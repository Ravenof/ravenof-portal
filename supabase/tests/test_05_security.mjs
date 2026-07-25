// Saugumas — autorizacija pagal auth.uid(), RLS, kliento duomenų ignoravimas
export async function run(t) {
  const { q, rpc, check, eq, truthy, asAuthenticated } = t
  const A = '50000000-0000-4000-8000-00000000000a'
  const B = '50000000-0000-4000-8000-00000000000b'
  q(`insert into profiles(id, username, gold) values ('${A}','sec_a',1000) on conflict do nothing`)
  q(`insert into profiles(id, username, gold) values ('${B}','sec_b',1000) on conflict do nothing`)
  // Supabase numatytosios teisės (migracijose jos duodamos per grant ... to authenticated)
  q(`grant select on all tables in schema public to authenticated`)
  q(`grant usage on all sequences in schema public to authenticated`)

  rpc(A, `rvn_get_daily_quests()`)
  rpc(B, `rvn_get_daily_quests()`)
  q(`update user_daily_quests set progress = target_value, is_completed = true where user_id='${A}'`)
  const questA = q(`select id from user_daily_quests where user_id='${A}' and difficulty='hard'`)

  check('kito vartotojo questo claim atmetamas', () => {
    const goldA = q(`select gold from profiles where id='${A}'`)
    const r = rpc(B, `rvn_claim_daily_quest(${questA}, 'sec1')`)
    eq(r.error, 'not_claimable', 'klaida')
    eq(q(`select gold from profiles where id='${A}'`), goldA, 'A balansas nepakito')
    eq(q(`select gold from profiles where id='${B}'`), '1000', 'B balansas nepakito')
  })

  check('kito vartotojo login claim atmetamas (tapatybė iš auth.uid(), ne iš parametro)', () => {
    rpc(A, `rvn_claim_login_reward('sec-login')`)
    eq(q(`select count(*) from user_login_claims where user_id='${A}'`), '1', 'A turi 1 claim');
    eq(q(`select count(*) from user_login_claims where user_id='${B}'`), '0', 'B neturi claim')
  })

  check('kito vartotojo pending choice išspręsti negalima', () => {
    // sukuriam A pasirinkimą per sezono atlygį
    q(`select rvn__add_pass_xp('${A}', 5000)`)
    const r = rpc(A, `rvn_claim_season_reward_v2(5, 'free', 'sec-s5')`)
    const cid = r.pendingChoices[0].choiceId
    const fid = r.pendingChoices[0].options[0].factionId
    const bad = rpc(B, `rvn_resolve_faction_booster_choice('${cid}'::uuid, ${fid}, 'sec2')`)
    eq(bad.error, 'choice_not_found', 'klaida')
    eq(q(`select status from reward_choices where id='${cid}'`), 'pending', 'liko pending')
    eq(q(`select count(*) from user_collections where user_id='${B}'`), '0', 'B kolekcija tuščia')
  })

  check('kito vartotojo kortos pasirinkimo išspręsti negalima', () => {
    q(`select rvn__add_pass_xp('${A}', 3000)`)
    const r = rpc(A, `rvn_claim_season_reward_v2(7, 'free', 'sec-s7')`)
    const c = r.pendingChoices.find((x) => x.choiceType === 'card')
    const bad = rpc(B, `rvn_resolve_card_choice('${c.choiceId}'::uuid, '${c.options[0].cardId}'::uuid, 'sec3')`)
    eq(bad.error, 'choice_not_found', 'klaida')
  })

  check('klientas negali perduoti atlygio sumos — tokių parametrų nėra', () => {
    const bad = q(`select coalesce(string_agg(p.proname || '(' || pg_get_function_arguments(p.oid) || ')', ' | '), '')
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname like 'rvn_%'
        and p.proname in ('rvn_claim_login_reward','rvn_claim_season_reward_v2','rvn_claim_all_season_rewards',
                          'rvn_claim_daily_quest','rvn_claim_daily_chest_v2','rvn_reroll_daily_quest',
                          'rvn_resolve_card_choice','rvn_resolve_faction_booster_choice','rvn_unlock_season_pass_v2')
        and (pg_get_function_arguments(p.oid) ilike '%amount%'
          or pg_get_function_arguments(p.oid) ilike '%p_user%'
          or pg_get_function_arguments(p.oid) ilike '%user_id%'
          or pg_get_function_arguments(p.oid) ilike '%reward%')`)
    eq(bad, '', 'nerasta jokių sumos/vartotojo parametrų: ' + bad)
  })

  check('visos v2 claim funkcijos yra SECURITY DEFINER su fiksuotu search_path', () => {
    const bad = q(`select coalesce(string_agg(p.proname, ', '), '') from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in
        ('rvn_claim_login_reward','rvn_claim_season_reward_v2','rvn_claim_all_season_rewards',
         'rvn_claim_daily_quest','rvn_claim_daily_chest_v2','rvn_reroll_daily_quest',
         'rvn_resolve_card_choice','rvn_resolve_faction_booster_choice','rvn_unlock_season_pass_v2',
         'rvn_get_progression_snapshot','rvn_continue_pending_claims')
        and (not p.prosecdef or not (p.proconfig::text ilike '%search_path%'))`)
    eq(bad, '', 'netvarkingos funkcijos: ' + bad)
  })

  check('RLS: vartotojas mato TIK savo progresą', () => {
    const own = asAuthenticated(A, `select count(*) from user_daily_quests where user_id='${A}'`)
    const foreign = asAuthenticated(A, `select count(*) from user_daily_quests where user_id='${B}'`)
    eq(own, '3', 'savo questai matomi')
    eq(foreign, '0', 'svetimi questai nematomi')
    eq(asAuthenticated(B, `select count(*) from user_login_claims where user_id='${A}'`), '0', 'svetimi login claim nematomi')
    eq(asAuthenticated(B, `select count(*) from reward_choices where user_id='${A}'`), '0', 'svetimi pasirinkimai nematomi')
    eq(asAuthenticated(B, `select count(*) from progression_reward_grants where user_id='${A}'`), '0', 'svetimas audit log nematomas')
  })

  check('RLS: klientas negali rašyti į progreso lenteles tiesiogiai', () => {
    for (const stmt of [
      `insert into user_login_claims(cycle_id, user_id, day_number, claim_date) values (gen_random_uuid(), '${B}', 1, current_date)`,
      `update profiles set gold = gold + 999999 where id = '${B}'`,
      `insert into user_daily_chests(user_id, date_key) values ('${B}', current_date)`,
      `update reward_choices set status='resolved' where user_id='${B}'`,
    ]) {
      let blocked = false
      try { asAuthenticated(B, stmt) } catch { blocked = true }
      truthy(blocked, 'užblokuota: ' + stmt.slice(0, 60))
    }
  })

  check('definition lentelės klientui tik skaitomos', () => {
    let blocked = false
    try { asAuthenticated(B, `update login_cycle_reward_defs set rewards = '[{"type":"silver","amount":999999}]'::jsonb where day_number=1`) }
    catch { blocked = true }
    truthy(blocked, 'atlygių lentelės redaguoti negalima')
    truthy(Number(asAuthenticated(B, `select count(*) from login_cycle_reward_defs`)) > 0, 'skaityti galima')
  })

  check('neautentifikuotas kvietimas grąžina no_auth', () => {
    const out = t.psql(['-d', t.DB, '-tAc',
      `select set_config('test.uid','',false); select rvn_get_progression_snapshot();`]).trim().split('\n')
    const res = JSON.parse(out[out.length - 1])
    eq(res.error, 'no_auth', 'klaida')
  })

  check('bendras snapshot grąžina visas tris sistemas', () => {
    const s = rpc(A, `rvn_get_progression_snapshot()`)
    truthy(s.login && s.season && s.quests, 'login+season+quests')
    truthy(s.balances && typeof s.economyVersion === 'number', 'balansai ir ekonomikos versija')
    truthy(Array.isArray(s.pendingChoices), 'pasirinkimų eilė')
  })
}
