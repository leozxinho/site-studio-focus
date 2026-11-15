/* ALARME DE SUPLEMENTOS */
(function(){
  const STORAGE_KEY    = 'sf_alarms';
  const FIRED_KEY      = 'sf_alarms_fired'; // persiste para evitar duplo-disparo após recarga

  // Capture install prompt (Android/Chrome)
  let _installPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    _installPrompt = e;
  });

  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.navigator.standalone === true;
  }

  window.installAlarmPWA = function() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (_installPrompt) {
      _installPrompt.prompt();
      _installPrompt.userChoice.then(function(r) {
        if (r.outcome === 'accepted') {
          showToast('App instalado! Abra pelo ícone na tela inicial.', 'success');
          _installPrompt = null;
          closeModal('alarm-modal-overlay');
        }
      });
    } else if (isIOS) {
      const steps = document.getElementById('pwa-ios-steps');
      const btn   = document.getElementById('pwa-install-btn');
      const visible = steps && steps.style.display !== 'none';
      if (steps) steps.style.display = visible ? 'none' : 'flex';
      if (btn)   btn.textContent = visible ? 'Ver como instalar no iPhone' : 'Ocultar instruções';
    } else {
      showToast('Abra o menu do navegador (⋮) e toque em "Adicionar à tela inicial".', 'info');
    }
  };

  // FIX 1: merge profundo garante que times[] existe sempre
  function loadAlarms() {
    var def = { creatina:{active:false,times:[]}, whey:{active:false,times:[]} };
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      ['creatina','whey'].forEach(function(k) {
        if (!raw[k]) { raw[k] = { active:false, times:[] }; return; }
        if (!Array.isArray(raw[k].times)) raw[k].times = [];
        if (typeof raw[k].active !== 'boolean') raw[k].active = false;
      });
      return raw;
    } catch(e) { return def; }
  }

  // FIX 2: fired set persiste em localStorage (evita duplo-disparo após reload)
  function loadFired() {
    try {
      var today = new Date().toDateString();
      var raw   = JSON.parse(localStorage.getItem(FIRED_KEY)) || {};
      // descarta dias anteriores
      if (raw.day !== today) return { day:today, keys:[] };
      return raw;
    } catch(e) { return { day:new Date().toDateString(), keys:[] }; }
  }

  function hasFired(key) {
    return loadFired().keys.indexOf(key) !== -1;
  }

  function markFired(key) {
    var f = loadFired();
    if (f.keys.indexOf(key) === -1) f.keys.push(key);
    localStorage.setItem(FIRED_KEY, JSON.stringify(f));
  }

  function getTimesFor(supp) {
    var c = document.getElementById('alarm-'+supp+'-times');
    if (!c) return [];
    return Array.from(c.querySelectorAll('.alarm-time-input')).map(function(el){ return el.value; }).filter(Boolean);
  }

  function renderTimes(supp, times) {
    var c = document.getElementById('alarm-'+supp+'-times');
    if (!c) return;
    if (!times || !times.length) {
      c.innerHTML = '<div class="alarm-empty">Nenhum horário configurado</div>';
      return;
    }
    c.innerHTML = times.map(function(t,i) {
      return '<div class="alarm-time-item">' +
        '<input type="time" class="alarm-time-input" value="'+t+'" onchange="saveAlarms()">' +
        '<button class="alarm-time-del" onclick="removeAlarmTime(\''+supp+'\','+i+')" aria-label="Remover">\xd7</button>' +
      '</div>';
    }).join('');
  }

  window.addAlarmTime = function(supp) {
    var d = loadAlarms();
    d[supp].times.push('08:00');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    renderTimes(supp, d[supp].times);
    updateStatus();
  };

  window.removeAlarmTime = function(supp, idx) {
    var d = loadAlarms();
    d[supp].times.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    renderTimes(supp, d[supp].times);
    updateStatus();
  };

  window.saveAlarms = function() {
    // Só lê do DOM quando o painel de configuração está visível.
    // Se o modal estiver fechado, os inputs estão vazios e salvar apagaria os dados do usuário.
    var config = document.getElementById('alarm-config');
    if (!config || config.style.display === 'none') {
      updateStatus();
      return;
    }

    var existing = loadAlarms();
    var tc = document.getElementById('alarm-creatina-toggle');
    var tw = document.getElementById('alarm-whey-toggle');

    var d = {
      creatina: {
        active: tc ? !!tc.checked : existing.creatina.active,
        times:  getTimesFor('creatina')
      },
      whey: {
        active: tw ? !!tw.checked : existing.whey.active,
        times:  getTimesFor('whey')
      }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    updateStatus();
  };

  function updateStatus() {
    var d   = loadAlarms();
    var dot = document.getElementById('alarm-status-dot');
    var txt = document.getElementById('alarm-status-txt');
    if (!dot || !txt) return;
    var active = (d.creatina.active && d.creatina.times.length) ||
                 (d.whey.active     && d.whey.times.length);
    dot.className = 'alarm-status-dot' + (active ? '' : ' off');
    if (active) {
      var parts = [];
      if (d.creatina.active) d.creatina.times.forEach(function(t){ parts.push('Creatina '+t); });
      if (d.whey.active)     d.whey.times.forEach(function(t){ parts.push('Whey '+t); });
      txt.textContent = 'Alarmes ativos: ' + parts.join(', ');
    } else {
      txt.textContent = 'Nenhum alarme ativo. Ative e adicione horários.';
    }
  }

  function updatePermBanner() {
    var b = document.getElementById('alarm-perm-banner');
    if (!b) return;
    if (!('Notification' in window)) {
      b.className = 'alarm-perm-banner denied';
      b.innerHTML = '<span>⚠️</span><span>Notificações não suportadas neste navegador.</span>';
      return;
    }
    if (Notification.permission === 'granted') {
      b.className = 'alarm-perm-banner granted';
      b.innerHTML = '<span>✅</span><span>Notificações permitidas. Os alarmes estão prontos!</span>';
    } else if (Notification.permission === 'denied') {
      b.className = 'alarm-perm-banner denied';
      b.innerHTML = '<span>🚫</span><span>Notificações bloqueadas. Habilite nas configurações do celular.</span>';
    } else {
      b.className = 'alarm-perm-banner';
      b.innerHTML = '<span>🔔</span><span>Permita notificações para receber os alarmes.</span>' +
                    '<button class="alarm-perm-btn" onclick="requestAlarmPermission()">Permitir</button>';
    }
  }

  window.requestAlarmPermission = function() {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(function(p) {
      updatePermBanner();
      if (p === 'granted') showToast('Notificações ativadas!', 'success');
    });
  };

  window.openAlarmModal = function() {
    var pwa    = isPWA();
    var gate   = document.getElementById('alarm-pwa-gate');
    var config = document.getElementById('alarm-config');
    if (gate)   gate.style.display   = pwa ? 'none' : 'flex';
    if (config) config.style.display = pwa ? 'flex' : 'none';

    if (!pwa) {
      var btn   = document.getElementById('pwa-install-btn');
      var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (btn) {
        if (isIOS)            btn.textContent = 'Ver como instalar no iPhone';
        else if (_installPrompt) btn.textContent = 'Instalar na tela inicial';
        else                  btn.textContent = 'Adicionar à tela inicial';
      }
      var steps = document.getElementById('pwa-ios-steps');
      if (steps) steps.style.display = 'none';
    } else {
      var d  = loadAlarms();
      var tc = document.getElementById('alarm-creatina-toggle');
      var tw = document.getElementById('alarm-whey-toggle');
      if (tc) tc.checked = !!d.creatina.active;
      if (tw) tw.checked = !!d.whey.active;
      renderTimes('creatina', d.creatina.times);
      renderTimes('whey',     d.whey.times);
      updatePermBanner();
      updateStatus();
    }
    openModal('alarm-modal-overlay');
  };

  document.getElementById('alarm-modal-close')?.addEventListener('click', function() {
    closeModal('alarm-modal-overlay');
  });
  document.getElementById('alarm-modal-overlay')?.addEventListener('click', function(e) {
    if (e && e.target && e.target.id === 'alarm-modal-overlay') closeModal('alarm-modal-overlay');
  });

  /* ---------- Alarm checker ---------- */

  // FIX 3: intervalo de 10s (mais responsivo, dedup via localStorage impede duplo-disparo)
  var SUPPS = [
    { key:'creatina', title:'Creatina 💪',    body:'Hora de tomar sua creatina!', speech:'Tomar creatina', tag:'alarm-creatina' },
    { key:'whey',     title:'Whey Protein 🥤', body:'Hora de tomar seu whey!',    speech:'Tomar Way',      tag:'alarm-whey' }
  ];

  function checkAlarms() {
    var d   = loadAlarms();
    var now = new Date();
    var hh  = String(now.getHours()).padStart(2,'0');
    var mm  = String(now.getMinutes()).padStart(2,'0');
    var timeStr = hh + ':' + mm;

    SUPPS.forEach(function(s) {
      var info = d[s.key];
      if (!info || !info.active || !info.times || !info.times.length) return;
      info.times.forEach(function(t) {
        if (t !== timeStr) return;
        var k = new Date().toDateString() + '|' + s.key + '|' + t;
        if (hasFired(k)) return;
        markFired(k);
        fireAlarm(s.title, s.body, s.speech, s.tag);
      });
    });
  }

  function fireAlarm(title, body, speechText, tag) {
    // FIX 4: tag única por suplemento (creatina e whey não se sobrepõem)
    // FIX 5: ícone do app incluído na notificação SW
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION', title: title, body: body, tag: tag
          });
        } else {
          new Notification(title, { body: body, tag: tag, icon: './img/icon-192.png' });
        }
      } catch(e) {
        try { new Notification(title, { body: body }); } catch(e2) {}
      }
    }

    // Síntese de voz
    if ('speechSynthesis' in window) {
      try {
        var u = new SpeechSynthesisUtterance(speechText);
        u.lang = 'pt-BR'; u.rate = 0.85; u.pitch = 1.1; u.volume = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch(e) {}
    }
  }

  // Envia agenda de alarmes ao SW para disparo mesmo com app em background
  function syncAlarmsToSW() {
    if (!('serviceWorker' in navigator)) return;
    var d = loadAlarms();
    var alarms = [];
    SUPPS.forEach(function(s) {
      var info = d[s.key];
      if (!info || !info.active || !info.times || !info.times.length) return;
      info.times.forEach(function(t) {
        alarms.push({ time: t, title: s.title, body: s.body, tag: s.tag });
      });
    });
    // Usa ready para garantir que o SW ativo receba a mensagem
    navigator.serviceWorker.ready.then(function(reg) {
      if (reg.active) reg.active.postMessage({ type: 'SCHEDULE_ALARMS', alarms: alarms });
    }).catch(function() {});
  }



  function buildAlarmList() {
    var d = loadAlarms(); var alarms = [];
    SUPPS.forEach(function(s) {
      var info = d[s.key];
      if (!info || !info.active || !info.times || !info.times.length) return;
      info.times.forEach(function(t) {
        alarms.push({ time: t, title: s.title, body: s.body, tag: s.tag });
      });
    });
    return alarms;
  }

  function updatePushStatus(state, msg) {
    var el = document.getElementById('alarm-push-status');
    if (!el) return;
    var icons = { syncing: '🔄', ok: '☁️ ✅', error: '⚠️', off: '📴' };
    var colors = {
      syncing: 'rgba(96,165,250,.15)',
      ok:      'rgba(74,222,128,.12)',
      error:   'rgba(239,68,68,.12)',
      off:     'rgba(138,138,158,.1)'
    };
    var borders = {
      syncing: 'rgba(96,165,250,.3)',
      ok:      'rgba(74,222,128,.3)',
      error:   'rgba(239,68,68,.3)',
      off:     'rgba(138,138,158,.2)'
    };
    el.style.display = 'flex';
    el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;font-size:11px;color:var(--mt);line-height:1.4;' +
      'background:' + (colors[state]||colors.off) + ';border:1px solid ' + (borders[state]||borders.off);
    el.innerHTML = '<span style="font-size:14px;flex-shrink:0">' + (icons[state]||'') + '</span><span>' + msg + '</span>';
  }

  // URL do Cloudflare Worker de alarmes (deploy: workers/wrangler-alarms.toml)
  var ALARMS_WORKER_URL = 'https://studio-focus-alarms.the130programacion.workers.dev';

  var _pushSyncRetries = 0;
  async function syncPushSubscription() {
    if (!window.OneSignal) {
      updatePushStatus('off', 'OneSignal não carregado.');
      return;
    }

    if (Notification.permission !== 'granted') {
      updatePushStatus('off', 'Notificações não permitidas. Ative para receber alarmes.');
      return;
    }

    // Obtém o ID do usuário no OneSignal (necessário para o Worker enviar push)
    var onesignalId = null;
    try {
      onesignalId = await OneSignal.User.getOnesignalId();
    } catch(e) {}
    if (!onesignalId) {
      try { onesignalId = OneSignal.User.PushSubscription?.id; } catch(e) {}
    }

    if (!onesignalId) {
      updatePushStatus('off', 'Aguardando registro do OneSignal...');
      setTimeout(function() { _pushSyncRetries < 5 && syncPushSubscription(); _pushSyncRetries++; }, 3000);
      return;
    }

    var alarms = buildAlarmList();
    if (!alarms.length) {
      updatePushStatus('off', 'Nenhum alarme ativo.');
      // Remove assinatura do worker ao desativar todos os alarmes
      fetch(ALARMS_WORKER_URL + '/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesignalId: onesignalId }),
      }).catch(function(){});
      return;
    }

    updatePushStatus('syncing', 'Sincronizando alarmes...');

    try {
      var resp = await fetch(ALARMS_WORKER_URL + '/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesignalId: onesignalId, alarms: alarms }),
      });

      if (resp.ok) {
        updatePushStatus('ok', alarms.length + ' alarme(s) ativo(s) - push garantido!');
      } else {
        throw new Error('HTTP ' + resp.status);
      }
    } catch(e) {
      console.warn('[Alarm] Worker sync erro:', e);
      updatePushStatus('error', 'Erro ao sincronizar alarmes. Verifique a conexão.');
    }
  }

  // Sincroniza ao salvar, adicionar ou remover horários
  var _origSave          = window.saveAlarms;
  var _origAdd           = window.addAlarmTime;
  var _origRemove        = window.removeAlarmTime;
  window.saveAlarms      = function()      { _origSave();          syncAlarmsToSW(); _pushSyncRetries=0; syncPushSubscription(); };
  window.addAlarmTime    = function(s)     { _origAdd(s);          syncAlarmsToSW(); _pushSyncRetries=0; syncPushSubscription(); };
  window.removeAlarmTime = function(s, i)  { _origRemove(s, i);    syncAlarmsToSW(); _pushSyncRetries=0; syncPushSubscription(); };

  // Sincroniza assim que o SW estiver pronto no carregamento da página
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function() {
      syncAlarmsToSW();
      syncPushSubscription();
    }).catch(function() {});
  }

  // Re-verifica ao app voltar ao primeiro plano (ex: usuário re-abre o PWA)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) { checkAlarms(); syncAlarmsToSW(); _pushSyncRetries=0; syncPushSubscription(); }
  });

  setInterval(checkAlarms, 10000);
  setTimeout(checkAlarms, 2000);
})();
