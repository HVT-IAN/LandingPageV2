import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["ADMIN_EMAIL"] = "admin@test.com"
os.environ["ADMIN_PASSWORD"] = "secreto123"

from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.database import engine
from app.main import app
from app.seed import run as seed

API = "/api/v1"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        seed()
        yield c
    # Windows mantiene el archivo abierto hasta cerrar todas las conexiones
    engine.dispose()
    os.remove("test.db")


def login(c):
    r = c.post(f"{API}/auth/login", json={"email": "admin@test.com", "password": "secreto123"})
    assert r.status_code == 200


def test_landing_public(client):
    data = client.get(f"{API}/public/landing").json()
    assert len(data["projects"]) == 3
    assert data["skillGroups"][0]["name"] == "Frontend"
    assert data["about"]["contentColumns"] == 1
    assert data["projects"][0]["descriptionColumns"] == 1


def test_admin_requires_session(client):
    c = TestClient(app)
    assert c.get(f"{API}/admin/projects").status_code == 401


def test_bad_login(client):
    r = TestClient(app).post(f"{API}/auth/login", json={"email": "admin@test.com", "password": "x"})
    assert r.status_code == 401


def test_project_crud_and_order(client):
    login(client)
    r = client.post(f"{API}/admin/projects", json={"slug": "nuevo", "title": "Nuevo"})
    assert r.status_code == 201
    pid = r.json()["id"]
    assert client.post(f"{API}/admin/projects", json={"slug": "nuevo", "title": "X"}).status_code == 409
    assert client.patch(f"{API}/admin/projects/{pid}", json={"published": False}).status_code == 200
    slugs = [p["slug"] for p in client.get(f"{API}/public/landing").json()["projects"]]
    assert "nuevo" not in slugs  # no publicado
    ids = [p["id"] for p in client.get(f"{API}/admin/projects").json()][::-1]
    assert client.put(f"{API}/admin/projects/order", json={"ids": ids}).status_code == 204
    assert client.delete(f"{API}/admin/projects/{pid}").status_code == 204


def test_skills_replace(client):
    login(client)
    body = {"groups": [{"name": "A", "skills": ["x", "y"]}]}
    assert client.put(f"{API}/admin/skills", json=body).json() == body


def test_contact_honeypot_and_limit(client):
    ok = {"name": "N", "email": "a@b.com", "message": "hola", "website": ""}
    assert client.post(f"{API}/public/contact", json={**ok, "website": "spam"}).status_code == 202
    for _ in range(3):
        assert client.post(f"{API}/public/contact", json=ok).status_code == 202
    assert client.post(f"{API}/public/contact", json=ok).status_code == 429
    login(client)
    assert len(client.get(f"{API}/admin/messages").json()) == 3


def test_upload(client):
    login(client)
    buf = BytesIO()
    Image.new("RGB", (50, 50), "red").save(buf, "PNG")
    r = client.post(f"{API}/admin/upload", files={"file": ("a.png", buf.getvalue(), "image/png")})
    assert r.status_code == 201 and r.json()["url"].endswith(".webp")
    r = client.post(f"{API}/admin/upload", files={"file": ("a.txt", b"no soy imagen", "text/plain")})
    assert r.status_code == 400


def test_settings_about_and_lists_still_work(client):
    """Regresión REST tras extraer la lógica a app/content_service.py."""

    login(client)

    r = client.put(f"{API}/admin/settings", json={"seo_title": "Ian | REST"})
    assert r.status_code == 200
    assert r.json()["seo_title"] == "Ian | REST"
    assert r.json()["meta_description"].startswith("Portafolio")  # merge parcial

    r = client.put(
        f"{API}/admin/about",
        json={
            "paragraphs": ["  Uno  ", "", "Dos"],
            "content_html": "<p onclick='x()'>Hola</p><script>alert(1)</script>",
            "content_columns": 3,
            "content_align": "justify",
            "photo_alt": "Ian",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["paragraphs"] == ["Uno", "Dos"]
    assert "<script" not in body["content_html"] and "onclick" not in body["content_html"]
    assert body["content_columns"] == 3 and body["content_align"] == "justify"

    r = client.put(
        f"{API}/admin/social-links",
        json={"links": [{"platform": "github", "url": "https://github.com/ian", "visible": True}]},
    )
    assert r.status_code == 200
    assert [link["platform"] for link in r.json()["links"]] == ["github"]

    body = {"groups": [{"name": "Único", "skills": ["Python"]}]}
    assert client.put(f"{API}/admin/skills", json=body).json() == body
