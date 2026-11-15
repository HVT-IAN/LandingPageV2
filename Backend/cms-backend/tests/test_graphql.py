"""Pruebas de la API GraphQL (Misión A).

Mismo patrón que `test_api.py`: variables de entorno antes de importar `app`,
`TestClient` con lifespan, y `engine.dispose()` al final porque Windows
bloquea `test.db`.
"""

import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["ADMIN_EMAIL"] = "admin@test.com"
os.environ["ADMIN_PASSWORD"] = "secreto123"

import json
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.database import engine
from app.main import app
from app.seed import run as seed
from app.services import _hits

GRAPHQL = "/graphql"


@pytest.fixture(scope="module")
def client():
    # El rate limit es global en memoria y test_api.py ya lo consumió.
    _hits.clear()
    with TestClient(app) as c:
        seed()
        yield c
    engine.dispose()
    os.remove("test.db")


def gql(client, query, variables=None):
    return client.post(GRAPHQL, json={"query": query, "variables": variables or {}})


def ok(client, query, variables=None):
    response = gql(client, query, variables)
    assert response.status_code == 200, response.text
    body = response.json()
    assert "errors" not in body, body["errors"]
    return body["data"]


def error_code(client, query, variables=None):
    body = gql(client, query, variables).json()
    assert body.get("errors"), body
    return body["errors"][0]["extensions"]["code"]


def login(client):
    data = ok(
        client,
        'mutation { login(email: "admin@test.com", password: "secreto123") { id email } }',
    )
    return data["login"]


# ---------------- Sesión ----------------
def test_requires_session(client):
    anonymous = TestClient(app)
    assert error_code(anonymous, "{ projects { id } }") == "UNAUTHENTICATED"
    assert error_code(anonymous, "{ settings { seoTitle } }") == "UNAUTHENTICATED"
    assert error_code(anonymous, "mutation { deleteProject(id: 1) }") == "UNAUTHENTICATED"


def test_bad_login(client):
    assert (
        error_code(
            TestClient(app),
            'mutation { login(email: "admin@test.com", password: "mal") { id } }',
        )
        == "UNAUTHENTICATED"
    )


def test_login_me_logout(client):
    user = login(client)
    assert user["email"] == "admin@test.com"
    assert client.cookies.get("cms_session")
    assert ok(client, "{ me { id email } }")["me"]["email"] == "admin@test.com"
    assert ok(client, "mutation { logout }")["logout"] is True
    assert client.cookies.get("cms_session") in (None, "")
    assert error_code(client, "{ me { id } }") == "UNAUTHENTICATED"


# ---------------- Configuración y Sobre mí ----------------
def test_settings_partial_update(client):
    login(client)
    data = ok(
        client,
        'mutation { updateSettings(input: { seoTitle: "Ian | GraphQL" }) '
        "{ seoTitle metaDescription } }",
    )["updateSettings"]
    assert data["seoTitle"] == "Ian | GraphQL"
    # PUT parcial: lo no enviado conserva su valor (el seed lo dejó cargado).
    assert data["metaDescription"].startswith("Portafolio de Ian")


def test_update_about_sanitizes_html(client):
    login(client)
    data = ok(
        client,
        """
        mutation {
          updateAbout(input: {
            paragraphs: ["  Uno  ", "", "Dos"]
            contentHtml: "<p style='text-align:justify;position:fixed' onclick='x()'>Hola</p><script>alert(1)</script>"
            contentColumns: 7
            contentAlign: "center"
            photoAlt: "Foto"
          }) { paragraphs contentHtml contentColumns contentAlign photoAlt }
        }
        """,
    )["updateAbout"]
    assert data["paragraphs"] == ["Uno", "Dos"]
    assert "<script" not in data["contentHtml"] and "onclick" not in data["contentHtml"]
    assert "position" not in data["contentHtml"]
    assert data["contentColumns"] == 1  # 7 no es válido -> 1
    assert data["contentAlign"] == "left"  # "center" no es válido -> left
    assert data["photoAlt"] == "Foto"


# ---------------- Proyectos ----------------
def test_project_crud_conflict_and_reorder(client):
    login(client)
    created = ok(
        client,
        """
        mutation {
          createProject(input: {
            slug: "gql-nuevo"
            title: "Nuevo"
            description: "<p>Con <strong>formato</strong></p><script>alert(1)</script>"
          }) { id slug position published description }
        }
        """,
    )["createProject"]
    project_id = created["id"]
    assert created["position"] >= 1
    assert created["published"] is True
    assert "<script" not in created["description"]
    assert "<strong>formato</strong>" in created["description"]

    # Slug duplicado -> CONFLICT
    assert (
        error_code(
            client,
            'mutation { createProject(input: { slug: "gql-nuevo", title: "Otro" }) { id } }',
        )
        == "CONFLICT"
    )

    # Slug inválido -> BAD_USER_INPUT (misma regla que Rust/Pydantic)
    assert (
        error_code(
            client,
            'mutation { createProject(input: { slug: "Con Espacio", title: "X" }) { id } }',
        )
        == "BAD_USER_INPUT"
    )

    # Parcial: despublicar y comprobar que la landing no lo devuelve
    updated = ok(
        client,
        f"mutation {{ updateProject(id: {project_id}, input: {{ published: false }}) {{ published }} }}",
    )["updateProject"]
    assert updated["published"] is False
    slugs = [p["slug"] for p in ok(client, "{ publicLanding { projects { slug } } }")["publicLanding"]["projects"]]
    assert "gql-nuevo" not in slugs

    # Reordenar exige todos los ids
    ids = [p["id"] for p in ok(client, "{ projects { id } }")["projects"]]
    assert len(ids) > 1
    incomplete = ids[:-1]
    assert (
        error_code(client, f"mutation {{ reorderProjects(ids: {incomplete}) {{ id }} }}")
        == "BAD_USER_INPUT"
    )
    reordered = ok(
        client,
        f"mutation {{ reorderProjects(ids: {list(reversed(ids))}) {{ id position }} }}",
    )["reorderProjects"]
    assert [p["position"] for p in reordered] == list(range(1, len(ids) + 1))
    assert reordered[0]["id"] == ids[-1]

    # 404 y borrado
    assert error_code(client, "mutation { deleteProject(id: 999999) }") == "NOT_FOUND"
    assert ok(client, f"mutation {{ deleteProject(id: {project_id}) }}")["deleteProject"] is True
    assert error_code(client, f"mutation {{ updateProject(id: {project_id}, input: {{}}) {{ id }} }}") == "NOT_FOUND"


# ---------------- Tecnologías y redes ----------------
def test_replace_skills_and_social_links(client):
    login(client)
    skills = ok(
        client,
        """
        mutation {
          replaceSkills(groups: [
            { name: "Backend", skills: ["Python", "GraphQL", "  "] }
            { name: "Frontend", skills: ["HTML"] }
          ]) { groups { name skills } }
        }
        """,
    )["replaceSkills"]
    assert skills["groups"] == [
        {"name": "Backend", "skills": ["Python", "GraphQL"]},
        {"name": "Frontend", "skills": ["HTML"]},
    ]
    # Reemplazo total: la query devuelve lo mismo
    assert ok(client, "{ skills { groups { name skills } } }")["skills"] == skills

    links = ok(
        client,
        """
        mutation {
          replaceSocialLinks(links: [
            { platform: "github", url: "https://github.com/ian", visible: true }
            { platform: "email", url: "mailto:a@b.com", visible: false }
          ]) { platform url visible }
        }
        """,
    )["replaceSocialLinks"]
    assert links == [
        {"platform": "github", "url": "https://github.com/ian", "visible": True},
        {"platform": "email", "url": "mailto:a@b.com", "visible": False},
    ]
    assert (
        error_code(
            client,
            'mutation { replaceSocialLinks(links: [{ platform: "NO VALIDO", url: "x" }]) { url } }',
        )
        == "BAD_USER_INPUT"
    )


# ---------------- Contacto público ----------------
def test_contact_honeypot_and_rate_limit(client):
    _hits.clear()

    def submit(**extra):
        payload = {"name": "N", "email": "a@b.com", "message": "hola", **extra}
        return gql(
            client,
            "mutation ($input: ContactInput!) { submitContact(input: $input) { ok } }",
            {"input": payload},
        )

    # Honeypot: responde OK y no guarda
    assert submit(website="spam").json()["data"]["submitContact"]["ok"] is True

    for _ in range(3):
        body = submit().json()
        assert body["data"]["submitContact"]["ok"] is True

    limited = submit().json()
    assert limited["errors"][0]["extensions"]["code"] == "TOO_MANY_REQUESTS"

    # Sin sesión no se puede paginar, pero el login permite comprobar el total
    login(client)
    page = ok(
        client,
        "{ messages(unreadOnly: true, page: 1, pageSize: 50) { items { name } total page pageSize } }",
    )["messages"]
    assert page["total"] == 3
    assert page["page"] == 1 and page["pageSize"] == 50
    message_id = ok(client, "{ messages { items { id } } }")["messages"]["items"][0]["id"]
    assert ok(client, f"mutation {{ markMessageRead(id: {message_id}) }}")["markMessageRead"] is True
    assert error_code(client, "mutation { markMessageRead(id: 999999) }") == "NOT_FOUND"
    assert ok(client, f"mutation {{ deleteMessage(id: {message_id}) }}")["deleteMessage"] is True


# ---------------- Subida de imágenes ----------------
def upload(client, filename, content, content_type):
    operations = {
        "query": "mutation ($file: Upload!) { uploadImage(file: $file) { url width height } }",
        "variables": {"file": None},
    }
    return client.post(
        GRAPHQL,
        data={"operations": json.dumps(operations), "map": json.dumps({"0": ["variables.file"]})},
        files={"0": (filename, content, content_type)},
    )


def test_upload_valid_and_invalid(client):
    login(client)
    buffer = BytesIO()
    Image.new("RGB", (60, 40), "red").save(buffer, "PNG")
    body = upload(client, "a.png", buffer.getvalue(), "image/png").json()
    assert "errors" not in body, body
    result = body["data"]["uploadImage"]
    assert result["url"].endswith(".webp")
    assert result["width"] == 60 and result["height"] == 40

    body = upload(client, "a.txt", b"no soy imagen", "text/plain").json()
    assert body["errors"][0]["extensions"]["code"] == "BAD_USER_INPUT"


# ---------------- Landing pública ----------------
def test_public_landing_shape(client):
    landing = ok(
        client,
        """
        query {
          publicLanding {
            settings { heroTitle contactEmail }
            about { contentHtml contentColumns photo { url alt } }
            projects { slug title featured descriptionColumns image { url } }
            skillGroups { name skills }
            socialLinks { platform url }
          }
        }
        """,
    )["publicLanding"]
    assert landing["settings"]["heroTitle"] == "Ian Oscani"
    assert landing["about"]["contentColumns"] == 1
    # Solo redes visibles (test anterior dejó "email" oculta)
    assert [l["platform"] for l in landing["socialLinks"]] == ["github"]
    assert landing["projects"]  # los publicados del seed
    assert {p["slug"] for p in landing["projects"]} == {"deco-one", "proyecto-2", "proyecto-3"}
