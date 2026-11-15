"""Lógica de negocio del contenido, compartida por la API REST y GraphQL.

Los routers (`app/routers/*`) y los resolvers (`app/graphql/*`) no deben
duplicar reglas: ambos llaman a estas funciones. Las funciones levantan
``HTTPException`` para conservar exactamente los códigos y mensajes que ya
usaba la API REST; GraphQL los traduce a ``extensions.code`` en
``app/graphql/errors.py``.
"""

from __future__ import annotations

import uuid
from io import BytesIO

from fastapi import HTTPException, Response, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .models import About, Message, Project, SiteSettings, Skill, SkillGroup, SocialLink, User
from .sanitize import sanitize_rich_html
from .schemas import (
    AboutData,
    ContactIn,
    ProjectCreate,
    ProjectUpdate,
    SettingsData,
    SkillGroupData,
    SkillsData,
    SocialLinkData,
)
from .security import COOKIE_NAME, create_token, verify_password
from .services import rate_limited

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


# ---------------- Autenticación ----------------
def authenticate(db: Session, email: str, password: str) -> User:
    """Valida credenciales y devuelve el usuario. 401 con mensaje en español."""

    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user or not user.active or not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales inválidas")
    return user


def set_session_cookie(response: Response, user: User) -> None:
    """Misma cookie que usa la API REST (`cms_session`)."""

    response.set_cookie(
        COOKIE_NAME,
        create_token(user.id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.token_hours * 3600,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


# ---------------- Configuración del sitio ----------------
def get_settings_row(db: Session) -> SiteSettings:
    return db.get(SiteSettings, 1)


def update_settings(db: Session, data: SettingsData) -> SiteSettings:
    row = db.get(SiteSettings, 1)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    return row


# ---------------- Sobre mí ----------------
def get_about_row(db: Session) -> About:
    return db.get(About, 1)


def update_about(db: Session, data: AboutData) -> About:
    row = db.get(About, 1)
    row.paragraphs = [p.strip() for p in data.paragraphs if p.strip()]
    row.content_html = sanitize_rich_html(data.content_html)
    row.content_columns = 2 if data.content_columns == 2 else 3 if data.content_columns == 3 else 1
    row.content_align = "justify" if data.content_align == "justify" else "left"
    row.photo_url = data.photo_url
    row.photo_alt = data.photo_alt
    db.commit()
    return row


# ---------------- Proyectos ----------------
def list_projects(db: Session) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.position, Project.id)).all())


def create_project(db: Session, data: ProjectCreate) -> Project:
    last = db.scalar(select(func.max(Project.position))) or 0
    project = Project(**data.model_dump(), position=last + 1)
    project.description = sanitize_rich_html(project.description)
    project.description_columns = 2 if project.description_columns == 2 else 1
    project.description_align = "justify" if project.description_align == "justify" else "left"
    db.add(project)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proyecto con ese slug")
    return project


def reorder_projects(db: Session, ids: list[int]) -> list[Project]:
    projects = {p.id: p for p in db.scalars(select(Project)).all()}
    if set(ids) != set(projects):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La lista debe contener todos los proyectos")
    for pos, project_id in enumerate(ids, start=1):
        projects[project_id].position = pos
    db.commit()
    return sorted(projects.values(), key=lambda p: (p.position, p.id))


def update_project(db: Session, project_id: int, data: ProjectUpdate) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    project.description = sanitize_rich_html(project.description)
    project.description_columns = 2 if project.description_columns == 2 else 1
    project.description_align = "justify" if project.description_align == "justify" else "left"
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proyecto con ese slug")
    return project


def delete_project(db: Session, project_id: int) -> None:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    db.delete(project)
    db.commit()


# ---------------- Tecnologías (reemplazo total) ----------------
def skills_payload(db: Session) -> SkillsData:
    groups = db.scalars(select(SkillGroup).order_by(SkillGroup.position, SkillGroup.id)).all()
    return SkillsData(
        groups=[SkillGroupData(name=g.name, skills=[s.name for s in g.skills]) for g in groups]
    )


def replace_skills(db: Session, data: SkillsData) -> SkillsData:
    for group in db.scalars(select(SkillGroup)).all():
        db.delete(group)  # cascade borra sus skills
    db.flush()
    for group_position, group in enumerate(data.groups):
        row = SkillGroup(name=group.name, position=group_position)
        row.skills = [
            Skill(name=name.strip(), position=skill_position)
            for skill_position, name in enumerate(group.skills)
            if name.strip()
        ]
        db.add(row)
    db.commit()
    return skills_payload(db)


# ---------------- Redes sociales (reemplazo total) ----------------
def social_links_payload(db: Session) -> list[SocialLinkData]:
    rows = db.scalars(select(SocialLink).order_by(SocialLink.position, SocialLink.id)).all()
    return [SocialLinkData(platform=r.platform, url=r.url, visible=r.visible) for r in rows]


def replace_social_links(db: Session, links: list[SocialLinkData]) -> list[SocialLinkData]:
    for row in db.scalars(select(SocialLink)).all():
        db.delete(row)
    db.flush()
    for position, link in enumerate(links):
        db.add(SocialLink(platform=link.platform, url=link.url, visible=link.visible, position=position))
    db.commit()
    return links


# ---------------- Subida de imágenes ----------------
def save_image(raw: bytes) -> dict:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Máximo {settings.max_upload_mb} MB")
    try:
        image = Image.open(BytesIO(raw))
        if image.format not in ALLOWED_IMAGE_FORMATS:
            raise ValueError
        image.load()
    except (UnidentifiedImageError, ValueError, OSError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solo se permiten imágenes JPG, PNG o WebP")

    image = image.convert("RGBA") if image.mode in ("RGBA", "LA", "P") else image.convert("RGB")
    image.thumbnail((2400, 2400))
    name = f"{uuid.uuid4().hex}.webp"
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    image.save(settings.uploads_dir / name, "WEBP", quality=82)
    return {"url": f"/uploads/{name}", "width": image.width, "height": image.height}


# ---------------- Mensajes ----------------
def list_messages(
    db: Session, unread_only: bool = False, page: int = 1, page_size: int = 20
) -> tuple[list[Message], int, int, int]:
    """Devuelve (filas, total, página, tamaño) con el mismo recorte que REST."""

    page, page_size = max(page, 1), min(max(page_size, 1), 100)
    filters = [Message.read.is_(False)] if unread_only else []
    total = db.scalar(select(func.count()).select_from(Message).where(*filters)) or 0
    rows = db.scalars(
        select(Message)
        .where(*filters)
        .order_by(Message.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    ).all()
    return list(rows), total, page, page_size


def mark_message_read(db: Session, message_id: int) -> None:
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mensaje no encontrado")
    message.read = True
    db.commit()


def delete_message(db: Session, message_id: int) -> None:
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mensaje no encontrado")
    db.delete(message)
    db.commit()


# ---------------- Contacto público ----------------
def create_contact_message(db: Session, ip: str, data: ContactIn) -> bool:
    """Guarda el mensaje. Devuelve False si era un bot (honeypot lleno)."""

    if data.website:
        return False
    if rate_limited(ip):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados envíos, inténtalo más tarde")
    db.add(Message(name=data.name.strip(), email=data.email, message=data.message.strip()))
    db.commit()
    return True


# ---------------- Payload de la landing ----------------
def landing_payload(db: Session) -> dict:
    """Mismo contrato camelCase que `GET /api/v1/public/landing`."""

    settings_row = db.get(SiteSettings, 1)
    about = db.get(About, 1)
    projects = db.scalars(
        select(Project).where(Project.published.is_(True)).order_by(Project.position, Project.id)
    ).all()
    groups = db.scalars(select(SkillGroup).order_by(SkillGroup.position, SkillGroup.id)).all()
    links = db.scalars(
        select(SocialLink).where(SocialLink.visible.is_(True)).order_by(SocialLink.position, SocialLink.id)
    ).all()

    return {
        "settings": {
            "seoTitle": settings_row.seo_title,
            "metaDescription": settings_row.meta_description,
            "logoUrl": settings_row.logo_url,
            "faviconUrl": settings_row.favicon_url,
            "latitude": settings_row.latitude,
            "longitude": settings_row.longitude,
            "frameText": settings_row.frame_text,
            "availability": settings_row.availability,
            "heroTitle": settings_row.hero_title,
            "heroSubtitle": settings_row.hero_subtitle,
            "heroHook": settings_row.hero_hook,
            "ctaPrimary": settings_row.cta_primary,
            "ctaSecondary": settings_row.cta_secondary,
            "contactTitle": settings_row.contact_title,
            "contactText": settings_row.contact_text,
            "contactEmail": settings_row.contact_email,
        } if settings_row else {},
        "about": {
            "paragraphs": about.paragraphs,
            "contentHtml": sanitize_rich_html(about.content_html),
            "contentColumns": about.content_columns or 1,
            "contentAlign": about.content_align or "left",
            "photo": {"url": about.photo_url, "alt": about.photo_alt},
        } if about else {
            "paragraphs": [], "contentHtml": "", "contentColumns": 1,
            "contentAlign": "left", "photo": {"url": "", "alt": ""},
        },
        "projects": [
            {
                "slug": p.slug, "title": p.title, "dateLabel": p.date_label, "role": p.role,
                "description": sanitize_rich_html(p.description),
                "descriptionColumns": p.description_columns or 1,
                "descriptionAlign": p.description_align or "left",
                "image": {"url": p.image_url, "alt": p.image_alt},
                "repoUrl": p.repo_url, "demoUrl": p.demo_url, "tags": p.tags, "featured": p.featured,
            }
            for p in projects
        ],
        "skillGroups": [{"name": g.name, "skills": [k.name for k in g.skills]} for g in groups],
        "socialLinks": [{"platform": l.platform, "url": l.url} for l in links],
    }
