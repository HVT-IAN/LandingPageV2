from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class SiteSettings(Base):
    """Una sola fila (id=1)."""
    __tablename__ = "site_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    # Global
    seo_title: Mapped[str] = mapped_column(String(160), default="")
    meta_description: Mapped[str] = mapped_column(String(320), default="")
    logo_url: Mapped[str] = mapped_column(String(500), default="")
    favicon_url: Mapped[str] = mapped_column(String(500), default="")
    latitude: Mapped[str] = mapped_column(String(40), default="")
    longitude: Mapped[str] = mapped_column(String(40), default="")
    frame_text: Mapped[str] = mapped_column(String(200), default="")
    # Portada
    availability: Mapped[str] = mapped_column(String(120), default="")
    hero_title: Mapped[str] = mapped_column(String(200), default="")
    hero_subtitle: Mapped[str] = mapped_column(String(300), default="")
    hero_hook: Mapped[str] = mapped_column(String(300), default="")
    cta_primary: Mapped[str] = mapped_column(String(60), default="")
    cta_secondary: Mapped[str] = mapped_column(String(60), default="")
    # Contacto
    contact_title: Mapped[str] = mapped_column(String(200), default="")
    contact_text: Mapped[str] = mapped_column(Text, default="")
    contact_email: Mapped[str] = mapped_column(String(255), default="")


class About(Base):
    """Una sola fila (id=1)."""
    __tablename__ = "about"
    id: Mapped[int] = mapped_column(primary_key=True)
    paragraphs: Mapped[list] = mapped_column(JSON, default=list)
    photo_url: Mapped[str] = mapped_column(String(500), default="")
    photo_alt: Mapped[str] = mapped_column(String(200), default="")


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    date_label: Mapped[str] = mapped_column(String(60), default="")
    role: Mapped[str] = mapped_column(String(120), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    image_alt: Mapped[str] = mapped_column(String(200), default="")
    repo_url: Mapped[str] = mapped_column(String(500), default="")
    demo_url: Mapped[str] = mapped_column(String(500), default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)


class SkillGroup(Base):
    __tablename__ = "skill_groups"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    position: Mapped[int] = mapped_column(Integer, default=0)
    skills: Mapped[list["Skill"]] = relationship(
        back_populates="group", cascade="all, delete-orphan", order_by="Skill.position"
    )


class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("skill_groups.id"))
    name: Mapped[str] = mapped_column(String(80))
    position: Mapped[int] = mapped_column(Integer, default=0)
    group: Mapped[SkillGroup] = relationship(back_populates="skills")


class SocialLink(Base):
    __tablename__ = "social_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    platform: Mapped[str] = mapped_column(String(40))  # github, instagram, linkedin, email
    url: Mapped[str] = mapped_column(String(500))
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
