"""Contexto de Strawberry: sesión de base de datos y usuario de la cookie."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session
from strawberry.fastapi import BaseContext

from ..database import get_db
from ..models import User
from ..security import COOKIE_NAME, decode_token
from .errors import UNAUTHENTICATED, graphql_error


class GraphQLContext(BaseContext):
    """`BaseContext` ya expone request, response y background_tasks."""

    def __init__(self, db: Session) -> None:
        super().__init__()
        self.db = db
        self._user: User | None = None
        self._user_resolved = False

    def current_user(self) -> User | None:
        if not self._user_resolved:
            self._user_resolved = True
            cookies = getattr(self.request, "cookies", None) or {}
            token = cookies.get(COOKIE_NAME)
            user_id = decode_token(token) if token else None
            user = self.db.get(User, user_id) if user_id else None
            self._user = user if user and user.active else None
        return self._user

    def require_user(self) -> User:
        user = self.current_user()
        if user is None:
            raise graphql_error("Sin sesión", UNAUTHENTICATED)
        return user


async def get_context(db: Session = Depends(get_db)) -> GraphQLContext:
    return GraphQLContext(db=db)
