import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import { permitePlan } from './auditoria';

const router = Router();
router.use(authMiddleware);

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// ---- 1) Clasificador contable (DeepSeek) ----
router.post('/clasificar', async (req: Request, res: Response) => {
  try {
    if (!(await permitePlan(req, 2))) { res.status(403).json({ error: 'La IA requiere plan Profesional o superior' }); return; }
    const { descripcion, tipo } = req.body || {};
    if (!descripcion) { res.status(400).json({ error: 'Falta la descripcion' }); return; }

    const cuentas = (await pool.query(
      `SELECT codigo, nombre, tipo FROM chart_of_accounts WHERE tenant_id = $1 AND acepta_asientos = true ORDER BY codigo`,
      [req.user!.tenantId]
    )).rows;

    const catalogo = cuentas.map((c: any) => `${c.codigo} - ${c.nombre} (${c.tipo})`).join('\n');
    const prompt = `Eres un contador guatemalteco. Elige la cuenta contable mas adecuada del siguiente catalogo para este movimiento.
Tipo de movimiento: ${tipo || 'gasto'}
Descripcion: "${descripcion}"
Catalogo:
${catalogo}
Responde SOLO con JSON valido: {"codigo":"<codigo>","nombre":"<nombre>","confianza":<0-100>,"razon":"<breve>"}`;

    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.2, response_format: { type: 'json_object' } }),
    });
    const j: any = await r.json();
    const txt = j?.choices?.[0]?.message?.content || '{}';
    let out: any = {};
    try { out = JSON.parse(txt); } catch { out = { raw: txt }; }
    res.json({ ok: true, sugerencia: out });
  } catch (e: any) { console.error('IA clasificar:', e.message); res.status(500).json({ error: 'Error en la IA' }); }
});

// ---- 2) OCR de estado de cuenta / factura (Gemini) ----
router.post('/estado-cuenta', async (req: Request, res: Response) => {
  try {
    if (!(await permitePlan(req, 2))) { res.status(403).json({ error: 'La IA requiere plan Profesional o superior' }); return; }
    const { base64, mime } = req.body || {};
    if (!base64 || !mime) { res.status(400).json({ error: 'Falta el archivo (base64 y mime)' }); return; }

    const prompt = `Extrae los movimientos de este estado de cuenta bancario guatemalteco.
Devuelve SOLO JSON: {"movimientos":[{"fecha":"YYYY-MM-DD","no_documento":"","concepto":"","debito":0,"credito":0}]}
Debito = salidas/cargos; credito = entradas/abonos.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: prompt }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } }),
    });
    const j: any = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let out: any = {};
    try { out = JSON.parse(txt); } catch { out = { raw: txt }; }
    res.json({ ok: true, extraido: out });
  } catch (e: any) { console.error('IA OCR:', e.message); res.status(500).json({ error: 'Error en la IA' }); }
});

// ---- 3) Proyector financiero + anomalias (DeepSeek) ----
router.get('/proyeccion', async (req: Request, res: Response) => {
  try {
    if (!(await permitePlan(req, 2))) { res.status(403).json({ error: 'La IA requiere plan Profesional o superior' }); return; }
    const tenantId = req.user!.tenantId;

    const ventas = (await pool.query(
      `SELECT to_char(fecha,'YYYY-MM') AS mes, COALESCE(SUM(total),0) AS total, COALESCE(SUM(iva),0) AS iva
       FROM sales_book WHERE tenant_id=$1 GROUP BY 1 ORDER BY 1 DESC LIMIT 6`, [tenantId])).rows;
    const compras = (await pool.query(
      `SELECT to_char(fecha,'YYYY-MM') AS mes, COALESCE(SUM(total),0) AS total
       FROM purchases_book WHERE tenant_id=$1 GROUP BY 1 ORDER BY 1 DESC LIMIT 6`, [tenantId])).rows;

    const datos = `Ventas por mes (mas reciente primero): ${JSON.stringify(ventas)}
Compras por mes (mas reciente primero): ${JSON.stringify(compras)}`;

    const prompt = `Eres un analista financiero guatemalteco. Con estos datos historicos, proyecta el proximo mes y detecta riesgos.
${datos}
Responde SOLO con JSON valido:
{"resumen":"<2 frases>","flujo_proyectado":{"entradas":<num>,"salidas":<num>,"neto":<num>},"alertas":["<alerta>",...],"recomendaciones":["<accion>",...]}`;

    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.3, response_format: { type: 'json_object' } }),
    });
    const j: any = await r.json();
    const txt = j?.choices?.[0]?.message?.content || '{}';
    let out: any = {};
    try { out = JSON.parse(txt); } catch { out = { raw: txt }; }
    res.json({ ok: true, historial: { ventas, compras }, proyeccion: out });
  } catch (e: any) { console.error('IA proyeccion:', e.message); res.status(500).json({ error: 'Error en la IA' }); }
});

export default router;
