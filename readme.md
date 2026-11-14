# Studio Focus

Sistema de gestão para academia/personal trainer, com painel administrativo e área do aluno. Instalável como PWA.

---

## Links de Acesso

| Ambiente | URL | Descrição |
|---|---|---|
| **Página Pública** | `/` | Landing page e ferramentas fitness |
| **Área do Aluno (Treinos)** | `/treinos` | Treinos personalizados do aluno |
| **Admin — Login** | `/admin` | Acesso ao painel administrativo |
| **Admin — Dashboard** | `/admin/dashboard.html` | Painel de gestão (requer login) |

---

## Páginas

### Página Pública (`/`)

Landing page da academia com:
- Apresentação do Studio Focus
- Calculadoras e ferramentas fitness
- Suporte a tema claro/escuro
- Instalável como PWA (Progressive Web App) no celular

### Área do Aluno — Treinos (`/treinos`)

Página privada enviada ao aluno via link único. Contém:
- Lista de exercícios do treino do aluno
- Animações e imagens de execução dos exercícios
- Marcação de exercícios concluídos (checklist)
- Informações de séries, repetições e carga

### Painel Administrativo (`/admin`)

Acesso restrito via **Supabase Auth** (e-mail + senha). Crie o usuário admin em
*Authentication → Users* no painel do Supabase.

> **Atenção:** desative o cadastro público (*Authentication → Providers → Email →
> "Allow new users to sign up"*). Qualquer usuário `authenticated` tem acesso total
> às tabelas do painel (ver `supabase/migrations/`).

O dashboard possui as seguintes seções:

| Seção | Funcionalidade |
|---|---|
| **Visão Geral** | Estatísticas de alunos ativos, receita mensal, gráficos de crescimento e despesas, atividades recentes |
| **Alunos** | Cadastro, edição e arquivamento de alunos; exportação de inativos para CSV |
| **Pagamentos** | Controle de mensalidades e cobranças pendentes com alertas |
| **Despesas** | Registro e acompanhamento de gastos da academia |
| **Treinos** | Biblioteca de exercícios e montagem de treinos por aluno |
| **Configurações** | Configurações gerais do sistema |

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, Tailwind CSS (CDN), Lucide Icons |
| Banco de dados | Supabase (PostgreSQL) |
| Push Notifications | OneSignal |
| Worker (alarmes) | Cloudflare Workers |
| Deploy | Cloudflare (Workers + assets estáticos) |

---

## Estrutura de Pastas

```
studio_focus/
├── index.html          # Página pública
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── admin/
│   ├── index.html      # Login do painel admin
│   ├── dashboard.html  # Dashboard administrativo
│   ├── admin.js        # Lógica do painel (auth, CRUD)
│   ├── admin.css       # Estilos do painel
│   └── exercises/      # JSONs e imagens dos exercícios
├── treinos/
│   ├── index.html      # Área do aluno
│   ├── definir-acesso.html  # Link de primeiro acesso (token)
│   └── avaliacao-pdf.html   # PDF da avaliação física
├── supabase/
│   └── migrations/     # SQL: RPCs de login do aluno, RLS das tabelas
├── workers/            # Cloudflare Workers
│   └── alarms.js
```

---

## Segurança / Banco de dados

Aplique as migrations em `supabase/migrations/` (SQL Editor do Supabase, na ordem do nome do arquivo, ou `supabase db push`):

| Migration | O que faz |
|---|---|
| `20261113000000_aluno_auth_server_side.sql` | Login do aluno via RPC (`aluno_login`, `aluno_treino`, …), senhas em bcrypt, sessão por token, bloqueio após 5 falhas; fecha `treinos`, `tokens_acesso`, `fichas_avaliacao` para `anon` |
| `20261113000100_rls_tabelas_admin.sql` | RLS em todas as tabelas do painel (só admin, via `is_admin()`); remove `alarmes_push`/`alarmes_sync` (alarmes ficam no Worker) |
| `20261114000000_reset_senha_pelo_admin.sql` | Remove o "esqueci a senha" por dígitos do telefone; a senha é redefinida pelo link de acesso gerado no painel (encerra as sessões do aluno) |

A chave `anon` no HTML é pública por design — a proteção vem do RLS e das RPCs.

### Marcar o admin
Só usuários com `app_metadata.role = 'admin'` acessam o painel e as tabelas. Depois das migrations, no SQL Editor:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
 where email = 'SEU_EMAIL_ADMIN';
```

Depois faça logout/login no painel para o token receber o novo papel.

## Variáveis de Ambiente

| Onde | Variável | Uso |
|---|---|---|
| Worker `studio-focus-alarms` (secret) | `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` | Alarmes push (cron a cada minuto) |

## Deploy

Site estático + Worker na **Cloudflare** (ver `workers/setup.md`):

```bash
# Site (assets estáticos, config em wrangler.jsonc)
npx wrangler deploy

# Worker de alarmes (cron)
npx wrangler deploy --config workers/wrangler-alarms.toml
```
