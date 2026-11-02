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
