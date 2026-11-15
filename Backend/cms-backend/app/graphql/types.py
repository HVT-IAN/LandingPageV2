"""Tipos de salida del esquema GraphQL.

Los nombres Python van en snake_case y Strawberry los publica en camelCase
(`seo_title` -> `seoTitle`), como pide el contrato de interfaz.
"""

from __future__ import annotations

import strawberry

from ..models import About as AboutModel
from ..models import Message as MessageModel
from ..models import Project as ProjectModel
from ..models import SiteSettings as SiteSettingsModel
from ..schemas import SkillGroupData, SkillsData


@strawberry.type
class Health:
    status: str


@strawberry.type(name="User")
class UserType:
    id: int
    email: str


@strawberry.type
class Photo:
    url: str
    alt: str


# ---------------- Configuración del sitio ----------------
@strawberry.type
class SiteSettings:
    seo_title: str
    meta_description: str
    logo_url: str
    favicon_url: str
    latitude: str
    longitude: str
    frame_text: str
    availability: str
    hero_title: str
    hero_subtitle: str
    hero_hook: str
    cta_primary: str
    cta_secondary: str
    contact_title: str
    contact_text: str
    contact_email: str

    @classmethod
    def from_model(cls, row: SiteSettingsModel) -> "SiteSettings":
        return cls(
            seo_title=row.seo_title,
            meta_description=row.meta_description,
            logo_url=row.logo_url,
            favicon_url=row.favicon_url,
            latitude=row.latitude,
            longitude=row.longitude,
            frame_text=row.frame_text,
            availability=row.availability,
            hero_title=row.hero_title,
            hero_subtitle=row.hero_subtitle,
            hero_hook=row.hero_hook,
            cta_primary=row.cta_primary,
            cta_secondary=row.cta_secondary,
            contact_title=row.contact_title,
            contact_text=row.contact_text,
            contact_email=row.contact_email,
        )

    @classmethod
    def from_payload(cls, data: dict) -> "SiteSettings":
        return cls(
            seo_title=data.get("seoTitle", ""),
            meta_description=data.get("metaDescription", ""),
            logo_url=data.get("logoUrl", ""),
            favicon_url=data.get("faviconUrl", ""),
            latitude=data.get("latitude", ""),
            longitude=data.get("longitude", ""),
            frame_text=data.get("frameText", ""),
            availability=data.get("availability", ""),
            hero_title=data.get("heroTitle", ""),
            hero_subtitle=data.get("heroSubtitle", ""),
            hero_hook=data.get("heroHook", ""),
            cta_primary=data.get("ctaPrimary", ""),
            cta_secondary=data.get("ctaSecondary", ""),
            contact_title=data.get("contactTitle", ""),
            contact_text=data.get("contactText", ""),
            contact_email=data.get("contactEmail", ""),
        )


# ---------------- Sobre mí (admin) ----------------
@strawberry.type
class About:
    paragraphs: list[str]
    content_html: str
    content_columns: int
    content_align: str
    photo_url: str
    photo_alt: str

    @classmethod
    def from_model(cls, row: AboutModel) -> "About":
        return cls(
            paragraphs=list(row.paragraphs or []),
            content_html=row.content_html or "",
            content_columns=row.content_columns or 1,
            content_align=row.content_align or "left",
            photo_url=row.photo_url,
            photo_alt=row.photo_alt,
        )


# ---------------- Proyectos (admin) ----------------
@strawberry.type
class Project:
    id: int
    slug: str
    title: str
    date_label: str
    role: str
    description: str
    description_columns: int
    description_align: str
    image_url: str
    image_alt: str
    repo_url: str
    demo_url: str
    tags: list[str]
    featured: bool
    published: bool
    position: int

    @classmethod
    def from_model(cls, row: ProjectModel) -> "Project":
        return cls(
            id=row.id,
            slug=row.slug,
            title=row.title,
            date_label=row.date_label,
            role=row.role,
            description=row.description,
            description_columns=row.description_columns or 1,
            description_align=row.description_align or "left",
            image_url=row.image_url,
            image_alt=row.image_alt,
            repo_url=row.repo_url,
            demo_url=row.demo_url,
            tags=list(row.tags or []),
            featured=row.featured,
            published=row.published,
            position=row.position,
        )


# ---------------- Tecnologías ----------------
@strawberry.type
class SkillGroup:
    name: str
    skills: list[str]

    @classmethod
    def from_data(cls, data: SkillGroupData) -> "SkillGroup":
        return cls(name=data.name, skills=list(data.skills))


@strawberry.type
class Skills:
    groups: list[SkillGroup]

    @classmethod
    def from_data(cls, data: SkillsData) -> "Skills":
        return cls(groups=[SkillGroup.from_data(g) for g in data.groups])


# ---------------- Redes sociales (admin) ----------------
@strawberry.type
class SocialLink:
    platform: str
    url: str
    visible: bool


# ---------------- Mensajes ----------------
@strawberry.type
class Message:
    id: int
    name: str
    email: str
    message: str
    read: bool
    created_at: str

    @classmethod
    def from_model(cls, row: MessageModel) -> "Message":
        return cls(
            id=row.id,
            name=row.name,
            email=row.email,
            message=row.message,
            read=row.read,
            created_at=row.created_at.isoformat(),
        )


@strawberry.type
class MessagePage:
    items: list[Message]
    total: int
    page: int
    page_size: int


# ---------------- Subida de imágenes ----------------
@strawberry.type
class UploadResult:
    url: str
    width: int
    height: int


# ---------------- Contacto ----------------
@strawberry.type
class ContactResult:
    ok: bool


# ---------------- Landing pública ----------------
@strawberry.type
class LandingAbout:
    paragraphs: list[str]
    content_html: str
    content_columns: int
    content_align: str
    photo: Photo

    @classmethod
    def from_payload(cls, data: dict) -> "LandingAbout":
        return cls(
            paragraphs=list(data.get("paragraphs") or []),
            content_html=data.get("contentHtml", ""),
            content_columns=data.get("contentColumns") or 1,
            content_align=data.get("contentAlign") or "left",
            photo=Photo(
                url=(data.get("photo") or {}).get("url", ""),
                alt=(data.get("photo") or {}).get("alt", ""),
            ),
        )


@strawberry.type
class LandingProject:
    slug: str
    title: str
    date_label: str
    role: str
    description: str
    description_columns: int
    description_align: str
    image: Photo
    repo_url: str
    demo_url: str
    tags: list[str]
    featured: bool

    @classmethod
    def from_payload(cls, data: dict) -> "LandingProject":
        return cls(
            slug=data.get("slug", ""),
            title=data.get("title", ""),
            date_label=data.get("dateLabel", ""),
            role=data.get("role", ""),
            description=data.get("description", ""),
            description_columns=data.get("descriptionColumns") or 1,
            description_align=data.get("descriptionAlign") or "left",
            image=Photo(
                url=(data.get("image") or {}).get("url", ""),
                alt=(data.get("image") or {}).get("alt", ""),
            ),
            repo_url=data.get("repoUrl", ""),
            demo_url=data.get("demoUrl", ""),
            tags=list(data.get("tags") or []),
            featured=bool(data.get("featured")),
        )


@strawberry.type
class LandingSocialLink:
    platform: str
    url: str


@strawberry.type
class Landing:
    settings: SiteSettings | None
    about: LandingAbout
    projects: list[LandingProject]
    skill_groups: list[SkillGroup]
    social_links: list[LandingSocialLink]

    @classmethod
    def from_payload(cls, payload: dict) -> "Landing":
        settings_data = payload.get("settings") or {}
        return cls(
            settings=SiteSettings.from_payload(settings_data) if settings_data else None,
            about=LandingAbout.from_payload(payload.get("about") or {}),
            projects=[LandingProject.from_payload(p) for p in payload.get("projects") or []],
            skill_groups=[
                SkillGroup(name=g.get("name", ""), skills=list(g.get("skills") or []))
                for g in payload.get("skillGroups") or []
            ],
            social_links=[
                LandingSocialLink(platform=l.get("platform", ""), url=l.get("url", ""))
                for l in payload.get("socialLinks") or []
            ],
        )
