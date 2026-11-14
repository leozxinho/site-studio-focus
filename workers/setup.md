# Setup — Worker de alarmes

## Pré-requisitos
- Conta Cloudflare (gratuita): https://cloudflare.com
- Conta OneSignal (gratuita): https://onesignal.com
- Node.js instalado
- Wrangler CLI: `npm install -g wrangler`
- Login: `wrangler login`

---

## 1. Worker de Alarmes de Suplementos

### Criar KV namespace
```bash
wrangler kv namespace create ALARMS_KV --config wrangler-alarms.toml
```
Copie o `id` retornado e cole em `wrangler-alarms.toml`:
```toml
[[kv_namespaces]]
binding = "ALARMS_KV"
id      = "COLE_O_ID_AQUI"
```

### Deploy
```bash
wrangler deploy --config wrangler-alarms.toml
```

### Configurar secrets do OneSignal

No painel OneSignal (https://app.onesignal.com):
- Acesse seu app → Settings → Keys & IDs
- Copie o **App ID** e o **REST API Key**

```bash
wrangler secret put ONESIGNAL_APP_ID       --config wrangler-alarms.toml
wrangler secret put ONESIGNAL_REST_API_KEY --config wrangler-alarms.toml
```

### Atualizar URL no index.html
Abra `index.html` e localize a linha:
```js
var ALARMS_WORKER_URL = 'https://studio-focus-alarms.the130programacion.workers.dev';
```
Substitua pelo URL do seu Worker deployado.

---

## 2. OneSignal — Configurar domínio GitHub Pages

1. Acesse app.onesignal.com → seu app → Settings → Platforms → Web Push
2. Em **Allowed Origins**, adicione:
   - `https://SEU_USUARIO.github.io`
   - (ou seu domínio customizado)
3. Salve.

---

## 3. GitHub Pages — Deploy

1. No repositório GitHub: Settings → Pages
2. Source: `Deploy from a branch` → branch `main` → pasta `/` (root)
3. Salvar. URL: `https://SEU_USUARIO.github.io/studio_focus/`

---

## Verificação final

| Funcionalidade     | Como testar                                    |
|--------------------|------------------------------------------------|
| Alarme (app aberto)| Configure um alarme 2 min à frente, espere     |
| Alarme (app fechado)| Configure, feche o app, espere o horário       |

Se o alarme com app fechado não chegar, verifique:
- `wrangler tail --config workers/wrangler-alarms.toml` (logs do Worker)
- Se o OneSignal mostra o dispositivo como registrado no dashboard
