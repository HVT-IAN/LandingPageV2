from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from .. import content_service
from ..database import get_db
from ..deps import current_user
from ..models import User
from ..schemas import LoginIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(data: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = content_service.authenticate(db, data.email, data.password)
    content_service.set_session_cookie(response, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    content_service.clear_session_cookie(response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
