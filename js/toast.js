function showToast(msg, type='info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// Trava a altura do viewport no carregamento para evitar expansão no iOS Safari
(function(){
  function setAppVh(){
    document.documentElement.style.setProperty('--app-vh', window.innerHeight + 'px');
  }
  setAppVh();
  window.addEventListener('orientationchange', function(){ setTimeout(setAppVh, 150); });
})();

// Service Worker Registration + detecção de atualização
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });

      // Periodic Background Sync: acorda o SW periodicamente (Chrome/Android)
      if ('periodicSync' in reg) {
        navigator.permissions.query({ name: 'periodic-background-sync' })
          .then(status => {
            if (status.state === 'granted') {
              reg.periodicSync.register('check-alarms', { minInterval: 60 * 1000 })
                .catch(() => {});
            }
          }).catch(() => {});
      }
    }).catch(err => console.log('SW falhou: ', err));
  });
}

function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML =
    '<span>Nova versão disponível!</span>' +
    '<button onclick="window.location.reload()">Atualizar</button>' +
    '<button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:inherit;font-size:18px;cursor:pointer;padding:0 4px;opacity:.7">×</button>';
  banner.style.cssText =
    'position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);left:50%;transform:translateX(-50%);' +
    'z-index:9999;display:flex;align-items:center;gap:10px;' +
    'background:#1e3a5f;border:1px solid rgba(61,154,255,.4);color:#e0eeff;' +
    'padding:10px 16px;border-radius:12px;font-size:13px;font-family:var(--fb);' +
    'box-shadow:0 4px 24px rgba(0,0,0,.5);white-space:nowrap;';
  banner.querySelector('button').style.cssText =
    'background:var(--pu);color:#fff;border:none;border-radius:8px;' +
    'padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;';
  document.body.appendChild(banner);
}
document.addEventListener('DOMContentLoaded',function(){if(window.lucide)lucide.createIcons();});
