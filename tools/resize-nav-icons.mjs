// Bottom nav ikonų paruošimas (leidžiama Windows pusėje per git-commit493.bat):
// 1) trim — nukerpamas permatomas kraštas (menas užpildo drobę, nebeatrodo mažas)
// 2) resize į 128×128 (30–40px UI + retina atsarga)
import sharp from 'sharp'
import { statSync, writeFileSync } from 'node:fs'

const ICONS = ['nav-home', 'nav-collection', 'nav-decks', 'nav-shop', 'nav-more']
for (const n of ICONS) {
  const p = `public/digital/icons/${n}.png`
  const buf = await sharp(p)
    .trim({ threshold: 10 })                     // nukerpa permatomą/vienodą kraštą
    .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }) // 4px kvėpavimo tarpas
    .png({ compressionLevel: 9 })
    .toBuffer()
  writeFileSync(p, buf)
  console.log(n, '→ trim+128px,', statSync(p).size, 'B')
}
