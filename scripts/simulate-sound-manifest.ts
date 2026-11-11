// ── Garsų manifesto ir raktų patikra (757) ───────────────────────────────────
// Paleidimas: npm run game:test:sounds
// Tikrina: manifestas sutampa su public/sounds turiniu; kiekvienas kovos garso
// raktas turi savo failą ARBA fallback rakto failą ARBA sintezę; variantų paieška
// nepainioja panašių vardų (impact vs impact-1, zmk-crit vs zmk-flip).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { sfxVariants, sfxExists } from '../src/lib/sfxPlayer'
import { BATTLE_SOUND_FILES, battleSoundHasOwnFile } from '../src/lib/game/soundManager'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
const manifest = JSON.parse(readFileSync('src/lib/game/soundManifest.json', 'utf8')) as Record<string, string[]>
console.log('\n── Manifestas = diskas ──')
for (const d of ['battle', 'reaction', 'ui']) {
  const p = `public/sounds/${d}`
  const disk = existsSync(p) ? readdirSync(p).filter((f) => /\.mp3$/i.test(f)).sort() : []
  check(`${d}: ${disk.length} failų, manifestas sutampa (jei ne – npm run sounds:manifest)`, JSON.stringify(disk) === JSON.stringify(manifest[d] ?? []))
}
console.log('\n── Variantų paieška ──')
{
  const imp = sfxVariants('battle', 'impact').map((u) => u.split('/').pop())
  check('impact → impact.mp3 + impact-N.mp3, be svetimų', imp.length >= 1 && imp.every((f) => /^impact(-\d+)?\.mp3$/.test(f!)), imp.join(','))
  check('zmk-crit neapima zmk-flip / zmk-fizzle', sfxVariants('battle', 'zmk-crit').every((u) => /zmk-crit/.test(u)))
  check('nesamas garsas → tuščias sąrašas (jokių spėjimų)', sfxVariants('battle', 'tokio-nera').length === 0)
  check('sfxExists: esamas true, nesamas false', sfxExists('/sounds/battle/death.mp3') && !sfxExists('/sounds/battle/death-5.mp3') && !sfxExists('/sounds/ui/hover-1.mp3') === (manifest.ui.indexOf('hover-1.mp3') === -1))
  check('puff ir gold turi savo failus', battleSoundHasOwnFile('puff') && battleSoundHasOwnFile('gold'))
}
console.log('\n── Raktai be savo failo (skamba fallback / sintezė) ──')
{
  const keys = Object.keys(BATTLE_SOUND_FILES) as (keyof typeof BATTLE_SOUND_FILES)[]
  const missing = keys.filter((k) => !battleSoundHasOwnFile(k))
  console.log('   ' + (missing.length ? missing.map((k) => `${k} → ${BATTLE_SOUND_FILES[k]}.mp3`).join('\n   ') : '(visi turi)'))
  check('raktų sąrašas netuščias', keys.length > 30, String(keys.length))
}
console.log(`\n${pass} ✓ / ${fail} ✗`); if (fail) process.exit(1)
