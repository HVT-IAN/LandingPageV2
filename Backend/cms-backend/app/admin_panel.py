"""Panel de administración con SQLAdmin.

Se monta en /admin y usa la misma tabla `users` del backend REST.
El login acepta el email como "usuario" y la contraseña almacenada con argon2.
"""

from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy import select
from starlette.requests import Request

from .config import settings
from .database import SessionLocal, engine
from .models import About, Message, Project, SiteSettings, Skill, SkillGroup, SocialLink, User
from .security import verify_password


class AdminAuth(AuthenticationBackend):
    """Login del panel usando los usuarios existentes del CMS."""

    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = str(form.get("username", "")).strip().lower()
        password = str(form.get("password", ""))

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == email))
            if user and user.active and verify_password(password, user.password_hash):
                request.session.update({"user_id": user.id, "email": user.email})
                return True

        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        user_id = request.session.get("user_id")
        if not user_id:
            return False

        with SessionLocal() as db:
            user = db.get(User, user_id)
            return bool(user and user.active)


class ProjectAdmin(ModelView, model=Project):
    name = "Proyecto"
    name_plural = "Proyectos"
    icon = "fa-solid fa-diagram-project"
    column_list = ["id", "title", "slug", "published", "featured", "position"]
    column_searchable_list = ["title", "slug"]
    column_sortable_list = ["position", "title", "published"]
    form_columns = [
        "slug",
        "title",
        "date_label",
        "role",
        "description",
        "image_url",
        "image_alt",
        "repo_url",
        "demo_url",
        "tags",
        "featured",
        "published",
        "position",
    ]
    column_labels = {
        "date_label": "Fecha",
        "role": "Rol",
        "image_url": "Imagen (URL)",
        "image_alt": "Texto alternativo",
        "repo_url": "Repositorio",
        "demo_url": "Demo",
        "tags": "Tags (JSON)",
        "featured": "Destacado",
        "published": "Publicado",
        "position": "Orden",
    }


class SkillGroupAdmin(ModelView, model=SkillGroup):
    name = "Grupo de tecnologías"
    name_plural = "Grupos de tecnologías"
    icon = "fa-solid fa-layer-group"
    column_list = ["id", "name", "position"]
    column_sortable_list = ["position", "name"]
    form_columns = ["name", "position"]
    column_labels = {"position": "Orden"}


class SkillAdmin(ModelView, model=Skill):
    name = "Tecnología"
    name_plural = "Tecnologías"
    icon = "fa-solid fa-code"
    column_list = ["id", "name", "group", "position"]
    column_sortable_list = ["position", "name"]
    form_columns = ["name", "group", "position"]
    column_labels = {"group": "Grupo", "position": "Orden"}


class SocialLinkAdmin(ModelView, model=SocialLink):
    name = "Red social"
    name_plural = "Redes sociales"
    icon = "fa-solid fa-share-nodes"
    column_list = ["id", "platform", "url", "visible", "position"]
    column_sortable_list = ["position", "platform"]
    form_columns = ["platform", "url", "visible", "position"]
    column_labels = {"visible": "Visible", "position": "Orden"}


class SiteSettingsAdmin(ModelView, model=SiteSettings):
    name = "Configuración"
    name_plural = "Configuración"
    icon = "fa-solid fa-gear"
    can_create = False
    can_delete = False
    column_list = ["id", "seo_title", "hero_title", "availability", "contact_email"]
    form_columns = [
        "seo_title",
        "meta_description",
        "logo_url",
        "favicon_url",
        "latitude",
        "longitude",
        "frame_text",
        "availability",
        "hero_title",
        "hero_subtitle",
        "hero_hook",
        "cta_primary",
        "cta_secondary",
        "contact_title",
        "contact_text",
        "contact_email",
    ]
    column_labels = {
        "seo_title": "Título SEO",
        "meta_description": "Meta description",
        "logo_url": "Logo (URL)",
        "favicon_url": "Favicon (URL)",
        "frame_text": "Texto del marco",
        "hero_title": "Título del hero",
        "hero_subtitle": "Subtítulo",
        "hero_hook": "Gancho",
        "cta_primary": "Botón principal",
        "cta_secondary": "Botón secundario",
        "contact_title": "Título de contacto",
        "contact_text": "Texto de contacto",
        "contact_email": "Email de contacto",
    }


class AboutAdmin(ModelView, model=About):
    name = "Sobre mí"
    name_plural = "Sobre mí"
    icon = "fa-solid fa-user"
    can_create = False
    can_delete = False
    column_list = ["id", "photo_url", "photo_alt"]
    form_columns = ["paragraphs", "photo_url", "photo_alt"]
    column_labels = {
        "paragraphs": "Párrafos (JSON)",
        "photo_url": "Foto (URL)",
        "photo_alt": "Texto alternativo",
    }


class MessageAdmin(ModelView, model=Message):
    name = "Mensaje"
    name_plural = "Mensajes"
    icon = "fa-solid fa-envelope"
    can_create = False
    can_edit = True
    can_delete = True
    column_list = ["id", "name", "email", "message", "read", "created_at"]
    column_sortable_list = ["created_at", "read"]
    column_default_sort = [("created_at", True)]
    form_columns = ["read"]
    column_labels = {
        "name": "Nombre",
        "email": "Correo",
        "message": "Mensaje",
        "read": "Leído",
        "created_at": "Recibido",
    }


def setup_admin(app) -> Admin:
    """Monta SQLAdmin en /admin. Llamar antes de montar la landing en /."""

    authentication_backend = AdminAuth(
        secret_key=settings.secret_key,
        https_only=settings.cookie_secure,
        same_site="lax",
    )

    admin = Admin(
        app,
        engine,
        title="CMS · Ian Oscani",
        base_url="/admin",
        authentication_backend=authentication_backend,
    )

    admin.add_view(ProjectAdmin)
    admin.add_view(SkillGroupAdmin)
    admin.add_view(SkillAdmin)
    admin.add_view(SocialLinkAdmin)
    admin.add_view(SiteSettingsAdmin)
    admin.add_view(AboutAdmin)
    admin.add_view(MessageAdmin)

    return admin
