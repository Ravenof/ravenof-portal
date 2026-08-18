#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  TUTORIAL V3 — „Senojo Korvo" balso failų gamyba (ElevenLabs) + įkėlimas.
//
//  1) npm run tutorial:voice          → sugeneruoja tutorial-voice.json
//  2) node tools/tutorial-voice-generate.mjs            → sukuria mp3 į ./tutorial-voice/
//     node tools/tutorial-voice-generate.mjs --upload   → dar ir įkelia į Supabase
//     node tools/tutorial-voice-generate.mjs --only l1  → tik l1-* eilutės
//     node tools/tutorial-voice-generate.mjs --force    → perrašo jau esamus failus
//
//  ENV (.env.local arba aplinka):
//    ELEVENLABS_API_KEY   — būtinas generavimui
//    ELEVENLABS_VOICE_ID  — Senojo Korvo balso ID (klonuotas ar iš Voice Library)
//    ELEVENLABS_MODEL     — numatyta: eleven_multilingual_v2
//    NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — įkėlimui (--upload)
//
//  Kiekviena eilutė generuojama ATSKIRAI (trumpi failai → švarus skip pamokoje).
//  Jau egzistuojantys failai praleidžiami (nebent --force), tad procesą galima
//  saugiai kartoti / tęsti.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'tutorial-voice')
const SRC = path.join(ROOT, 'tutorial-voice.json')

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }

// ── .env.local įkėlimas (be priklausomybių) ──
function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(ROOT, f)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const API_KEY = process.env.ELEVENLABS_API_KEY
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!fs.existsSync(SRC)) {
  console.error('✗ Nerastas tutorial-voice.json — pirma paleisk: npm run tutorial:voice')
  process.exit(1)
}
const { lines } = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const only = val('--only')
const todo = only ? lines.filter((l) => l.voiceId.startsWith(only)) : lines
fs.mkdirSync(OUT, { recursive: true })

// Režisūros nustatymai pagal handoff §6
const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 0.95 }

async function tts(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: VOICE_SETTINGS, output_format: 'mp3_44100_128' }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return Buffer.from(await res.arrayBuffer())
}

async function upload(file, buf) {
  const url = `${SUPA_URL.replace(/\/$/, '')}/storage/v1/object/card-audio/tutorial/${file}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
    body: buf,
  })
  if (!res.ok) throw new Error(`Supabase upload ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

const doUpload = has('--upload')
if (!API_KEY || !VOICE_ID) {
  console.error('✗ Trūksta ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID.')
  console.error('  Tekstus rankiniam generavimui rasi TUTORIAL-VOICE-SCRIPT.md')
  process.exit(1)
}
if (doUpload && (!SUPA_URL || !SUPA_KEY)) {
  console.error('✗ --upload reikalauja NEXT_PUBLIC_SUPABASE_URL ir SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

let made = 0, skipped = 0, failed = 0, bytes = 0
for (const l of todo) {
  const dest = path.join(OUT, l.file)
  try {
    let buf
    if (fs.existsSync(dest) && !has('--force')) {
      buf = fs.readFileSync(dest); skipped++
    } else {
      buf = await tts(l.text)
      fs.writeFileSync(dest, buf); made++
      await new Promise((r) => setTimeout(r, 350))   // mandagus tempas API'ui
    }
    bytes += buf.length
    if (doUpload) await upload(l.file, buf)
    console.log(`  ${fs.existsSync(dest) ? '✓' : '·'} ${l.file}  (${Math.round(buf.length / 1024)} KB)${doUpload ? ' ↑' : ''}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${l.file}: ${e.message}`)
  }
}
console.log(`\nSugeneruota: ${made} · praleista (jau buvo): ${skipped} · klaidų: ${failed} · bendras dydis: ${(bytes / 1048576).toFixed(1)} MB`)
if (!doUpload) console.log('Įkėlimui: node tools/tutorial-voice-generate.mjs --upload')
