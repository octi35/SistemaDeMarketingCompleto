# API externa de AdTeam AI

Esta API permite que **otro sistema** (tu CRM, tu funnel de infoproductos, Zapier/Make/n8n, o una app propia) publique contenido y lea datos de AdTeam AI.

## Autenticación

1. Define una o más claves en el servidor (archivo `.env.local` o variable de entorno):

   ```env
   EXTERNAL_API_KEYS="clave_super_secreta_de_16+_caracteres,otra_clave_opcional"
   ```

2. Envía la clave en cada petición con la cabecera `X-Api-Key`:

   ```bash
   curl -H "X-Api-Key: clave_super_secreta_de_16+_caracteres" https://tu-app.com/api/ext/posts
   ```

Sin `EXTERNAL_API_KEYS` configurada, los endpoints `/api/ext/*` responden `503` (la API queda deshabilitada).

## Endpoints

### `POST /api/ext/publish-all` — publicar en todas las redes

Publica (o programa) el mismo contenido en Instagram, Facebook y LinkedIn en una sola llamada. Cada red se resuelve de forma independiente: si una falla, las demás siguen.

```bash
curl -X POST https://tu-app.com/api/ext/publish-all \
  -H "X-Api-Key: TU_CLAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Texto para todas las redes",
    "captions": { "linkedin": "Versión B2B del texto (opcional)" },
    "imageUrls": ["https://tu-app.com/uploads/img_123.png"],
    "networks": {
      "instagram": { "igAccountId": "1784...", "token": "EAAB..." },
      "facebook":  { "pageId": "1029...",    "token": "EAAB..." },
      "linkedin":  { "token": "AQV..." }
    },
    "publishAt": "2026-07-10T14:00:00Z"
  }'
```

- `caption`: texto común; `captions.{red}` lo sobreescribe por red.
- `imageUrls`: URLs **públicas HTTPS** (Instagram lo exige; 2–10 imágenes = carrusel en IG).
- `videoUrl` (opcional, excluye a `imageUrls`): publica **video** — Reel en Instagram (espera el procesamiento, ~15-60s) y video de página en Facebook; LinkedIn se omite.
- `networks.instagram.firstComment` (opcional): se publica como **primer comentario** del post de IG (práctica típica: los hashtags).
- `publishAt` (opcional): si viene, en vez de publicar crea posts programados (el scheduler del servidor los publica solo; los tokens se guardan cifrados).
- Respuesta inmediata: `{ mode: "published", ok, results: { instagram: { ok, postId | error }, ... } }` (HTTP 207 si alguna red falló).
- Respuesta programada: `{ mode: "scheduled", scheduled: [{network, id}], skipped: [...] }`.

### Endpoints de lectura

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/api/ext/posts` | Historial de posts publicados |
| GET | `/api/ext/scheduled` | Cola de publicaciones programadas (sin tokens) |
| GET | `/api/ext/calendar` | Plan de contenido de 30 días |
| GET | `/api/ext/metrics` | Resumen de métricas históricas (likes/comentarios/engagement) |
| GET | `/api/ext/assets` | Biblioteca de imágenes de marca (URLs públicas) |

## Webhooks salientes (AdTeam → tu sistema)

Se administran desde la app (**Integración Nube → Webhooks**) o por API:

- `GET /api/webhooks` — lista suscripciones.
- `POST /api/webhooks` — body: `{ "url": "https://...", "events": ["post.published"], "secret": "opcional" }` (sin `events` = todos).
- `DELETE /api/webhooks/:id`
- `POST /api/webhooks/test` — envía un evento de prueba a todos los suscriptores.

### Eventos

| Evento | Cuándo | Payload (`data`) |
| --- | --- | --- |
| `post.published` | Se publicó un post (manual, 1-click o programado) | `{ network, postId, caption }` |
| `post.failed` | Falló una publicación programada | `{ scheduledId, network, label, error }` |
| `asset.created` | Se generó una imagen de marca | `{ id, url, concept }` |

### Formato de entrega

`POST` a tu URL con JSON:

```json
{ "event": "post.published", "at": "2026-07-03T18:00:00.000Z", "data": { "network": "instagram", "postId": "1784...", "caption": "..." } }
```

Cabeceras: `X-AdTeam-Event` (nombre del evento) y, si configuraste `secret`, `X-AdTeam-Signature` = HMAC-SHA256 hex del body con tu secreto — verifícala así (Node):

```js
const ok = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex") === req.headers["x-adteam-signature"];
```

La entrega corre en segundo plano con timeout de 8s y **hasta 3 intentos** (esperas de 5s y 30s) ante errores de red, respuestas 5xx o 429. Las respuestas 4xx no se reintentan (se asume payload rechazado). Si tu endpoint estuvo caído más tiempo, consulta `/api/ext/posts` para re-sincronizar.
