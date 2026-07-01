-- ════════════════════════════════════════════════════════════════════════════
-- First-session (welcome) apdovanojimas — vienkartinė naujoko dovana.
-- profiles.welcome_reward_claimed + rvn_claim_welcome_reward (idempotentiška).
-- Dovana: 500 aukso + 2 boosteriai + 1 magiška korta (be exp -> nereikia liesti
-- xp_transactions CHECK). Atlygis per rvn__grant_payload (exception-safe).
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles add column if not exists welcome_reward_claimed boolean not null default false;

create or replace function public.rvn_claim_welcome_reward()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_claimed boolean;
  v_payload jsonb := '{"gold":500,"boosters":2,"cardMin":"magic"}'::jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select welcome_reward_claimed into v_claimed from public.profiles where id = v_uid;
  if coalesce(v_claimed, false) then
    return jsonb_build_object('ok', true, 'first', false, 'reward', v_payload);
  end if;
  begin
    perform public.rvn__grant_payload(v_uid, v_payload, 'welcome');
  exception when others then null;  -- atlygis niekada nelaužia claim'o
  end;
  update public.profiles set welcome_reward_claimed = true where id = v_uid;
  return jsonb_build_object('ok', true, 'first', true, 'reward', v_payload);
end $$;

grant execute on function public.rvn_claim_welcome_reward() to authenticated;
