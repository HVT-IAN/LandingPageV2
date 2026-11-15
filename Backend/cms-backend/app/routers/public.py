from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from sqlalchemy.orm import Session

from .. import content_service
from ..database import get_db
from ..schemas import ContactIn
from ..services import send_contact_email

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/landing")
def landing(db: Session = Depends(get_db)):
    return content_service.landing_payload(db)


@router.post("/contact", status_code=status.HTTP_202_ACCEPTED)
def contact(
    data: ContactIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Honeypot: si un bot llenó el campo, respondemos OK sin guardar nada
    ip = request.client.host if request.client else "unknown"
    if content_service.create_contact_message(db, ip, data):
        background.add_task(send_contact_email, data.name, data.email, data.message)
    return {"ok": True}
