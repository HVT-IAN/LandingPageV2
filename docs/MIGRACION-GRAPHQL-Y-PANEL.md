# Migración a GraphQL y nuevo panel de administración

**Fecha:** noviembre de 2026

**Rama:** `feat/graphql-api`

**Base:** `main` (`43525b9`)

Este documento resume el cambio que sustituye la administración basada en SQLAdmin por una API GraphQL y un panel propio en React, manteniendo viva la API REST pública que consume la landing.

## 1. Resumen

| Área | Antes | Ahora |
|---|---|---|
| API del CMS | REST `/api/v1/*` | REST intacto + `POST /graphql` |
| Panel | SQLAdmin en `/admin` | SPA React/TypeScript en `/admin` |
| Sesión | Cookie `cms_session` + sesión de SQLAdmin | Solo cookie `cms_session` (JWT HttpOnly) |
| Editor rico | SQLAdmin + TinyMCE embebido | React + TinyMCE 6 self-hosted |
| Lógica de negocio | Repartida en routers | Centralizada en `app/content_service.py` |
| Landing | Consume REST | Sin cambios de contrato; sigue consumiendo REST |

La API REST pública se conserva para no romper la landing ya desplegada. GraphQL es la API que usa el nuevo panel.

## 2. Backend

### Archivos principales

- `app/graphql/`: esquema Strawberry, queries, mutations, tipos, inputs, contexto y errores.
- `app/content_service.py`: reglas de negocio compartidas por REST y GraphQL.
- `app/sanitize.py` y `app/migrations.py`: sanitización con `nh3` y migraciones aditivas.
- `app/main.py`: monta `/graphql` y `/admin` antes de los estáticos.
- `requirements.txt`: añade `strawberry-graphql[fastapi]`; retira `sqladmin`, `wtforms` e `itsdangerous`.

### Endpoint GraphQL

- Un único endpoint: `POST /graphql`.
- Nombres en `camelCase`, IDs `Int`, fechas ISO 8601.
- Autenticación con la misma cookie `cms_session` (`HttpOnly`, `SameSite=Lax`, `Secure` con `COOKIE_SECURE=true`).
- Sin sesión: error `UNAUTHENTICATED`.
- Errores en `extensions.code`: `BAD_USER_INPUT`, `UNAUTHENTICATED`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `TOO_MANY_REQUESTS`.
- Subida de imágenes con el estándar multipart de GraphQL (`uploadImage(file: Upload!)`), devolviendo una URL relativa `/uploads/...`.

El contrato completo está en [`docs/graphql/README.md`](graphql/README.md) y el SDL versionado en [`docs/graphql/schema.graphql`](graphql/schema.graphql).

### Operaciones disponibles

**Query:** `health`, `publicLanding`, `me`, `settings`, `about`, `projects`, `skills`, `socialLinks`, `messages(unreadOnly, page, pageSize)`.

**Mutation:** `login`, `logout`, `updateSettings`, `updateAbout`, `createProject`, `updateProject`, `deleteProject`, `reorderProjects`, `replaceSkills`, `replaceSocialLinks`, `markMessageRead`, `deleteMessage`, `uploadImage`, `submitContact`.

### Reglas que el panel debe respetar

- `updateAbout` es reemplazo total: hay que reenviar `paragraphs`.
- `updateSettings` es parcial: solo se envían los campos modificados.
- `reorderProjects` exige **todos** los IDs.
- `messages.pageSize` se limita a 1..100 y devuelve `total`.
- El HTML se sanitiza en el backend; el panel no debe confiar en HTML externo.

## 3. Panel de administración

Ruta: `Backend/cms-backend/admin-front/`

Build: `Backend/cms-backend/admin-dist/` (versionado para que Render no necesite Node).

- Vite + React 18 + TypeScript.
- `base: "/admin/"` y proxy de desarrollo para `/graphql` y `/uploads`.
- Tipos generados con `graphql-codegen` desde el SDL.
- TinyMCE 6 instalado por npm, sin CDN.
- Pantallas: login, proyectos, sobre mí, configuración, tecnologías, redes sociales y mensajes.
- Estados de carga, vacío, error y sin sesión; confirmación al borrar; feedback al guardar.
- Subida de imágenes con progreso mediante `XMLHttpRequest` y multipart GraphQL.

El detalle de instalación y desarrollo está en [`docs/admin-front/README.md`](admin-front/README.md).

## 4. Landing

La landing sigue consumiendo la API REST pública (`/api/v1/public/landing` y `/api/v1/public/contact`). No se modificó su contrato ni su estrategia de caché/fallback.

Los cambios incluidos en `index.html`, `Css/` y `JavaScript/` corresponden al editor de contenido enriquecido y a los ajustes visuales que acompañan la migración. GitHub Pages sigue publicando únicamente la landing mediante `.github/workflows/pages.yml`.

## 5. Despliegue

Arquitectura vigente:

- **Landing:** GitHub Pages.
- **API + panel:** Render, desde `main`, usando `render.yaml`.
- **Base de datos:** Neon PostgreSQL en producción; SQLite en local.

### Variables de entorno relevantes

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Connection string de Neon |
| `SECRET_KEY` | Valor largo y aleatorio |
| `COOKIE_SECURE` | `true` en producción |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales del administrador |
| `ALLOWED_ORIGINS` | `https://TU-USUARIO.github.io` |
| `ENVIRONMENT` | `production` |

`ENVIRONMENT=production` desactiva GraphiQL; el endpoint GraphQL sigue disponible para el panel.

### Notas

- Render instala solo Python: el panel ya viene compilado en `admin-dist/`.
- El panel y la API comparten origen en Render, así que la cookie funciona sin CORS.
- No hay que cambiar `API_PRODUCCION` en `JavaScript/script.js` si se conserva el servicio actual de Render.
- El disco de Render es efímero: las imágenes subidas a `/uploads` no persisten entre reinicios o despliegues.

## 6. Verificación

Comandos ejecutados:

```powershell
cd Backend/cms-backend
..\.venv\Scripts\python.exe -m pytest -q

cd admin-front
npm run codegen
npm run build
```

Resultados:

- `pytest -q`: **20 passed**.
- `npm run codegen`: correcto.
- `npm run build`: correcto, salida en `../admin-dist`.
- Arranque real con SQLite temporal:
  - `/admin` y `/admin/projects/3` responden la SPA (fallback incluido).
  - Login, `me`, logout y cookie `cms_session`.
  - CRUD de proyecto, reordenamiento y borrado.
  - `uploadImage` multipart y descarga de `/uploads/...`.
  - `/api/v1/health`, `/api/v1/public/landing` y `/graphql` responden.
- Prueba visual en navegador:
  - Login, listado de proyectos, edición con TinyMCE y guardado.
  - Bandeja de mensajes y badge de no leídos.
  - Landing con contenido real desde la API y envío del formulario de contacto; el mensaje aparece en el CMS.
- `grep` de `sqladmin`, `wtforms` e `itsdangerous` en `app/` y `requirements.txt`: sin coincidencias.

## 7. Limitaciones y riesgos

- **Uploads efímeros en Render:** si se necesita persistencia, integrar Cloudinary, S3 o R2.
- **Cold start de Render gratis:** la primera petición tras inactividad puede tardar.
- **Rate limit en memoria:** no se comparte entre workers ni sobrevive reinicios.
- **Sin Alembic:** las migraciones son aditivas e idempotentes; no renombrar ni eliminar columnas.
- **SQLAdmin retirado:** las URLs antiguas del panel de SQLAdmin dejan de existir; el acceso pasa por `/admin`.

## 8. Rollback

El cambio está concentrado en un commit. Para volver al estado anterior:

```bash
git revert <commit>
```

Hay que tener en cuenta que el rollback restaura SQLAdmin y elimina el panel nuevo. La API REST pública no se ve afectada por el cambio, así que la landing seguiría funcionando.
