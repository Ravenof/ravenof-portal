// ── Ravenof: kortų numeracija (LT + EN puslapiai) ir PNG eksportas ─────────────
// Puslapiai: „Stylised Gothic Animation" (LT) ir „Stylised gothic animation eng" (EN).
// Frakcijos – kortų stulpelių grupės iš kairės į dešinę; frakcijos viduje – eilėmis
// (iš viršaus žemyn, iš kairės į dešinę). EN korta = LT korta tame pačiame poslinkyje.
figma.showUI(__html__, { width: 460, height: 420 })

const LT_PAGE = 'stylised gothic animation'
const EN_PAGE = 'stylised gothic animation eng'
const FACTIONS = ['demonu-orda', 'plesiku-naktis', 'mistikos-melodija', 'vryhioko-gauja', 'sviesos-pulkas', 'inkvizicijos-legionas', 'mirties-marsas', 'rytu-vejas', 'neutralus']
const CLUSTER_GAP = 80     // tarpas tarp frakcijų stulpelių (kortos tarpai ~40)
const ROW_TOL = 150        // y skirtumas, kai prasideda nauja eilė
const SCALE = 4            // 261x354 → 1044x1416

const pageBy = (n) => figma.root.children.find((p) => p.name.trim().toLowerCase() === n)
const visibleIn = (n, root) => { let x = n; while (x && x !== root) { if (x.visible === false) return false; x = x.parent } return true }

const NUM_RE = /^\s*\d+\s*\/\s*\d+/
// Visi matomi numerio tekstai kortoje (kai kuriose kortose naujas sluoksnis uždėtas ant seno –
// keičiam VISUS, kad matomas viršutinis irgi pasikeistų)
function numberNodes(card) {
  const y0 = card.absoluteTransform[1][2], h = card.height
  return card.findAll((n) => n.type === 'TEXT' && NUM_RE.test(n.characters) && visibleIn(n, card) && n.absoluteTransform[1][2] - y0 > h * 0.85)
}
function numberNode(card) { const a = numberNodes(card); return a.length ? a[a.length - 1] : null }
function cardName(card) {
  // viršutinis (paskutinis) matomas vardo blokas – žr. numberNodes
  const gs = card.findAll((n) => n.name === 'CHARACTERS_Name').filter((g) => visibleIn(g, card) && 'findAll' in g)
  for (let i = gs.length - 1; i >= 0; i--) {
    const s = gs[i].findAll((x) => x.type === 'TEXT' && visibleIn(x, card)).map((x) => x.characters.trim()).filter(Boolean).join(' ')
    if (s) return s
  }
  return ''
}
const cardsOf = (page) => page.children.filter((n) => (n.type === 'FRAME' || n.type === 'INSTANCE' || n.type === 'COMPONENT') && numberNode(n))

async function collect() {
  const lt = pageBy(LT_PAGE), en = pageBy(EN_PAGE)
  if (!lt || !en) throw new Error('Nerasti puslapiai „Stylised Gothic Animation" ir/ar „… eng"')
  await lt.loadAsync(); await en.loadAsync()
  const L = cardsOf(lt), E = cardsOf(en)
  // poslinkis LT→EN: dažniausias dx tarp to paties pavadinimo rėmelių
  const dxs = {}
  for (const a of L) { const b = E.find((e) => e.name === a.name && Math.abs(e.y - a.y) < 5); if (b) { const d = Math.round(b.x - a.x); dxs[d] = (dxs[d] || 0) + 1 } }
  const dx = Number(Object.entries(dxs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)
  // frakcijų stulpeliai
  const byX = [...L].sort((a, b) => a.x - b.x)
  const clusters = []
  let cur = [], right = -Infinity
  for (const c of byX) {
    if (cur.length && c.x > right + CLUSTER_GAP) { clusters.push(cur); cur = []; right = -Infinity }
    cur.push(c); right = Math.max(right, c.x + c.width)
  }
  if (cur.length) clusters.push(cur)
  // eilės kiekvienoje frakcijoje
  const ordered = []
  clusters.forEach((cl, fi) => {
    const s = [...cl].sort((a, b) => a.y - b.y)
    const rows = []; let row = [], y0 = null
    for (const c of s) { if (y0 !== null && c.y - y0 > ROW_TOL) { rows.push(row); row = [] ; y0 = null } if (y0 === null) y0 = c.y; row.push(c) }
    if (row.length) rows.push(row)
    for (const r of rows) for (const c of r.sort((a, b) => a.x - b.x)) ordered.push({ lt: c, faction: FACTIONS[fi] || `grupe-${fi + 1}` })
  })
  const usedEn = new Set(), missing = []
  for (const o of ordered) {
    const b = E.find((e) => !usedEn.has(e.id) && Math.abs(e.x - (o.lt.x + dx)) < 20 && Math.abs(e.y - o.lt.y) < 20)
    if (b) { usedEn.add(b.id); o.en = b } else missing.push(o.lt.name + ' @' + Math.round(o.lt.x) + ',' + Math.round(o.lt.y))
  }
  return { ordered, clusters: clusters.map((c, i) => `${FACTIONS[i] || 'grupe-' + (i + 1)}: ${c.length}`), dx, ltCount: L.length, enCount: E.length, missing, enUnpaired: E.filter((e) => !usedEn.has(e.id)).map((e) => e.name) }
}

async function setNum(card, txt) {
  const all = numberNodes(card); if (!all.length) return 0
  for (const t of all) {
    for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f)
    t.characters = txt
  }
  return all.length
}

let ackResolve = null
const waitAck = () => new Promise((r) => { ackResolve = r })

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'ack') { const r = ackResolve; ackResolve = null; r && r(msg); return }
  try {
    const c = await collect()
    const total = c.ordered.length
    if (msg.type === 'check') {
      figma.ui.postMessage({ type: 'log', text: `LT kortų: ${c.ltCount}, EN: ${c.enCount}, poslinkis dx=${c.dx}\nFrakcijos:\n  ${c.clusters.join('\n  ')}\nBe EN poros: ${c.missing.length}${c.missing.length ? '\n  ' + c.missing.slice(0, 15).join('\n  ') : ''}\nEN be LT poros: ${c.enUnpaired.length}\nPirmos: ${c.ordered.slice(0, 3).map((o, i) => (i + 1) + ' ' + cardName(o.lt)).join(', ')}\nPaskutinės: ${c.ordered.slice(-3).map((o, i) => (total - 2 + i) + ' ' + cardName(o.lt)).join(', ')}` })
      return
    }
    if (msg.type === 'renumber') {
      let n = 0, done = 0
      const multi = []
      for (const o of c.ordered) {
        n++
        const txt = `${n} / ${total}`
        const k = await setNum(o.lt, txt)
        if (k) done++
        if (k > 1) multi.push(n)
        if (o.en) await setNum(o.en, txt)
        if (n % 25 === 0) figma.ui.postMessage({ type: 'progress', text: `Numeruojama ${n}/${total}` })
      }
      figma.ui.postMessage({ type: 'log', text: `Sunumeruota ${done} kortų (1–${total}), LT ir EN vienodai.\nKortos su keliais numerio sluoksniais (${multi.length}): ${multi.join(',')}` })
      figma.ui.postMessage({ type: 'only', list: multi.join(',') })
      return
    }
    if (msg.type === 'export') {
      const manifest = []
      const only = msg.only ? new Set(String(msg.only).split(',').map((x) => Number(x.trim())).filter(Boolean)) : null
      let n = 0
      for (const o of c.ordered) {
        n++
        if (only && !only.has(n)) continue
        const num = String(n).padStart(3, '0')
        const entry = { n, faction: o.faction, frame: o.lt.name, lt: { id: o.lt.id, name: cardName(o.lt), file: `lt/${num}.png` }, en: o.en ? { id: o.en.id, name: cardName(o.en), file: `en/${num}.png` } : null }
        for (const side of ['lt', 'en']) {
          const node = side === 'lt' ? o.lt : o.en
          if (!node) continue
          const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: SCALE } })
          figma.ui.postMessage({ type: 'file', path: entry[side].file, bytes })
          const a = await waitAck()
          if (!a.ok) throw new Error('Serveris nepriėmė failo ' + entry[side].file + ' (ar paleistas tools/figma-card-sink.mjs?)')
        }
        manifest.push(entry)
        figma.ui.postMessage({ type: 'progress', text: `Eksportuota ${n}/${total}` })
      }
      if (!only) { figma.ui.postMessage({ type: 'manifest', manifest: { total, exportedAt: new Date().toISOString(), cards: manifest } }); await waitAck() }
      figma.ui.postMessage({ type: 'log', text: `Baigta: ${manifest.length} kortų × 2 kalbos išsaugota.` })
    }
  } catch (e) {
    figma.ui.postMessage({ type: 'log', text: 'KLAIDA: ' + (e && e.message ? e.message : String(e)) })
  }
}
