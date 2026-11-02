import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import current_user
from ..models import About, Message, Project, SiteSettings, Skill, SkillGroup, SocialLink
from ..schemas import (AboutData, MessageOut, OrderIn, ProjectCreate, ProjectOut, ProjectUpdate,
                       SettingsData, SkillGroupData, SkillsData, SocialLinkData, SocialLinksData)

# Todas las rutas de este router exigen sesión
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_user)])


# ---------------- Settings ----------------
@router.get("/settings", response_model=SettingsData)
def get_settings(db: Session = Depends(get_db)):
    return db.get(SiteSettings, 1)


@router.put("/settings", response_model=SettingsData)
def put_settings(data: SettingsData, db: Session = Depends(get_db)):
    row = db.get(SiteSettings, 1)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    return row


# ---------------- Sobre mí ----------------
@router.get("/about", response_model=AboutData)
def get_about(db: Session = Depends(get_db)):
    return db.get(About, 1)


@router.put("/about", response_model=AboutData)
def put_about(data: AboutData, db: Session = Depends(get_db)):
    row = db.get(About, 1)
    row.paragraphs = [p.strip() for p in data.paragraphs if p.strip()]
    row.photo_url = data.photo_url
    row.photo_alt = data.photo_alt
    db.commit()
    return row


# ---------------- Proyectos ----------------
@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.scalars(select(Project).order_by(Project.position, Project.id)).all()


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    last = db.scalar(select(func.max(Project.position))) or 0
    project = Project(**data.model_dump(), position=last + 1)
    db.add(project)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proyecto con ese slug")
    return project


# IMPORTANTE: /projects/order va ANTES de /projects/{project_id}
@router.put("/projects/order", status_code=status.HTTP_204_NO_CONTENT)
def reorder_projects(data: OrderIn, db: Session = Depends(get_db)):
    projects = {p.id: p for p in db.scalars(select(Project)).all()}
    if set(data.ids) != set(projects):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La lista debe contener todos los proyectos")
    for pos, pid in enumerate(data.ids, start=1):
        projects[pid].position = pos
    db.commit()


@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(project, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proyecto con ese slug")
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    db.delete(project)
    db.commit()


# ---------------- Tecnologías (lista completa) ----------------
def _skills_out(db: Session) -> SkillsData:
    groups = db.scalars(select(SkillGroup).order_by(SkillGroup.position, SkillGroup.id)).all()
    return SkillsData(groups=[SkillGroupData(name=g.name, skills=[s.name for s in g.skills]) for g in groups])


@router.get("/skills", response_model=SkillsData)
def get_skills(db: Session = Depends(get_db)):
    return _skills_out(db)


@router.put("/skills", response_model=SkillsData)
def put_skills(data: SkillsData, db: Session = Depends(get_db)):
    for g in db.scalars(select(SkillGroup)).all():
        db.delete(g)  # cascade borra sus skills
    db.flush()
    for gi, g in enumerate(data.groups):
        group = SkillGroup(name=g.name, position=gi)
        group.skills = [Skill(name=n.strip(), position=si) for si, n in enumerate(g.skills) if n.strip()]
        db.add(group)
    db.commit()
    return _skills_out(db)


# ---------------- Redes (lista completa) ----------------
@router.get("/social-links", response_model=SocialLinksData)
def get_links(db: Session = Depends(get_db)):
    rows = db.scalars(select(SocialLink).order_by(SocialLink.position, SocialLink.id)).all()
    return SocialLinksData(links=[SocialLinkData(platform=r.platform, url=r.url, visible=r.visible) for r in rows])


@router.put("/social-links", response_model=SocialLinksData)
def put_links(data: SocialLinksData, db: Session = Depends(get_db)):
    for r in db.scalars(select(SocialLink)).all():
        db.delete(r)
    db.flush()
    for i, l in enumerate(data.links):
        db.add(SocialLink(platform=l.platform, url=l.url, visible=l.visible, position=i))
    db.commit()
    return data


# ---------------- Subida de imágenes ----------------
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload(file: UploadFile = File(...)):
    max_bytes = settings.max_upload_mb * 1024 * 1024
    raw = await file.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Máximo {settings.max_upload_mb} MB")
    try:
        img = Image.open(BytesIO(raw))
        if img.format not in ALLOWED_FORMATS:
            raise ValueError
        img.load()
    except (UnidentifiedImageError, ValueError, OSError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solo se permiten imágenes JPG, PNG o WebP")

    img = img.convert("RGBA") if img.mode in ("RGBA", "LA", "P") else img.convert("RGB")
    img.thumbnail((2400, 2400))
    name = f"{uuid.uuid4().hex}.webp"
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    img.save(settings.uploads_dir / name, "WEBP", quality=82)
    return {"url": f"/uploads/{name}", "width": img.width, "height": img.height}


# ---------------- Mensajes ----------------
@router.get("/messages", response_model=list[MessageOut])
def list_messages(unread_only: bool = False, page: int = 1, page_size: int = 20,
                  db: Session = Depends(get_db)):
    q = select(Message).order_by(Message.created_at.desc())
    if unread_only:
        q = q.where(Message.read.is_(False))
    page, page_size = max(page, 1), min(max(page_size, 1), 100)
    rows = db.scalars(q.limit(page_size).offset((page - 1) * page_size)).all()
    return [MessageOut.from_model(m) for m in rows]


@router.patch("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(message_id: int, db: Session = Depends(get_db)):
    m = db.get(Message, message_id)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mensaje no encontrado")
    m.read = True
    db.commit()


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(message_id: int, db: Session = Depends(get_db)):
    m = db.get(Message, message_id)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mensaje no encontrado")
    db.delete(m)
    db.commit()
