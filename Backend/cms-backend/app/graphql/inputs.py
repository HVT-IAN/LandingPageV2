"""Tipos de entrada del esquema GraphQL y su conversión a los esquemas Pydantic.

La validación sigue siendo la de `app/schemas.py`: GraphQL no relaja ni
duplica reglas, solo traduce camelCase -> snake_case.
"""

from __future__ import annotations

from dataclasses import fields as dataclass_fields

import strawberry
from strawberry import UNSET

from ..schemas import (AboutData, ContactIn, ProjectCreate, ProjectUpdate, SettingsData,
                       SkillGroupData, SkillsData, SocialLinkData)


def provided(value) -> dict:
    """Campos realmente enviados (descarta UNSET, conserva null y listas vacías)."""

    return {
        field.name: getattr(value, field.name)
        for field in dataclass_fields(value)
        if getattr(value, field.name) is not UNSET
    }


@strawberry.input
class SettingsInput:
    """Actualización parcial: solo se modifica lo enviado (como PUT en REST)."""

    seo_title: str | None = UNSET
    meta_description: str | None = UNSET
    logo_url: str | None = UNSET
    favicon_url: str | None = UNSET
    latitude: str | None = UNSET
    longitude: str | None = UNSET
    frame_text: str | None = UNSET
    availability: str | None = UNSET
    hero_title: str | None = UNSET
    hero_subtitle: str | None = UNSET
    hero_hook: str | None = UNSET
    cta_primary: str | None = UNSET
    cta_secondary: str | None = UNSET
    contact_title: str | None = UNSET
    contact_text: str | None = UNSET
    contact_email: str | None = UNSET


@strawberry.input
class AboutInput:
    """Reemplazo completo (mismos defaults y normalizaciones que REST)."""

    paragraphs: list[str] = strawberry.field(default_factory=list)
    content_html: str = ""
    content_columns: int = 1
    content_align: str = "left"
    photo_url: str = ""
    photo_alt: str = ""


@strawberry.input
class ProjectCreateInput:
    slug: str
    title: str
    date_label: str = ""
    role: str = ""
    description: str = ""
    description_columns: int = 1
    description_align: str = "left"
    image_url: str = ""
    image_alt: str = ""
    repo_url: str = ""
    demo_url: str = ""
    tags: list[str] = strawberry.field(default_factory=list)
    featured: bool = False
    published: bool = True


@strawberry.input
class ProjectUpdateInput:
    slug: str | None = UNSET
    title: str | None = UNSET
    date_label: str | None = UNSET
    role: str | None = UNSET
    description: str | None = UNSET
    description_columns: int | None = UNSET
    description_align: str | None = UNSET
    image_url: str | None = UNSET
    image_alt: str | None = UNSET
    repo_url: str | None = UNSET
    demo_url: str | None = UNSET
    tags: list[str] | None = UNSET
    featured: bool | None = UNSET
    published: bool | None = UNSET


@strawberry.input
class SkillGroupInput:
    name: str
    skills: list[str] = strawberry.field(default_factory=list)


@strawberry.input
class SocialLinkInput:
    platform: str
    url: str
    visible: bool = True


@strawberry.input
class ContactInput:
    name: str
    email: str
    message: str
    website: str = ""  # honeypot


# ---------------- Conversión a Pydantic (una sola validación) ----------------
def settings_data(value: SettingsInput) -> SettingsData:
    return SettingsData(**provided(value))


def about_data(value: AboutInput) -> AboutData:
    return AboutData(**provided(value))


def project_create(value: ProjectCreateInput) -> ProjectCreate:
    return ProjectCreate(**provided(value))


def project_update(value: ProjectUpdateInput) -> ProjectUpdate:
    return ProjectUpdate(**provided(value))


def skills_data(groups: list[SkillGroupInput]) -> SkillsData:
    return SkillsData(
        groups=[
            SkillGroupData(name=group.name, skills=list(group.skills))
            for group in groups
        ]
    )


def social_links_data(links: list[SocialLinkInput]) -> list[SocialLinkData]:
    return [
        SocialLinkData(platform=link.platform, url=link.url, visible=link.visible)
        for link in links
    ]


def contact_data(value: ContactInput) -> ContactIn:
    return ContactIn(**provided(value))
