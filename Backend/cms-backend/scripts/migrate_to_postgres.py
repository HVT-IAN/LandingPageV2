"""Migra el contenido de la base local (SQLite) a PostgreSQL/Neon.

Uso:
    python scripts/migrate_to_postgres.py --target "postgresql+psycopg://usuario:clave@host/bd?sslmode=require"

Opciones:
    --source   URL de origen (por defecto sqlite:///./cms.db)
    --target   URL de destino (o TARGET_DATABASE_URL en .env)
    --dry-run  Solo muestra cuántas filas hay en el origen, sin escribir nada

Copia:
    site_settings, about, projects, skill_groups, skills, social_links y messages.

NO copia usuarios: el administrador se crea solo con ADMIN_EMAIL/ADMIN_PASSWORD
la primera vez que arranca el backend contra la base nueva.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine, delete, func, select, text
from sqlalchemy.orm import Session

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402
from app.models import (  # noqa: E402
    About,
    Message,
    Project,
    SiteSettings,
    Skill,
    SkillGroup,
    SocialLink,
)

# El orden importa: los hijos (skills) se copian después de sus padres (skill_groups).
TABLAS = [
    ("site_settings", SiteSettings),
    ("about", About),
    ("projects", Project),
    ("skill_groups", SkillGroup),
    ("skills", Skill),
    ("social_links", SocialLink),
    ("messages", Message),
]


def valores(obj):
    """Convierte una fila ORM en un diccionario de columnas."""
    return {columna.key: getattr(obj, columna.key) for columna in obj.__table__.columns}


def normalizar_url(url: str) -> str:
    """Acepta las URLs que copia Neon y las adapta al driver psycopg 3."""
    url = url.strip()
    for prefijo in ("postgres://", "postgresql://"):
        if url.startswith(prefijo):
            return "postgresql+psycopg://" + url[len(prefijo):]
    return url


def main() -> int:
    parser = argparse.ArgumentParser(description="Migra cms.db (SQLite) a PostgreSQL/Neon")
    parser.add_argument(
        "--source",
        default=f"sqlite:///{(BASE_DIR / 'cms.db').as_posix()}",
        help="URL de la base de origen (por defecto cms.db local)",
    )
    parser.add_argument(
        "--target",
        default=settings.target_database_url,
        help="URL de la base de destino (PostgreSQL/Neon). También vale TARGET_DATABASE_URL en .env",
    )
    parser.add_argument("--dry-run", action="store_true", help="No escribe nada, solo cuenta filas")
    args = parser.parse_args()

    if not args.target:
        print("ERROR: falta --target o TARGET_DATABASE_URL en Backend/cms-backend/.env")
        print('Ejemplo: --target "postgresql+psycopg://usuario:clave@host/bd?sslmode=require"')
        return 1

    args.target = normalizar_url(args.target)

    if args.source.startswith("sqlite:///"):
        ruta = Path(args.source.removeprefix("sqlite:///"))
        if not ruta.exists():
            print(f"ERROR: no existe la base de datos de origen: {ruta}")
            return 1

    source_engine = create_engine(args.source)
    target_engine = create_engine(args.target, pool_pre_ping=True)

    with Session(source_engine) as src:
        conteos = {
            nombre: src.scalar(select(func.count()).select_from(modelo))
            for nombre, modelo in TABLAS
        }
        print("Contenido en el origen:")
        for nombre, total in conteos.items():
            print(f"  {nombre}: {total}")

        if args.dry_run:
            print("Dry-run: no se escribió nada.")
            return 0

        # Crea las tablas en el destino si no existen.
        Base.metadata.create_all(target_engine)

        with Session(target_engine) as dst:
            # Vaciamos el destino en orden inverso (hijos primero).
            for _, modelo in reversed(TABLAS):
                dst.execute(delete(modelo))
            dst.commit()

            for nombre, modelo in TABLAS:
                filas = src.scalars(select(modelo).order_by(modelo.id)).all()
                for fila in filas:
                    dst.add(modelo(**valores(fila)))
                dst.commit()
                print(f"  copiados {nombre}: {len(filas)}")

    # Al insertar IDs explícitos, PostgreSQL no avanza sus secuencias.
    # Las ajustamos para que los próximos INSERT no choquen con IDs existentes.
    if target_engine.dialect.name == "postgresql":
        with target_engine.begin() as conn:
            for nombre, _ in TABLAS:
                conn.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{nombre}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {nombre}), 1), "
                        f"(SELECT COUNT(*) > 0 FROM {nombre}))"
                    )
                )
        print("Secuencias de PostgreSQL ajustadas.")

    print("Migración completada correctamente.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
