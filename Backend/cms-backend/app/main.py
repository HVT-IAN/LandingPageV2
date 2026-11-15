from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .database import Base, SessionLocal, engine
from .graphql import graphql_router
from .migrations import ensure_rich_text_schema
from .models import About, SiteSettings, User
from .routers import admin, auth, public
from .security import hash_password


def init_db():
    Base.metadata.create_all(engine)
    ensure_rich_text_schema(engine)
    with SessionLocal() as db:
        if not db.get(SiteSettings, 1):
            db.add(SiteSettings(id=1))
        if not db.get(About, 1):
            db.add(About(id=1))
        if not db.scalar(select(User).limit(1)):
            db.add(User(email=settings.admin_email.lower(), password_hash=hash_password(settings.admin_password)))
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Landing CMS", lifespan=lifespan)

# CORS para permitir peticiones desde la landing (Live Server / GitHub Pages)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/v1/health", tags=["health"])
def health():
    return {"status": "ok"}


for r in (public.router, auth.router, admin.router):
    app.include_router(r, prefix="/api/v1")

# API GraphQL (POST /graphql). Se monta antes de los estáticos, igual que la API REST.
app.include_router(graphql_router, prefix="/graphql")

# Panel de administración compilado (SPA React) en /admin con fallback a index.html
class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


if settings.admin_dist_dir.exists():
    @app.get("/admin", include_in_schema=False)
    def serve_admin_root():
        return FileResponse(settings.admin_dist_dir / "index.html")

    app.mount(
        "/admin",
        SPAStaticFiles(directory=settings.admin_dist_dir, html=True),
        name="admin",
    )

settings.uploads_dir.mkdir(parents=True, exist_ok=True)

# Archivos estáticos: SIEMPRE después de la API y del panel, o "/" taparía las rutas
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
if settings.landing_dir.exists():
    app.mount("/", StaticFiles(directory=settings.landing_dir, html=True), name="landing")
