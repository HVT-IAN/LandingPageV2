from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, StringConstraints

Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)]


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    id: int
    email: str
    model_config = {"from_attributes": True}


# ---------- Contacto ----------
class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=4000)
    website: str = ""  # honeypot


# ---------- Settings ----------
class SettingsData(BaseModel):
    seo_title: str = Field(default="", max_length=160)
    meta_description: str = Field(default="", max_length=320)
    logo_url: str = ""
    favicon_url: str = ""
    latitude: str = ""
    longitude: str = ""
    frame_text: str = ""
    availability: str = ""
    hero_title: str = ""
    hero_subtitle: str = ""
    hero_hook: str = ""
    cta_primary: str = ""
    cta_secondary: str = ""
    contact_title: str = ""
    contact_text: str = ""
    contact_email: str = ""
    model_config = {"from_attributes": True}


# ---------- Sobre mí ----------
class AboutData(BaseModel):
    paragraphs: list[str] = []
    photo_url: str = ""
    photo_alt: str = ""
    model_config = {"from_attributes": True}


# ---------- Proyectos ----------
class ProjectBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    date_label: str = ""
    role: str = ""
    description: str = ""
    image_url: str = ""
    image_alt: str = ""
    repo_url: str = ""
    demo_url: str = ""
    tags: list[str] = []
    featured: bool = False
    published: bool = True


class ProjectCreate(ProjectBase):
    slug: Slug


class ProjectUpdate(BaseModel):
    slug: Slug | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    date_label: str | None = None
    role: str | None = None
    description: str | None = None
    image_url: str | None = None
    image_alt: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    tags: list[str] | None = None
    featured: bool | None = None
    published: bool | None = None


class ProjectOut(ProjectBase):
    id: int
    slug: str
    position: int
    model_config = {"from_attributes": True}


class OrderIn(BaseModel):
    ids: list[int]


# ---------- Tecnologías ----------
class SkillGroupData(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    skills: list[str] = []


class SkillsData(BaseModel):
    groups: list[SkillGroupData]


# ---------- Redes ----------
class SocialLinkData(BaseModel):
    platform: str = Field(pattern=r"^[a-z0-9_-]{2,40}$")
    url: str = Field(min_length=1, max_length=500)
    visible: bool = True


class SocialLinksData(BaseModel):
    links: list[SocialLinkData]


# ---------- Mensajes ----------
class MessageOut(BaseModel):
    id: int
    name: str
    email: str
    message: str
    read: bool
    created_at: str

    @classmethod
    def from_model(cls, m):
        return cls(id=m.id, name=m.name, email=m.email, message=m.message,
                   read=m.read, created_at=m.created_at.isoformat())
