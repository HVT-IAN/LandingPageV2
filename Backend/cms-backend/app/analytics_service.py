"""Ingesta y agregación de métricas de tráfico web.

Dos responsabilidades, una sola fuente de verdad para la API REST y GraphQL:

- ``ingest_event``: valida, normaliza y guarda un evento anónimo.
- ``metrics_snapshot``: agrega los eventos de un rango en un diccionario
  camelCase listo para los tipos de GraphQL.

Privacidad: nunca se guarda la IP ni el user-agent. La sesión se reduce a un
hash con ``SECRET_KEY`` y el referrer se recorta al host.
"""

from __future__ import annotations

import hashlib
import re
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .config import settings
from .models import AnalyticsEvent, Message, Project
from .schemas import AnalyticsEventIn
from .services import analytics_rate_limited

# Rango visible -> (días de retención consultados, granularidad)
RANGES: dict[str, tuple[int, str]] = {
    "last_7_days": (7, "day"),
    "last_30_days": (30, "day"),
    "last_365_days": (365, "month"),
}

MAX_BREAKDOWN = 8
DEVICES = ("desktop", "mobile", "tablet")
DEVICE_LABELS = {"desktop": "Escritorio", "mobile": "Móvil", "tablet": "Tablet"}

SECTION_LABELS = {
    "inicio": "Portada",
    "panel-proyectos": "Proyectos",
    "panel-informacion": "Información",
    "panel-contacto": "Contacto",
}

MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun",
             "jul", "ago", "sep", "oct", "nov", "dic"]

_HOST_RE = re.compile(r"[^a-z0-9.:\-]")
_BOT_RE = re.compile(
    r"(bot|crawler|spider|slurp|headless|phantom|pingdom|uptime|lighthouse)", re.I
)


# ---------------- Normalización ----------------
def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    """SQLite devuelve datetimes sin tz; en la app siempre son UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clean_text(value: str, limit: int = 120) -> str:
    return " ".join((value or "").split())[:limit]


def clean_host(value: str) -> str:
    """De ``https://www.Google.com/x?y`` a ``google.com``."""
    if not value:
        return ""
    host = (value or "").strip().lower()
    host = host.split("//")[-1]
    host = host.split("/")[0].split("?")[0].split("#")[0]
    host = host.split("@")[-1]
    host = host.split(":")[0]
    host = _HOST_RE.sub("", host).strip(".")
    if host.startswith("www."):
        host = host[4:]
    return host[:120]


def device_from_user_agent(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "ipad" in ua or "tablet" in ua or ("android" in ua and "mobile" not in ua):
        return "tablet"
    if "mobi" in ua or "iphone" in ua or "android" in ua:
        return "mobile"
    return "desktop"


def looks_like_bot(user_agent: str) -> bool:
    return bool(_BOT_RE.search(user_agent or ""))


def session_hash(session_id: str) -> str:
    return hashlib.sha256(f"{settings.secret_key}:{session_id}".encode()).hexdigest()[:32]


# ---------------- Ingesta ----------------
def ingest_event(db: Session, data: AnalyticsEventIn, request: Request) -> bool:
    """Guarda el evento. Devuelve ``False`` si era un bot o una ruta ignorada."""

    user_agent = request.headers.get("user-agent", "")
    if looks_like_bot(user_agent):
        return False

    ip = request.client.host if request.client else "unknown"
    if analytics_rate_limited(ip):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados eventos, inténtalo más tarde"
        )

    path = _clean_text(data.path, 200) or "/"
    if not path.startswith("/") or path.startswith("/admin"):
        return False

    db.add(
        AnalyticsEvent(
            event_name=data.event,
            path=path,
            section=_clean_text(data.section) if data.event == "section_view" else "",
            project_slug=(
                _clean_text(data.project_slug) if data.event == "project_open" else ""
            ),
            referrer_host=clean_host(data.referrer_host) if data.event == "page_view" else "",
            target=clean_host(data.target) if data.event == "outbound_click" else "",
            device=device_from_user_agent(user_agent),
            session_hash=session_hash(data.session_id),
        )
    )
    db.commit()
    return True


def prune_events(db: Session, retention_days: int | None = None) -> int:
    """Borra eventos más antiguos que la retención configurada (400 días)."""

    days = settings.analytics_retention_days if retention_days is None else retention_days
    if days <= 0:
        return 0
    cutoff = _utc_now() - timedelta(days=days)
    result = db.execute(delete(AnalyticsEvent).where(AnalyticsEvent.created_at < cutoff))
    db.commit()
    return result.rowcount or 0


# ---------------- Agregación ----------------
def _daily_label(value: date) -> str:
    return f"{value.day} {MONTHS_ES[value.month - 1]}"


def _range_bounds(range_key: str) -> tuple[datetime, datetime, str, list[tuple[str, str]]]:
    """Devuelve (desde, hasta, granularidad, buckets con etiqueta)."""

    days, granularity = RANGES[range_key]
    now = _utc_now()

    if granularity == "month":
        total = now.year * 12 + (now.month - 1)
        buckets: list[tuple[str, str]] = []
        for offset in range(11, -1, -1):
            year, month_index = divmod(total - offset, 12)
            month = month_index + 1
            buckets.append(
                (f"{year:04d}-{month:02d}", f"{MONTHS_ES[month - 1]} {year % 100:02d}")
            )
        start_year, start_month_index = divmod(total - 11, 12)
        start = datetime(start_year, start_month_index + 1, 1, tzinfo=timezone.utc)
        return start, now, granularity, buckets

    today = now.date()
    start_date = today - timedelta(days=days - 1)
    buckets = [
        (
            (start_date + timedelta(days=offset)).isoformat(),
            _daily_label(start_date + timedelta(days=offset)),
        )
        for offset in range(days)
    ]
    start = datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc)
    return start, now, granularity, buckets


def _breakdown(values: dict[str, int], labels: dict[str, str] | None = None) -> list[dict]:
    labels = labels or {}
    items = sorted(values.items(), key=lambda item: (-item[1], item[0]))
    return [
        {"key": key, "label": labels.get(key, key), "value": value}
        for key, value in items[:MAX_BREAKDOWN]
        if value > 0
    ]


def metrics_snapshot(db: Session, range_key: str = "last_30_days") -> dict:
    """Agrega el rango pedido. Compatible con SQLite y PostgreSQL."""

    if range_key not in RANGES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Rango de métricas inválido")

    start, end, granularity, buckets = _range_bounds(range_key)

    series: dict[str, dict] = {
        key: {
            "bucket": key,
            "label": label,
            "pageViews": 0,
            "sessions": set(),
            "projectOpens": 0,
        }
        for key, label in buckets
    }

    rows = db.scalars(
        select(AnalyticsEvent)
        .where(AnalyticsEvent.created_at >= start)
        .order_by(AnalyticsEvent.created_at)
    ).all()

    all_sessions: set[str] = set()
    page_views = 0
    project_opens = 0
    projects: dict[str, int] = {}
    sections: dict[str, int] = {}
    referrers: dict[str, int] = {}
    outbound: dict[str, int] = {}
    devices = {device: 0 for device in DEVICES}

    for row in rows:
        created = _as_utc(row.created_at)
        if created < start:
            continue

        key = created.strftime("%Y-%m") if granularity == "month" else created.date().isoformat()
        bucket = series.get(key)

        all_sessions.add(row.session_hash)
        if bucket is not None:
            bucket["sessions"].add(row.session_hash)

        if row.event_name == "page_view":
            page_views += 1
            if bucket is not None:
                bucket["pageViews"] += 1
            devices[row.device] = devices.get(row.device, 0) + 1
            host = row.referrer_host or "directo"
            referrers[host] = referrers.get(host, 0) + 1
        elif row.event_name == "project_open":
            project_opens += 1
            if bucket is not None:
                bucket["projectOpens"] += 1
            slug = row.project_slug or "sin-slug"
            projects[slug] = projects.get(slug, 0) + 1
        elif row.event_name == "section_view":
            section = row.section or "sin-seccion"
            sections[section] = sections.get(section, 0) + 1
        elif row.event_name == "outbound_click":
            target = row.target or "otro"
            outbound[target] = outbound.get(target, 0) + 1

    project_titles: dict[str, str] = {}
    if projects:
        for project in db.scalars(select(Project).where(Project.slug.in_(projects))).all():
            project_titles[project.slug] = project.title

    contacts = (
        db.scalar(select(func.count()).select_from(Message).where(Message.created_at >= start))
        or 0
    )
    sessions = len(all_sessions)
    conversion = round(contacts / sessions * 100, 1) if sessions else 0.0

    return {
        "range": range_key,
        "rangeStart": start.isoformat(),
        "rangeEnd": end.isoformat(),
        "granularity": granularity,
        "totals": {
            "pageViews": page_views,
            "sessions": sessions,
            "projectOpens": project_opens,
            "contactSubmissions": contacts,
            "conversionRate": conversion,
        },
        "series": [
            {
                "bucket": item["bucket"],
                "label": item["label"],
                "pageViews": item["pageViews"],
                "sessions": len(item["sessions"]),
                "projectOpens": item["projectOpens"],
            }
            for item in series.values()
        ],
        "topProjects": _breakdown(projects, project_titles),
        "topSections": _breakdown(sections, SECTION_LABELS),
        "topReferrers": _breakdown(referrers),
        "topOutbound": _breakdown(outbound),
        "devices": _breakdown(devices, DEVICE_LABELS),
    }
