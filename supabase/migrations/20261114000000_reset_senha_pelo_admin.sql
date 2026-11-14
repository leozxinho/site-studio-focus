-- ============================================================================
-- Studio Focus — Redefinição de senha só pelo admin
-- ----------------------------------------------------------------------------
-- Antes: "esqueci a senha" pedia só o usuário (previsível) e os 4 últimos dígitos
-- do telefone. ~480 tentativas/dia contra 10.000 combinações: conta tomada em
-- poucos dias, ou na hora por quem conhece o telefone do aluno.
--
-- Agora: o aluno pede ao personal, que gera um novo link (tokens_acesso: UUID,
-- uso único, 7 dias) no painel. Ao usar o link, as sessões abertas do aluno
-- são encerradas.
--
-- Pré-requisito: migration 20261113000000.
-- ============================================================================

drop function if exists public.aluno_reset_iniciar(text);
drop function if exists public.aluno_reset_concluir(text, text, text);
delete from public.aluno_login_falhas where chave like 'reset:%';

-- Igual à versão anterior, mais: invalida tokens pendentes do mesmo treino e
-- derruba as sessões do aluno (quem tinha a senha antiga perde o acesso).
create or replace function public.token_acesso_definir(p_token text, p_usuario text, p_senha text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_usuario text := lower(trim(coalesce(p_usuario, '')));
  k record;
  v_aluno text;
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
   where id::text = k.treino_id
  returning aluno_id::text into v_aluno;
  perform public._sf_grava_senha(k.treino_id, p_senha);
  update public.tokens_acesso set used_at = now()
   where treino_id::text = k.treino_id and used_at is null;
  delete from public.aluno_sessoes where aluno_id = v_aluno;
  perform public._sf_limpar_falhas('login:' || v_usuario);
  return json_build_object('ok', true);
end $$;

grant execute on function public.token_acesso_definir(text, text, text) to anon, authenticated;
