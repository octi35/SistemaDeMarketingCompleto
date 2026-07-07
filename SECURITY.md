# Seguridad

Este documento resume las medidas de seguridad implementadas en AdTeam AI y el modelo de amenazas considerado.

## Medidas implementadas

### Credenciales y secretos
- **Cifrado en reposo (AES-256-GCM)**: los tokens de redes sociales usados por publicaciones programadas y el recolector de métricas nunca se guardan en texto plano — se reemplazan por referencias opacas (`secret_*`) cifradas con una clave derivada de `APP_SECRET` (o generada localmente). Ver `server/secretStore.ts`.
- **Sin secretos en el repositorio**: todas las claves viven en variables de entorno (`.env.local`, gitignorado). `.env.example` solo contiene placeholders.
- **Los listados públicos nunca exponen tokens**: `/api/scheduled` elimina el payload; los webhooks nunca devuelven su `secret` (solo `hasSecret`).

### OAuth
- **CSRF**: todo flujo OAuth usa `state` aleatorio de un solo uso con expiración de 10 minutos (`oauthState.ts`).
- **XSS en callbacks**: los valores embebidos en los `<script>` inline de las páginas de callback se serializan con `jsonForInlineScript`, que escapa `</script>` (`<`) y los separadores U+2028/U+2029. El `code` se sanea con allowlist de caracteres.
- **postMessage estricto**: el frontend solo acepta mensajes del **mismo origen** y los popups publican con `targetOrigin` explícito (nunca `*`).
- **Tokens de larga duración**: el token corto de Meta se intercambia inmediatamente por uno de ~60 días, con renovación desde el panel.

### Superficie HTTP
- **Cabeceras**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; `x-powered-by` deshabilitado; `trust proxy` habilitado para IPs reales detrás del reverse proxy.
- **Rate limiting por capas**: 300 req/min global en `/api`, 30/min en endpoints de IA y subidas, 120/min en la API externa.
- **CORS**: en producción restringido al origen configurado en `APP_URL`.
- **Validación de entrada**: los endpoints de escritura validan el body con esquemas Zod (`server/validate.ts`); las subidas aceptan solo data-URLs `image/*` o `video/*` (máx. 12 por petición).

### API externa y webhooks
- **API keys en tiempo constante**: la comparación usa `crypto.timingSafeEqual` sobre digests SHA-256 (sin ataques de timing). La API queda deshabilitada (503) si `EXTERNAL_API_KEYS` no está configurada.
- **Anti-SSRF**: las URLs de webhooks salientes rechazan loopback, rangos privados (RFC 1918), link-local y el metadata endpoint de nube (`169.254.169.254`), incluyendo literales IPv6. `ALLOW_PRIVATE_WEBHOOKS=1` lo relaja solo para desarrollo local.
- **Firma de entregas**: los webhooks se firman con HMAC-SHA256 (`X-AdTeam-Signature`) cuando hay secreto configurado.

### Almacenamiento
- **Path traversal**: el borrado de assets usa `path.basename`; los archivos se sirven vía `express.static`.
- **Supabase (opcional)**: la tabla usa RLS activo sin políticas — solo la `service_role` key del servidor accede; la clave pública no tiene acceso a datos.

### Control de acceso (instancias desplegadas)
- **Gate por contraseña**: con `APP_PASSWORD` configurada, toda la app y la API exigen login. La sesión es una cookie `HttpOnly; SameSite=Lax` (+`Secure` en producción) con un token HMAC sin estado — cambiar la contraseña revoca todas las sesiones. El login tiene rate limit propio (10/min) y comparación en tiempo constante. Quedan públicos solo `/uploads` (las redes sociales deben poder leer las imágenes) y `/api/ext/*` (protegido por sus propias API keys).

## Limitaciones conocidas (por diseño de la fase actual)

- **Aplicación mono-operador**: hay una contraseña de acceso global (no cuentas individuales ni roles). Los tokens de sesión de redes del navegador viven en `localStorage`. La fase multi-usuario (Supabase Auth + roles) está en el roadmap.
- **Sin CSP estricta**: las páginas de callback OAuth usan scripts inline mínimos; se mitigó con serialización segura en lugar de CSP.

## Reporte de vulnerabilidades

Si encontrás una vulnerabilidad, abrí un issue privado o contactá al autor del repositorio. Por favor incluí pasos de reproducción. No explotes datos de terceros.
