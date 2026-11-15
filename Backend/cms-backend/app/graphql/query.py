"""Queries GraphQL: mismas lecturas que la API REST."""

from __future__ import annotations

import strawberry
from strawberry.types import Info

from .. import content_service
from .context import GraphQLContext
from .errors import NOT_FOUND, graphql_error, run
from .types import (About, Health, Landing, Message, MessagePage, Project, SiteSettings, Skills,
                    SocialLink, UserType)


def _require_user(info: Info[GraphQLContext]):
    return info.context.require_user()


@strawberry.type
class Query:
    @strawberry.field(description="Estado del servicio. Ruta permanente usada por Render.")
    def health(self) -> Health:
        return Health(status="ok")

    @strawberry.field(description="Contenido público de la landing (equivalente a GET /public/landing).")
    def public_landing(self, info: Info[GraphQLContext]) -> Landing:
        return Landing.from_payload(run(content_service.landing_payload, info.context.db))

    @strawberry.field(description="Usuario de la sesión actual. Requiere cookie cms_session.")
    def me(self, info: Info[GraphQLContext]) -> UserType:
        user = _require_user(info)
        return UserType(id=user.id, email=user.email)

    @strawberry.field
    def settings(self, info: Info[GraphQLContext]) -> SiteSettings:
        _require_user(info)
        row = content_service.get_settings_row(info.context.db)
        if row is None:
            raise graphql_error("Configuración no encontrada", NOT_FOUND)
        return SiteSettings.from_model(row)

    @strawberry.field
    def about(self, info: Info[GraphQLContext]) -> About:
        _require_user(info)
        row = content_service.get_about_row(info.context.db)
        if row is None:
            raise graphql_error("Sobre mí no encontrado", NOT_FOUND)
        return About.from_model(row)

    @strawberry.field
    def projects(self, info: Info[GraphQLContext]) -> list[Project]:
        _require_user(info)
        return [Project.from_model(p) for p in content_service.list_projects(info.context.db)]

    @strawberry.field
    def skills(self, info: Info[GraphQLContext]) -> Skills:
        _require_user(info)
        return Skills.from_data(content_service.skills_payload(info.context.db))

    @strawberry.field
    def social_links(self, info: Info[GraphQLContext]) -> list[SocialLink]:
        _require_user(info)
        return [
            SocialLink(platform=link.platform, url=link.url, visible=link.visible)
            for link in content_service.social_links_payload(info.context.db)
        ]

    @strawberry.field(description="Mensajes paginados, más recientes primero.")
    def messages(
        self,
        info: Info[GraphQLContext],
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> MessagePage:
        _require_user(info)
        rows, total, page, page_size = content_service.list_messages(
            info.context.db, unread_only, page, page_size
        )
        return MessagePage(
            items=[Message.from_model(row) for row in rows],
            total=total,
            page=page,
            page_size=page_size,
        )
