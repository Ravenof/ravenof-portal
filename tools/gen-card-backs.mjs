#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// Ravenof kortų nugarėlių paketo generatorius — VIENA dizaino sistema:
// bendra gotikinio rėmo geometrija + centrinis antspaudas + po VIENĄ kontroliuojamą
// akcento spalvą kiekvienam dizainui („Stylised Gothic Animation" kryptis).
//
// STATUSAS: tai INTERIM (programiškai generuoti vektoriniai) assetai — vientisi,
// be teksto, be emoji, teisingu santykiu ir maskėmis. Galutinis rankos darbo
// artas (ir tikros frakcijų emblemos!) keičiami 1:1 pagal docs/CARD-BACK-MANIFEST.md
// nekeičiant kodų, kelių ar nuosavybės.
//
// Išvestys:
//   tools/card-backs/masters/<file>.png   — lossless master 1044×1416 (avatarai 640×640)
//   public/card-backs/<file>.webp         — runtime 522×708 (avatarai 320×320)
//   public/card-backs/thumbs/<file>.webp  — miniatiūra 156×212 (avatarai 96×96)
// Paleisti: node tools/gen-card-backs.mjs
// ════════════════════════════════════════════════════════════════════════════
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const W = 1044, H = 1416, CX = W / 2, CY = H / 2

// ── Dizainų konfigūracija: code → { file, accent, accent2, sigil } ───────────
// Akcentai pagal audit Part 6 („Suggested accents").
const BACKS = [
  { code: 'cb_default',              file: 'ravenof-default',          accent: '#8d1f2d', accent2: '#c8b89a', sigil: 'raven' },
  { code: 'cb_mirties_marsas',       file: 'cb-mirties-marsas',        accent: '#5d7360', accent2: '#cfc9b8', sigil: 'bone' },
  { code: 'cb_plesiku_naktis',       file: 'cb-plesiku-naktis',        accent: '#5d2430', accent2: '#9aa1ad', sigil: 'dagger' },
  { code: 'cb_vryhioko_gauja',       file: 'cb-vryhioko-gauja',        accent: '#6f6a2e', accent2: '#a8874a', sigil: 'fang' },
  { code: 'cb_demonu_orda',          file: 'cb-demonu-orda',           accent: '#b0421f', accent2: '#e08a4a', sigil: 'flame' },
  { code: 'cb_inkvizicijos_legionas',file: 'cb-inkvizicijos-legionas', accent: '#8d1f2d', accent2: '#d8cbb0', sigil: 'seal' },
  { code: 'cb_sviesos_pulkas',       file: 'cb-sviesos-pulkas',        accent: '#a98c3f', accent2: '#e6dcc2', sigil: 'sun' },
  { code: 'cb_mistikos_melodija',    file: 'cb-mistikos-melodija',     accent: '#5a4a8f', accent2: '#7fa3c9', sigil: 'moon' },
  { code: 'cb_rytu_vejas',           file: 'cb-rytu-vejas',            accent: '#3f7a63', accent2: '#8aa08a', sigil: 'wind' },
  { code: 'cb_ruby_inferno',         file: 'cb-rubino-infernas',       accent: '#a3122e', accent2: '#ff7a45', sigil: 'ruby' },
  { code: 'cb_crimson_crown',        file: 'cb-karmazino-karuna',      accent: '#8d1f2d', accent2: '#b08d3f', sigil: 'crown' },
  { code: 'cb_ember',                file: 'cb-ember',                 accent: '#a3481f', accent2: '#e0a34a', sigil: 'flame' },
  { code: 'cb_frost',                file: 'cb-frost',                 accent: '#3f6a8f', accent2: '#a9c9e0', sigil: 'shard' },
  { code: 'cb_void',                 file: 'cb-void',                  accent: '#5a3f8f', accent2: '#a98ad6', sigil: 'void' },
  { code: 'cb_gold',                 file: 'cb-gold',                  accent: '#a9832f', accent2: '#e8cf8a', sigil: 'diamond' },
  { code: 'basic_card_back',         file: 'cb-basic',                 accent: '#6b6474', accent2: '#a9a4b0', sigil: 'tier1' },
  { code: 'rare_card_back',          file: 'cb-rare',                  accent: '#3f6a8f', accent2: '#8fb3d1', sigil: 'tier2' },
  { code: 'premium_card_back',       file: 'cb-premium',               accent: '#6a4a9f', accent2: '#b391dd', sigil: 'tier3' },
  { code: 'legendary_card_back',     file: 'cb-legendary',             accent: '#a9701f', accent2: '#e8b45a', sigil: 'tier4' },
  { code: 'prestige_card_back',      file: 'cb-prestige',              accent: '#9B3A48', accent2: '#e0b45a', sigil: 'laurel' },
]

const AVATARS = [
  { code: 'av_ruby_raven',            file: 'av-rubino-varnas', accent: '#a3122e', accent2: '#ff7a45', sigil: 'raven' },
  { code: 'av_raven',                 file: 'av-varnas',        accent: '#6b6474', accent2: '#c8b89a', sigil: 'raven' },
  { code: 'av_dragon',                file: 'av-drakonas',      accent: '#a3481f', accent2: '#e0a34a', sigil: 'fang' },
  { code: 'av_skull',                 file: 'av-kaukole',       accent: '#5d7360', accent2: '#cfc9b8', sigil: 'bone' },
  { code: 'av_crown',                 file: 'av-karuna',        accent: '#a9832f', accent2: '#e8cf8a', sigil: 'crown' },
  { code: 'av_inkvizitorius',         file: 'av-inkvizitorius', accent: '#8d1f2d', accent2: '#d8cbb0', sigil: 'seal' },
  { code: 'basic_player_avatar',      file: 'av-basic',         accent: '#6b6474', accent2: '#a9a4b0', sigil: 'tier1' },
  { code: 'rare_player_avatar',       file: 'av-rare',          accent: '#3f6a8f', accent2: '#8fb3d1', sigil: 'tier2' },
  { code: 'premium_player_avatar',    file: 'av-premium',       accent: '#6a4a9f', accent2: '#b391dd', sigil: 'tier3' },
  { code: 'legendary_player_avatar',  file: 'av-legendary',     accent: '#a9701f', accent2: '#e8b45a', sigil: 'tier4' },
]

// ── Sigilai: ink-line stiliaus keliai, centruoti (0,0), ~±150 zonoje ─────────
function sigil(kind, A, A2) {
  const S = (d, w = 10, col = A2, fill = 'none') =>
    `<path d="${d}" fill="${fill}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  switch (kind) {
    case 'raven': // stilizuotas varnas profiliu: smailas snapas kairėn, pakeltas smailių plunksnų sparnas
      return S('M -132 -58 L -70 -44 C -60 -78 -34 -98 0 -100 C 10 -128 34 -144 64 -144 L 46 -116 L 92 -128 L 66 -96 C 92 -104 116 -100 134 -86 L 96 -74 C 118 -60 128 -36 126 -8 C 122 34 92 66 48 74 L 78 96 L 30 88 L 44 124 L 2 92 C -10 116 -30 132 -56 138 L -44 100 C -78 92 -100 66 -104 30 C -108 -4 -94 -30 -70 -44 Z', 8, A2, 'rgba(0,0,0,0.3)')
        + `<circle cx="-52" cy="-62" r="8" fill="${A}"/>`
        + S('M -104 30 C -70 44 -30 46 6 34', 6, A2)
    case 'bone': // kaukolės arka + du kaulai
      return S('M 0 -110 C -62 -110 -96 -66 -96 -14 C -96 26 -76 52 -48 64 L -48 104 L 48 104 L 48 64 C 76 52 96 26 96 -14 C 96 -66 62 -110 0 -110 Z')
        + `<circle cx="-36" cy="-18" r="20" fill="${A}"/><circle cx="36" cy="-18" r="20" fill="${A}"/>`
        + S('M -14 30 L 0 8 L 14 30 Z', 8)
    case 'dagger':
      return S('M 0 -140 L 22 -60 L 22 60 L 0 150 L -22 60 L -22 -60 Z', 9, A2, 'rgba(0,0,0,0.2)')
        + S('M -66 -60 L 66 -60', 12) + S('M 0 -60 L 0 -96', 12) + `<circle cx="0" cy="-112" r="14" fill="${A}"/>`
    case 'fang':
      return S('M -90 -90 C -60 -20 -40 40 0 120 C 40 40 60 -20 90 -90 C 50 -50 30 -40 0 -40 C -30 -40 -50 -50 -90 -90 Z', 9, A2, 'rgba(0,0,0,0.2)')
        + `<circle cx="0" cy="-96" r="11" fill="${A}"/>`
    case 'flame':
      return S('M 0 -140 C 40 -84 76 -48 76 8 C 76 74 44 118 0 140 C -44 118 -76 74 -76 8 C -76 -48 -40 -84 0 -140 Z', 9)
        + S('M 0 -64 C 20 -34 38 -14 38 18 C 38 56 20 82 0 96 C -20 82 -38 56 -38 18 C -38 -14 -20 -34 0 -64 Z', 8, A, A + '33')
    case 'seal': // inkvizicijos kryžius-vaško antspaudas
      return `<circle cx="0" cy="0" r="96" fill="${A}22" stroke="${A}" stroke-width="10"/>`
        + S('M 0 -120 L 0 120', 14) + S('M -78 -42 L 78 -42', 14) + S('M -46 34 L 46 34', 10)
    case 'sun':
      return `<circle cx="0" cy="0" r="58" fill="none" stroke="${A2}" stroke-width="11"/>`
        + Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; const x1 = Math.cos(a) * 84, y1 = Math.sin(a) * 84, x2 = Math.cos(a) * 138, y2 = Math.sin(a) * 138; return S(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`, 11) }).join('')
        + `<circle cx="0" cy="0" r="20" fill="${A}"/>`
    case 'moon':
      return S('M 44 -120 C -30 -104 -78 -46 -78 20 C -78 88 -28 132 36 132 C 8 100 -8 66 -8 16 C -8 -42 12 -88 44 -120 Z', 9, A2, 'rgba(0,0,0,0.2)')
        + `<circle cx="66" cy="-6" r="12" fill="${A}"/><circle cx="92" cy="42" r="8" fill="${A}"/>`
    case 'wind':
      return S('M -110 -40 C -40 -70 30 -70 70 -40 C 108 -12 96 30 58 30 C 30 30 22 4 40 -8', 11)
        + S('M -110 40 C -30 12 40 12 84 44 C 116 68 104 106 70 104', 11)
        + `<circle cx="-124" cy="-40" r="9" fill="${A}"/><circle cx="-124" cy="40" r="9" fill="${A}"/>`
    case 'ruby':
      return S('M 0 -110 L 84 -36 L 52 110 L -52 110 L -84 -36 Z', 10, A2, A + '44')
        + S('M -84 -36 L 0 -8 L 84 -36 M 0 -8 L 0 110 M -52 110 L 0 -8 L 52 110', 7)
        + S('M 0 -110 L 0 -8', 7)
    case 'crown':
      return S('M -96 60 L -96 -30 L -44 10 L 0 -78 L 44 10 L 96 -30 L 96 60 Z', 10, A2, A + '33')
        + S('M -96 84 L 96 84', 12) + `<circle cx="0" cy="-96" r="12" fill="${A}"/><circle cx="-96" cy="-48" r="9" fill="${A}"/><circle cx="96" cy="-48" r="9" fill="${A}"/>`
    case 'shard':
      return S('M 0 -140 L 44 -40 L 24 130 L -24 130 L -44 -40 Z', 9, A2, A + '33') + S('M 0 -140 L 0 130', 6)
        + S('M -78 -12 L -44 22 M 78 -12 L 44 22', 9)
    case 'void':
      return S('M 0 -120 C 66 -120 120 -66 120 0 C 120 66 66 120 0 120 C -50 120 -90 80 -90 30 C -90 -14 -56 -48 -12 -48 C 22 -48 48 -22 48 12 C 48 38 28 58 2 58', 10)
        + `<circle cx="0" cy="0" r="10" fill="${A}"/>`
    case 'diamond':
      return S('M 0 -110 L 78 0 L 0 110 L -78 0 Z', 10, A2, A + '33') + S('M 0 -110 L 0 110 M -78 0 L 78 0', 6)
    case 'laurel':
      return S('M -60 110 C -110 60 -120 -20 -80 -80 M 60 110 C 110 60 120 -20 80 -80', 10)
        + Array.from({ length: 4 }, (_, i) => S(`M ${-92 + i * 8} ${60 - i * 42} q -34 -12 -42 -40 q 34 -4 42 40 Z`, 6, A2, A + '33')).join('')
        + Array.from({ length: 4 }, (_, i) => S(`M ${92 - i * 8} ${60 - i * 42} q 34 -12 42 -40 q -34 -4 -42 40 Z`, 6, A2, A + '33')).join('')
        + S('M 0 -46 L 14 -8 L 54 -8 L 22 16 L 34 56 L 0 32 L -34 56 L -22 16 L -54 -8 L -14 -8 Z', 7, A2, A + '55')
    default: { // tier1..4 — ševronai pagal pakopą
      const n = Number(kind.replace('tier', '')) || 1
      return Array.from({ length: n }, (_, i) => S(`M -70 ${44 - i * 52} L 0 ${-8 - i * 52} L 70 ${44 - i * 52}`, 13)).join('')
        + `<circle cx="0" cy="96" r="11" fill="${A}"/>`
    }
  }
}

// ── Bendra rėmo geometrija (VIENODA visam rinkiniui) ─────────────────────────
function frameSvg(A, A2) {
  const corner = (tx, ty, sx, sy) => `
    <g transform="translate(${tx} ${ty}) scale(${sx} ${sy})" stroke="${A2}" fill="none" stroke-width="7" stroke-linecap="round">
      <path d="M 46 168 L 46 92 Q 46 46 92 46 L 168 46"/>
      <path d="M 62 200 L 62 106 Q 62 62 106 62 L 200 62" stroke-width="4" opacity="0.55"/>
      <path d="M 46 92 L 30 60 L 46 46 L 60 30 L 92 46" fill="${A}" stroke="${A2}" stroke-width="4"/>
    </g>`
  const finial = (x, y, rot) => `
    <g transform="translate(${x} ${y}) rotate(${rot})">
      <path d="M 0 -26 L 14 0 L 0 26 L -14 0 Z" fill="${A}" stroke="${A2}" stroke-width="4"/>
      <path d="M 0 -44 L 6 -28 L -6 -28 Z" fill="${A2}"/>
    </g>`
  return `
    <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="26" fill="none" stroke="#2a2430" stroke-width="10"/>
    <rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="20" fill="none" stroke="${A2}" stroke-width="5" opacity="0.9"/>
    <rect x="58" y="58" width="${W - 116}" height="${H - 116}" rx="14" fill="none" stroke="${A2}" stroke-width="2.5" opacity="0.5"/>
    ${corner(0, 0, 1, 1)}${corner(W, 0, -1, 1)}${corner(0, H, 1, -1)}${corner(W, H, -1, -1)}
    ${finial(CX, 74, 0)}${finial(CX, H - 74, 180)}${finial(74, CY, -90)}${finial(W - 74, CY, 90)}
  `
}

function cardSvg({ accent: A, accent2: A2, sigil: sg }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="46%">
      <stop offset="0%" stop-color="${A}" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="${A}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${A}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#17131c"/>
      <stop offset="55%" stop-color="#100d14"/>
      <stop offset="100%" stop-color="#0a080c"/>
    </linearGradient>
    <filter id="tex"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.76  0 0 0 0 0.68  0 0 0 0.05 0"/>
      <feComposite operator="over" in2="SourceGraphic"/></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#field)"/>
  <rect width="${W}" height="${H}" fill="transparent" filter="url(#tex)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${frameSvg(A, A2)}
  <!-- centrinis antspaudas: dvigubas žiedas + rombo spinduliai + sigilas -->
  <g transform="translate(${CX} ${CY})">
    <circle r="252" fill="#0c0a10" stroke="${A2}" stroke-width="6" opacity="0.96"/>
    <circle r="226" fill="none" stroke="${A2}" stroke-width="2.5" opacity="0.55"/>
    <circle r="252" fill="none" stroke="${A}" stroke-width="2" opacity="0.6" filter="url(#soft)"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; const x = Math.cos(a) * 240, y = Math.sin(a) * 240; return `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} l 0 0" stroke="${A2}" stroke-width="9" stroke-linecap="round"/>` }).join('')}
    <circle r="186" fill="${A}12"/>
    ${sigil(sg, A, A2)}
  </g>
  <!-- apatinis/viršutinis smulkus ornamentas simetrijai -->
  <g stroke="${A2}" stroke-width="4" fill="none" opacity="0.7">
    <path d="M ${CX - 150} 158 q 150 44 300 0"/>
    <path d="M ${CX - 150} ${H - 158} q 150 -44 300 0"/>
  </g>
</svg>`
}

function avatarSvg({ accent: A, accent2: A2, sigil: sg }) {
  const S = 640, c = S / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${A}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#14101a"/>
      <stop offset="100%" stop-color="#0a080c"/>
    </radialGradient>
    <filter id="tex"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.76  0 0 0 0 0.68  0 0 0 0.05 0"/>
      <feComposite operator="over" in2="SourceGraphic"/></filter>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
  <rect width="${S}" height="${S}" fill="transparent" filter="url(#tex)"/>
  <circle cx="${c}" cy="${c}" r="${c - 14}" fill="none" stroke="${A2}" stroke-width="10"/>
  <circle cx="${c}" cy="${c}" r="${c - 34}" fill="none" stroke="${A}" stroke-width="4" opacity="0.7"/>
  <g transform="translate(${c} ${c + 10}) scale(1.35)">${sigil(sg, A, A2)}</g>
</svg>`
}

async function main() {
  const mastersDir = join(ROOT, 'tools', 'card-backs', 'masters')
  const outDir = join(ROOT, 'public', 'card-backs')
  const thumbDir = join(outDir, 'thumbs')
  for (const d of [mastersDir, outDir, thumbDir]) mkdirSync(d, { recursive: true })

  let n = 0
  for (const b of BACKS) {
    const svg = Buffer.from(cardSvg(b))
    const master = await sharp(svg, { density: 96 }).png({ compressionLevel: 9 }).toBuffer()
    writeFileSync(join(mastersDir, `${b.file}.png`), master)
    await sharp(master).resize(522, 708).webp({ quality: 82 }).toFile(join(outDir, `${b.file}.webp`))
    await sharp(master).resize(156, 212).webp({ quality: 78 }).toFile(join(thumbDir, `${b.file}.webp`))
    n++
  }
  for (const a of AVATARS) {
    const svg = Buffer.from(avatarSvg(a))
    const master = await sharp(svg, { density: 96 }).png({ compressionLevel: 9 }).toBuffer()
    writeFileSync(join(mastersDir, `${a.file}.png`), master)
    await sharp(master).resize(320, 320).webp({ quality: 84 }).toFile(join(outDir, `${a.file}.webp`))
    await sharp(master).resize(96, 96).webp({ quality: 80 }).toFile(join(thumbDir, `${a.file}.webp`))
    n++
  }
  console.log(`OK: ${n} dizainai (masters + runtime webp + thumbs)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
