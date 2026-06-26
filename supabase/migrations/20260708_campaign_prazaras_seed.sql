-- ════════════════════════════════════════════════════════════════════════════
-- SAMPLE CAMPAIGN — "Prazaro kilmė: Varnagrado užrakinimas"
-- Dark military fantasy. Demon war, siege of Varnagrad, betrayal & sealing.
-- Demonstrates: story-only, standard battle, ambush, gate/wave defense, boss,
-- branching story node, custom objectives, pre/post cutscenes, rewards.
-- Idempotent: keyed on slug; re-running replaces the sample cleanly.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_camp uuid;
  v_demon int := (select id from public.factions where name = 'Demonų orda' limit 1);
  v_inq   int := (select id from public.factions where name = 'Inkvizicijos legionas' limit 1);
  v_light int := (select id from public.factions where name = 'Šviesos pulkas' limit 1);
  -- chapters
  ch1 uuid := gen_random_uuid(); ch2 uuid := gen_random_uuid(); ch3 uuid := gen_random_uuid(); ch4 uuid := gen_random_uuid();
  -- nodes
  n1 uuid := gen_random_uuid(); n2 uuid := gen_random_uuid(); n3 uuid := gen_random_uuid();
  n4 uuid := gen_random_uuid(); n5 uuid := gen_random_uuid(); n6 uuid := gen_random_uuid();
  n7 uuid := gen_random_uuid(); n8 uuid := gen_random_uuid(); n9 uuid := gen_random_uuid();
  n10 uuid := gen_random_uuid(); n11 uuid := gen_random_uuid(); n12 uuid := gen_random_uuid();
  -- cutscenes
  cs_intro uuid := gen_random_uuid(); cs_breach uuid := gen_random_uuid(); cs_inq uuid := gen_random_uuid();
  cs_light uuid := gen_random_uuid(); cs_cmd uuid := gen_random_uuid(); cs_orders uuid := gen_random_uuid();
  cs_end uuid := gen_random_uuid();
begin
  -- clean prior sample
  delete from public.campaigns where slug = 'prazaro-kilme-varnagrado-uzrakinimas';

  insert into public.campaigns (id, slug, title, subtitle, description, campaign_type, lore_period, related_factions, visibility, sort_order)
  values (gen_random_uuid(), 'prazaro-kilme-varnagrado-uzrakinimas',
    'Prazaro kilmė: Varnagrado užrakinimas',
    'Demonų karas · Varnagrado gynyba · išdavystė',
    'Tamsi karinė fantazija. Sniegas, akmens sienos, juodos vėliavos, demonų maras ir išsekę kareiviai. Prazaras – dar tik kapralas, mūšio lauko vadas – gina Varnagradą nuo Demonų ordos, kol imperija nusprendžia regioną užrakinti ir paaukoti.',
    'story', 'demonu-karas', array['Demonų orda','Inkvizicijos legionas','Šviesos pulkas'], 'draft', 0)
  returning id into v_camp;

  insert into public.campaign_chapters (id, campaign_id, title, description, sort_order) values
    (ch1, v_camp, 'I skyrius: Pirmieji dūmai', 'Pirmieji demonų karo ženklai prie Vethago kalno.', 0),
    (ch2, v_camp, 'II skyrius: Apgultis prasideda', 'Varnagrado sienos atlaiko pirmąsias bangas.', 1),
    (ch3, v_camp, 'III skyrius: Šviesa ir pelenai', 'Atvyksta Šviesos pulkas ir Inkvizicijos legionas – ne paguodai.', 2),
    (ch4, v_camp, 'IV skyrius: Užrakintas regionas', 'Imperija priima sprendimą. Varnagradas užsklendžiamas.', 3);

  -- ── CUTSCENES ──
  insert into public.campaign_cutscenes (id, campaign_id, title, type, skippable, autoplay, steps) values
   (cs_intro, v_camp, 'Sargybos bokšto įspėjimas', 'dialogue', true, false, $j$[
     {"id":"s1","side":"narrator","text":"Žiema atėjo anksti. Virš Vethago kalno dangus rūko juodais dūmais."},
     {"id":"s2","side":"left","characterName":"Sargas Kernius","text":"Vade... tai ne gaisras. Tie dūmai juda prieš vėją. Tai jie. Orda."},
     {"id":"s3","side":"right","characterName":"Kapralas Prazaras","text":"Skambink varpą. Uždaryk vidinius vartus. Varnagradas dar neparuoštas, bet pasiruošti privalome dabar."}
   ]$j$::jsonb),
   (cs_breach, v_camp, 'Pirmasis proveržis', 'dialogue', true, false, $j$[
     {"id":"s1","side":"narrator","text":"Išorinė siena laikėsi tris dienas. Ketvirtą – nelaikė."},
     {"id":"s2","side":"right","characterName":"Kapralas Prazaras","text":"Atsitraukit į antrą liniją! Niekas nepalieka spragos atviros – užtverkit kūnais, jei reikės."}
   ]$j$::jsonb),
   (cs_inq, v_camp, 'Inkvizitoriaus ugnis', 'dialogue', true, false, $j$[
     {"id":"s1","side":"left","characterName":"Inkvizitorius","text":"Tavo žmonės dega, kapralei. Bet ugnis – tai ir mūsų ginklas. Šventoji liepsna neklausia, kas po ja stovi."},
     {"id":"s2","side":"right","characterName":"Kapralas Prazaras","text":"Tada nukreipk ją į ordą, ne į mano kareivius."}
   ]$j$::jsonb),
   (cs_light, v_camp, 'Šviesos pulko vėliavos', 'dialogue', true, false, $j$[
     {"id":"s1","side":"narrator","text":"Baltos vėliavos pakilo virš sniego. Bet šviesa, kuri ateina per vėlai, šildo tik mirusiuosius."},
     {"id":"s2","side":"left","characterName":"Šviesos pulko kapitonas","text":"Mes laikysim dešinįjį flangą. Melskis, kad to pakaktų."}
   ]$j$::jsonb),
   (cs_cmd, v_camp, 'Prazaras perima vadovavimą', 'dialogue', true, false, $j$[
     {"id":"s1","side":"narrator","text":"Vyresnysis vadas krito. Liko Prazaras – ir keli šimtai išsekusių."},
     {"id":"s2","side":"right","characterName":"Kapralas Prazaras","text":"Nuo šios nakties Varnagradą vedu aš. Niekas nebėga. Mes esame siena."}
   ]$j$::jsonb),
   (cs_orders, v_camp, 'Imperijos įsakymas', 'dialogue', true, false, $j$[
     {"id":"s1","side":"left","characterName":"Imperijos pasiuntinys","text":"Įsakymas iš sosto: Varnagradas užsklendžiamas. Vartai užmūrijami. Regionas paaukojamas, kad maras nepasiektų imperijos."},
     {"id":"s2","side":"right","characterName":"Kapralas Prazaras","text":"O žmonės viduje?"},
     {"id":"s3","side":"left","characterName":"Imperijos pasiuntinys","text":"Jie jau už sienos. Pasirink, kapralei – paklusti ar likti."},
     {"id":"choice","side":"right","characterName":"Kapralas Prazaras","text":"...","choices":[
       {"key":"obey","label":"Paklusti įsakymui","nextStepId":"end"},
       {"key":"stay","label":"Likti su gynėjais","nextStepId":"end"}
     ]},
     {"id":"end","side":"narrator","text":"Kad ir ką jis pasirinko – vartai vis tiek užsivėrė."}
   ]$j$::jsonb),
   (cs_end, v_camp, 'Pabaiga: Varnagradas užsklęstas', 'dialogue', false, false, $j$[
     {"id":"s1","side":"narrator","text":"Paskutinis akmuo užmūrijo paskutinį vartą. Iš vidaus nesigirdėjo nei riksmo – tik tyla."},
     {"id":"s2","side":"narrator","text":"Gynėjai suprato: jie nebuvo pamiršti. Jie buvo paaukoti."},
     {"id":"s3","side":"right","characterName":"Prazaras","text":"Jei imperija atima vardą, aš pasiimsiu kitą. Ir jie dar prisimins Varnagradą."}
   ]$j$::jsonb);

  -- ── NODES ──
  -- Chapter 1
  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, pre_cutscene_id, post_cutscene_id, battle_config, scenario, reward_payload, sort_order)
  values
   (n1, v_camp, ch1, 'Sargybos bokšto įspėjimas', 'Pirmasis ženklas', 'Kernius pastebi dūmus prie Vethago kalno.',
     22, 30, 'story', 'STORY_ONLY', '{"type":"always"}', '{}', array[n2],
     $j$[{"id":"win","kind":"win","label":"Sužinok, kas artėja","primary":true}]$j$::jsonb,
     cs_intro, null, '{}'::jsonb, '{}'::jsonb, '{"exp":40}'::jsonb, 0);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, battle_config, reward_payload, sort_order)
  values
   (n2, v_camp, ch1, 'Kelias į Varnagradą', 'Demonų žvalgai', 'Pirmasis susidūrimas su ordos žvalgais kelyje.',
     31, 38, 'battle', 'STANDARD_CARD_BATTLE', '{"type":"all_prev"}', array[n1], array[n3],
     $j$[{"id":"win","kind":"win","label":"Sutriuškink demonų žvalgus","primary":true},
         {"id":"fast","kind":"defeat_within","label":"Laimėk iki 10 ėjimo","primary":false,"params":{"turns":10}}]$j$::jsonb,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','faction','enemyFactionId',v_demon,'enemyName','Demonų žvalgai','difficulty','easy','aiProfile','aggressive'),
     '{"gold":120,"exp":60}'::jsonb, 1);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, post_cutscene_id, battle_config, scenario, reward_payload, sort_order)
  values
   (n3, v_camp, ch1, 'Pirmasis proveržis', 'Pasala prie spragos', 'Orda prasiveržia pro išorinę sieną. Gynėjų mažai.',
     40, 33, 'siege', 'AMBUSH', '{"type":"all_prev"}', array[n2], array[n4],
     $j$[{"id":"win","kind":"win","label":"Atremk pasalą","primary":true},
         {"id":"survive","kind":"survive_turns","label":"Išlaikyk liniją 6 ėjimus","primary":false,"params":{"turns":6}}]$j$::jsonb,
     cs_breach,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','faction','enemyFactionId',v_demon,'enemyName','Ordos puolėjai','difficulty','normal','aiProfile','aggressive'),
     jsonb_build_object('startingEnemyBoard', $j$[]$j$::jsonb, 'rules', $j$[{"trigger":"onTurnStart","turn":3,"actions":[{"type":"dialogue","text":"Iš šono! Dar daugiau jų!","characterName":"Sargas Kernius"}]}]$j$::jsonb),
     '{"gold":150,"exp":80,"cardMin":"magic"}'::jsonb, 2);

  -- Chapter 2
  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, battle_config, scenario, reward_payload, sort_order)
  values
   (n4, v_camp, ch2, 'Laikyk išorinius vartus', 'Vartų gynyba', 'Vartai turi atlaikyti. Jei jie krenta – krenta miestas.',
     49, 40, 'gate', 'GATE_DEFENSE', '{"type":"all_prev"}', array[n3], array[n5],
     $j$[{"id":"win","kind":"win","label":"Apgink vartus","primary":true},
         {"id":"gatehp","kind":"protect_objective","label":"Vartai išlieka su ≥10 HP","primary":false,"params":{"objectiveId":"gate","hp":10}}]$j$::jsonb,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','faction','enemyFactionId',v_demon,'enemyName','Ordos taranas','difficulty','normal','aiProfile','objective_attacker'),
     jsonb_build_object('objectives', jsonb_build_array(jsonb_build_object('id','gate','kind','gate','label','Išoriniai vartai','hp',20,'maxHp',20,'side','player','x',50,'y',80))),
     '{"gold":180,"exp":90}'::jsonb, 3);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, battle_config, scenario, reward_payload, sort_order)
  values
   (n5, v_camp, ch2, 'Naktis ant sienos', 'Bangų gynyba', 'Demonai ateina bangomis per visą naktį. Reikia ištverti.',
     57, 35, 'wave', 'WAVE_DEFENSE', '{"type":"all_prev"}', array[n4], array[n6],
     $j$[{"id":"win","kind":"win","label":"Ištverk visas bangas","primary":true},
         {"id":"survive","kind":"survive_turns","label":"Išgyvenk 8 ėjimus","primary":false,"params":{"turns":8}}]$j$::jsonb,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','waves','enemyFactionId',v_demon,'enemyName','Naktinė orda','difficulty','hard','aiProfile','wave_attacker'),
     jsonb_build_object('survivalTurns',8,'waves', jsonb_build_array(
       jsonb_build_object('id','demon_wave_01','name','Pirmoji banga','triggerType','turn','turn',2,'spawnSide','top','warningText','Pirmoji banga artėja!','mustClear',true,'unitPool', $j$[]$j$::jsonb),
       jsonb_build_object('id','demon_wave_02','name','Antroji banga','triggerType','turn','turn',5,'spawnSide','top','warningText','Antra banga – laikykitės!','mustClear',true,'unitPool', $j$[]$j$::jsonb),
       jsonb_build_object('id','demon_wave_03','name','Aušros puolimas','triggerType','turn','turn',8,'spawnSide','top','warningText','Paskutinis puolimas prieš aušrą!','mustClear',true,'unitPool', $j$[]$j$::jsonb)
     )),
     '{"gold":220,"exp":110,"boosters":1}'::jsonb, 4);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, pre_cutscene_id, battle_config, scenario, reward_payload, sort_order)
  values
   (n6, v_camp, ch2, 'Inkvizitoriaus ugnis', 'Atvyksta legionas', 'Inkvizicijos legionas atneša šventąją liepsną – ir savo kainą.',
     64, 42, 'battle', 'STANDARD_CARD_BATTLE', '{"type":"all_prev"}', array[n5], array[n7],
     $j$[{"id":"win","kind":"win","label":"Laimėk su legiono parama","primary":true},
         {"id":"spells","kind":"no_more_than","label":"Panaudok ne daugiau 3 burtų","primary":false,"params":{"count":3}}]$j$::jsonb,
     cs_inq,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','faction','enemyFactionId',v_demon,'enemyName','Demonų maras','difficulty','normal','aiProfile','tactical'),
     jsonb_build_object('rules', $j$[{"trigger":"onTurnStart","turn":2,"actions":[{"type":"dialogue","text":"Šventoji liepsna – degink!","characterName":"Inkvizitorius"}]}]$j$::jsonb),
     '{"gold":200,"exp":100}'::jsonb, 5);

  -- Chapter 3
  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, pre_cutscene_id, battle_config, reward_payload, sort_order)
  values
   (n7, v_camp, ch3, 'Šviesos pulko vėliavos', 'Mišri sąjunga', 'Šviesos pulkas stoja į dešinįjį flangą. Šventa, bet vėluojanti pagalba.',
     59, 52, 'battle', 'STANDARD_CARD_BATTLE', '{"type":"all_prev"}', array[n6], array[n8],
     $j$[{"id":"win","kind":"win","label":"Atremk puolimą su Šviesos pulku","primary":true}]$j$::jsonb,
     cs_light,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','faction','enemyFactionId',v_demon,'enemyName','Ordos antplūdis','difficulty','normal','aiProfile','aggressive'),
     '{"gold":210,"exp":110}'::jsonb, 6);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, battle_config, scenario, reward_payload, sort_order)
  values
   (n8, v_camp, ch3, 'Maras po žeme', 'Korupcija', 'Po Varnagradu plinta demonų prakeiksmas. Korupcija graužia gynėjus iš vidaus.',
     51, 58, 'elite', 'CUSTOM', '{"type":"all_prev"}', array[n7], array[n9],
     $j$[{"id":"win","kind":"win","label":"Išvalyk užkrėstus tunelius","primary":true},
         {"id":"keep","kind":"keep_alive_count","label":"Išlaikyk ≥2 Varnagrado gynėjus","primary":false,"params":{"count":2}}]$j$::jsonb,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','faction','enemyFactionId',v_demon,'enemyName','Prakeiktas maras','difficulty','hard','aiProfile','chaotic_demon'),
     jsonb_build_object('startingCurses', $j$[]$j$::jsonb, 'rules', $j$[{"trigger":"onTurnStart","everyTurns":3,"actions":[{"type":"dialogue","text":"Maras vėl kyla...","characterName":"Sargas Kernius"}]}]$j$::jsonb),
     '{"gold":240,"exp":130,"cardMin":"unique"}'::jsonb, 7);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, pre_cutscene_id, battle_config, scenario, reward_payload, sort_order)
  values
   (n9, v_camp, ch3, 'Prazaras perima vadovavimą', 'Elitinė kova', 'Vyresnysis vadas krito. Prazaras stoja prieš ordos vadą.',
     44, 53, 'boss', 'BOSS_BATTLE', '{"type":"all_prev"}', array[n8], array[n10],
     $j$[{"id":"win","kind":"win","label":"Nugalėk demonų vadą","primary":true},
         {"id":"hp","kind":"protect_objective","label":"Neprarask Prazaro (≥1 HP)","primary":false,"params":{"objectiveId":"prazaras","hp":1}}]$j$::jsonb,
     cs_cmd,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','boss','enemyFactionId',v_demon,'enemyName','Ordos vadas','difficulty','hard','aiProfile','boss'),
     jsonb_build_object('objectives', jsonb_build_array(jsonb_build_object('id','prazaras','kind','commander','label','Kapralas Prazaras','hp',30,'maxHp',30,'side','player')),
                        'rules', $j$[{"trigger":"onTurnStart","turn":1,"actions":[{"type":"setBossPhase","phase":1}]}]$j$::jsonb),
     '{"gold":300,"exp":160,"boosters":1,"cardMin":"epic"}'::jsonb, 8);

  -- Chapter 4
  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, branch_choice, objectives, pre_cutscene_id, reward_payload, sort_order)
  values
   (n10, v_camp, ch4, 'Imperijos įsakymas', 'Sunkus pasirinkimas', 'Pasiuntinys atneša sosto valią: regioną užrakinti.',
     36, 60, 'story', 'STORY_ONLY', '{"type":"all_prev"}', array[n9], array[n11],
     jsonb_build_object('prompt','Ar paklusi įsakymui?','options', jsonb_build_array(
        jsonb_build_object('key','obey','label','Paklusti','nextNodeId',n11),
        jsonb_build_object('key','stay','label','Likti su gynėjais','nextNodeId',n11))),
     $j$[{"id":"win","kind":"win","label":"Apsispręsk","primary":true}]$j$::jsonb,
     cs_orders, '{"exp":80}'::jsonb, 9);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, battle_config, scenario, reward_payload, sort_order)
  values
   (n11, v_camp, ch4, 'Paskutiniai Varnagrado vartai', 'Sienos gynyba su bangomis', 'Masinė ordos ataka prieš užsiveriant vartams.',
     30, 66, 'gate', 'WALL_DEFENSE', '{"type":"all_prev"}', array[n10], array[n12],
     $j$[{"id":"win","kind":"win","label":"Sulaikyk ordą prie sienos","primary":true},
         {"id":"breach","kind":"prevent_breach","label":"Neleisk pralaužti sienos","primary":false,"params":{"objectiveId":"wall"}}]$j$::jsonb,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','waves','enemyFactionId',v_demon,'enemyName','Visa orda','difficulty','hard','aiProfile','siege'),
     jsonb_build_object('objectives', jsonb_build_array(jsonb_build_object('id','wall','kind','wall','label','Vidinė siena','hp',25,'maxHp',25,'side','player')),
       'waves', jsonb_build_array(
         jsonb_build_object('id','final_wave_01','name','Pralaužimas','triggerType','turn','turn',3,'spawnSide','wall','warningText','Siena braška!','mustClear',true,'unitPool', $j$[]$j$::jsonb),
         jsonb_build_object('id','final_wave_02','name','Antrasis antplūdis','triggerType','turn','turn',6,'spawnSide','wall','warningText','Jie lipa per sieną!','mustClear',true,'unitPool', $j$[]$j$::jsonb))),
     '{"gold":280,"exp":150}'::jsonb, 10);

  insert into public.campaign_nodes (id, campaign_id, chapter_id, title, subtitle, lore_text, pos_x, pos_y, icon_type, mission_type, unlock_rule, prev_node_ids, next_node_ids, objectives, post_cutscene_id, battle_config, scenario, reward_payload, sort_order)
  values
   (n12, v_camp, ch4, 'Nėra kelio atgal', 'Išgyvenimas', 'Vartai užsiveria. Gynėjai supranta tiesą. Paskutinė kova.',
     24, 72, 'wave', 'SURVIVAL', '{"type":"all_prev"}', array[n11], '{}',
     $j$[{"id":"win","kind":"survive_turns","label":"Išgyvenk iki galo (10 ėjimų)","primary":true,"params":{"turns":10}},
         {"id":"defiance","kind":"win","label":"Sutriuškink paskutinę bangą","primary":false}]$j$::jsonb,
     cs_end,
     jsonb_build_object('playerDeckMode','collection','enemyDeckMode','faction','enemyFactionId',v_demon,'enemyName','Beribė orda','difficulty','hard','aiProfile','chaotic_demon'),
     jsonb_build_object('survivalTurns',10),
     '{"gold":400,"exp":250,"boosters":2,"cardMin":"legendary","codexUnlocks":["varnagrado-uzrakinimas"]}'::jsonb, 11);

  -- start node
  update public.campaigns set start_node_id = n1 where id = v_camp;
end $$;
