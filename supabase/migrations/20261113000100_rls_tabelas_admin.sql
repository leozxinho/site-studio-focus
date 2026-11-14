-- ============================================================================
-- Studio Focus — RLS nas tabelas do painel admin
-- ----------------------------------------------------------------------------
-- A chave anon está no HTML público. Sem RLS, qualquer pessoa lê/altera alunos,
-- pagamentos, despesas etc. Esta migration:
--   * habilita RLS em todas as tabelas usadas pelo painel;
--   * remove as policies existentes e cria uma única: só admin (is_admin()) acessa;
--   * revoga tudo de `anon`;
--   * remove `alarmes_push`: os alarmes agora ficam só no Cloudflare Worker
--     (workers/alarms.js + KV). Os alunos ressincronizam ao abrir o app.
--
-- Pré-requisito: migration 20261113000000 (cria public.is_admin()).
-- ============================================================================

do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array[
    'agendamentos_avaliacao', 'alunos', 'avaliacoes', 'campanhas',
    'configuracoes_admin', 'despesas', 'exercicios_personalizados',
    'frequencias', 'leads', 'pagamentos', 'produtos', 'vendas'
  ] loop
    if to_regclass('public.' || tbl) is null then
      raise notice 'Tabela % não existe — ignorada', tbl;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', tbl);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
      execute format('drop policy %I on public.%I', pol.policyname, tbl);
    end loop;
    execute format('revoke all on public.%I from anon', tbl);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', tbl);
  end loop;
end $$;

-- Sistema de alarmes unificado no Worker: tabela e RPC antigas saem.
drop function if exists public.alarmes_sync(text, jsonb);
drop table if exists public.alarmes_push;
