-- ════════════════════════════════════════════════════════════════════════════
-- PASIEKIMŲ PRANEŠIMAI + ATOMINIS ATLYGIS.
-- 1) rvn__ach_set: užbaigimas atominis (concurrent-safe) — atlygis skiriamas
--    LYGIAI VIENĄ kartą; sukuriamas pranešimas su STABILIU ID route'u:
--    /digital/profile/achievements?achievementId=<code>
--    (kliento pusė pagal code atveria/išryškina pasiekimą; pervadinti
--    pasiekimai atsprendžiami pagal code, ne pagal pavadinimą).
-- 2) notify_badge_earned (legacy user_badges): nuoroda nebe į /me#badges —
--    Digital vartotojas patenka į Digital Pasiekimus.
-- 3) Vienkartinis senų pranešimų remontas: /me#badges → Digital route.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Atominis užbaigimas + pranešimas ──────────────────────────────────────
create or replace function public.rvn__ach_set(p_user uuid, p_code text, p_progress int)
returns void language plpgsql security definer set search_path = public as $$
declare v_target int; v_rewards jsonb; v_name text; v_completed boolean := false;
begin
  select target, rewards, name_lt into v_target, v_rewards, v_name from public.rvn_achievements
   where code = p_code and is_active;
  if v_target is null or v_target <= 0 then return; end if;   -- nesekamas

  insert into public.rvn_achievement_progress(user_id, code, progress, updated_at)
    values (p_user, p_code, greatest(0, p_progress), now())
  on conflict (user_id, code) do update
    set progress = greatest(public.rvn_achievement_progress.progress, excluded.progress),
        updated_at = now();

  if p_progress >= v_target then
    -- ATOMINIS užbaigimas: `where completed_at is null` garantuoja, kad du
    -- lygiagretūs kvietimai negalės abu skirti atlygio (concurrent-safe).
    update public.rvn_achievement_progress
       set completed_at = now(), granted_at = now()
     where user_id = p_user and code = p_code and completed_at is null;
    v_completed := found;

    if v_completed then
      -- atlygis AUTOMATIŠKAI, per bendrą Progression v2 variklį (ledger'is
      -- progression_reward_grants + reward_transactions; source='achievement:<code>')
      if v_rewards is not null and jsonb_array_length(v_rewards) > 0 then
        perform public.rvn__grant_rewards_v2(p_user, v_rewards, 'achievement', p_code);
      end if;
      -- pranešimas su STABILIU code (ne lokalizuotu pavadinimu!)
      begin
        insert into public.notifications (user_id, type, title, message, link)
        values (p_user, 'achievement',
                '🏆 Pasiekimas įvykdytas!',
                coalesce(v_name, p_code),
                '/digital/profile/achievements?achievementId=' || p_code);
      exception when undefined_table then null; -- notifications gali nebūti seed'intoje DB
      end;
    end if;
  end if;
end $$;

-- ── 2) Legacy ženkleliai → Digital Pasiekimų puslapis ────────────────────────
create or replace function public.notify_badge_earned() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_badge_title text;
  v_badge_icon text;
begin
  select title, icon into v_badge_title, v_badge_icon
  from public.badges where id = new.badge_id;

  insert into public.notifications (user_id, type, title, message, link)
  values (
    new.user_id,
    'badge_earned',
    coalesce(v_badge_icon, '🏅') || ' Naujas ženklelis!',
    v_badge_title,
    '/digital/profile/achievements'
  );
  return new;
end;
$$;

-- ── 3) Seni pranešimai: nebeveda „į pagrindinį" / web portalą ────────────────
update public.notifications
   set link = '/digital/profile/achievements'
 where link = '/me#badges';

-- 4) Terminologija: Reaction/Battlecry -> lietuviski terminai (audit #23)
-- (Saltinio CSV asffa/asset-maps/achievement-manifest.csv atnaujinti atskirai!)
update public.rvn_achievements set requirement_lt = 'Panaudokite pirmą Reakcijos kortą' where requirement_lt = 'Panaudokite pirmą Reaction kortą';
update public.rvn_achievements set requirement_lt = 'Suaktyvinkite 2 Reakcijas vienoje grandinėje' where requirement_lt = 'Suaktyvinkite 2 Reaction vienoje grandinėje';
update public.rvn_achievements set requirement_lt = 'Panaudokite 50 Reakcijų' where requirement_lt = 'Panaudokite 50 Reaction';
update public.rvn_achievements set requirement_lt = 'Suaktyvinkite pirmą Kovos šūksnį' where requirement_lt = 'Suaktyvinkite pirmą Battlecry';
update public.rvn_achievements set requirement_lt = 'Suaktyvinkite 100 Kovos šūksnio arba iškvietimo efektų' where requirement_lt = 'Suaktyvinkite 100 Battlecry arba summon efektų';
