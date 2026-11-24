"""Pruebas de la ingesta de tráfico y de la query GraphQL `metrics`.

Mismo patrón que el resto: variables de entorno antes de importar `app` y
`TestClient` con lifespan. El archivo se llama `test_metrics.py` para que
pytest lo ejecute después de `test_graphql.py` y no choque con `test.db`.
"""

import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["ADMIN_EMAIL"] = "admin@test.com"
os.environ["ADMIN_PASSWORD"] = "secreto123"

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select

from app.database import SessionLocal, engine
from app.main import app
from app.models import AnalyticsEvent, Message
from app.seed import run as seed
from app.services import _analytics_hits, _hits

API = "/api/v1"
GRAPHQL = "/graphql"

METRICS_QUERY = """
query Metrics($range: MetricsRange!) {
  metrics(range: $range) {
    range
    rangeStart
    rangeEnd
    granularity
    totals { pageViews sessions projectOpens contactSubmissions conversionRate }
    series { bucket label pageViews sessions projectOpens }
    topProjects { key label value }
    topSections { key label value }
    topReferrers { key label value }
    topOutbound { key label value }
    devices { key label value }
  }
}
"""


@pytest.fixture(scope="module")
def client():
    _hits.clear()
    _analytics_hits.clear()
    with TestClient(app) as c:
        seed()
        yield c
    engine.dispose()
    os.remove("test.db")


def login(client):
    r = client.post(f"{API}/auth/login", json={"email": "admin@test.com", "password": "secreto123"})
    assert r.status_code == 200


def gql(client, query, variables=None):
    r = client.post(GRAPHQL, json={"query": query, "variables": variables or {}})
    assert r.status_code == 200, r.text
    return r.json()


def event_payload(**overrides):
    data = {
        "event": "page_view",
        "session_id": "sesion-de-prueba-0001",
        "path": "/",
        "section": "",
        "project_slug": "",
        "referrer_host": "",
        "target": "",
    }
    data.update(overrides)
    return data


def clear_analytics():
    with SessionLocal() as db:
        db.execute(delete(AnalyticsEvent))
        db.execute(delete(Message))
        db.commit()


def add_event(event, session, days_ago=0, **fields):
    with SessionLocal() as db:
        db.add(
            AnalyticsEvent(
                event_name=event,
                path=fields.get("path", "/"),
                section=fields.get("section", ""),
                project_slug=fields.get("project_slug", ""),
                referrer_host=fields.get("referrer_host", ""),
                target=fields.get("target", ""),
                device=fields.get("device", "desktop"),
                session_hash=session,
                created_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
            )
        )
        db.commit()


# ---------------- Ingesta ----------------
def test_ingest_returns_204_and_hashes_session(client):
    clear_analytics()

    r = client.post(
        f"{API}/public/analytics",
        json=event_payload(referrer_host="https://www.google.com/search?q=ian"),
        headers={"user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/131"},
    )
    assert r.status_code == 204

    with SessionLocal() as db:
        row = db.scalars(select(AnalyticsEvent)).one()
        assert row.event_name == "page_view"
        assert row.path == "/"
        assert row.referrer_host == "google.com"  # host limpio, sin www ni ruta
        assert len(row.session_hash) == 32
        assert row.session_hash != "sesion-de-prueba-0001"  # nunca el valor crudo
        assert row.device == "desktop"


def test_ingest_normalizes_device_and_project(client):
    clear_analytics()

    iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"
    assert client.post(
        f"{API}/public/analytics",
        json=event_payload(event="project_open", project_slug=" deco-one ", section=""),
        headers={"user-agent": iphone},
    ).status_code == 204

    with SessionLocal() as db:
        row = db.scalars(select(AnalyticsEvent)).one()
        assert row.device == "mobile"
        assert row.project_slug == "deco-one"
        assert row.section == ""


def test_ingest_ignores_admin_paths_and_bots(client):
    clear_analytics()

    assert client.post(f"{API}/public/analytics", json=event_payload(path="/admin")).status_code == 204
    assert client.post(
        f"{API}/public/analytics",
        json=event_payload(),
        headers={"user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"},
    ).status_code == 204

    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(AnalyticsEvent)) == 0


def test_ingest_rejects_unknown_events_and_short_sessions(client):
    assert client.post(f"{API}/public/analytics", json=event_payload(event="click_falso")).status_code == 422
    assert client.post(f"{API}/public/analytics", json=event_payload(session_id="corto")).status_code == 422


# ---------------- Consulta protegida ----------------
def test_metrics_requires_session(client):
    body = gql(client, METRICS_QUERY, {"range": "LAST_7_DAYS"})
    assert body["errors"][0]["extensions"]["code"] == "UNAUTHENTICATED"


# ---------------- Agregaciones ----------------
def test_metrics_totals_breakdowns_and_ranges(client):
    clear_analytics()

    add_event("page_view", "s1", referrer_host="google.com", device="desktop")
    add_event("page_view", "s2", device="mobile")
    add_event("page_view", "s3", referrer_host="github.com", device="desktop")
    add_event("project_open", "s1", project_slug="deco-one")
    add_event("project_open", "s2", project_slug="deco-one")
    add_event("section_view", "s1", section="panel-proyectos")
    add_event("outbound_click", "s1", target="github.com")
    add_event("page_view", "s4", days_ago=10, referrer_host="google.com")

    with SessionLocal() as db:
        db.add(Message(name="Ana", email="ana@example.com", message="Hola"))
        db.commit()

    login(client)

    week = gql(client, METRICS_QUERY, {"range": "LAST_7_DAYS"})["data"]["metrics"]
    assert week["range"] == "last_7_days"
    assert week["granularity"] == "day"
    assert len(week["series"]) == 7
    assert week["totals"] == {
        "pageViews": 3,
        "sessions": 3,
        "projectOpens": 2,
        "contactSubmissions": 1,
        "conversionRate": 33.3,
    }
    assert week["topProjects"] == [{"key": "deco-one", "label": "DECO-ONE", "value": 2}]
    assert week["topSections"] == [{"key": "panel-proyectos", "label": "Proyectos", "value": 1}]
    assert {item["key"]: item["value"] for item in week["topReferrers"]} == {
        "google.com": 1,
        "directo": 1,
        "github.com": 1,
    }
    assert week["topOutbound"] == [{"key": "github.com", "label": "github.com", "value": 1}]
    assert {item["key"]: item["value"] for item in week["devices"]} == {
        "desktop": 2,
        "mobile": 1,
    }
    # Los buckets diarios existen aunque no tengan eventos.
    assert all(point["pageViews"] == 0 for point in week["series"][:-1])

    month = gql(client, METRICS_QUERY, {"range": "LAST_30_DAYS"})["data"]["metrics"]
    assert month["totals"]["pageViews"] == 4
    assert month["totals"]["sessions"] == 4
    assert month["totals"]["conversionRate"] == 25.0

    year = gql(client, METRICS_QUERY, {"range": "LAST_365_DAYS"})["data"]["metrics"]
    assert year["granularity"] == "month"
    assert len(year["series"]) == 12
    assert year["totals"]["pageViews"] == 4


def test_metrics_defaults_to_30_days(client):
    login(client)
    body = gql(client, "query { metrics { range } }")
    assert body["data"]["metrics"]["range"] == "last_30_days"


# ---------------- Retención ----------------
def test_prune_events_keeps_recent_rows(client):
    from app.analytics_service import prune_events

    clear_analytics()
    add_event("page_view", "viejo", days_ago=500)
    add_event("page_view", "reciente", days_ago=5)

    with SessionLocal() as db:
        removed = prune_events(db, retention_days=400)

    assert removed == 1
    with SessionLocal() as db:
        remaining = db.scalars(select(AnalyticsEvent)).all()
    assert [row.session_hash for row in remaining] == ["reciente"]
