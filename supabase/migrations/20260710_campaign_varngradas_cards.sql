-- ════════════════════════════════════════════════════════════════════════════
-- CAMPAIGN-ONLY CARDS — "Prazaro kilmė: Varngrado užrakinimas"
-- 3 deck packages (Varngrado gynėjai / Trijų jėgų frontas / Varngrado Užraktas)
-- + Demonų ordos enemy package. Cards become real `cards` rows (status 'active',
-- card_number 'VRN-###'). Engine derives keywords from effect_text (Pasišaipymas→
-- taunt, „Kovos šūksnis"→battlecry, Greitis/Sprint→sprint, Sėlinimas→stealth...).
-- Deeper effects (žala/gydymas/summon) can be enriched later via admin Gameplay
-- editor (cards.gameplay JSONB). Idempotent on card_number.
--
-- Factions used (must exist in live DB): Universalus, Inkvizicijos legionas,
-- Šviesos pulkas, Demonų orda. NO Mirties Maršas (prequel rule).
-- ════════════════════════════════════════════════════════════════════════════

insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, description, is_champion, status)
select v.num, v.cname,
       (select id from public.factions  where name = v.fac limit 1),
       (select id from public.card_types where name = v.typ limit 1),
       (select id from public.rarities   where name = v.rar limit 1),
       v.cost, v.atk, v.hp, v.eff, v.descr, (v.typ = 'Čempionas'), 'active'
from (values
  -- ── Paketas 1: Varngrado gynėjai (Universalus; žmonės, sienos, disciplina) ──
  ('VRN-001','Prazaras, Varngrado maršalas','Universalus','Čempionas','Legendinis',0,null::int,30,
    'Čempionas (tik HP). Skill: „Kelkite vartus" – gynėjui Pasišaipymas / objektui +HP. Skill: „Rikiuotė prie sienos" – gretimiems +buff. Skill: „Niekas nepalieka spragos" – prišaukia 1/2 Varngrado Sargybinį.',
    'Varngrado maršalas. Ne piktadarys – paliktas gynėjas su užkrėsta žaizda.'),
  ('VRN-002','Varngrado sargybinis','Universalus','Padaras','Paprastas',2,1,2,'Pasišaipymas.','Laiko sieną, kol laiko žmonės.'),
  ('VRN-003','Sienos ietis','Universalus','Padaras','Paprastas',3,2,3,'Gali atakuoti tolimą taikinį.','Ietis pasiekia toliau nei baimė.'),
  ('VRN-004','Vartų arbaletininkas','Universalus','Padaras','Paprastas',3,2,2,'Kovos šūksnis: padaro 1 žalą.','Nuo sienos kiekvienas šūvis svarbus.'),
  ('VRN-005','Sandėlių nešikas','Universalus','Padaras','Paprastas',2,1,3,'Kovos šūksnis: kitą ėjimą gauni +1 auksą.','Karas valgo daugiau nei kariai.'),
  ('VRN-006','Karantino prižiūrėtoja','Universalus','Padaras','Magiškas',3,2,4,'Kovos šūksnis: pagydo 2 draugišką padarą.','Vardas, skausmas, šviesa, ugnis.'),
  ('VRN-007','Vardų raštininkas','Universalus','Padaras','Magiškas',2,1,3,'Suteikia gretimam padarui Pasišaipymą.','Vardas saugo nuo ištrynimo.'),
  ('VRN-008','Saldas, vartų kapitonas','Universalus','Padaras','Unikalus',4,3,4,'Pasišaipymas. Paskutinis noras: gretimi gauna +1/+1.','Laikė vartus, kai vartų nebebuvo.'),
  ('VRN-009','Ema, miesto gydytoja','Universalus','Padaras','Unikalus',4,2,4,'Kovos šūksnis: pagydo 3.','Kol jiems reikia tvarsčių, esam gyvi.'),
  ('VRN-010','Tautvydas, jaunas karininkas','Universalus','Padaras','Magiškas',3,2,3,'Kovos šūksnis: gretimi gauna +1 puolimą.','Naujos kartos gynėjas.'),
  ('VRN-011','Uždaryti vartus','Universalus','Reakcija','Magiškas',2,null,null,'Sušaldo priešo padarą.','Medis ir geležis dar laiko.'),
  ('VRN-012','Akmenys nuo sienos','Universalus','Burtas','Magiškas',3,null,null,'Padaro 1 žalą visiems priešo padarams.','Net akmuo gali būti ginklas.'),
  ('VRN-013','Vardas ant lentos','Universalus','Burtas','Paprastas',1,null,null,'Draugiškas padaras gauna +0/+2 ir tampa atsparus nutildymui.','Užrašyk jį, kol kas nors nepamiršo.'),
  ('VRN-014','Atsitraukti į antrą liniją','Universalus','Reakcija','Paprastas',1,null,null,'Grąžink draugišką padarą į ranką; jis gauna +0/+1.','Žingsnis. Skydai. Žingsnis.'),
  ('VRN-015','Paskutinis postas','Universalus','Burtas','Unikalus',2,null,null,'Draugiškas padaras gauna Pasišaipymą ir +0/+3.','Niekas nepalieka spragos.'),
  ('VRN-016','Karantino ratas','Universalus','Laukas','Magiškas',3,null,null,'Kol aktyvus: tavo padarai gauna +0/+1.','Mažas ratas. Ne visa aikštė.'),

  -- ── Paketas 2: Trijų jėgų frontas (Inkvizicijos legionas + Šviesos pulkas) ──
  ('VRN-017','Madelius, žibintų vadas','Inkvizicijos legionas','Padaras','Unikalus',5,3,5,'Kovos šūksnis: padegk priešo padarą. Įspėjimas: balta šviesa degina ir pilkus (1 žala tavo padarui).','Protokolo žmogus, tapęs liudytoju.'),
  ('VRN-018','Tėvas Konstancijus, liudytojas','Inkvizicijos legionas','Padaras','Unikalus',3,1,5,'Pasišaipymas. Paskutinis noras: gretimi gauna +0/+2 („liudiju").','Rašau, kad niekas neperrašytų.'),
  ('VRN-019','Eleonora Kraujoviesa','Inkvizicijos legionas','Padaras','Unikalus',4,2,4,'Kovos šūksnis: nutildo priešo padarą.','Užkratas eina po oda.'),
  ('VRN-020','Gunteris, Šviesos pulko vadas','Šviesos pulkas','Padaras','Unikalus',5,4,5,'Pasišaipymas. Gretimi riteriai gauna +1 puolimą.','Garbė, kuri nėra naivi.'),
  ('VRN-021','Alarikas Teisusis','Šviesos pulkas','Padaras','Magiškas',3,2,4,'Kovos šūksnis: draugiškas padaras tampa atsparus nutildymui (liudijimas).','Užrašau viską.'),
  ('VRN-022','Doriana, Ordino kovotoja','Šviesos pulkas','Padaras','Magiškas',4,4,3,'Greitis: atakuoja iškart.','Garbė kartais turi mokėti šliaužti.'),
  ('VRN-023','Žibinto nešėjas','Inkvizicijos legionas','Padaras','Paprastas',2,1,3,'Suteikia gretimam Pasišaipymą.','Maži žibintai, ne balta šviesa.'),
  ('VRN-024','Ordino riteris','Šviesos pulkas','Padaras','Paprastas',3,3,3,'Pasišaipymas.','Mėlynas mithrilas nesitraukia.'),
  ('VRN-025','Triple liudijimas','Universalus','Reakcija','Unikalus',2,null,null,'Nutildo dabar žaidžiamą priešo burtą (suklastotą įsakymą).','Varngradas, Inkvizicija, Ordinas.'),
  ('VRN-026','Žibinto ratas','Inkvizicijos legionas','Laukas','Magiškas',3,null,null,'Kol aktyvus: priešo burtai silpnesni.','Šviesa, kuri laiko, ne degina.'),
  ('VRN-027','Balta šviesa','Inkvizicijos legionas','Burtas','Epinis',4,null,null,'Padaro 3 žalą visiems priešo padarams; padaro 1 žalą ir tavo padarams (kaina).','Gelbėja ir degina. Abu sakiniai teisingi.'),
  ('VRN-028','Arno kraujo riba','Universalus','Burtas','Unikalus',2,null,null,'Sunaikina priešo lauką arba prakeiksmą.','Vaiko kraujas, tapęs riba.'),
  ('VRN-029','Grandinės ir balista','Universalus','Burtas','Epinis',5,null,null,'Padaro 6 žalą priešo Čempionui/bosui ir jį pažeidžia (atviras kitam smūgiui).','Priversk jį pajusti pirmą kartą.'),

  -- ── Paketas 3: Varngrado Užraktas (po mazgo 14; objektai, auka, vardai) ──
  ('VRN-030','Miestas vietoj vartų','Universalus','Laukas','Epinis',4,null,null,'Kol aktyvus: kai draugiškas padaras miršta, gretimi gauna +0/+1.','Vartų nebėra. Žmonės yra vartai.'),
  ('VRN-031','Užrakintųjų sprendimas','Universalus','Burtas','Epinis',3,null,null,'Visi tavo padarai gauna Pasišaipymą ir +0/+2.','Mes nebelaukiame kelio.'),
  ('VRN-032','Pietų siūlė','Universalus','Laukas','Unikalus',3,null,null,'Kol aktyvus: priešo bangos atvyksta su −1 puolimu.','Atverk segmentą. Ne miestą.'),
  ('VRN-033','Vardų aikštė','Universalus','Laukas','Magiškas',2,null,null,'Kol aktyvus: tavo padarai atsparūs nutildymui.','Vardas, liudininkas, darbas.'),
  ('VRN-034','Šventinto rato spaudimas','Universalus','Burtas','Unikalus',4,null,null,'Padaro 2 žalą visiems padarams (ir tavo).','Indas, kuris spaudžia iš išorės.'),
  ('VRN-035','Užvertas dugnas','Universalus','Burtas','Magiškas',3,null,null,'Vieną ėjimą priešas negali prikelti padarų iš kapo.','Dugnas arčiau nei dangtis.'),
  ('VRN-036','Laikykite grandinę','Universalus','Reakcija','Magiškas',2,null,null,'Draugiškas padaras negali mirti šį ėjimą.','Matas iš Dervių laikė grandinę.'),
  ('VRN-037','Paskutinė rikiuotė','Universalus','Burtas','Unikalus',4,null,null,'Visi tavo padarai gauna +2 puolimą šį ėjimą.','Paskutinė, jei reikės.'),
  ('VRN-038','Liudiju','Universalus','Reakcija','Magiškas',1,null,null,'Kai draugiškas padaras miršta: prišaukia 1/2 Varngrado Sargybinį.','Liudiju: žmonės viduje buvo gyvi.'),
  ('VRN-039','Nepamiršti vardai','Universalus','Burtas','Magiškas',2,null,null,'Grąžink draugišką padarą iš kapo į ranką su +0/+1.','Tada rašysime juos kitur.'),
  ('VRN-040','Prazaro žaizda','Universalus','Artefaktas','Epinis',0,null,null,'Kampanijos objektas (RIZIKA): kiekvieną ėjimą suteikia galią, bet kaupia korupciją. NE paprastas buff.','Regnaras norėjo ją atidaryti.'),

  -- ── Priešų paketas: Demonų orda ──
  ('VRN-101','Impas iš plyšio','Demonų orda','Padaras','Paprastas',1,2,1,'Greitis.','Mažieji eina pirmi – tikrina, ar pasaulis dar minkštas.'),
  ('VRN-102','Dyglių velnias','Demonų orda','Padaras','Magiškas',3,3,4,'Pasišaipymas.','Žemai nuleista galva, ragai į priekį.'),
  ('VRN-103','Maro kirminas','Demonų orda','Padaras','Magiškas',3,2,5,'Paskutinis noras: padaro 1 žalą visiems gretimiems.','Burnos, kurios atsiveria žemėje.'),
  ('VRN-104','Juodo dūmo nešėjas','Demonų orda','Padaras','Paprastas',2,1,3,'Kovos šūksnis: suteikia gretimam Sėlinimą.','Dūmai, kurie juda prieš vėją.'),
  ('VRN-105','Grandinių nešėjas','Demonų orda','Padaras','Magiškas',4,3,3,'Kovos šūksnis: apsvaigina priešo padarą.','Grandinės storesnės už žmogaus liemenį.'),
  ('VRN-106','Okuliaras, stebėtojas','Demonų orda','Padaras','Unikalus',3,1,4,'Kol gyvas: žymi silpną priešo taikinį (bangos taiklesnės).','Akis, kuri matuoja silpnybes.'),
  ('VRN-107','Oglor’as Klaidinotojas','Demonų orda','Padaras','Epinis',5,3,5,'Kovos šūksnis: suklastotas įsakymas – priešo padaras laikinai negali blokuoti.','Įėjo į miestą per ausis.'),
  ('VRN-108','Regnaras Mėgdžiotojas','Demonų orda','Padaras','Epinis',5,5,4,'Sėlinimas. Greitis. Medžioja silpniausią taikinį.','Vardai lūžta lengviau nei vartai.'),
  ('VRN-109','Belzatoras, Ordos vadas','Demonų orda','Čempionas','Legendinis',8,8,12,'Bosas: fazės su šarvu. Negali būti galutinai sunaikintas – sužeistas atsitraukia.','Jūs ne miestas. Jūs kapas su ginklais.')
) as v(num, cname, fac, typ, rar, cost, atk, hp, eff, descr)
where not exists (select 1 from public.cards c where c.card_number = v.num);

-- ════════════════════════════════════════════════════════════════════════════
-- STORY DECKS — owned by the first admin profile, visibility 'public'.
-- Named „[Kampanija] …" so the campaign seed/rebuild can resolve them by name
-- and wire battle_config.storyDeckId. Idempotent (rebuilt each run).
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_admin uuid := (select id from public.profiles where role = 'admin' order by created_at limit 1);
  v_uni int := (select id from public.factions where name = 'Universalus' limit 1);
  v_deck uuid;
  v_cnt int; v_avg numeric;


begin
  if v_admin is null then
    raise notice 'No admin profile found — skipping story-deck creation (cards still created).';
    return;
  end if;

  -- helper inline: build a deck from a list of (card_number, quantity)
  -- Package 1: Varngrado gynėjai
  delete from public.decks where user_id = v_admin and name = '[Kampanija] Varngrado gynėjai';
  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
    values (v_admin, '[Kampanija] Varngrado gynėjai', 'Kampanijos istorinė kaladė (mazgai 1–4). Žmonės gynėjai.', v_uni, 'public', 0, 0)
    returning id into v_deck;
  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
  select v_deck, c.id, q.qty, false from (values
    ('VRN-001',1),('VRN-002',2),('VRN-003',2),('VRN-004',2),('VRN-005',2),('VRN-006',2),
    ('VRN-007',2),('VRN-008',1),('VRN-009',1),('VRN-010',2),('VRN-011',2),('VRN-012',2),
    ('VRN-013',2),('VRN-014',2),('VRN-015',1),('VRN-016',1)
  ) as q(num,qty) join public.cards c on c.card_number = q.num;
  select coalesce(sum(dc.quantity),0), coalesce(round(sum(coalesce(c.gold_cost,0)*dc.quantity)::numeric/nullif(sum(dc.quantity),0),2),0)
    into v_cnt, v_avg from public.deck_cards dc join public.cards c on c.id=dc.card_id where dc.deck_id=v_deck;
  update public.decks set card_count=v_cnt, avg_gold_cost=v_avg where id=v_deck;

  -- Package 2: Trijų jėgų frontas (gynėjai + Inkvizicija + Ordinas)
  delete from public.decks where user_id = v_admin and name = '[Kampanija] Trijų jėgų frontas';
  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
    values (v_admin, '[Kampanija] Trijų jėgų frontas', 'Kampanijos istorinė kaladė (po mazgo 4–5). Inkvizicija ir Šviesos pulkas.', v_uni, 'public', 0, 0)
    returning id into v_deck;
  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
  select v_deck, c.id, q.qty, false from (values
    ('VRN-001',1),('VRN-002',2),('VRN-003',2),('VRN-004',2),('VRN-008',1),('VRN-009',1),('VRN-010',1),
    ('VRN-017',1),('VRN-018',1),('VRN-019',1),('VRN-020',1),('VRN-021',1),('VRN-022',1),('VRN-023',2),
    ('VRN-024',2),('VRN-025',1),('VRN-026',2),('VRN-027',1),('VRN-028',1),('VRN-029',1)
  ) as q(num,qty) join public.cards c on c.card_number = q.num;
  select coalesce(sum(dc.quantity),0), coalesce(round(sum(coalesce(c.gold_cost,0)*dc.quantity)::numeric/nullif(sum(dc.quantity),0),2),0)
    into v_cnt, v_avg from public.deck_cards dc join public.cards c on c.id=dc.card_id where dc.deck_id=v_deck;
  update public.decks set card_count=v_cnt, avg_gold_cost=v_avg where id=v_deck;

  -- Package 3: Varngrado Užraktas (po mazgo 14)
  delete from public.decks where user_id = v_admin and name = '[Kampanija] Varngrado Užraktas';
  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
    values (v_admin, '[Kampanija] Varngrado Užraktas', 'Kampanijos istorinė kaladė (po mazgo 14). Miestas yra užraktas.', v_uni, 'public', 0, 0)
    returning id into v_deck;
  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
  select v_deck, c.id, q.qty, false from (values
    ('VRN-001',1),('VRN-002',2),('VRN-007',2),('VRN-008',1),('VRN-018',1),('VRN-020',1),
    ('VRN-030',1),('VRN-031',1),('VRN-032',1),('VRN-033',1),('VRN-034',1),('VRN-035',1),
    ('VRN-036',2),('VRN-037',1),('VRN-038',1),('VRN-039',2),('VRN-040',1),('VRN-015',2),('VRN-016',2)
  ) as q(num,qty) join public.cards c on c.card_number = q.num;
  select coalesce(sum(dc.quantity),0), coalesce(round(sum(coalesce(c.gold_cost,0)*dc.quantity)::numeric/nullif(sum(dc.quantity),0),2),0)
    into v_cnt, v_avg from public.deck_cards dc join public.cards c on c.id=dc.card_id where dc.deck_id=v_deck;
  update public.decks set card_count=v_cnt, avg_gold_cost=v_avg where id=v_deck;

  raise notice 'Story decks created for admin %', v_admin;
end $$;
