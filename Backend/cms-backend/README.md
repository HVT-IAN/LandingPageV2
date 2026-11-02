# Landing CMS – Backend (FastAPI)

API para administrar el contenido de la landing. No toca el HTML, CSS, 3D ni las 4 secciones
(`#inicio`, `#panel-proyectos`, `#panel-informacion`, `#panel-contacto`).

## Arranque rápido

```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # edita SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
python -m app.seed                                    # carga contenido inicial (edita app/seed.py antes)
uvicorn app.main:app --reload
```

- Documentación interactiva: http://localhost:8000/docs
- Pruebas: `pytest`

## Endpoints (prefijo `/api/v1`)

| Método | Ruta | Sesión |
|---|---|---|
| GET | `/health` | no |
| GET | `/public/landing` | no |
| POST | `/public/contact` (202; honeypot `website`; 3/hora por IP) | no |
| POST | `/auth/login` · `/auth/logout` · GET `/auth/me` | — |
| GET, PUT | `/admin/settings` | sí |
| GET, PUT | `/admin/about` | sí |
| GET, POST | `/admin/projects` | sí |
| PUT | `/admin/projects/order` (body `{"ids":[...]}`) | sí |
| PATCH, DELETE | `/admin/projects/{id}` | sí |
| GET, PUT | `/admin/skills` (lista completa) | sí |
| GET, PUT | `/admin/social-links` (lista completa) | sí |
| POST | `/admin/upload` (JPG/PNG/WebP, 5 MB, se convierte a WebP) | sí |
| GET | `/admin/messages` (`?unread_only=&page=&page_size=`) | sí |
| PATCH | `/admin/messages/{id}/read` | sí |
| DELETE | `/admin/messages/{id}` | sí |

Errores: 400 datos inválidos · 401 sin sesión · 404 no existe · 409 slug duplicado · 413 archivo grande · 429 límite.

## Estructura

```
app/
  main.py        arranque, montaje de rutas y estáticos
  config.py      variables de entorno
  models.py      tablas SQLAlchemy
  schemas.py     validación Pydantic
  security.py    argon2 + JWT
  deps.py        dependencia de sesión
  services.py    límite de envíos y correo
  seed.py        contenido inicial
  routers/       public.py · auth.py · admin.py
tests/test_api.py
```

## Producción (un solo servidor)

Copia tu landing a `landing/` y el panel compilado a `admin-dist/`: FastAPI sirve `/`, `/admin`,
`/uploads` y `/api/v1` en el mismo dominio (sin CORS). Pon `COOKIE_SECURE=true` y una `SECRET_KEY` larga.
Para PostgreSQL cambia `DATABASE_URL` (`postgresql+psycopg://...`) e instala `psycopg[binary]`.

## Despliegue: GitHub Pages + Render + Neon

La landing vive en GitHub Pages; la API y el panel en Render; la base de datos en Neon.

1. Crear una base de datos en Neon y copiar la connection string
   (`postgresql://...`). El script la adapta sola al driver `psycopg`.
2. Migrar el contenido local (settings, about, proyectos, skills, redes y mensajes).
   Pega la URL en `Backend/cms-backend/.env` como `TARGET_DATABASE_URL=...` y ejecuta:

   ```bash
   python scripts/migrate_to_postgres.py
   ```

   También puedes pasarla directamente con `--target "postgresql://..."`.
   No copia usuarios: el admin se crea con `ADMIN_EMAIL`/`ADMIN_PASSWORD` al arrancar.
3. En Render, crear un **Web Service** desde el repositorio:
   - Root Directory: `Backend/cms-backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check: `/api/v1/health`
   - Variables: `DATABASE_URL`, `SECRET_KEY`, `COOKIE_SECURE=true`,
     `ADMIN_EMAIL`, `ADMIN_PASSWORD` y
     `ALLOWED_ORIGINS=https://TU-USUARIO.github.io`

   También puedes usar el `render.yaml` de la raíz del repositorio (Blueprint).
4. En `JavaScript/script.js`, cambiar `API_PRODUCCION` por la URL pública de Render.
5. En GitHub: **Settings → Pages → Source: GitHub Actions**. El workflow
   `.github/workflows/pages.yml` publica solo la landing (no el backend).
6. Probar `/api/v1/health`, `/api/v1/public/landing`, `/admin` y el formulario.

> El disco de Render es efímero: `/admin/upload` no persiste entre reinicios.
> Usa URLs externas (o Cloudinary) hasta integrar almacenamiento persistente.

## Integración con la landing

En `script.js`: `fetch("/api/v1/public/landing")`, renderiza con `textContent` (no `innerHTML`),
y conserva el HTML actual como respaldo si la petición falla. Formulario de contacto:
`POST /api/v1/public/contact` con `{name, email, message, website: ""}` (campo `website` oculto).

## Pendiente / no incluido

- Panel admin en React (esta entrega es solo el backend).
- Cambio de contraseña: se hace por script o directamente en la base.
- Migraciones (Alembic): `create_all` basta para empezar.
