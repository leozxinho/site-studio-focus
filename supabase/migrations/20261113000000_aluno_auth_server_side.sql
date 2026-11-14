-- ============================================================================
-- Studio Focus — Autenticação do aluno no servidor
-- ----------------------------------------------------------------------------
-- Antes: o navegador lia `treinos.senha` / `treinos.senha_hash` com a chave anon
-- e comparava a senha no cliente. Qualquer pessoa conseguia ler/alterar senhas.
--
-- Depois:
--   * Senhas guardadas com bcrypt (pgcrypto) em `treinos.senha_bcrypt`.
--   * Hashes SHA-256 / senhas em texto legadas são migradas no primeiro login.
--   * Sessão do aluno = token aleatório (só o hash SHA-256 fica no banco).
--   * Bloqueio após 5 falhas seguidas por 15 minutos (login e redefinição).
--   * O aluno só acessa o banco pelas funções RPC abaixo (SECURITY DEFINER).
--   * `treinos`, `tokens_acesso` e `fichas_avaliacao` ficam fechadas para `anon`;
--     apenas o admin (is_admin()) lê/escreve direto.
--
-- Acesso de admin: só usuários com app_metadata.role = 'admin' (função is_admin()).
-- Estar logado (`authenticated`) NÃO basta. app_metadata só pode ser alterado
-- com service_role/SQL, nunca pelo próprio usuário.
-- Depois de aplicar, marque o admin (ver README) e faça login de novo no painel.
-- Mantenha também desativados o signup público e o login anônimo.
--
-- Como aplicar: SQL Editor do Supabase (colar e executar) ou `supabase db push`.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- Admin = claim app_metadata.role = 'admin' no JWT do Supabase Auth.
create or replace function public.is_admin()
returns boolean language sql stable
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Colunas / tabelas de apoio
-- ---------------------------------------------------------------------------
alter table public.treinos add column if not exists senha_bcrypt text;

-- O painel admin só precisa saber se há senha, não ler o hash.
alter table public.treinos add column if not exists tem_senha boolean
  generated always as (senha_bcrypt is not null or senha_hash is not null or senha is not null) stored;

-- Migra o que dá para migrar já: senhas em texto puro viram bcrypt.
-- (Hashes SHA-256 não podem ser convertidos; são migrados no próximo login.)
update public.treinos
   set senha_bcrypt = extensions.crypt(senha, extensions.gen_salt('bf', 10)),
       senha        = null
 where senha is not null
   and senha <> ''
   and senha_bcrypt is null;

create table if not exists public.aluno_sessoes (
  token_hash  text primary key,
  aluno_id    text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists aluno_sessoes_aluno_idx   on public.aluno_sessoes (aluno_id);
create index if not exists aluno_sessoes_expires_idx on public.aluno_sessoes (expires_at);

create table if not exists public.aluno_login_falhas (
  chave          text primary key,          -- 'login:<usuario>' ou 'reset:<usuario>'
  falhas         int  not null default 0,
  bloqueado_ate  timestamptz,
  updated_at     timestamptz not null default now()
);

alter table public.aluno_sessoes      enable row level security;
alter table public.aluno_login_falhas enable row level security;
revoke all on public.aluno_sessoes, public.aluno_login_falhas from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helpers internos (não expostos)
-- ---------------------------------------------------------------------------
create or replace function public._sf_sha256(p text)
returns text language sql immutable
set search_path = public, extensions
as $$ select encode(extensions.digest(p, 'sha256'), 'hex') $$;

-- Retorna true se a chave está bloqueada.
create or replace function public._sf_bloqueado(p_chave text)
returns boolean language sql stable security definer
set search_path = public, extensions
as $$
  select coalesce((select bloqueado_ate > now() from public.aluno_login_falhas where chave = p_chave), false)
$$;

create or replace function public._sf_registrar_falha(p_chave text)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
begin
  insert into public.aluno_login_falhas as f (chave, falhas, updated_at)
       values (p_chave, 1, now())
  on conflict (chave) do update
     set falhas = case when f.updated_at < now() - interval '15 minutes' then 1 else f.falhas + 1 end,
         updated_at = now();
  update public.aluno_login_falhas
     set bloqueado_ate = now() + interval '15 minutes', falhas = 0
   where chave = p_chave and falhas >= 5;
end $$;

create or replace function public._sf_limpar_falhas(p_chave text)
returns void language sql security definer
set search_path = public, extensions
as $$ delete from public.aluno_login_falhas where chave = p_chave $$;

-- Confere a senha de um treino (bcrypt, ou legado SHA-256 / texto) e,
-- se for legado, migra para bcrypt.
create or replace function public._sf_confere_senha(p_treino_id text, p_senha text)
returns boolean language plpgsql security definer
set search_path = public, extensions
as $$
declare
  r record;
  ok boolean := false;
begin
  select id, senha, senha_hash, senha_bcrypt into r
    from public.treinos where id::text = p_treino_id;
  if not found or p_senha is null or p_senha = '' then
    return false;
  end if;

  if r.senha_bcrypt is not null then
    ok := extensions.crypt(p_senha, r.senha_bcrypt) = r.senha_bcrypt;
  elsif r.senha_hash is not null then
    ok := public._sf_sha256(p_senha) = r.senha_hash;
  elsif r.senha is not null then
    ok := p_senha = r.senha;
  end if;

  if ok and r.senha_bcrypt is null then
    update public.treinos
       set senha_bcrypt = extensions.crypt(p_senha, extensions.gen_salt('bf', 10)),
           senha_hash = null, senha = null
     where id = r.id;
  end if;
  return ok;
end $$;

-- Grava nova senha (sempre bcrypt) e apaga formatos legados.
create or replace function public._sf_grava_senha(p_treino_id text, p_senha text)
returns void language sql security definer
set search_path = public, extensions
as $$
  update public.treinos
     set senha_bcrypt = extensions.crypt(p_senha, extensions.gen_salt('bf', 10)),
         senha_hash = null, senha = null
   where id::text = p_treino_id
$$;

-- Cria sessão e devolve o token em claro (única vez que ele existe).
create or replace function public._sf_criar_sessao(p_aluno_id text)
returns text language plpgsql security definer
set search_path = public, extensions
as $$
declare
  tok text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from public.aluno_sessoes where expires_at < now();
  insert into public.aluno_sessoes (token_hash, aluno_id, expires_at)
       values (public._sf_sha256(tok), p_aluno_id, now() + interval '90 days');
  return tok;
end $$;

-- Valida a sessão e devolve aluno_id (ou null). Renova a validade (sliding).
create or replace function public._sf_sessao_aluno(p_sessao text)
returns text language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_aluno text;
begin
  if p_sessao is null or length(p_sessao) <> 64 then
    return null;
  end if;
  update public.aluno_sessoes
     set expires_at = greatest(expires_at, now() + interval '90 days')
   where token_hash = public._sf_sha256(p_sessao) and expires_at > now()
  returning aluno_id into v_aluno;
  return v_aluno;
end $$;

-- Treino mais recente do aluno no formato que o front espera.
create or replace function public._sf_treino_json(p_aluno_id text)
returns json language sql stable security definer
set search_path = public, extensions
as $$
  select json_build_object(
           'id', t.id,
           'aluno_id', t.aluno_id,
           'aluno_nome', coalesce(a.nome, 'Aluno'),
           'exercicios', t.exercicios,
           'updated_at', t.updated_at)
    from public.treinos t
    left join public.alunos a on a.id = t.aluno_id
   where t.aluno_id::text = p_aluno_id
   order by t.updated_at desc nulls last
   limit 1
$$;

-- ---------------------------------------------------------------------------
-- 3. RPCs públicas (chamadas pelo front com a chave anon)
-- ---------------------------------------------------------------------------

-- Login: devolve { ok, erro?, sessao?, treino? }
create or replace function public.aluno_login(p_usuario text, p_senha text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_usuario text := lower(trim(coalesce(p_usuario, '')));
  v_chave   text := 'login:' || v_usuario;
  t record;
begin
  if v_usuario = '' then
    return json_build_object('ok', false, 'erro', 'credenciais');
  end if;
  if public._sf_bloqueado(v_chave) then
    return json_build_object('ok', false, 'erro', 'bloqueado');
  end if;

  select id::text as id, aluno_id::text as aluno_id into t
    from public.treinos
   where lower(usuario) = v_usuario
   order by updated_at desc nulls last
   limit 1;

  if not found or not public._sf_confere_senha(t.id, p_senha) then
    perform public._sf_registrar_falha(v_chave);
    return json_build_object('ok', false, 'erro', 'credenciais');
  end if;

  perform public._sf_limpar_falhas(v_chave);
  return json_build_object(
    'ok', true,
    'sessao', public._sf_criar_sessao(t.aluno_id),
    'treino', public._sf_treino_json(t.aluno_id));
end $$;

-- Treino atual da sessão (null se sessão inválida/expirada).
create or replace function public.aluno_treino(p_sessao text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_aluno text := public._sf_sessao_aluno(p_sessao);
begin
  if v_aluno is null then return null; end if;
  return public._sf_treino_json(v_aluno);
end $$;

create or replace function public.aluno_logout(p_sessao text)
returns void language sql security definer
set search_path = public, extensions
as $$ delete from public.aluno_sessoes where token_hash = public._sf_sha256(coalesce(p_sessao, '')) $$;

-- Troca de senha logado: { ok, erro? }
create or replace function public.aluno_trocar_senha(p_sessao text, p_atual text, p_nova text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_aluno  text := public._sf_sessao_aluno(p_sessao);
  v_treino text;
  v_chave  text;
begin
  if v_aluno is null then
    return json_build_object('ok', false, 'erro', 'sessao');
  end if;
  if length(coalesce(p_nova, '')) < 6 then
    return json_build_object('ok', false, 'erro', 'senha_curta');
  end if;

  select id::text into v_treino from public.treinos
   where aluno_id::text = v_aluno and usuario is not null
   order by updated_at desc nulls last limit 1;
  if v_treino is null then
    return json_build_object('ok', false, 'erro', 'sessao');
  end if;

  v_chave := 'troca:' || v_treino;
  if public._sf_bloqueado(v_chave) then
    return json_build_object('ok', false, 'erro', 'bloqueado');
  end if;
  if not public._sf_confere_senha(v_treino, p_atual) then
    perform public._sf_registrar_falha(v_chave);
    return json_build_object('ok', false, 'erro', 'senha_atual');
  end if;

  perform public._sf_limpar_falhas(v_chave);
  perform public._sf_grava_senha(v_treino, p_nova);
  -- Derruba as outras sessões do aluno, mantém a atual.
  delete from public.aluno_sessoes
   where aluno_id = v_aluno and token_hash <> public._sf_sha256(p_sessao);
  return json_build_object('ok', true);
end $$;

-- Avaliações físicas do aluno logado.
create or replace function public.aluno_avaliacoes(p_sessao text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_aluno text := public._sf_sessao_aluno(p_sessao);
begin
  if v_aluno is null then return null; end if;
  return (
    select json_build_object(
      'aluno_nome', (select nome from public.alunos where id::text = v_aluno),
      'fichas', coalesce(json_agg(json_build_object('id', f.id, 'data', f.data, 'dados', f.dados)
                                  order by f.data desc), '[]'::json))
      from public.fichas_avaliacao f
     where f.aluno_id::text = v_aluno);
end $$;

-- Redefinição de senha (esqueci a senha) — passo 1: dica do telefone.
-- Resposta genérica para não revelar se o usuário existe.
create or replace function public.aluno_reset_iniciar(p_usuario text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_usuario text := lower(trim(coalesce(p_usuario, '')));
  v_fone text;
begin
  if public._sf_bloqueado('reset:' || v_usuario) then
    return json_build_object('ok', false, 'erro', 'bloqueado');
  end if;
  select regexp_replace(coalesce(a.telefone, ''), '\D', '', 'g') into v_fone
    from public.treinos t join public.alunos a on a.id = t.aluno_id
   where lower(t.usuario) = v_usuario
   order by t.updated_at desc nulls last limit 1;

  if v_fone is null or length(v_fone) < 4 then
    return json_build_object('ok', false, 'erro', 'indisponivel');
  end if;
  return json_build_object('ok', true, 'fone_longo', length(v_fone) >= 10);
end $$;

-- Passo 2/3: confere os 4 últimos dígitos e (se p_nova informado) grava a senha.
create or replace function public.aluno_reset_concluir(p_usuario text, p_digitos text, p_nova text default null)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_usuario text := lower(trim(coalesce(p_usuario, '')));
  v_chave   text := 'reset:' || v_usuario;
  r record;
begin
  if public._sf_bloqueado(v_chave) then
    return json_build_object('ok', false, 'erro', 'bloqueado');
  end if;

  select t.id::text as id, t.aluno_id::text as aluno_id,
         regexp_replace(coalesce(a.telefone, ''), '\D', '', 'g') as fone
    into r
    from public.treinos t join public.alunos a on a.id = t.aluno_id
   where lower(t.usuario) = v_usuario
   order by t.updated_at desc nulls last limit 1;

  if not found or length(r.fone) < 4 or right(r.fone, 4) <> coalesce(p_digitos, '') then
    perform public._sf_registrar_falha(v_chave);
    return json_build_object('ok', false, 'erro', 'digitos');
  end if;

  if p_nova is null then
    return json_build_object('ok', true);   -- só verificação (passo 2)
  end if;
  if length(p_nova) < 6 then
    return json_build_object('ok', false, 'erro', 'senha_curta');
  end if;

  perform public._sf_limpar_falhas(v_chave);
  perform public._sf_grava_senha(r.id, p_nova);
  delete from public.aluno_sessoes where aluno_id = r.aluno_id;
  return json_build_object('ok', true);
end $$;

-- Link de primeiro acesso (definir-acesso.html) — consulta.
create or replace function public.token_acesso_info(p_token text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  r record;
begin
  select k.used_at, k.expires_at, a.nome, t.usuario into r
    from public.tokens_acesso k
    left join public.alunos  a on a.id = k.aluno_id
    left join public.treinos t on t.id = k.treino_id
   where k.token::text = p_token;

  if not found or r.expires_at < now() then
    return json_build_object('status', 'invalido');
  end if;
  if r.used_at is not null then
    return json_build_object('status', 'usado');
  end if;
  return json_build_object('status', 'ok',
                           'primeiro_nome', split_part(coalesce(r.nome, ''), ' ', 1),
                           'usuario', r.usuario);
end $$;

-- Link de primeiro acesso — grava usuário e senha e consome o token.
create or replace function public.token_acesso_definir(p_token text, p_usuario text, p_senha text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_usuario text := lower(trim(coalesce(p_usuario, '')));
  k record;
begin
  select id, treino_id::text as treino_id, used_at, expires_at into k
    from public.tokens_acesso where token::text = p_token
   for update;

  if not found or k.expires_at < now() then
    return json_build_object('ok', false, 'erro', 'invalido');
  end if;
  if k.used_at is not null then
    return json_build_object('ok', false, 'erro', 'usado');
  end if;
  if v_usuario !~ '^[a-z0-9.]{3,30}$' then
    return json_build_object('ok', false, 'erro', 'usuario_invalido');
  end if;
  if length(coalesce(p_senha, '')) < 6 then
    return json_build_object('ok', false, 'erro', 'senha_curta');
  end if;
  if exists (select 1 from public.treinos
              where lower(usuario) = v_usuario and id::text <> k.treino_id) then
    return json_build_object('ok', false, 'erro', 'usuario_em_uso');
  end if;

  update public.treinos set usuario = v_usuario, updated_at = now()
   where id::text = k.treino_id;
  perform public._sf_grava_senha(k.treino_id, p_senha);
  update public.tokens_acesso set used_at = now() where id = k.id;
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Permissões das funções
-- ---------------------------------------------------------------------------
revoke all on function
  public._sf_sha256(text),
  public._sf_bloqueado(text),
  public._sf_registrar_falha(text),
  public._sf_limpar_falhas(text),
  public._sf_confere_senha(text, text),
  public._sf_grava_senha(text, text),
  public._sf_criar_sessao(text),
  public._sf_sessao_aluno(text),
  public._sf_treino_json(text)
from public, anon, authenticated;

grant execute on function
  public.aluno_login(text, text),
  public.aluno_treino(text),
  public.aluno_logout(text),
  public.aluno_trocar_senha(text, text, text),
  public.aluno_avaliacoes(text),
  public.aluno_reset_iniciar(text),
  public.aluno_reset_concluir(text, text, text),
  public.token_acesso_info(text),
  public.token_acesso_definir(text, text, text)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Fecha as tabelas sensíveis para `anon`
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array['treinos', 'tokens_acesso', 'fichas_avaliacao'] loop
    execute format('alter table public.%I enable row level security', tbl);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
      execute format('drop policy %I on public.%I', pol.policyname, tbl);
    end loop;
    execute format('revoke all on public.%I from anon', tbl);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', tbl);
  end loop;
end $$;
