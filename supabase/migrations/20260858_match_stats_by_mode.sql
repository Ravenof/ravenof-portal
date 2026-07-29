-- ════════════════════════════════════════════════════════════════════════════
-- STATISTIKA PAGAL REŽIMĄ (audit #24): DI treniruotės / nereitinginis PvP /
-- reitinginės kovos ATSKIRAI, kad viešas win-rate nebūtų išpūstas DI kovomis.
-- Bendras winRate lieka rvn_get_profile_overview — UI privalo aiškiai parodyti
-- jo sudėtį (šio RPC skaičiais). Kampanija NELIEČIAMA (jos kovos nerašomos į
-- public.matches — žr. TutorialGame onCampaignResult early-return).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_get_match_mode_stats(p_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_uid uuid := coalesce(p_user_id, v_me);
  v_self boolean := (v_uid = v_me);
  v_public boolean;
  v_out jsonb;
begin
  if v_me is null then return jsonb_build_object('error','no_auth'); end if;
  select coalesce(is_public, true) into v_public from public.profiles where id = v_uid;
  if v_public is null then return jsonb_build_object('error','no_profile'); end if;
  if not v_self and not v_public then return jsonb_build_object('error','private_profile'); end if;

  select jsonb_object_agg(m.mode, jsonb_build_object(
           'matches', m.n, 'wins', m.w,
           'winRate', case when m.n > 0 then round(100.0 * m.w / m.n, 1) else 0 end))
    into v_out
    from (
      select mode, count(*)::int n, count(*) filter (where result = 'win')::int w
        from public.matches where user_id = v_uid
       group by mode
    ) m;

  return jsonb_build_object('byMode', coalesce(v_out, '{}'::jsonb));
end $$;
grant execute on function public.rvn_get_match_mode_stats(uuid) to authenticated;
