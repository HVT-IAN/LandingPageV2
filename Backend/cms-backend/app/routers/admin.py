from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from .. import content_service
from ..config import settings
from ..database import get_db
from ..deps import current_user
from ..schemas import (AboutData, MessageOut, OrderIn, ProjectCreate, ProjectOut, ProjectUpdate,
                       SettingsData, SkillsData, SocialLinksData)

# Todas las rutas de este router exigen sesión
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_user)])


# ---------------- Settings ----------------
@router.get("/settings", response_model=SettingsData)
def get_settings(db: Session = Depends(get_db)):
    return content_service.get_settings_row(db)


@router.put("/settings", response_model=SettingsData)
def put_settings(data: SettingsData, db: Session = Depends(get_db)):
    return content_service.update_settings(db, data)


# ---------------- Sobre mí ----------------
@router.get("/about", response_model=AboutData)
def get_about(db: Session = Depends(get_db)):
    return content_service.get_about_row(db)


@router.put("/about", response_model=AboutData)
def put_about(data: AboutData, db: Session = Depends(get_db)):
    return content_service.update_about(db, data)


# ---------------- Proyectos ----------------
@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return content_service.list_projects(db)


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    return content_service.create_project(db, data)


# IMPORTANTE: /projects/order va ANTES de /projects/{project_id}
@router.put("/projects/order", status_code=status.HTTP_204_NO_CONTENT)
def reorder_projects(data: OrderIn, db: Session = Depends(get_db)):
    content_service.reorder_projects(db, data.ids)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    return content_service.update_project(db, project_id, data)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    content_service.delete_project(db, project_id)


# ---------------- Tecnologías (lista completa) ----------------
@router.get("/skills", response_model=SkillsData)
def get_skills(db: Session = Depends(get_db)):
    return content_service.skills_payload(db)


@router.put("/skills", response_model=SkillsData)
def put_skills(data: SkillsData, db: Session = Depends(get_db)):
    return content_service.replace_skills(db, data)


# ---------------- Redes (lista completa) ----------------
@router.get("/social-links", response_model=SocialLinksData)
def get_links(db: Session = Depends(get_db)):
    return SocialLinksData(links=content_service.social_links_payload(db))


@router.put("/social-links", response_model=SocialLinksData)
def put_links(data: SocialLinksData, db: Session = Depends(get_db)):
    return SocialLinksData(links=content_service.replace_social_links(db, data.links))


# ---------------- Subida de imágenes ----------------
@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload(file: UploadFile = File(...)):
    max_bytes = settings.max_upload_mb * 1024 * 1024
    raw = await file.read(max_bytes + 1)
    return content_service.save_image(raw)


# ---------------- Mensajes ----------------
@router.get("/messages", response_model=list[MessageOut])
def list_messages(unread_only: bool = False, page: int = 1, page_size: int = 20,
                  db: Session = Depends(get_db)):
    rows, _total, _page, _page_size = content_service.list_messages(db, unread_only, page, page_size)
    return [MessageOut.from_model(m) for m in rows]


@router.patch("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(message_id: int, db: Session = Depends(get_db)):
    content_service.mark_message_read(db, message_id)


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(message_id: int, db: Session = Depends(get_db)):
    content_service.delete_message(db, message_id)
