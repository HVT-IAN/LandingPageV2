"""Aplica la migración aditiva del editor enriquecido.

Uso local:
    python scripts/migrate_rich_text.py

Uso contra Neon u otra base:
    python scripts/migrate_rich_text.py --database-url "postgresql://..."

No borra ni recrea tablas. Solo agrega columnas nuevas y convierte los
párrafos actuales de Sobre mí a ``content_html`` si aún está vacío.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app import models  # noqa: E402,F401  (registra las tablas en Base)
from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402
from app.migrations import ensure_rich_text_schema  # noqa: E402


def normalizar_url(url: str) -> str:
    url = url.strip()
    for prefijo in ("postgres://", "postgresql://"):
        if url.startswith(prefijo):
            return "postgresql+psycopg://" + url[len(prefijo):]
    return url


def main() -> int:
    parser = argparse.ArgumentParser(description="Migración aditiva del editor enriquecido")
    parser.add_argument(
        "--database-url",
        default=settings.database_url,
        help="Base de destino; por defecto usa DATABASE_URL del .env",
    )
    args = parser.parse_args()

    url = normalizar_url(args.database_url)
    engine = create_engine(url, pool_pre_ping=True)

    # Crea tablas nuevas si faltan, pero no altera las existentes.
    Base.metadata.create_all(engine)
    changes = ensure_rich_text_schema(engine)

    if changes:
        print("Migración aplicada:")
        for change in changes:
            print(f"  - {change}")
    else:
        print("Sin cambios: la base ya estaba actualizada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
