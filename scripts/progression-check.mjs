#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  PROGRESSION v2 — statinė ekonomikos ir kontrakto validacija
//  Paleidimas: npm run progression:check
//  Tikrina:
//   1) login ciklo 31 dienos lentelę SQL'e = patvirtinta ekonomika
//   2) sezono kelio 20 lygių × 2 takelių lentelę = patvirtinta ekonomika
//   3) dienos questų atlygius, reroll kainas ir dienos maksimumą
//   4) boosterio taisykles (10 kortų, 8+2, slotų minimalus rarity)
//   5) kad kiekvienas iš TS kviečiamas rvn_* RPC egzistuoja migracijose
//   6) kad progression komponentai nehardcodina atlygio sumų
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const MIG = path.join(ROOT, 'supabase/migrations')
const read = (f) => fs.readFileSync(path.join(MIG, f), 'utf8')

let errors = 0, warnings = 0
const fail = (msg) => { errors++; console.log('  ✗ ' + msg) }
const warn = (msg) => { warnings++; console.log('  ! ' + msg) }
const ok = (msg) => console.log('  ✓ ' + msg)

// ── 1) Daily Login: patvirtinta 31 dienos lentelė ──────────────────────────
const LOGIN_EXPECTED = {
  1: 'silver:100', 2: 'essence:25', 3: 'silver:150', 4: 'silver:150', 5: 'essence:50',
  6: 'silver:200', 7: 'booster:1', 8: 'silver:200', 9: 'essence:50', 10: 'silver:250',
  11: 'silver:250', 12: 'essence:75', 13: 'silver:300', 14: 'booster:1+silver:100',
  15: 'silver:300', 16: 'essence:75', 17: 'silver:350', 18: 'essence:100', 19: 'silver:400',
  20: 'silver:500', 21: 'card:rare', 22: 'silver:450', 23: 'essence:100', 24: 'silver:500',
  25: 'essence:125', 26: 'silver:600', 27: 'silver:750', 28: 'booster:1+essence:150',
  29: 'silver:1000', 30: 'rubies:25', 31: 'booster:2+essence:200',
}
const fmt = (rewards) => rewards.map((r) => {
  if (r.type === 'faction_booster_choice') return `booster:${r.quantity}`
  if (r.type === 'card_choice') return `card:${r.rarity}`
  if (r.type === 'card_back' || r.type === 'player_avatar') return `${r.type}:${r.cosmeticId}`
  return `${r.type}:${r.amount}`
}).join('+')

console.log('── 1) Daily Login (31 dienos ciklas) ──')
{
  const sql = read('20260842_login_cycle_v2.sql')
  const rows = [...sql.matchAll(/\(2,\s*(\d+),\s*'(\[[^']*\])'/g)]
  if (rows.length !== 31) fail(`rasta ${rows.length} dienų, laukta 31`)
  else {
    let bad = 0
    for (const [, day, json] of rows) {
      const got = fmt(JSON.parse(json))
      const exp = LOGIN_EXPECTED[Number(day)]
      if (got !== exp) { fail(`${day} diena: laukta "${exp}", SQL'e "${got}"`); bad++ }
    }
    if (!bad) ok('visos 31 dienos atitinka patvirtintą ekonomiką')
  }
}

// ── 2) Season Path: 20 lygių × 2 takeliai ──────────────────────────────────
const SEASON_EXPECTED = {
  1:  ['silver:250', 'essence:50'],
  2:  ['essence:50', 'silver:350'],
  3:  ['silver:350', 'booster:1'],
  4:  ['silver:400', 'essence:75'],
  5:  ['booster:1', 'silver:500'],
  6:  ['silver:500', 'booster:1'],
  7:  ['card:rare', 'essence:125'],
  8:  ['essence:100', 'booster:1'],
  9:  ['silver:650', 'silver:750'],
  10: ['booster:1', 'booster:2'],
  11: ['silver:750', 'essence:150'],
  12: ['essence:150', 'card_back:$season_card_back'],
  13: ['silver:850', 'booster:1'],
  14: ['booster:1', 'silver:1000'],
  15: ['card:epic', 'booster:2'],
  16: ['silver:1000', 'essence:250'],
  17: ['essence:200', 'booster:1+silver:500'],
  18: ['booster:1', 'silver:1500'],
  19: ['silver:1250', 'booster:2'],
  20: ['card:legendary', 'player_avatar:$season_player_avatar+booster:2'],
}
console.log('── 2) Season Path (20 lygių) ──')
{
  const sql = read('20260843_season_path_v2.sql')
  const m = sql.match(/'season_path_v2',\s*\$j\$([\s\S]*?)\$j\$/)
  if (!m) fail('nerasta season_path_v2 konfigūracija')
  else {
    const cfg = JSON.parse(m[1])
    if (cfg.xp_per_level !== 1000) fail(`xp_per_level = ${cfg.xp_per_level}, laukta 1000`)
    if (cfg.levels !== 20) fail(`levels = ${cfg.levels}, laukta 20`)
    if (cfg.total_xp !== 20000) fail(`total_xp = ${cfg.total_xp}, laukta 20000`)
    let bad = 0
    for (const [lvl, [expFree, expPass]] of Object.entries(SEASON_EXPECTED)) {
      const r = cfg.rewards[lvl]
      if (!r) { fail(`nėra ${lvl} lygio`); bad++; continue }
      const gotFree = fmt(r.free), gotPass = fmt(r.pass)
      if (gotFree !== expFree) { fail(`${lvl} lygis free: laukta "${expFree}", gauta "${gotFree}"`); bad++ }
      if (gotPass !== expPass) { fail(`${lvl} lygis pass: laukta "${expPass}", gauta "${gotPass}"`); bad++ }
    }
    if (!bad) ok('visi 20 lygių (free + pass) atitinka patvirtintą ekonomiką')
    const cardRewards = Object.values(cfg.rewards).flatMap((r) => [...r.free, ...r.pass])
    const cosmetics = cardRewards.filter((r) => r.type === 'card_back' || r.type === 'player_avatar')
    if (cosmetics.length !== 2) fail(`kosmetikos atlygių ${cosmetics.length}, laukta 2 (1 card back + 1 avatar)`)
    else ok('kosmetika tik Card Back ir Player Avatar (po vieną)')
  }
}

// ── 3) Daily Quests ─────────────────────────────────────────────────────────
console.log('── 3) Daily Quests ──')
{
  const sql = read('20260844_daily_quests_v2.sql')
  const m = sql.match(/'daily_quests_v2',\s*\$j\$([\s\S]*?)\$j\$/)
  if (!m) fail('nerasta daily_quests_v2 konfigūracija')
  else {
    const cfg = JSON.parse(m[1])
    const exp = { easy: 'silver:100+season_xp:80', medium: 'silver:150+season_xp:100', hard: 'silver:200+season_xp:120' }
    let bad = 0
    for (const [d, e] of Object.entries(exp)) {
      const got = fmt(cfg.rewards[d] ?? [])
      if (got !== e) { fail(`${d}: laukta "${e}", gauta "${got}"`); bad++ }
    }
    if (fmt(cfg.chest) !== 'essence:50+season_xp:100') { fail(`skrynia: gauta "${fmt(cfg.chest)}"`); bad++ }
    const max = cfg.daily_max
    if (max.silver !== 450 || max.essence !== 50 || max.season_xp !== 400) { fail(`dienos maksimumas: ${JSON.stringify(max)}`); bad++ }
    // reroll: 1 nemokamas + 2 po 100, viso 3
    if (cfg.reroll.free !== 1) { fail(`reroll.free = ${cfg.reroll.free}, laukta 1`); bad++ }
    if (cfg.reroll.paid_cost_silver !== 100) { fail(`reroll kaina = ${cfg.reroll.paid_cost_silver}, laukta 100`); bad++ }
    if (cfg.reroll.max_total !== 3) { fail(`reroll max = ${cfg.reroll.max_total}, laukta 3`); bad++ }
    // suma turi sutapti su dienos maksimumu
    const sumSilver = ['easy', 'medium', 'hard'].reduce((a, d) => a + cfg.rewards[d].find((r) => r.type === 'silver').amount, 0)
    const sumXp = ['easy', 'medium', 'hard'].reduce((a, d) => a + cfg.rewards[d].find((r) => r.type === 'season_xp').amount, 0)
      + cfg.chest.find((r) => r.type === 'season_xp').amount
    if (sumSilver !== max.silver) { fail(`sidabro suma ${sumSilver} ≠ dienos maksimumas ${max.silver}`); bad++ }
    if (sumXp !== max.season_xp) { fail(`Season XP suma ${sumXp} ≠ dienos maksimumas ${max.season_xp}`); bad++ }
    if (!bad) ok('atlygiai, skrynia, reroll kainos ir dienos maksimumas sutampa')
  }
  if (!/win_streak/.test(sql)) ok('win-streak questų nėra')
  else fail('rasta win-streak reikalavimų')
  if (/is_active = false[\s\S]{0,200}open_pack/.test(sql)) ok('„atplėšk pakuotę" questai išjungiami')
  else warn('nerastas aiškus pakuotės questų išjungimas')
}

// ── 4) Boosteris ────────────────────────────────────────────────────────────
console.log('── 4) Frakcijos boosteris ──')
{
  const sql = read('20260841_progression_boosters.sql')
  const m = sql.match(/'booster_v2',\s*\$j\$([\s\S]*?)\$j\$/)
  if (!m) fail('nerasta booster_v2 konfigūracija')
  else {
    const cfg = JSON.parse(m[1])
    let bad = 0
    if (cfg.cards_total !== 10) { fail(`kortų ${cfg.cards_total}, laukta 10`); bad++ }
    if (cfg.faction_cards !== 8) { fail(`frakcijos kortų ${cfg.faction_cards}, laukta 8`); bad++ }
    if (cfg.universal_cards !== 2) { fail(`universalių ${cfg.universal_cards}, laukta 2`); bad++ }
    if (cfg.faction_cards + cfg.universal_cards !== cfg.cards_total) { fail('8 + 2 ≠ 10'); bad++ }
    const slot = (i) => cfg.slots.find((s) => s.from <= i && s.to >= i)
    if (slot(1)?.min_rarity_sort !== 1 || slot(6)?.min_rarity_sort !== 1) { fail('slotai 1–6 turi būti Common+'); bad++ }
    if (slot(7)?.min_rarity_sort !== 2 || slot(9)?.min_rarity_sort !== 2) { fail('slotai 7–9 turi būti Magic+'); bad++ }
    if (slot(10)?.min_rarity_sort !== 3) { fail('slotas 10 turi būti Rare+'); bad++ }
    if (cfg.guaranteed_slot?.index !== 10 || cfg.guaranteed_slot?.faction !== 'selected') { fail('10-as slotas turi būti garantuotai pasirinktos frakcijos'); bad++ }
    if (!bad) ok('10 kortų (8 frakcijos + 2 universalios), slotų rarity minimumai ir garantija')
  }
  if (/rvn__duplicate_essence[\s\S]*craft'/.test(sql)) ok('dublikato kompensacija imama iš esamos craft.disenchant lentelės')
  else fail('kompensacija neimama iš esamos serverio konfigūracijos')
}

// ── 5) RPC egzistavimas ─────────────────────────────────────────────────────
console.log('── 5) TS ↔ SQL kontraktas ──')
{
  const tsFiles = ['src/lib/progression/client.ts']
  const allSql = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql')).map((f) => read(f)).join('\n')
  const called = new Set()
  for (const f of tsFiles) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
    for (const m of src.matchAll(/'(rvn_[a-z0-9_]+)'/g)) called.add(m[1])
  }
  let missing = 0
  for (const fn of called) {
    if (!new RegExp(`create or replace function public\\.${fn}\\b`).test(allSql)) { fail(`RPC ${fn} neegzistuoja migracijose`); missing++ }
  }
  if (!missing) ok(`visi ${called.size} iš TS kviečiami RPC egzistuoja`)
}

// ── 6) Hardcodintos sumos komponentuose ────────────────────────────────────
console.log('── 6) Reward sumų hardcode patikra ──')
{
  // Ieškom TIK atlygio konteksto: `amount: N`, `quantity: N`, `<Chip amount={N}`
  // ir grynų JSX tekstų tipo `+250` / `250 sidabro`. CSS reikšmės (px, rgba,
  // font, opacity, animation) ignoruojamos — jos ne ekonomika.
  const REWARD_CTX = [
    /\bamount\s*:\s*(\d{2,5})\b/g,
    /\bquantity\s*:\s*(\d{1,3})\b/g,
    /\bamount=\{\s*(\d{2,5})\s*\}/g,
    />\s*\+(\d{2,5})\s*</g,
  ]
  const scan = (dir) => {
    const out = []
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) out.push(...scan(p))
      else if (/\.(tsx|ts)$/.test(e.name)) out.push(p)
    }
    return out
  }
  const files = scan(path.join(ROOT, 'src/components')).concat(scan(path.join(ROOT, 'src/app')))
  let flagged = 0
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    if (!/@\/lib\/progression/.test(src)) continue
    const hits = new Set()
    for (const re of REWARD_CTX) {
      for (const m of src.matchAll(re)) {
        const n = Number(m[1])
        // 0 leidžiama (placeholder / tuščias balansas)
        if (n > 0) hits.add(n)
      }
    }
    if (hits.size) { fail(`${path.relative(ROOT, f)}: atlygio sumos kode: ${[...hits].join(', ')}`); flagged++ }
  }
  if (!flagged) ok(`progression UI (${files.filter((f) => /@\/lib\/progression/.test(fs.readFileSync(f, 'utf8'))).length} failai) nehardcodina atlygio sumų`)

  // senasis (v1) UI — tik įspėjimas, jis bus pakeistas dizaino handoff'u
  for (const name of ['MonthlyLoginModal.tsx', 'SeasonPathModal.tsx', 'DailyTasksModal.tsx']) {
    const p = path.join(ROOT, 'src/components/digital', name)
    if (!fs.existsSync(p)) continue
    const src = fs.readFileSync(p, 'utf8')
    const hits = [...src.matchAll(/\bamount\s*:\s*(\d{2,5})\b/g)].map((m) => Number(m[1]))
    if (hits.length) warn(`${name} (v1 UI, bus pakeistas): ${[...new Set(hits)].join(', ')}`)
  }
}

console.log(`\n════ progression-check: ${errors} klaidos · ${warnings} įspėjimai ════`)
process.exit(errors === 0 ? 0 : 1)
