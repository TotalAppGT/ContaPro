# WhatsApp Webhook Router (universal)

Router único para la Cloud API de WhatsApp que reenvía eventos a múltiples sistemas SaaS según el `phone_number_id` que los recibió.

## Despliegue en Railway (servicio separado)

1. En Railway, crear **New Service** → deploy from GitHub (repo `TotalAppGT/ContaPro`).
2. En **Settings** del servicio, poner `Root Directory` = `whatsapp-router`.
3. En **Variables**:
   - `VERIFY_TOKEN` = token de verificación (mismo que pondrás en Meta)
   - `ROUTES` = rutas de reenvío, una por línea:
     ```
     1178159198722196=https://contapro-production.up.railway.app/api/notificaciones/webhook
     DEFAULT=https://licitrackgt-production.up.railway.app/api/whatsapp/webhook
     ```
4. En Meta Developer Console → WhatsApp → Configuration:
   - Callback URL = `https://TU-SERVICIO.up.railway.app/webhook`
   - Verify token = `VERIFY_TOKEN`

Cualquier `phone_number_id` nuevo se agrega solo añadiendo una línea a `ROUTES` (no requiere tocar código ni Meta).

## Rutas del servicio

- `GET /webhook` — verificación con Meta (`hub.verify_token`)
- `POST /webhook` — recibe eventos y los reenvía según `ROUTES`
- `GET /health` — estado y rutas cargadas
