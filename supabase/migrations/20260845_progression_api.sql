-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — BENDRAS API SLUOKSNIS
--  • rvn_get_progression_snapshot() — viskas vienu kvietimu (login+season+quests)
--  • rvn_continue_pending_claims()  — tęsia „Claim All" po pasirinkimo
--  • rvn_get_progression_config()   — ekonomikos konfigūracija tik skaitymui
--  • saugumo patikros: viskas per auth.uid(); klientas neperduoda user_id
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_get_progression_snapshot()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  return jsonb_build_object(
    'login',   public.rvn_get_login_cycle(),
    'season',  public.rvn_get_season_path_v2(),
    'quests',  public.rvn_get_daily_quests_v2(),
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'economyVersion', public.rvn__economy_version(),
    'serverTime', now()
  );
end $$;

-- Tęsia nutrūkusį „Claim All" (po to, kai pasirinkimai išspręsti)
create or replace function public.rvn_continue_pending_claims(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if jsonb_array_length(public.rvn__pending_choices(v_uid)) > 0 then
    return jsonb_build_object('status','choice_required','grantedRewards','[]'::jsonb,
      'pendingChoices', public.rvn__pending_choices(v_uid),
      'snapshot', public.rvn_get_progression_snapshot());
  end if;
  return public.rvn_claim_all_season_rewards(p_idempotency_key);
end $$;

-- Ekonomikos konfigūracija klientui (tik skaitymui; sumos NIEKADA iš kliento)
create or replace function public.rvn_get_progression_config()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'economyVersion', public.rvn__economy_version(),
    'loginCycle', jsonb_build_object(
      'length', 31,
      'rewards', coalesce((select jsonb_agg(jsonb_build_object('day',day_number,'rewards',rewards,'milestone',is_milestone) order by day_number)
                           from public.login_cycle_reward_defs where economy_version = public.rvn__economy_version()), '[]'::jsonb)),
    'seasonPath', (select value from public.economy_config where key='season_path_v2'),
    'dailyQuests', (select value from public.economy_config where key='daily_quests_v2'),
    'booster', (select value from public.economy_config where key='booster_v2'),
    'factions', coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'name',name,'alignment',alignment))
                          from public.rvn__selectable_factions()), '[]'::jsonb)
  );
end $$;

grant execute on function public.rvn_get_progression_snapshot() to authenticated;
grant execute on function public.rvn_continue_pending_claims(text) to authenticated;
grant execute on function public.rvn_get_progression_config() to authenticated;

-- ── Saugumo pastaba (RLS) ──────────────────────────────────────────────────
--  Visos v2 lentelės: RLS įjungtas, SELECT tik savo eilutėms (user_id=auth.uid()),
--  jokių INSERT/UPDATE/DELETE politikų klientui — visi rašymai vyksta tik per
--  security definer RPC, kurie tapatybę ima iš auth.uid(), o ne iš parametro.
--  Definition lentelės (login_cycle_reward_defs, daily_quest_templates,
--  season_reward_defs) — vieša tik SELECT teisė; rašymas tik admin rolei.
