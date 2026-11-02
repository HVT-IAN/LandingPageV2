from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import About, SiteSettings, User
from .routers import admin, auth, public
from .security import hash_password
from .admin_panel import setup_admin


def init_db():
    Base.metadata.create_all(engine)
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

# Panel de administración (SQLAdmin) en /admin
setup_admin(app)

settings.uploads_dir.mkdir(parents=True, exist_ok=True)

# Archivos estáticos: SIEMPRE después de la API y del panel, o "/" taparía las rutas
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
if settings.landing_dir.exists():
    app.mount("/", StaticFiles(directory=settings.landing_dir, html=True), name="landing")
