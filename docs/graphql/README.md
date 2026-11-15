# API GraphQL del CMS

Endpoint único: **`POST /graphql`**. La API REST sigue viva en `/api/v1` como capa de
compatibilidad (la landing la usa hasta que se migre en una tarea aparte).

- SDL versionada: [`schema.graphql`](./schema.graphql). Consúmela con `graphql-codegen` en el panel.
- En desarrollo (y en cualquier entorno con `ENVIRONMENT` distinto de `production`) `/graphql`
  sirve **GraphiQL** al abrir la URL en el navegador.
- La sesión es la misma cookie `cms_session` (HttpOnly, SameSite=Lax) de REST. No hay bearer
  tokens ni JWT en `localStorage`.

## Decisiones de esta entrega

| # | Decisión | Resultado |
|---|---|---|
| D1 | ¿GraphQL reemplaza `/public/*`? | **No en esta ronda.** `/public/landing` y `/public/contact` siguen funcionando; `publicLanding` y `submitContact` son equivalentes para el panel. Migrar `script.js` queda para una tarea aparte. |
| D2 | Librería | **Strawberry** (`strawberry-graphql[fastapi]`), tipado + `Upload`. |
| D3 | Upload | **GraphQL multipart spec** con `uploadImage(file: Upload!)`. `POST /api/v1/admin/upload` sigue vivo como compatibilidad. |
| D6 | `total` en mensajes | **Sí.** `MessagePage { items, total, page, pageSize }`. |

## Códigos de error (`extensions.code`)

| Código | Equivalente REST | Cuándo |
|---|---|---|
| `BAD_USER_INPUT` | 400 | Validación (slug, longitudes, plataforma, reorder incompleto, imagen inválida). |
| `UNAUTHENTICATED` | 401 | Sin cookie válida o credenciales incorrectas. |
| `NOT_FOUND` | 404 | Proyecto o mensaje inexistente. |
| `CONFLICT` | 409 | Slug duplicado. |
| `PAYLOAD_TOO_LARGE` | 413 | Imagen de más de 5 MB. |
| `TOO_MANY_REQUESTS` | 429 | Más de 3 contactos por hora desde la misma IP. |

Los mensajes van en español. Los errores de validación incluyen `extensions.details`
(`[{ field, message }]`) para que el panel pueda marcar campos.

## Queries

```graphql
# Público
query { health { status } }

query {
  publicLanding {
    settings { heroTitle contactEmail }
    about { paragraphs contentHtml contentColumns contentAlign photo { url alt } }
    projects { slug title dateLabel role description descriptionColumns descriptionAlign image { url alt } repoUrl demoUrl tags featured }
    skillGroups { name skills }
    socialLinks { platform url }
  }
}

# Con sesión
query { me { id email } }
query { settings { seoTitle metaDescription contactEmail } }
query { about { paragraphs contentHtml contentColumns contentAlign photoUrl photoAlt } }
query { projects { id slug title position published featured tags } }
query { skills { groups { name skills } } }
query { socialLinks { platform url visible } }
query { messages(unreadOnly: false, page: 1, pageSize: 20) { total page pageSize items { id name email message read createdAt } } }
```

`page` mínimo 1 y `pageSize` 1..100. Igual que REST, los valores fuera de rango se recortan
y la respuesta devuelve la página y el tamaño efectivos.

## Mutations

```graphql
mutation { login(email: "admin@example.com", password: "…") { id email } }
mutation { logout }

mutation { updateSettings(input: { seoTitle: "Ian | Frontend", contactEmail: "hola@ejemplo.com" }) {
  seoTitle metaDescription contactEmail } }

mutation { updateAbout(input: {
  paragraphs: ["Uno", "Dos"]
  contentHtml: "<p>Texto <strong>rico</strong></p>"
  contentColumns: 2
  contentAlign: "justify"
  photoUrl: "/uploads/foto.webp"
  photoAlt: "Ian"
}) { paragraphs contentHtml contentColumns contentAlign photoUrl photoAlt } }

mutation { createProject(input: { slug: "mi-proyecto", title: "Mi proyecto", tags: ["HTML"] }) {
  id slug position published } }

mutation { updateProject(id: 3, input: { published: false }) { id published } }
mutation { deleteProject(id: 3) }
mutation { reorderProjects(ids: [3, 1, 2]) { id position } }

mutation { replaceSkills(groups: [{ name: "Frontend", skills: ["HTML", "CSS"] }]) {
  groups { name skills } } }

mutation { replaceSocialLinks(links: [{ platform: "github", url: "https://github.com/…", visible: true }]) {
  platform url visible } }

mutation { markMessageRead(id: 1) }
mutation { deleteMessage(id: 1) }

mutation { submitContact(input: { name: "Ana", email: "ana@ejemplo.com", message: "Hola", website: "" }) {
  ok } }
```

### `updateSettings` es parcial

Solo se modifica lo que se envía; los campos omitidos conservan su valor (igual que
`PUT /api/v1/admin/settings`). Enviar `null` explícito es un error de validación.

### `updateAbout` es reemplazo total

Mismos defaults y normalizaciones que `PUT /api/v1/admin/about`: `paragraphs` se recorta y
descarta vacíos, `contentHtml` se sanitiza con `nh3`, `contentColumns` acepta 1/2/3 y
`contentAlign` acepta `left`/`justify` (cualquier otro valor cae a `1`/`left`).

### Reemplazos totales

`replaceSkills` y `replaceSocialLinks` borran y recrean la lista completa, igual que sus
equivalentes REST. No hay mutaciones de alta/baja individual.

### `reorderProjects`

Debe incluir **todos** los ids existentes; si falta uno devuelve `BAD_USER_INPUT`.

## Subida de imágenes

`uploadImage` usa el [multipart spec de GraphQL](https://github.com/jaydenseric/graphql-multipart-request-spec):

```bash
curl -b cookies.txt http://localhost:8000/graphql \
  -F operations='{"query":"mutation ($file: Upload!) { uploadImage(file: $file) { url width height } }","variables":{"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@foto.png
```

Límites y comportamiento son los de REST: JPG/PNG/WebP, máximo 5 MB, se valida con Pillow,
se redimensiona a 2400 px, se guarda como WebP (calidad 82) y la URL devuelta es relativa
(`/uploads/…`). En Render el disco es efímero: no prometas persistencia.

## Ejemplo con curl (sesión por cookie)

```bash
# 1. Login: guarda cms_session
curl -c cookies.txt http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(email: \"admin@example.com\", password: \"…\") { id email } }"}'

# 2. Query autenticada
curl -b cookies.txt http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ projects { id slug title } }"}'
```

En el panel: `fetch("/graphql", { method: "POST", credentials: "include", … })` o el proxy de
Vite hacia `http://127.0.0.1:8000` para mantener el mismo origen.

## Equivalencia REST → GraphQL

| REST | GraphQL |
|---|---|
| `GET /api/v1/health` | `query { health { status } }` |
| `GET /api/v1/public/landing` | `query { publicLanding { … } }` |
| `POST /api/v1/public/contact` | `mutation { submitContact(input: …) { ok } }` |
| `POST /api/v1/auth/login` | `mutation { login(email, password) { id email } }` |
| `POST /api/v1/auth/logout` | `mutation { logout }` |
| `GET /api/v1/auth/me` | `query { me { id email } }` |
| `GET /api/v1/admin/settings` | `query { settings { … } }` |
| `PUT /api/v1/admin/settings` | `mutation { updateSettings(input: …) { … } }` |
| `GET /api/v1/admin/about` | `query { about { … } }` |
| `PUT /api/v1/admin/about` | `mutation { updateAbout(input: …) { … } }` |
| `GET /api/v1/admin/projects` | `query { projects { … } }` |
| `POST /api/v1/admin/projects` | `mutation { createProject(input: …) { … } }` |
| `PUT /api/v1/admin/projects/order` | `mutation { reorderProjects(ids: …) { … } }` |
| `PATCH /api/v1/admin/projects/{id}` | `mutation { updateProject(id, input) { … } }` |
| `DELETE /api/v1/admin/projects/{id}` | `mutation { deleteProject(id) }` |
| `GET /api/v1/admin/skills` | `query { skills { groups { name skills } } }` |
| `PUT /api/v1/admin/skills` | `mutation { replaceSkills(groups: …) { … } }` |
| `GET /api/v1/admin/social-links` | `query { socialLinks { platform url visible } }` |
| `PUT /api/v1/admin/social-links` | `mutation { replaceSocialLinks(links: …) { … } }` |
| `POST /api/v1/admin/upload` | `mutation { uploadImage(file: Upload!) { url width height } }` |
| `GET /api/v1/admin/messages` | `query { messages(…) { items total page pageSize } }` |
| `PATCH /api/v1/admin/messages/{id}/read` | `mutation { markMessageRead(id) }` |
| `DELETE /api/v1/admin/messages/{id}` | `mutation { deleteMessage(id) }` |

## Notas de implementación

- La lógica vive en `app/content_service.py`; **REST y GraphQL llaman a las mismas funciones**
  (`sanitize_rich_html`, `rate_limited`, `send_contact_email`, esquemas Pydantic). No hay dos
  verdades.
- `app/graphql/errors.py` traduce `HTTPException` y `ValidationError` a `extensions.code`.
- El `Date`/hora de `Message.createdAt` es ISO 8601 (`datetime.isoformat()`), igual que REST.
- GraphiQL se desactiva cuando `ENVIRONMENT=production`.
