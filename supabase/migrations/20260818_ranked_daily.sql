-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof — Ranked kovų įrašymas į matches (kad daily-task objektyvai progresuotų)
--  Ranked atlygį toliau tvarko esama sistema (rvn_report_ranked_match). Šis RPC
--  TIK įrašo matches eilutę (mode='ranked') → daily task trigeris progresuoja
--  win_ranked/play_ranked/play_match/win_match. JOKIO ekonomikos atlygio (be dvigubo).
--  Idempotentiška per client_match_id.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.rvn_record_ranked_match(
  p_client_match_id uuid, p_result text,
  p_duration_seconds int default 0, p_turns int default 0,
  p_player_actions int default 0, p_opponent_actions int default 0,
  p_opponent_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_val jsonb; v_minA int; v_valid boolean;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if p_client_match_id is not null and exists (select 1 from public.matches where user_id=v_uid and client_match_id=p_client_match_id) then
    return jsonb_build_object('duplicate', true);
  end if;
  select value into v_val from public.economy_config where key='match_validity';
  v_minA := coalesce((v_val->>'min_actions')::int,3);
  v_valid := p_duration_seconds >= coalesce((v_val->>'min_duration_seconds')::int,180)
          or p_turns            >= coalesce((v_val->>'min_turns')::int,5)
          or (p_player_actions >= v_minA and p_opponent_actions >= v_minA);
  insert into public.matches(user_id, client_match_id, opponent_id, opponent_type, mode, result,
    duration_seconds, turns_played, player_actions_count, opponent_actions_count, valid_for_rewards)
    values (v_uid, p_client_match_id, p_opponent_id, 'human', 'ranked', p_result,
    p_duration_seconds, p_turns, p_player_actions, p_opponent_actions, v_valid);
  return jsonb_build_object('ok', true, 'valid', v_valid);
end $$;
grant execute on function public.rvn_record_ranked_match(uuid, text, int, int, int, int, uuid) to authenticated;
