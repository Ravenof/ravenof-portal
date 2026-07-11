// Build-time atlygių asset'ų validacija: (1) visi registro keliai egzistuoja
// public/ kataloge; (2) produkciniuose reward komponentuose nėra emoji.
// Paleidimas: node tools/validate-reward-assets.mjs  (exit 1 jei klaida)
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const src = readFileSync(join(root, 'src/lib/rewards/rewardVisuals.ts'), 'utf8')
const assets = [...src.matchAll(/I \+ '([^']+)'/g)].map((m) => '/digital/icons/' + m[1])
let fail = 0
for (const a of assets) {
  const p = join(root, 'public', a)
  if (!existsSync(p)) { console.error('❌ Trūksta asset:', a); fail++ }
  else console.log('✓', a)
}
const REWARD_FILES = [
  'src/components/digital/ui/RewardBits.tsx',
  'src/components/digital/DailyTasksModal.tsx',
  'src/components/digital/MonthlyLoginModal.tsx',
  'src/components/digital/SeasonPathModal.tsx',
  'src/components/digital/LevelRoadModal.tsx',
  'src/components/digital/ranked/Rewards.tsx',
]
const EMOJI = /🪙|🥈|💎|🔮|🎁|🏆|❓|⭐|🏵️|🎴(?!')/u
for (const f of REWARD_FILES) {
  const t = readFileSync(join(root, f), 'utf8')
  const bad = t.split('\n').map((l, i) => [l, i + 1]).filter(([l]) => EMOJI.test(l) && !l.trim().startsWith('//'))
  for (const [l, n] of bad) { console.error(`❌ Emoji reward faile ${f}:${n}: ${l.trim().slice(0, 80)}`); fail++ }
}
if (fail) { console.error(`\n${fail} klaidų.`); process.exit(1) }
console.log('\n✓ Reward asset validacija OK')
