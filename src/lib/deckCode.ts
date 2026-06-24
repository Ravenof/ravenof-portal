// ── Kaladės dalijimosi kodas (export/import) ─────────────────────────────────
// Kompaktiškas binarinis formatas → base64url. „RVN1-" prefiksas.
// Baitai: [v=1][factionId hi][factionId lo][count] tada count × [16B uuid][qty][side].

export type DeckCodeEntry = { cardId: string; qty: number; side: boolean }

function uuidToBytes(u: string): number[] {
  const hex = u.replace(/-/g, '')
  const b: number[] = []
  for (let i = 0; i < 16; i++) b.push(parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0)
  return b
}
function bytesToUuid(b: number[]): string {
  const h = b.map((x) => (x & 255).toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}
function bytesToB64(bytes: number[]): string {
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x & 255)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64ToBytes(b64: string): number[] {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const out: number[] = []
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i))
  return out
}

export function encodeDeckCode(factionId: number | null, entries: DeckCodeEntry[]): string {
  const fid = factionId == null ? 65535 : factionId
  const list = entries.slice(0, 255)
  const bytes: number[] = [1, (fid >> 8) & 255, fid & 255, list.length & 255]
  for (const e of list) {
    bytes.push(...uuidToBytes(e.cardId), Math.min(255, Math.max(1, e.qty | 0)), e.side ? 1 : 0)
  }
  return 'RVN1-' + bytesToB64(bytes)
}

export function decodeDeckCode(code: string): { factionId: number | null; entries: DeckCodeEntry[] } | null {
  try {
    const m = code.trim().replace(/^RVN1-/i, '')
    const bytes = b64ToBytes(m)
    if (bytes.length < 4 || bytes[0] !== 1) return null
    const fid = (bytes[1] << 8) | bytes[2]
    const count = bytes[3]
    const entries: DeckCodeEntry[] = []
    let i = 4
    for (let n = 0; n < count; n++) {
      if (i + 18 > bytes.length) break
      const cardId = bytesToUuid(bytes.slice(i, i + 16)); i += 16
      const qty = bytes[i]; i += 1
      const side = bytes[i] === 1; i += 1
      if (qty > 0) entries.push({ cardId, qty, side })
    }
    if (entries.length === 0) return null
    return { factionId: fid === 65535 ? null : fid, entries }
  } catch { return null }
}
