# Panel de Administración — Landing CMS (`admin-front`)

SPA de administración del portafolio de **Ian Oscani**, construida con **Vite + React 18 + TypeScript** y conectada exclusivamente a **`POST /graphql`** mediante la cookie de sesión `cms_session` (`HttpOnly`, `SameSite=Lax`).

Reemplaza por completo a SQLAdmin y se sirve desde el mismo origen que FastAPI en **`/admin`** (`Backend/cms-backend/admin-dist/`).

---

## 1. Estructura

```text
Backend/cms-backend/
  admin-front/                # Código fuente del panel (Vite + React + TS)
    codegen.ts                # Configuración de GraphQL Code Generator contra docs/graphql/schema.graphql
    vite.config.ts            # base: "/admin/", build.outDir: "../admin-dist", proxy /graphql y /uploads
    src/
      api/
        client.ts             # Cliente POST /graphql + uploadImage multipart con XMLHttpRequest y progreso
        operations.ts         # Queries y Mutations GraphQL
      components/
        ConfirmDialog.tsx     # Modal accesible de confirmación antes de borrar
        ImageUploader.tsx     # Subida reutilizable (valida JPG/PNG/WebP y <= 5 MB, barra de progreso XHR, resolución de URL)
        RichTextEditor.tsx    # Editor enriquecido TinyMCE 6 (npm self-hosted) compatible con sanitización nh3
      generated/
        graphql.ts            # Tipos TypeScript generados automáticamente con npm run codegen
      views/
        LoginView.tsx         # Inicio de sesión (mutation login)
        ProjectsView.tsx      # CRUD de proyectos, drag & drop + teclado (reorderProjects), columnas 1/2, alineación
        AboutView.tsx         # Sobre mí (reemplazo total conservando paragraphs, columnas 1/2/3, alineación, foto)
        SettingsView.tsx      # Configuración global (16 campos, updateSettings parcial enviando solo diffs)
        SkillsView.tsx        # Grupos de tecnologías y skills (reemplazo total y orden)
        SocialLinksView.tsx   # Redes sociales con visibilidad y orden (reemplazo total)
        MessagesView.tsx      # Bandeja paginada, filtro de no leídos, marcar leído y eliminar
      App.tsx                 # Layout principal, ruteo con soporte de deep links (/admin/projects/3) y badge de no leídos
  admin-dist/                 # Build estático compilado servido por FastAPI en /admin
```

---

## 2. Instalar dependencias

Requisitos: **Node.js 18+** y **npm 9+**.

```powershell
cd Backend/cms-backend/admin-front
npm install
```

### Generar tipos desde el SDL (`graphql-codegen`)

Cada vez que cambie `docs/graphql/schema.graphql` o las operaciones en `src/api/operations.ts`, regenera los tipos TypeScript:

```powershell
cd Backend/cms-backend/admin-front
npm run codegen
```

Esto actualiza `src/generated/graphql.ts`.

---

## 3. Desarrollar en local

1. Levanta el backend FastAPI en el puerto `8000`:

   ```powershell
   cd Backend/cms-backend
   ..\.venv\Scripts\Activate.ps1
   python -m app.seed
   uvicorn app.main:app --reload --port 8000
   ```

2. En otra terminal, inicia el servidor de desarrollo de Vite:

   ```powershell
   cd Backend/cms-backend/admin-front
   npm run dev
   ```

3. Abre `http://localhost:5173/admin/`.
   - El servidor de Vite redirige automáticamente `/graphql` y `/uploads` hacia `http://127.0.0.1:8000`, manteniendo la cookie `cms_session` en el mismo origen sin necesidad de modificar `ALLOWED_ORIGINS` ni relajar CORS.

---

## 4. Compilar para producción

```powershell
cd Backend/cms-backend/admin-front
npm run codegen
npm run build
```

- El build ejecuta `tsc -b && vite build`.
- La salida se escribe directamente en `Backend/cms-backend/admin-dist/` (`emptyOutDir: true`) con `base: "/admin/"`.

---

## 5. Desplegar (FastAPI + Render)

FastAPI monta `settings.admin_dist_dir` (`Backend/cms-backend/admin-dist/`) en `/admin` dentro de `Backend/cms-backend/app/main.py` **antes** de `/uploads` y del `StaticFiles` de `/`:

- Cualquier archivo estático existente en `admin-dist/` (como `/admin/assets/...`) se sirve directamente.
- Cualquier ruta o deep link del cliente bajo `/admin` (por ejemplo, `/admin`, `/admin/projects/3`, `/admin/messages`) responde con `admin-dist/index.html` (SPA fallback), permitiendo recargar la página o compartir enlaces profundos sin 404.

### Pasos para actualizar el despliegue

1. Compila el panel con `npm run build` desde `Backend/cms-backend/admin-front` (o agrega el paso de build en el pipeline de despliegue).
2. Verifica que `Backend/cms-backend/admin-dist/index.html` exista.
3. Arranca el backend con `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. En producción (`ENVIRONMENT=production`, `COOKIE_SECURE=true`), el panel y la API GraphQL comparten el mismo dominio en Render.

---

## 6. Decisiones de diseño y contrato (D4–D8, D10)

- **D4 (Framework):** Vite + React 18 + TypeScript sin frameworks CSS pesados; hoja de estilos propia (`src/styles.css`) inspirada en la estética editorial/técnica de la landing.
- **D5 (Editor enriquecido):** TinyMCE 6 (`tinymce@6.8.5` npm self-hosted) con la misma barra, bloques (`p`, `h2`, `h3`, `h4`), tipografías (`Montserrat`, `Poppins`, etc.) y estilos que sanitiza `nh3` en el backend.
- **D6 (Paginación y badge de mensajes):** Usa `MessagePage { items, total, page, pageSize }` y consulta `messages(unreadOnly: true, page: 1, pageSize: 1).total` para el contador de no leídos en la barra lateral.
- **D7 (Ruta final del panel):** Servido en `/admin` con SPA fallback hacia `admin-dist/index.html`.
- **D8 (Codegen):** `@graphql-codegen/cli` + `typescript` + `typescript-operations` contra `docs/graphql/schema.graphql` mediante `npm run codegen`.
- **D10 (Retiro de SQLAdmin):** Eliminados `app/admin_panel.py`, `app/fields.py`, `templates/sqladmin/`, y retirados `sqladmin` e `itsdangerous` de `requirements.txt` tras verificar con `grep` que ningún módulo los utiliza.
