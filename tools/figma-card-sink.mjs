#!/usr/bin/env node
// ── Priima kortų PNG iš Figma plugin'o (tools/figma-cards-plugin) ────────────────
// node tools/figma-card-sink.mjs  → klauso http://localhost:47821, saugo į store-media/cards-figma-export/
import http from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'store-media/cards-figma-export')
mkdirSync(OUT, { recursive: true })
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }
let files = 0
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }
  const u = new URL(req.url, 'http://x')
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    try {
      if (u.pathname === '/file') {
        const rel = normalize(String(u.searchParams.get('path') || '')).replace(/^(\.\.[\\/])+/, '')
        if (!/^(lt|en)[\\/]\d{3}\.png$/.test(rel)) throw new Error('bad path ' + rel)
        const abs = resolve(OUT, rel); mkdirSync(dirname(abs), { recursive: true })
        writeFileSync(abs, Buffer.concat(chunks)); files++
        if (files % 50 === 0) console.log('gauta failų:', files)
      } else if (u.pathname === '/manifest') {
        writeFileSync(resolve(OUT, 'manifest.json'), Buffer.concat(chunks)); console.log('manifest.json išsaugotas, failų:', files)
      } else { res.writeHead(404, cors); return res.end() }
      res.writeHead(200, cors); res.end('ok')
    } catch (e) { console.error(e.message); res.writeHead(400, cors); res.end(e.message) }
  })
}).listen(47821, () => console.log('Laukiu Figma plugin\'o: http://localhost:47821 →', OUT))
