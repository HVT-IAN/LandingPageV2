"""Migraciones aditivas para el contenido enriquecido.

La aplicación usa ``create_all`` para crear tablas nuevas, pero SQLAlchemy no
añade columnas a tablas que ya existen. Este módulo agrega únicamente las
columnas necesarias para el editor de proyectos y Sobre mí, sin borrar ni
recrear datos.

Se ejecuta al iniciar la app y también puede lanzarse manualmente con
``scripts/migrate_rich_text.py`` (útil antes de desplegar a Neon).
"""

from __future__ import annotations

import html
import json

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


# Nombre de tabla -> columnas nuevas y su DDL compatible con SQLite/PostgreSQL.
_COLUMNS: dict[str, dict[str, str]] = {
    "projects": {
        "description_columns": "INTEGER NOT NULL DEFAULT 1",
        "description_align": "VARCHAR(20) NOT NULL DEFAULT 'left'",
    },
    "about": {
        "content_html": "TEXT NOT NULL DEFAULT ''",
        "content_columns": "INTEGER NOT NULL DEFAULT 1",
        "content_align": "VARCHAR(20) NOT NULL DEFAULT 'left'",
    },
}


def _as_paragraph_list(value) -> list[str]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            value = []
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _paragraphs_to_html(value) -> str:
    return "".join(f"<p>{html.escape(paragraph)}</p>" for paragraph in _as_paragraph_list(value))


def ensure_rich_text_schema(engine: Engine) -> list[str]:
    """Agrega las columnas aditivas y rellena Sobre mí desde los párrafos.

    Es idempotente: si las columnas ya existen no las vuelve a crear y no
    sobrescribe ``content_html`` si ya contiene contenido.
    """

    changes: list[str] = []
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    for table, columns in _COLUMNS.items():
        if table not in table_names:
            continue
        existing = {column["name"] for column in inspector.get_columns(table)}
        for column, ddl in columns.items():
            if column in existing:
                continue
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
            changes.append(f"{table}.{column}")

    # Si la tabla about ya existe, convertir los párrafos antiguos a HTML.
    if "about" in table_names:
        with engine.begin() as conn:
            rows = conn.execute(
                text("SELECT id, paragraphs, content_html FROM about")
            ).mappings().all()
            for row in rows:
                if str(row.get("content_html") or "").strip():
                    continue
                content = _paragraphs_to_html(row.get("paragraphs"))
                if not content:
                    continue
                conn.execute(
                    text("UPDATE about SET content_html = :content WHERE id = :id"),
                    {"content": content, "id": row["id"]},
                )
                changes.append(f"about.content_html (fila {row['id']})")

    return changes
