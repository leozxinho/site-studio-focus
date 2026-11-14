// Deve ser o primeiro import — habilita push via OneSignal neste SW
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE = 'sf-treinos-v6';
const SHELL = [
  './index.html',
  './manifest.json',
  '../img/image.png',
];

const _ALARMS_URL = '/__sf-treinos-alarms__';
const _FIRED_URL  = '/__sf-treinos-fired__';

// ── Notificação ──────────────────────────────────────────────────────────────
function mostrarNotificacao(title, body, tag) {
  return self.registration.showNotification(title, {
    body,
    icon:     '../img/image.png',
    badge:    '../img/image.png',
    tag,
    renotify: true,
    requireInteraction: true,
    vibrate:  [200, 100, 200, 100, 200],
  });
}

// ── Alarmes: persistência via Cache API ──────────────────────────────────────
async function salvarAlarmes(alarms) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(_ALARMS_URL, new Response(JSON.stringify(alarms), {
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch(e) {}
}

async function lerAlarmes() {
  try {
    const cache = await caches.open(CACHE);
    const res   = await cache.match(_ALARMS_URL);
    if (res) return res.json();
  } catch(e) {}
  return [];
}

async function jaDisparou(key) {
  try {
    const cache = await caches.open(CACHE);
    const res   = await cache.match(_FIRED_URL);
    const f     = res ? await res.json() : {};
    return !!f[key];
  } catch(e) { return false; }
}

async function marcarDisparado(key) {
  try {
    const cache = await caches.open(CACHE);
    const res   = await cache.match(_FIRED_URL);
    let f       = res ? await res.json() : {};
    const today = new Date().toDateString();
    Object.keys(f).forEach(k => { if (!k.startsWith(today)) delete f[k]; });
    f[key] = true;
    await cache.put(_FIRED_URL, new Response(JSON.stringify(f), {
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch(e) {}
}

async function verificarAlarmes(alarms) {
  const now     = new Date();
  const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const today   = now.toDateString();
  for (const alarm of alarms) {
    if (alarm.time !== timeStr) continue;
    const k = today + '|' + alarm.tag + '|' + alarm.time;
    if (await jaDisparou(k)) continue;
    await marcarDisparado(k);
    await mostrarNotificacao(alarm.title, alarm.body, alarm.tag);
  }
}

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(url => new Request(url, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => caches.open(CACHE))
      .then(c => c.addAll(SHELL.map(url => new Request(url, { cache: 'no-cache' }))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname === _ALARMS_URL || url.pathname === _FIRED_URL) return;

  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        // 503: o supabase-js preenche `error` (com 200 ele trataria como dado e apagaria o cache)
        new Response('{"message":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/treinos/') || url.pathname === '/treinos') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ── Mensagens da página ───────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (e.data.type === 'SHOW_NOTIFICATION') {
    e.waitUntil(
      mostrarNotificacao(e.data.title, e.data.body, e.data.tag || 'sf-alarme')
    );
    return;
  }

  if (e.data.type === 'SCHEDULE_ALARMS') {
    e.waitUntil(salvarAlarmes(e.data.alarms || []));
    return;
  }
});

// ── Periodic Background Sync (Chrome/Android) ─────────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'sf-check-alarms') {
    e.waitUntil(lerAlarmes().then(alarms => verificarAlarmes(alarms)));
  }
});

// ── Push do servidor ──────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Studio Focus', body: 'Lembrete de suplemento!', tag: 'sf-alarme' };
  try { data = { ...data, ...e.data.json() }; } catch(_) {}
  e.waitUntil(mostrarNotificacao(data.title, data.body, data.tag));
});

// ── Notificação clicada ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const open = clients.find(c => c.url && c.visibilityState !== 'hidden');
      if (open) return open.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
