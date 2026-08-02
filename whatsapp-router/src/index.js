const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Token de verificación que pones en Meta (hub.verify_token)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'totalappgt2026';

// Rutas de reenvío. Formato: una entrada por línea
//   phone_number_id=https://sistema1.up.railway.app/api/notificaciones/webhook
//   phone_number_id2=https://sistema2.up.railway.app/api/whatsapp/webhook
// Si un phone_number_id no aparece, se reenvía a la ruta DEFAULT (opcional).
const ROUTES = {};
const ROUTE_LINES = (process.env.ROUTES || '')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'));

for (const line of ROUTE_LINES) {
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  if (!key || !value) continue;
  if (key === 'DEFAULT') {
    ROUTES.__default = value;
  } else {
    ROUTES[key] = value;
  }
}

const DEFAULT_TARGET = ROUTES.__default;

// Verificación inicial del webhook (GET) - la llama Meta al configurar
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[ROUTER] Webhook verificado correctamente');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Reenvío de eventos (POST)
app.post('/webhook', (req, res) => {
  const body = req.body;

  // Responder 200 inmediatamente a Meta (evita reintentos)
  res.status(200).send('ok');

  const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

  let target;
  if (phoneNumberId && ROUTES[phoneNumberId]) {
    target = ROUTES[phoneNumberId];
    console.log(`[ROUTER] phone_number_id=${phoneNumberId} -> ${target}`);
  } else if (DEFAULT_TARGET) {
    target = DEFAULT_TARGET;
    console.log(`[ROUTER] phone_number_id=${phoneNumberId || 'desconocido'} (default) -> ${DEFAULT_TARGET}`);
  } else {
    console.error('[ROUTER] Sin ruta configurada para', phoneNumberId, 'y no hay DEFAULT');
    return;
  }

  fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(r => r.text().then(t => console.log(`[ROUTER] Reenviado a ${target} -> ${r.status} ${t.slice(0, 200)}`)))
    .catch(e => console.error('[ROUTER] Error reenviando:', e.message));
});

app.get('/health', (req, res) => res.json({ status: 'ok', rutas: Object.keys(ROUTES) }));

app.listen(PORT, () => {
  console.log(`[ROUTER] WhatsApp Webhook Router escuchando en puerto ${PORT}`);
  console.log('[ROUTER] Rutas configuradas:', Object.keys(ROUTES));
});
