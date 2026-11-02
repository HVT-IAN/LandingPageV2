from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import About, Message, Project, SiteSettings, SkillGroup, SocialLink
from ..schemas import ContactIn
from ..services import rate_limited, send_contact_email

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/landing")
def landing(db: Session = Depends(get_db)):
    s = db.get(SiteSettings, 1)
    a = db.get(About, 1)
    projects = db.scalars(
        select(Project).where(Project.published.is_(True)).order_by(Project.position, Project.id)
    ).all()
    groups = db.scalars(select(SkillGroup).order_by(SkillGroup.position, SkillGroup.id)).all()
    links = db.scalars(
        select(SocialLink).where(SocialLink.visible.is_(True)).order_by(SocialLink.position, SocialLink.id)
    ).all()

    return {
        "settings": {
            "seoTitle": s.seo_title, "metaDescription": s.meta_description,
            "logoUrl": s.logo_url, "faviconUrl": s.favicon_url,
            "latitude": s.latitude, "longitude": s.longitude, "frameText": s.frame_text,
            "availability": s.availability, "heroTitle": s.hero_title,
            "heroSubtitle": s.hero_subtitle, "heroHook": s.hero_hook,
            "ctaPrimary": s.cta_primary, "ctaSecondary": s.cta_secondary,
            "contactTitle": s.contact_title, "contactText": s.contact_text,
            "contactEmail": s.contact_email,
        } if s else {},
        "about": {
            "paragraphs": a.paragraphs, "photo": {"url": a.photo_url, "alt": a.photo_alt},
        } if a else {"paragraphs": [], "photo": {"url": "", "alt": ""}},
        "projects": [
            {
                "slug": p.slug, "title": p.title, "dateLabel": p.date_label, "role": p.role,
                "description": p.description, "image": {"url": p.image_url, "alt": p.image_alt},
                "repoUrl": p.repo_url, "demoUrl": p.demo_url, "tags": p.tags, "featured": p.featured,
            }
            for p in projects
        ],
        "skillGroups": [{"name": g.name, "skills": [k.name for k in g.skills]} for g in groups],
        "socialLinks": [{"platform": l.platform, "url": l.url} for l in links],
    }


@router.post("/contact", status_code=status.HTTP_202_ACCEPTED)
def contact(
    data: ContactIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Honeypot: si un bot llenó el campo, respondemos OK sin guardar nada
    if data.website:
        return {"ok": True}

    ip = request.client.host if request.client else "unknown"
    if rate_limited(ip):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados envíos, inténtalo más tarde")

    db.add(Message(name=data.name.strip(), email=data.email, message=data.message.strip()))
    db.commit()
    background.add_task(send_contact_email, data.name, data.email, data.message)
    return {"ok": True}
