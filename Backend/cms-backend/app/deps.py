from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import COOKIE_NAME, decode_token


def current_user(
    cms_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_token(cms_session) if cms_session else None
    user = db.get(User, user_id) if user_id else None
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sin sesión")
    return user
