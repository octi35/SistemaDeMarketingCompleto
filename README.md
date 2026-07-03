<div align="center">
<h1>🚀 ADTEAM.AI — Agencia de Marketing Autónoma con IA</h1>
<p>Suite full-stack (React + Express) con un equipo de 6 agentes de IA para crear creativos de Meta Ads, carruseles para Instagram/LinkedIn con imágenes reales generadas por <strong>Nano Banana 🍌</strong>, copys persuasivos, calendarios de contenido y analíticas.</p>
</div>

---

## ✨ Novedades (última actualización)

- **Publicación total con 1 click**: `POST /api/publish-all` publica (o programa) el mismo contenido en **Instagram + Facebook + LinkedIn a la vez**, cada red con su copy optimizado y resultado independiente. Botones en el Gestor de Contenido y en Carruseles.
- **Fábrica de imágenes de marca 🍌**: planifica y genera hasta **50 imágenes** coherentes con tu Brand Kit (Nano Banana estándar o Pro, con tu logo como referencia), con progreso en vivo, reintentos y **biblioteca persistente** lista para publicar.
- **Calendario por red**: filtro Instagram/Facebook/LinkedIn, **imagen adjunta por día** desde la biblioteca, y programación real de Instagram desde el calendario.
- **Tokens de larga duración**: el OAuth de Meta entrega tokens de ~60 días con **aviso de vencimiento** y renovación desde el panel.
- **API externa + webhooks**: otros sistemas pueden publicar y leer datos con API keys (`/api/ext/*`), y AdTeam avisa a tu CRM/Zapier/Make cuando se publica o falla un post. Ver **[API.md](./API.md)**.
- **Métricas de Facebook** además de Instagram, e **ideas/calendario guiados por tus datos reales** de engagement.

## ✨ Novedades anteriores

- **Carruseles a partir de un prompt + Nano Banana 🍌**: la IA (Gemini o Claude) escribe los slides y el modelo de imágenes de Gemini (*Nano Banana*, `gemini-2.5-flash-image`) genera la imagen de fondo real de cada diapositiva.
- **Nano Banana 2.0**: generación de imágenes **en paralelo** (3 a la vez), opción **Nano Banana Pro** (`gemini-3-pro-image`) e **imagen de referencia** (subes tu logo/producto y el modelo lo integra — image-to-image).
- **Estilo visual configurable** y regeneración por slide; **descarga ZIP real** de todo el carrusel (no PNGs sueltos).
- **Guardar / cargar carruseles**: persistencia en el servidor (`/api/projects`); recupera tus carruseles aunque cierres el navegador.
- **Publicación real a Meta/Instagram**: selector de Página de Facebook + cuenta de Instagram Business (usa `/api/meta/accounts` y el token de página).
- **Correo real (SMTP / Nodemailer)** desde el panel de Integraciones (Drive y Calendar siguen simulados — requieren OAuth de Google).
- **Seguridad**: OAuth con `state` aleatorio verificado (anti‑CSRF) y callbacks sin XSS; se eliminaron las API keys hardcodeadas del cliente.
- **Calidad**: ESLint + Prettier + tests (Vitest) + CI en GitHub Actions; notificaciones tipo *toast* en vez de `alert()`.
- **Modelos corregidos**: IDs reales de Gemini (`gemini-2.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`) con reintentos y fallback automático.

## 🔑 Configuración mínima (lo más simple posible)

Solo necesitas **una** clave para que funcione todo (carruseles, copys, calendarios e imágenes Nano Banana): tu **API Key de Google AI Studio (Gemini)**.

Hay dos formas de cargarla:

1. **Desde la app (recomendado, sin tocar archivos):**
   - Abre la pestaña **"Integración Nube"**.
   - Pega tu key de Gemini en el panel *IA Gemini API Key* y pulsa **Conectar Key**.
   - (Opcional) Pega tu key de Claude para usar el motor alternativo Claude 3.5 Haiku.
   - La clave se guarda **solo en tu navegador** (localStorage) y se envía por cabecera en cada petición. No se sube a ningún lado.

2. **Por variable de entorno (para despliegue):** crea un archivo `.env.local` en la raíz:
   ```env
   GEMINI_API_KEY="tu_api_key_de_gemini"
   # Opcional:
   ANTHROPIC_API_KEY="tu_api_key_de_anthropic"
   ```

> Consigue tu clave gratis en: https://aistudio.google.com/app/apikey

Si no configuras ninguna clave, la app funciona en **Modo Demo** con contenido de ejemplo (sin generar imágenes reales).

## ▶️ Correr en local

**Requisitos:** Node.js 18+

```bash
npm install
npm run dev
```

Abre 👉 **http://localhost:3000**

## 🛠️ Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Levanta el servidor Express + Vite en desarrollo (puerto 3000, configurable con `PORT`) |
| `npm run build` | Compila el frontend (Vite) y empaqueta el servidor |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Chequeo de tipos con TypeScript |
| `npm run lint:eslint` | Linter ESLint sobre `src` |
| `npm test` | Tests unitarios con Vitest |
| `npm run format` | Formatea el código con Prettier |

> ¿El puerto 3000 ocupado? Usa otro: `PORT=3001 npm run dev` (o en PowerShell `$env:PORT=3001; npm run dev`).

## 🍌 Cómo generar un carrusel con imágenes

1. Ve a la pestaña **"Carruseles"**.
2. Escribe el **Tema / Prompt** del carrusel, elige nº de slides, canal y tono.
3. (Opcional) Escribe un **Estilo Visual** para las imágenes y marca *"Generar imágenes con Nano Banana"*.
4. Pulsa **Generar**. La IA escribe los slides; si marcaste la casilla, Nano Banana crea las imágenes.
5. También puedes pulsar **🍌 Generar imágenes (Nano Banana)** para todo el carrusel, o **Regenerar 🍌** en un slide concreto.
6. Edita textos/colores y **descarga** el PNG de cada slide o el carrusel completo.

## 🚀 Despliegue (para publicar de verdad)

El programador de publicaciones corre **dentro del servidor Express**, así que necesitas un hosting **siempre encendido** (Railway, Render, Fly.io o un VPS). En serverless (p. ej. Vercel functions) los posts programados no saldrían.

1. `npm run build && npm start` (sirve el frontend compilado y la API en un solo proceso; puerto via `PORT`).
2. Configura `APP_URL` con tu dominio **HTTPS** — Instagram exige URLs públicas para las imágenes (`/uploads`).
3. Variables en `.env.local` / panel del hosting: `GEMINI_API_KEY`, `META_APP_ID`, `META_APP_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, SMTP y (opcional) `EXTERNAL_API_KEYS`.
4. El disco debe ser **persistente** (carpeta `.data/` guarda proyectos, calendario, biblioteca y cola de publicación).
5. Meta: con tu propia cuenta (admin/developer de la app) todo funciona en modo desarrollo; para que **otras cuentas** conecten, la app de Meta debe pasar App Review.

## 🧭 Estado honesto del producto

- **Real**: publicación IG/FB/LinkedIn, carruseles Nano Banana, biblioteca de marca, calendario con programación automática, métricas IG/FB, borradores de Meta Ads, email SMTP, API externa y webhooks.
- **Simulado todavía**: Google Drive y Google Calendar (requieren OAuth de Google), y los datos del tablero de equipo/pipeline.

## 🗺️ Fase 2 (próximo salto): multi-usuario con Supabase

Hoy el sistema es mono-usuario (tokens en tu navegador + datos en `.data/store.json`). Para que **todo tu equipo** trabaje en el mismo espacio:

1. **Supabase Auth** (login por email) + roles (admin / editor / aprobador).
2. Migrar `serverStore.ts` a **Postgres** (la capa ya está aislada en ese módulo, es un swap directo).
3. Mover `/uploads` a **Supabase Storage** (URLs públicas estables que sobreviven redeploys).
4. Tokens de redes guardados **cifrados en el servidor por workspace** (el `secretStore` ya existe) en vez de localStorage.
5. Flujo editorial: borrador → aprobado → programado → publicado.

## ⚠️ Seguridad

- **Nunca** subas API keys reales al repositorio. Las claves se cargan desde la app (localStorage) o desde `.env.local`, que está ignorado por `.gitignore`.
- Si en algún momento una clave quedó expuesta en el código o en el historial de git, **rótala** (genera una nueva) en el panel correspondiente de Google AI Studio / Anthropic.
