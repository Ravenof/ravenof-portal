// ════════════════════════════════════════════════════════════════════════════
//  TUTORIAL V3 patikra (offline, be DB):
//   1) Kiekviena pamokoje minima korta EGZISTUOJA TUT migracijose
//      (20260717 + 20260871) — kitaip pamoka „tyliai" liktų be kortos.
//   2) Kiekvienas žingsnis turi pasiekiamą pabaigą (complete), o veiksmo
//      žingsniai (event/inspect/win) — `allow` sąrašą (kitaip gate užrakintų).
//   3) voiceId'ai nesikartoja tarp skirtingų tekstų ir atitinka failo vardo
//      formatą (tut-{voiceId}.mp3).
//   4) Ekrano tekstas trumpas (≤160 ženklų), balso tekstas nurodytas.
//   5) Rodyklės: `drag-path` privalo turėti `arrowFrom` IR `arrowTo`.
//   6) Kortų vardai `apply` mutacijose taip pat tikrinami.
//  Vykdymas: npm run tutorial:check
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { tutorialLessonSeeds, CORE_LESSON_KEYS } from '@/data/tutorialLessons/lessonSeeds'
import type { LessonSeed, LessonStep, HighlightTarget } from '@/lib/tutorial2/lessonTypes'

const ROOT = process.cwd()
const MIGR = ['20260717_tutorial_cards.sql', '20260871_tutorial_v3.sql']
  .map((f) => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', f), 'utf8')).join('\n')

let errors = 0
let warnings = 0
const err = (m: string) => { errors++; console.log('  ✗', m) }
const warn = (m: string) => { warnings++; console.log('  !', m) }
const ok = (m: string) => console.log('  ✓', m)

// ── 1) kortų vardai iš migracijų ──
const cardNames = new Set<string>()
for (const m of MIGR.matchAll(/\('TUT-[0-9A-Z]+','([^']+)'/g)) cardNames.add(m[1])
console.log(`\nTUT kortos migracijose: ${cardNames.size}`)

const usedCards = new Set<string>()
const collectTargetCard = (t: HighlightTarget | null | undefined) => {
  if (!t) return
  if (t.kind === 'handCard' && t.cardName) usedCards.add(t.cardName)
  if (t.kind === 'unit' && t.cardName) usedCards.add(t.cardName)
}

const voiceById = new Map<string, string>()
let steps = 0, dialogues = 0

for (const lesson of tutorialLessonSeeds as LessonSeed[]) {
  const cfg = lesson.config
  const sides = [cfg.setup.player, cfg.setup.enemy]
  for (const sd of sides) {
    for (const list of [sd?.hand, sd?.deck, sd?.board, sd?.artifacts, sd?.curses, sd?.reactions]) {
      for (const n of list ?? []) usedCards.add(n)
    }
    if (sd?.champion) usedCards.add(sd.champion)
    if (sd?.field) usedCards.add(sd.field)
  }

  const ids = new Set<string>()
  for (const st of cfg.steps as LessonStep[]) {
    steps++
    if (ids.has(st.id)) err(`${lesson.seedKey}: dubliuotas žingsnio id „${st.id}"`)
    ids.add(st.id)

    for (const h of st.highlight ?? []) collectTargetCard(h)
    collectTargetCard(st.arrowTo); collectTargetCard(st.arrowFrom); collectTargetCard(st.zoom)
    for (const a of st.allow ?? []) { if (a.cardName) usedCards.add(a.cardName); if (a.targetName) usedCards.add(a.targetName) }
    for (const sc of st.enemyScript ?? []) {
      if (sc.type === 'play') usedCards.add(sc.cardName)
      if (sc.type === 'play' && sc.targetCard) usedCards.add(sc.targetCard)
      if (sc.type === 'attack') { usedCards.add(sc.attackerCard); if (sc.targetCard) usedCards.add(sc.targetCard) }
    }
    const ap = st.apply
    for (const list of [ap?.addHandYou, ap?.addBoardYou, ap?.addBoardAi, ap?.cursesYou, ap?.seedEnemyDeckTop]) {
      for (const n of list ?? []) usedCards.add(n)
    }
    for (const s of ap?.setStatus ?? []) usedCards.add(s.cardName)
    if (st.complete.on === 'event' && st.complete.cardName) usedCards.add(st.complete.cardName)
    if (st.complete.on === 'inspect' && st.complete.cardName) usedCards.add(st.complete.cardName)

    // 2) veiksmo žingsniai privalo leisti veiksmą
    const needsAllow = st.complete.on === 'event' || st.complete.on === 'win' || st.complete.on === 'mulliganDone'
    if (needsAllow && (st.allow ?? []).length === 0) err(`${lesson.seedKey}/${st.id}: complete=${st.complete.on}, bet allow tuscias — gate užrakintų pamoką`)
    // enemyTurnDone žingsnis be dialogo ir be enemyScript = tuščias laukimas
    if (st.complete.on === 'enemyTurnDone' && !(st.enemyScript ?? []).length) err(`${lesson.seedKey}/${st.id}: enemyTurnDone be enemyScript`)

    // 4b) mulliganDone privalo leisti BŪTENT mulligan veiksmą
    if (st.complete.on === 'mulliganDone' && !(st.allow ?? []).some((a) => a.kind === 'mulligan')) {
      err(`${lesson.seedKey}/${st.id}: mulliganDone be allow:[{kind:'mulligan'}] — gate blokuotų patvirtinimą`)
    }
    // 4c) scripted ataka: ar puolėjas apskritai gali būti lentoje?
    for (const sc of st.enemyScript ?? []) {
      if (sc.type !== 'attack') continue
      const onBoard = (cfg.setup.enemy?.board ?? []).includes(sc.attackerCard)
      const added = (cfg.steps as LessonStep[]).some((x) => (x.apply?.addBoardAi ?? []).includes(sc.attackerCard))
      const played = (cfg.steps as LessonStep[]).some((x) => (x.enemyScript ?? []).some((y) => y.type === 'play' && y.cardName === sc.attackerCard))
      if (!onBoard && !added && !played) {
        warn(`${lesson.seedKey}/${st.id}: scripted ataka „${sc.attackerCard}" — padaro nėra nei setup lentoje, nei apply.addBoardAi, nei anksčiau sužaisto (runtime fallback išgelbės, bet demonstracija gali neatitikti teksto)`)
      }
    }
    // 5) drag-path
    if (st.arrowStyle === 'drag-path' && (!st.arrowFrom || !st.arrowTo)) err(`${lesson.seedKey}/${st.id}: drag-path be arrowFrom/arrowTo`)

    for (const d of st.dialogue ?? []) {
      dialogues++
      if (d.text.length > 160) err(`${lesson.seedKey}/${st.id}: ekrano tekstas per ilgas (${d.text.length} ž.)`)
      if (!d.voiceId) { err(`${lesson.seedKey}/${st.id}: dialogas be voiceId`); continue }
      if (!/^[a-z0-9-]+$/.test(d.voiceId)) err(`${lesson.seedKey}/${st.id}: netinkamas voiceId „${d.voiceId}"`)
      const prev = voiceById.get(d.voiceId)
      const full = d.voiceText ?? d.text
      if (prev && prev !== full) err(`voiceId „${d.voiceId}" naudojamas dviem SKIRTINGIEMS tekstams`)
      voiceById.set(d.voiceId, full)
    }
  }
}

// ── kortų egzistavimas ──
const missing = [...usedCards].filter((n) => !cardNames.has(n)).sort()
if (missing.length) err(`pamokose naudojamos NEEGZISTUOJANČIOS kortos: ${missing.join(', ')}`)
else ok(`visos ${usedCards.size} pamokose naudojamos kortos yra migracijose`)

// ── pamokų sandara ──
const keys = tutorialLessonSeeds.map((l) => l.seedKey)
if (new Set(keys).size !== keys.length) err('dubliuoti seedKey')
if (tutorialLessonSeeds.length !== 8) err(`tikėtasi 8 pamokų, rasta ${tutorialLessonSeeds.length}`)
for (const k of CORE_LESSON_KEYS) if (!keys.includes(k)) err(`CORE_LESSON_KEYS mini nežinomą pamoką ${k}`)
const orders = tutorialLessonSeeds.map((l) => l.sortOrder)
if (new Set(orders).size !== orders.length) err('dubliuoti sortOrder')
const l8 = tutorialLessonSeeds.find((l) => l.seedKey === 'tut-v3-l8')
if (!l8?.config.matchStartFlow) err('L8 privalo turėti matchStartFlow=true (moneta + mulliganas)')
for (const l of tutorialLessonSeeds) {
  if (l.seedKey !== 'tut-v3-l8' && l.config.matchStartFlow) err(`${l.seedKey}: matchStartFlow leidžiamas TIK L8`)
}

ok(`pamokų: ${tutorialLessonSeeds.length}, žingsnių: ${steps}, dialogų: ${dialogues}, unikalių balso eilučių: ${voiceById.size}`)

console.log(`\nTUTORIAL V3: ${errors ? `KLAIDŲ: ${errors}` : 'VISKAS GERAI ✓'}${warnings ? ` · įspėjimų: ${warnings}` : ''}`)
process.exit(errors ? 1 : 0)
