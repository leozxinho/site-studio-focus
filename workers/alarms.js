/**
 * Cloudflare Worker - Alarmes de Suplementos (sistema único: site público e portal do aluno)
 *
 * Rotas HTTP:
 *   POST   /subscribe { onesignalId, alarms: [{time, title, body, tag}] }  (alarms vazio = remove)
 *   DELETE /subscribe { onesignalId }
 *
 * Cron Trigger (todo minuto via wrangler-alarms.toml):
 *   Lê só o índice do minuto atual e dispara via OneSignal REST API.
 *
 * Layout do KV (binding ALARMS_KV):
 *   user:<onesignalId>  -> { alarms: [...], updatedAt }      (fonte da verdade)
 *   min:<HH:MM>         -> ["<onesignalId>", ...]            (índice por minuto)
 * Custo por minuto: 1 leitura do índice + 1 leitura por usuário com alarme naquele minuto.
 * (A versão anterior listava e lia TODOS os usuários a cada minuto.)
 *
 * O índice é read-modify-write: duas gravações simultâneas no mesmo minuto podem
 * perder uma entrada. Toda sincronização confere e repara o índice, e os clientes
 * ressincronizam ao abrir/voltar ao app; o cron confere o user:<id> antes de enviar.
 *
 * Secrets (wrangler secret put): ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY
 * Vars: ALLOWED_ORIGINS (vírgula). Binding opcional: RATE_LIMITER.
 * Deploy: wrangler deploy --config workers/wrangler-alarms.toml
 */

const DEFAULT_ORIGINS = ['https://www.studiofocus.app.br', 'https://studiofocus.app.br'];
const MAX_ALARMS = 20;
const MAX_BODY_BYTES = 8 * 1024;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default {
  // ── HTTP: salva/remove assinatura ────────────────────────────────────────────
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : DEFAULT_ORIGINS)
      .map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    });

    if (!allowed.includes(origin)) return json({ error: 'Origem não permitida' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (url.pathname !== '/subscribe' || !['POST', 'DELETE'].includes(request.method)) {
      return json({ error: 'Not Found' }, 404);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'anon';
    if (env.RATE_LIMITER && !(await env.RATE_LIMITER.limit({ key: ip })).success) {
      return json({ error: 'Muitas requisições' }, 429);
    }

    let payload;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return json({ error: 'Payload muito grande' }, 413);
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'JSON inválido' }, 400);
    }

    const onesignalId = payload?.onesignalId;
    if (typeof onesignalId !== 'string' || !ID_RE.test(onesignalId)) {
      return json({ error: 'onesignalId inválido' }, 400);
    }

    let alarms = [];
    if (request.method === 'POST') {
      alarms = sanitizeAlarms(payload.alarms);
      if (!alarms) return json({ error: 'Alarmes inválidos' }, 400);
    }

    await saveUser(env, onesignalId, alarms);
    return json({ ok: true, alarms: alarms.length });
  },

  // ── Cron: roda todo minuto ───────────────────────────────────────────────────
  async scheduled(event, env) {
    // HH:MM em Brasília (UTC-3, sem horário de verão desde 2019)
    const now = new Date(event.scheduledTime || Date.now());
    const spMin = ((now.getUTCHours() * 60 + now.getUTCMinutes()) - 180 + 1440) % 1440;
    const timeStr = String(Math.floor(spMin / 60)).padStart(2, '0') + ':' + String(spMin % 60).padStart(2, '0');

    const ids = await getJson(env, `min:${timeStr}`, []);
    if (!ids.length) return;
    console.log(`[Alarms] ${timeStr} | ${ids.length} usuário(s) no índice`);

    let sent = 0, failed = 0;
    await Promise.all(ids.map(async (id) => {
      const user = await getJson(env, `user:${id}`, null);
      const due = (user?.alarms || []).filter(a => a.time === timeStr);
      for (const alarm of due) {
        (await sendOneSignalPush(id, alarm, env)) ? sent++ : failed++;
      }
    }));
    console.log(`[Alarms] ${timeStr} | enviados=${sent} falhas=${failed}`);
  },
};

/** Valida e normaliza a lista. Retorna null se inválida. */
function sanitizeAlarms(alarms) {
  if (alarms == null) return [];
  if (!Array.isArray(alarms) || alarms.length > MAX_ALARMS) return null;
  const out = [];
  for (const a of alarms) {
    if (!a || typeof a.time !== 'string' || !TIME_RE.test(a.time)) return null;
    const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
    out.push({
      time: a.time,
      title: str(a.title, 80) || 'Studio Focus',
      body: str(a.body, 200),
      tag: str(a.tag, 40).replace(/[^\w-]/g, '') || 'alarm',
    });
  }
  return out;
}

/** Grava o usuário e atualiza o índice só dos minutos que mudaram. */
async function saveUser(env, id, alarms) {
  const prev = await getJson(env, `user:${id}`, null);
  const before = new Set((prev?.alarms || []).map(a => a.time));
  const after = new Set(alarms.map(a => a.time));

  // Gravações/remoções contam na cota do KV (1000/dia no plano grátis): só quando muda.
  if (alarms.length) {
    if (JSON.stringify(prev?.alarms) !== JSON.stringify(alarms)) {
      await env.ALARMS_KV.put(`user:${id}`, JSON.stringify({ alarms, updatedAt: Date.now() }));
    }
  } else if (prev) {
    await env.ALARMS_KV.delete(`user:${id}`);
  }
  // Primeira sincronização no formato novo: remove a chave da versão anterior
  if (!prev) await env.ALARMS_KV.delete(`player:${id}`);

  // Confere todos os minutos envolvidos (não só os alterados): assim cada
  // ressincronização do cliente também repara entradas perdidas no índice.
  // Só grava quando o índice realmente precisa mudar.
  await Promise.all([...new Set([...before, ...after])].map(async (t) => {
    const key = `min:${t}`;
    const list = new Set(await getJson(env, key, []));
    const want = after.has(t);
    if (list.has(id) === want) return;
    if (want) list.add(id); else list.delete(id);
    if (list.size) await env.ALARMS_KV.put(key, JSON.stringify([...list]));
    else await env.ALARMS_KV.delete(key);
  }));
}

async function getJson(env, key, fallback) {
  const raw = await env.ALARMS_KV.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

// ── OneSignal REST API ────────────────────────────────────────────────────────
async function sendOneSignalPush(onesignalId, alarm, env) {
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: env.ONESIGNAL_APP_ID,
        include_aliases: { onesignal_id: [onesignalId] },
        target_channel: 'push',
        headings: { pt: alarm.title, en: alarm.title },
        contents: { pt: alarm.body || alarm.title, en: alarm.body || alarm.title },
        web_push_topic: alarm.tag,
        ios_badge_type: 'Increase',
        ios_badge_count: 1,
      }),
    });

    if (!res.ok) {
      console.error(`[Alarms] OneSignal erro ${res.status}:`, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Alarms] Fetch error:', e.message);
    return false;
  }
}
