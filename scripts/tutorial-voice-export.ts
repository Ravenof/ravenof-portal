// ════════════════════════════════════════════════════════════════════════════
//  TUTORIAL V3 — balso scenarijaus eksportas (ElevenLabs gamybai).
//  Iš pamokų seed'ų (vienintelio tiesos šaltinio) sugeneruoja:
//    • TUTORIAL-VOICE-SCRIPT.md — lentelė „failas ↔ tekstas" rankiniam darbui
//    • tutorial-voice.json      — įvestis tools/tutorial-voice-generate.mjs
//  Vykdymas: npm run tutorial:voice
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { tutorialLessonSeeds } from '@/data/tutorialLessons/lessonSeeds'
import { SYSTEM_VOICE_LINES } from '@/data/tutorialLessons/systemVoice'

type Line = { voiceId: string; file: string; text: string; lesson: string; step: string }

const lines: Line[] = []
const seen = new Set<string>()

for (const lesson of tutorialLessonSeeds) {
  for (const st of lesson.config.steps) {
    for (const d of st.dialogue ?? []) {
      if (!d.voiceId || seen.has(d.voiceId)) continue
      seen.add(d.voiceId)
      lines.push({ voiceId: d.voiceId, file: `${d.voiceId}.mp3`, text: d.voiceText ?? d.text, lesson: lesson.title, step: st.id })
    }
  }
}
for (const [voiceId, text] of Object.entries(SYSTEM_VOICE_LINES)) {
  if (seen.has(voiceId)) continue
  seen.add(voiceId)
  lines.push({ voiceId, file: `${voiceId}.mp3`, text, lesson: 'Sisteminės frazės', step: '-' })
}

const ROOT = process.cwd()
fs.writeFileSync(path.join(ROOT, 'tutorial-voice.json'), JSON.stringify({ lines }, null, 2) + '\n', 'utf8')

const md: string[] = []
md.push('# TUTORIAL V3 — balso scenarijus (ElevenLabs)\n')
md.push('> Auto-generuota: `npm run tutorial:voice`. Šaltinis — `src/data/tutorialLessons/lessonSeeds.ts`.')
md.push('> Balsas: **Senasis Korvas** (Eleven Multilingual v2; Stability 45–55, Similarity 75, Style 25–35,')
md.push('> Speaker boost ON, Speed 0.95). Failai: mp3 44.1 kHz, mono, ~96–128 kbps, −16 LUFS.')
md.push('> Įkėlimas: Supabase `card-audio` → aplankas `tutorial/`.\n')
md.push(`**Iš viso eilučių: ${lines.length}**\n`)
let cur = ''
for (const l of lines) {
  if (l.lesson !== cur) { cur = l.lesson; md.push(`\n## ${cur}\n`); md.push('| Failas | Tekstas (kopijuoti į ElevenLabs) |'); md.push('|---|---|') }
  md.push(`| \`${l.file}\` | ${l.text.replace(/\|/g, '\\|')} |`)
}
md.push('')
fs.writeFileSync(path.join(ROOT, 'TUTORIAL-VOICE-SCRIPT.md'), md.join('\n'), 'utf8')

console.log(`✓ ${lines.length} eilutės → TUTORIAL-VOICE-SCRIPT.md + tutorial-voice.json`)
