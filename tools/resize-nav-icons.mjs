// Sumažina bottom nav ikonas iki 128×128 (30px UI + retina atsarga).
// Paleidžiama Windows pusėje (git-commit491.bat) — bash mount'as šiuos PNG mato pasenusius.
import sharp from 'sharp'
import { statSync, writeFileSync } from 'node:fs'

const ICONS = ['nav-home', 'nav-collection', 'nav-decks', 'nav-shop', 'nav-more']
for (const n of ICONS) {
  const p = `public/digital/icons/${n}.png`
  const { width } = await sharp(p).metadata()
  if (width <= 128) { console.log(n, 'jau mažas, praleista'); continue }
  const buf = await sharp(p).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(p, buf)
  console.log(n, '→ 128px,', statSync(p).size, 'B')
}
