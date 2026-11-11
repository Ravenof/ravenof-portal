// ── Garsų manifestas ─────────────────────────────────────────────────────────
// Surašo, kokie mp3 failai REALIAI yra public/sounds/{battle,reaction,ui}/ →
// src/lib/game/soundManifest.json. Garso variklis renkasi tik iš šio sąrašo,
// todėl nebespėlioja failų vardų (anksčiau: 7 spėjimai vienam garsui, dauguma 404,
// o pataikius į nesamą variantą suskambėdavo sintezė vietoj tikro failo).
//
// Paleidžiama automatiškai prieš `npm run dev / build / app:build`.
// Įkėlus naujus garsus rankiniu būdu:  npm run sounds:manifest
import { existsSync, readdirSync, writeFileSync } from 'node:fs'

const DIRS = ['battle', 'reaction', 'ui']
const out = {}
for (const d of DIRS) {
  const p = `public/sounds/${d}`
  out[d] = existsSync(p) ? readdirSync(p).filter((f) => /\.mp3$/i.test(f)).sort() : []
}
const file = 'src/lib/game/soundManifest.json'
writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
console.log(`[sounds] ${file}: ` + DIRS.map((d) => `${d} ${out[d].length}`).join(', '))
