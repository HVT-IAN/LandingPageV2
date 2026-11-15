"""Mutations GraphQL: misma lógica de negocio y validación que la API REST."""

from __future__ import annotations

import strawberry
from strawberry.file_uploads import Upload
from strawberry.types import Info

from .. import content_service
from ..config import settings
from ..schemas import LoginIn
from ..services import send_contact_email
from . import inputs
from .context import GraphQLContext
from .errors import run
from .types import (About, ContactResult, Project, SiteSettings, Skills, SocialLink, UploadResult,
                    UserType)


def _require_user(info: Info[GraphQLContext]):
    return info.context.require_user()


@strawberry.type
class Mutation:
    # ---------------- Sesión ----------------
    @strawberry.mutation(description="Inicia sesión y guarda la cookie cms_session.")
    def login(self, info: Info[GraphQLContext], email: str, password: str) -> UserType:
        data = run(lambda: LoginIn(email=email, password=password))
        user = run(content_service.authenticate, info.context.db, data.email, data.password)
        content_service.set_session_cookie(info.context.response, user)
        return UserType(id=user.id, email=user.email)

    @strawberry.mutation(description="Borra la cookie de sesión.")
    def logout(self, info: Info[GraphQLContext]) -> bool:
        content_service.clear_session_cookie(info.context.response)
        return True

    # ---------------- Configuración ----------------
    @strawberry.mutation
    def update_settings(
        self, info: Info[GraphQLContext], input: inputs.SettingsInput
    ) -> SiteSettings:
        _require_user(info)
        data = run(inputs.settings_data, input)
        row = run(content_service.update_settings, info.context.db, data)
        return SiteSettings.from_model(row)

    @strawberry.mutation
    def update_about(self, info: Info[GraphQLContext], input: inputs.AboutInput) -> About:
        _require_user(info)
        data = run(inputs.about_data, input)
        row = run(content_service.update_about, info.context.db, data)
        return About.from_model(row)

    # ---------------- Proyectos ----------------
    @strawberry.mutation
    def create_project(
        self, info: Info[GraphQLContext], input: inputs.ProjectCreateInput
    ) -> Project:
        _require_user(info)
        data = run(inputs.project_create, input)
        row = run(content_service.create_project, info.context.db, data)
        return Project.from_model(row)

    @strawberry.mutation
    def update_project(
        self, info: Info[GraphQLContext], id: int, input: inputs.ProjectUpdateInput
    ) -> Project:
        _require_user(info)
        data = run(inputs.project_update, input)
        row = run(content_service.update_project, info.context.db, id, data)
        return Project.from_model(row)

    @strawberry.mutation
    def delete_project(self, info: Info[GraphQLContext], id: int) -> bool:
        _require_user(info)
        run(content_service.delete_project, info.context.db, id)
        return True

    @strawberry.mutation(description="Reordena; la lista debe contener todos los ids.")
    def reorder_projects(self, info: Info[GraphQLContext], ids: list[int]) -> list[Project]:
        _require_user(info)
        rows = run(content_service.reorder_projects, info.context.db, ids)
        return [Project.from_model(row) for row in rows]

    # ---------------- Tecnologías y redes (reemplazo total) ----------------
    @strawberry.mutation
    def replace_skills(
        self, info: Info[GraphQLContext], groups: list[inputs.SkillGroupInput]
    ) -> Skills:
        _require_user(info)
        data = run(inputs.skills_data, groups)
        result = run(content_service.replace_skills, info.context.db, data)
        return Skills.from_data(result)

    @strawberry.mutation
    def replace_social_links(
        self, info: Info[GraphQLContext], links: list[inputs.SocialLinkInput]
    ) -> list[SocialLink]:
        _require_user(info)
        data = run(inputs.social_links_data, links)
        result = run(content_service.replace_social_links, info.context.db, data)
        return [SocialLink(platform=l.platform, url=l.url, visible=l.visible) for l in result]

    # ---------------- Mensajes ----------------
    @strawberry.mutation
    def mark_message_read(self, info: Info[GraphQLContext], id: int) -> bool:
        _require_user(info)
        run(content_service.mark_message_read, info.context.db, id)
        return True

    @strawberry.mutation
    def delete_message(self, info: Info[GraphQLContext], id: int) -> bool:
        _require_user(info)
        run(content_service.delete_message, info.context.db, id)
        return True

    # ---------------- Subida de imágenes ----------------
    @strawberry.mutation(description="Sube JPG/PNG/WebP (máx. 5 MB) y devuelve la URL en WebP.")
    async def upload_image(self, info: Info[GraphQLContext], file: Upload) -> UploadResult:
        _require_user(info)
        max_bytes = settings.max_upload_mb * 1024 * 1024
        raw = await file.read(max_bytes + 1)
        result = run(content_service.save_image, raw)
        return UploadResult(url=result["url"], width=result["width"], height=result["height"])

    # ---------------- Contacto público ----------------
    @strawberry.mutation(description="Formulario público (honeypot y límite de 3/hora por IP).")
    def submit_contact(
        self, info: Info[GraphQLContext], input: inputs.ContactInput
    ) -> ContactResult:
        data = run(inputs.contact_data, input)
        context = info.context
        request = context.request
        ip = request.client.host if request is not None and request.client else "unknown"
        saved = run(content_service.create_contact_message, context.db, ip, data)
        if saved and context.background_tasks is not None:
            context.background_tasks.add_task(send_contact_email, data.name, data.email, data.message)
        return ContactResult(ok=True)
