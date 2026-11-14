// OneSignal: deve ser o primeiro import do SW para registrar push subscriptions
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'studio-focus-v13';
const STATIC_ASSETS = [
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png'
];

const _SW_ALARMS_URL  = '/__sw_alarms__';
const _SW_FIRED_URL   = '/__sw_fired__';

// ── Notificação ──────────────────────────────────────────────────────────────
function showAlarmNotification(title, body, tag) {
  return self.registration.showNotification(title, {
    body,
    icon:     './img/icon-192.png',
    badge:    './img/icon-192.png',
    tag,
    renotify: true,
    requireInteraction: true,   // Não auto-dismiss: fica visível até o usuário interagir
    vibrate:  [200, 100, 200, 100, 200]
  });
}

// ── Persistência via Cache API (sobrevive ao SW ser morto) ───────────────────
async function persistAlarms(alarms) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(_SW_ALARMS_URL, new Response(JSON.stringify(alarms), {
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch(e) {}
}

async function loadPersistedAlarms() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res   = await cache.match(_SW_ALARMS_URL);
    if (res) return res.json();
  } catch(e) {}
  return [];
}

// Rastreia quais alarmes já dispararam hoje (evita duplicatas após reinício do SW)
async function hasAlreadyFired(key) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res   = await cache.match(_SW_FIRED_URL);
    const fired = res ? await res.json() : {};
    return !!fired[key];
  } catch(e) { return false; }
}

async function markFiredInCache(key) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res   = await cache.match(_SW_FIRED_URL);
    let fired   = res ? await res.json() : {};

    // Limpa entradas de dias anteriores
    const today = new Date().toDateString();
    Object.keys(fired).forEach(k => { if (!k.startsWith(today)) delete fired[k]; });

    fired[key] = true;
    await cache.put(_SW_FIRED_URL, new Response(JSON.stringify(fired), {
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch(e) {}
}

// ── Verifica e dispara alarmes no horário exato ──────────────────────────────
async function checkAndFireAlarms(alarms) {
  const now     = new Date();
  const hh      = String(now.getHours()).padStart(2, '0');
  const mm      = String(now.getMinutes()).padStart(2, '0');
  const timeStr = hh + ':' + mm;
  const today   = now.toDateString();

  for (const alarm of alarms) {
    if (alarm.time !== timeStr) continue;
    const k = today + '|' + alarm.tag + '|' + alarm.time;
    if (await hasAlreadyFired(k)) continue;
    await markFiredInCache(k);
    await showAlarmNotification(alarm.title, alarm.body, alarm.tag);
  }
}

// ── Recebe alarmes da página e persiste (sem setTimeout) ─────────────────────
// NOTA: setTimeout de horas NÃO funciona em SW - o SO mata o SW após segundos
// de inatividade. A persistência serve apenas para o periodic sync e push.
function receiveAlarms(alarms) {
  persistAlarms(alarms);
}

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: limpa caches velhos ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(names
          .filter(n => n !== CACHE_NAME)
          .map(n => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
// Estratégia:
//   • Arquivos de app (HTML, JS, CSS, JSON de dados) → network-first
//     Sempre busca a versão mais recente na rede; usa cache só se offline.
//   • Assets estáticos puros (imagens, webp, fontes) → cache-first
//     Imagens não mudam com frequência; cache acelera o carregamento.
//   • Requisições externas (Supabase, CDN, Fonts) → passa direto sem cache.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora URLs internas de persistência do SW
  if (url.pathname === _SW_ALARMS_URL || url.pathname === _SW_FIRED_URL) return;

  // Requisições externas: sem cache, deixa o navegador resolver normalmente
  if (url.origin !== self.location.origin) return;

  // Arquivos de app que mudam com frequência → network-first
  const isAppFile = /\.(html|js|css|json)$/i.test(url.pathname)
    || url.pathname.endsWith('/')
    || url.pathname === '/';

  if (isAppFile) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets estáticos (imagens, webp, ícones) → cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

// ── Mensagens da página ──────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(
      showAlarmNotification(
        event.data.title,
        event.data.body,
        event.data.tag || 'supplement-alarm'
      )
    );
  }

  if (event.data.type === 'SCHEDULE_ALARMS') {
    // Persiste os alarmes para uso do periodic sync, mas NÃO usa setTimeout
    receiveAlarms(event.data.alarms || []);
  }
});

// ── Periodic Background Sync (Chrome/Android - complementar) ─────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-alarms') {
    event.waitUntil(
      loadPersistedAlarms().then(alarms => checkAndFireAlarms(alarms))
    );
  }
});

// ── Notificação clicada: abre o app ──────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Se o usuário clicou em "dismiss"/"OK", apenas fecha
  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const appClient = clients.find(c => c.url && c.visibilityState !== 'hidden');
        if (appClient) return appClient.focus();
        return self.clients.openWindow('./');
      })
  );
});
