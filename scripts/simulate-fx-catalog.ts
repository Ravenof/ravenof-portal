// ── FX katalogo ir variklio suderinamumo patikros (npm run game:test:fx) ─────
// Be DOM: tikrina, kad katalogas (admin sąrašai) ir fxStage įgyvendinimai sutampa,
// kad kiekvienas statusas / projectile tipas turi skrydį + smūgį (niekas nelieka
// „tik su smūgiu"), ir kad admin parinktas smūgis (fxImpact) pasiekia žurnalą.
import { readFileSync } from 'node:fs'
import { fxStage } from '@/lib/game/fxStage'
import {
  SUMMON_FX, FX_PROJECTILES, FX_IMPACTS, LEGACY_SUMMON_MAP, PROJECTILE_TO_FX, STATUS_TO_FX,
  factionSummonFx, summonLandMs, isSummonFxId, isFxImpactId,
  SKILL_FX, CHAMPION_FX_KEYS, defaultSkillFx, championKey, isSkillFxId,
} from '@/lib/game/fxCatalog'
import { SUMMON_EFFECTS, PROJECTILE_TYPES } from '@/lib/game/types'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, extra = '') => { if (cond) { pass++; console.log('  ✓ ' + name) } else { fail++; console.log('  ✗ FAIL: ' + name + (extra ? ' — ' + extra : '')) } }
const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

console.log('══ FX katalogas ↔ variklis ══')
const ids = fxStage.ids()
ok('30 iškvietimo choreografijų', SUMMON_FX.length === 30)
ok('katalogo iškvietimai = variklio įgyvendinimai', same(SUMMON_FX.map((s) => s.value), ids.summons))
ok('katalogo skrydžiai = variklio įgyvendinimai', same(FX_PROJECTILES.map((s) => s.value), ids.projectiles))
ok('katalogo smūgiai = variklio įgyvendinimai', same(FX_IMPACTS.map((s) => s.value), ids.impacts))
ok('iškvietimų id unikalūs', new Set(SUMMON_FX.map((s) => s.value)).size === SUMMON_FX.length)
ok('kiekvienas iškvietimas turi nusileidimo laiką 200–1700 ms', SUMMON_FX.every((s) => s.landMs >= 200 && s.landMs <= 1700), SUMMON_FX.filter((s) => !(s.landMs >= 200 && s.landMs <= 1700)).map((s) => s.value).join())
ok('summonLandMs: nežinomas / tuščias → 0', summonLandMs(null) === 0 && summonLandMs(undefined) === 0)
ok('isSummonFxId atmeta šiukšles', !isSummonFxId('nope') && !isSummonFxId(5) && isSummonFxId('heroLanding'))
ok('isFxImpactId atmeta šiukšles', !isFxImpactId('nope') && !isFxImpactId(undefined) && isFxImpactId('seal'))

console.log('══ Čempionų gebėjimai ir fazės virsmas ══')
ok('21 gebėjimo FX (7 čempionai × 3)', SKILL_FX.length === 21 && CHAMPION_FX_KEYS.length === 7)
ok('katalogo gebėjimai = variklio įgyvendinimai', same(SKILL_FX.map((s) => s.value), ids.skills))
ok('visi gebėjimų smūgiai egzistuoja variklyje', ids.skillStrikeRefs.every((k) => ids.strikes.includes(k)), ids.skillStrikeRefs.filter((k) => !ids.strikes.includes(k)).join())
ok('kiekvienas čempionas turi fazės virsmą', same(CHAMPION_FX_KEYS, ids.evolves))
ok('numatytasis gebėjimo FX pagal kortos vardą (visos 7 kortos, 3 gebėjimai)', ['Prazaras I-masis', 'Nefilimas Galdrianas', "Zertahul'as Paskutinysis", 'Archimagas Lisarijus', 'Kapitonas Juodasmakris', 'Dorianos golemas', "Inžinierius Skrag'as"].every((n) => [0, 1, 2].every((i) => isSkillFxId(defaultSkillFx(n, i))) && !!championKey(n)))
ok('nežinomas čempionas → be gebėjimo FX (įprasti efektai)', defaultSkillFx('Nindzė Katsumoto', 0) === null && defaultSkillFx('Prazaras', 3) === null && championKey(null) === null)
ok('gebėjimų užtaisymo laikas 500–1100 ms', SKILL_FX.every((s) => s.castMs >= 500 && s.castMs <= 1100))

console.log('══ Atgalinis suderinamumas ══')
ok('visi 22 seni summonEffect turi v3 atitikmenį', SUMMON_EFFECTS.every((e) => isSummonFxId(LEGACY_SUMMON_MAP[e.value])), SUMMON_EFFECTS.filter((e) => !isSummonFxId(LEGACY_SUMMON_MAP[e.value])).map((e) => e.value).join())
ok('visi admin ProjectileType (išskyrus none) turi skrydį + smūgį', PROJECTILE_TYPES.filter((p) => p.value !== 'none').every((p) => { const m = PROJECTILE_TO_FX[p.value]; return !!m && ids.projectiles.includes(m.proj) && ids.impacts.includes(m.impact) }))
ok('visų 8 frakcijų numatytasis iškvietimas galioja', ['Mirties maršas', 'Mistikos melodija', 'Inkvizicija', 'Šviesos pulkas', 'Demonų orda', 'Goblinų gauja', 'Plėšikai', 'Rytų vėjas', '', null].every((f) => isSummonFxId(factionSummonFx(f))))

console.log('══ Skrydis visada prieš smūgį ══')
const NEG_STATUSES = ['frozen', 'stunned', 'burning', 'poisoned', 'silenced']
ok('kiekvienas neigiamas statusas turi skrydį + smūgį', NEG_STATUSES.every((s) => { const m = STATUS_TO_FX[s]; return !!m && ids.projectiles.includes(m.proj) && ids.impacts.includes(m.impact) }))
ok('raktažodžių suteikimas (shield/stealth/taunt/sprint) turi skrydį + smūgį', ['shield', 'stealth', 'taunt', 'sprint'].every((s) => { const m = STATUS_TO_FX[s]; return !!m && ids.projectiles.includes(m.proj) && ids.impacts.includes(m.impact) }))
const tg = readFileSync(new URL('../src/components/tutorial/TutorialGame.tsx', import.meta.url), 'utf8')
ok('TutorialGame: statusai skrenda per flyStatus (status + buff keliai)', (tg.match(/flyStatus\(e, /g) ?? []).length >= 2)
ok('TutorialGame: scenos (Kovos šūksnio) žala gauna skrydį', /const sceneProj = viaScene/.test(tg) && /sceneFlew \? SCENE_PROJ_MS : 0/.test(tg))
ok('TutorialGame: šaltinis perkeliamas tarp paketų ir išvalomas ties ėjimo riba', /carrySrcRef\.current = null/.test(tg) && /keepSrc\(\)/.test(tg))
ok('TutorialGame: v3 iškvietimas praleidžia cardLand dulkes', /summonV3Ref\.current\.delete\(uid\)\) return/.test(tg))
ok('TutorialGame: kortos efektai laukia iškvietimo nusileidimo', /summonBusyUntilRef\.current - performance\.now\(\)/.test(tg) && /summonLand \+ 180/.test(tg))
ok('TutorialGame: gebėjimo smūgiai keičia įprastą skrydį (žala, gydymas, buff, statusas)', (tg.match(/skillHit\('/g) ?? []).length >= 3 && /fxStage\.skillCast\(/.test(tg))
ok('TutorialGame: fazės virsmas grojamas evolve įvykiui', /fxStage\.evolve\(/.test(tg))
ok('TutorialGame: fxStage sustabdomas uždarant kovą', /useEffect\(\(\) => \(\) => \{ fxStage\.stop\(\) \}, \[\]\)/.test(tg))

console.log('══ Variklio taisyklės ══')
const st = readFileSync(new URL('../src/lib/game/fxStage.ts', import.meta.url), 'utf8')
ok('kortos valdomos per translate/scale/rotate, ne transform (game-feel taisyklė Nr. 1)', !/st\.setProperty\('transform'/.test(st) && /setProperty\('translate'/.test(st) && /setProperty\('scale'/.test(st))
ok('jokio shadowBlur / ctx.filter (brangu mobiliuose)', !/shadowBlur|ctx\.filter/.test(st))
ok('gradientai tik sprite cache + 1 išimtis (potvynio juosta)', (st.match(/createRadialGradient/g) ?? []).length === 1 && (st.match(/createLinearGradient/g) ?? []).length === 1)
ok('dalelių pool\'as su riba ir LOW režimu', /MAXP = LOW \? 350 : 700/.test(st) && /if \(pN >= MAXP\) return/.test(st))
ok('gyvas kortos sekimas kiekvieną kadrą + canvas erdvės sinchronizacija (efektas visada ant kortos)', /sc\.cx = m\.px; sc\.cy = m\.py/.test(st) && /syncCanvasSpace\(\)/.test(st))
ok('gebėjimų FX be pieštų ikonų: jokio drawSkull / herbo kontūrų', !/drawSkull|crest:/.test(st))
ok('rAF sustoja, kai nėra efektų', /else \{ running = false;/.test(st))
ok('reduced-motion: variklis negroja', /available\(\): boolean \{ return typeof window !== 'undefined' && !reducedMotion\(\) \}/.test(st))
const en = readFileSync(new URL('../src/lib/tutorial/engine.ts', import.meta.url), 'utf8')
const ee = readFileSync(new URL('../src/lib/game/effectEngine.ts', import.meta.url), 'utf8')
ok('fxImpact: mapping → __fxImpact → žurnalo įvykis; atstatomas finally bloke', /gg\.__fxImpact = m\.fxImpact \?\? undefined/.test(ee) && /gg\.__fxImpact = prevImp/.test(ee) && /if \(fi\) e\.fxImpact = fi/.test(en))

console.log(`\n══ Rezultatas: ${pass} praėjo, ${fail} krito ══`)
if (fail) process.exit(1)
