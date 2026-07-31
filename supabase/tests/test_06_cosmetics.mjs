// Kosmetikos atstatymas (migr. 20260860): default'ai, nuosavybės išsaugojimas,
// serverinė pasirinkimo validacija, fallback'ai. Migracija taikoma ČIA (runner'is
// krauna tik 2026084x), su stub'ais lentelėms, kurių nėra bootstrap'e.
export async function run(t) {
  const { q, psql, rpc, check, eq, truthy, DB } = t

  // ── stendas: trūkstamos lentelės (prod'e egzistuoja; bootstrap'e — ne) ──────
  q(`create table if not exists public.shop_items(
       id bigserial primary key, slug text unique, item_type text, name text,
       description text, rarity text, payload jsonb, sort_order int, is_active boolean default true)`)
  q(`create table if not exists public.shop_item_prices(
       shop_item_id bigint, currency_type text, amount int, unique(shop_item_id, currency_type))`)
  q(`create table if not exists public.content_translations(
       owner_type text, owner_id text, locale text, field text, value text,
       updated_at timestamptz default now(), primary key(owner_type, owner_id, locale, field))`)
  q(`create schema if not exists storage`)
  q(`create table if not exists storage.objects(bucket_id text, name text, metadata jsonb)`)
  q(`create table if not exists public.avatar_audio(file_url text, enabled boolean default true)`)
  q(`alter table public.cards add column if not exists gameplay jsonb not null default '{}'::jsonb`)
  q(`alter table public.cards add column if not exists image_url text`)
  q(`alter table public.cards add column if not exists status text not null default 'active'`)
  q(`create table if not exists public.card_packs(id uuid default gen_random_uuid() primary key, image_url text)`)
  q(`create table if not exists public.factions(id serial primary key, icon_url text)`)
  // realūs prod default'ai (20260730), kurių bootstrap'as neseed'ina
  q(`insert into public.cosmetics(id, kind, name, price_gold, owned_by_default, is_active)
     values ('av_nekronautas','avatar','Nekronautas',0,true,true),
            ('cb_ember','card_back','Žarijų nugarėlė',800,false,true),
            ('cb_gold','card_back','Auksinė nugarėlė',2000,false,true)
     on conflict (id) do nothing`)

  const U = '20000000-0000-4000-8000-000000000001'
  q(`insert into profiles(id, username, gold, rubies, essence) values ('${U}','cosm_user',0,0,0) on conflict do nothing`)

  // legacy nuosavybė PRIEŠ migraciją — privalo išlikti
  q(`insert into public.user_cosmetics(user_id, cosmetic_id) values ('${U}','cb_ember') on conflict do nothing`)
  // legacy user_inventory likutis — turi būti permigruotas
  q(`insert into public.user_inventory(user_id, item_type, item_id, quantity)
     values ('${U}','card_back','cb_gold',1) on conflict do nothing`)
  const ownedBefore = q(`select count(*) from public.user_cosmetics where user_id='${U}'`)

  // ── migracija (idempotencijos patikra: taikom DU kartus) ────────────────────
  psql(['-d', DB, '-f', 'supabase/migrations/20260860_cosmetics_restore.sql'])
  psql(['-d', DB, '-f', 'supabase/migrations/20260860_cosmetics_restore.sql'])

  check('nauja paskyra turi default avatarą IR default nugarėlę', () => {
    const s = rpc(U, `rvn_get_cosmetics()`)
    eq(s.defaults.avatar, 'av_nekronautas', 'defaults.avatar')
    eq(s.defaults.cardBack, 'cb_default', 'defaults.cardBack')
    truthy(s.owned.includes('av_nekronautas'), 'owned turi default avatarą')
    truthy(s.owned.includes('cb_default'), 'owned turi default nugarėlę')
    eq(s.active.avatar, 'av_nekronautas', 'active.avatar fallback')
    eq(s.active.cardBack, 'cb_default', 'active.cardBack fallback')
  })

  check('legacy nuosavybė išsaugota + user_inventory permigruotas', () => {
    truthy(Number(q(`select count(*) from public.user_cosmetics where user_id='${U}' and cosmetic_id='cb_ember'`)) === 1, 'cb_ember liko')
    truthy(Number(q(`select count(*) from public.user_cosmetics where user_id='${U}' and cosmetic_id='cb_gold'`)) === 1, 'cb_gold permigruotas iš user_inventory')
    truthy(Number(q(`select count(*) from public.user_cosmetics where user_id='${U}'`)) >= Number(ownedBefore), 'niekas neištrinta')
  })

  check('katalogas: cb_default owned_by_default, visos naujos frakcijų nugarėlės yra', () => {
    eq(q(`select owned_by_default from public.cosmetics where id='cb_default'`), 't', 'cb_default default')
    eq(q(`select count(*) from public.cosmetics where kind='card_back' and id in
      ('cb_default','cb_mirties_marsas','cb_plesiku_naktis','cb_vryhioko_gauja','cb_demonu_orda',
       'cb_inkvizicijos_legionas','cb_sviesos_pulkas','cb_mistikos_melodija','cb_rytu_vejas')`), '9', '9 naujos+default')
  })

  check('turimos nugarėlės pasirinkimas veikia ir persistuoja', () => {
    const r = rpc(U, `rvn_set_active_card_back('cb_ember')`)
    eq(r.cardBack, 'cb_ember', 'RPC grąžina naują aktyvų')
    eq(q(`select equipped_card_back from profiles where id='${U}'`), 'cb_ember', 'DB persistuota')
    const s = rpc(U, `rvn_get_cosmetics()`)
    eq(s.active.cardBack, 'cb_ember', 'perskaitymas po „reload"')
  })

  check('užrakintos kosmetikos pasirinkimas ATMETAMAS serveryje', () => {
    const out = q(`do $$ begin
        perform set_config('test.uid','${U}',true);
        begin
          perform public.rvn_set_active_card_back('cb_mirties_marsas');
          raise exception 'NEATMETE';
        exception when others then
          if sqlerrm like '%cosmetic_locked%' then raise notice 'OK'; else raise; end if;
        end;
      end $$`)
    eq(q(`select equipped_card_back from profiles where id='${U}'`), 'cb_ember', 'aktyvi nepasikeitė')
  })

  check('neteisingas/nebeturimas pasirinkimas krenta į default skaitant', () => {
    q(`update profiles set equipped_card_back='cb_gold', equipped_avatar='av_neegzistuoja' where id='${U}'`)
    // av_neegzistuoja — nėra kataloge; migracijos remontas jau praėjo, tad tikrinam READ fallback
    const s = rpc(U, `rvn_get_cosmetics()`)
    eq(s.active.cardBack, 'cb_gold', 'turima cb_gold galioja')
    eq(s.active.avatar, 'av_nekronautas', 'neegzistuojantis avataras → default')
    q(`update profiles set equipped_card_back='cb_ember', equipped_avatar=null where id='${U}'`)
  })

  check('offline manifestas turi default nugarėlę ir statines nugarėles', () => {
    const n = Number(q(`select count(*) from public.rvn_media_manifest()
      where url in ('/card-backs/ravenof-default.webp','/card-backs/back.webp?v=2','/card-backs/curse.webp','/card-backs/zmk.webp')`))
    eq(n, 4, 'manifesto įrašai')
  })

  check('naujos frakcijų nugarėlės sinchronizuotos į shop_items su kaina', () => {
    eq(q(`select count(*) from public.shop_items where slug='cb_mirties_marsas' and item_type='card_back'`), '1', 'shop_items')
    truthy(Number(q(`select count(*) from public.shop_item_prices p join public.shop_items i on i.id=p.shop_item_id where i.slug='cb_mirties_marsas' and p.currency_type='silver'`)) === 1, 'kaina')
  })
}
