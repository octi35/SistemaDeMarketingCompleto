<div align="center">
<h1>🚀 ADTEAM.AI — Agencia de Marketing Autónoma con IA</h1>
<p>Suite full-stack (React + Express) con un equipo de 6 agentes de IA para crear creativos de Meta Ads, carruseles para Instagram/LinkedIn con imágenes reales generadas por <strong>Nano Banana 🍌</strong>, copys persuasivos, calendarios de contenido y analíticas.</p>
</div>

---

## ✨ Novedades

- **Carruseles a partir de un prompt + Nano Banana 🍌**: la IA (Gemini o Claude) escribe los slides y el modelo de imágenes de Gemini (*Nano Banana*, `gemini-2.5-flash-image`) genera la imagen de fondo real de cada diapositiva. Puedes generar todas las imágenes de golpe o regenerar slide por slide, y descargarlas en PNG de alta resolución (1080×1350 / 1080×1080) con el texto ya superpuesto.
- **Estilo visual configurable**: un campo de "Estilo Visual" deja que indiques el look de las imágenes (cinematográfico, neón, 3D, minimalista, etc.).
- **Modelos corregidos**: se usan IDs reales de Gemini (`gemini-2.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`) con reintentos y fallback automático.

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
| `npm run dev` | Levanta el servidor Express + Vite en desarrollo (puerto 3000) |
| `npm run build` | Compila el frontend (Vite) y empaqueta el servidor |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Chequeo de tipos con TypeScript |

## 🍌 Cómo generar un carrusel con imágenes

1. Ve a la pestaña **"Carruseles"**.
2. Escribe el **Tema / Prompt** del carrusel, elige nº de slides, canal y tono.
3. (Opcional) Escribe un **Estilo Visual** para las imágenes y marca *"Generar imágenes con Nano Banana"*.
4. Pulsa **Generar**. La IA escribe los slides; si marcaste la casilla, Nano Banana crea las imágenes.
5. También puedes pulsar **🍌 Generar imágenes (Nano Banana)** para todo el carrusel, o **Regenerar 🍌** en un slide concreto.
6. Edita textos/colores y **descarga** el PNG de cada slide o el carrusel completo.

## ⚠️ Seguridad

- **Nunca** subas API keys reales al repositorio. Las claves se cargan desde la app (localStorage) o desde `.env.local`, que está ignorado por `.gitignore`.
- Si en algún momento una clave quedó expuesta en el código o en el historial de git, **rótala** (genera una nueva) en el panel correspondiente de Google AI Studio / Anthropic.
