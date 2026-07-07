'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { UserPlus, Swords, Check, X, Trash2, Repeat, MessageCircle, Send } from 'lucide-react'
import { friendRequest, friendRespond, friendRemove, friendsList, challengeCreate, challengeIncoming, challengeAccept, challengeCancel, randMatchCode, sendMessage, getConversation, type Friend, type Challenge, type ChatMessage } from '@/lib/social'
import { tradeCreate, tradeIncoming, tradeAccept, type TradeIncoming } from '@/lib/trade'
import { TradeWindow } from './TradeWindow'
import { RavenofButton } from '@/components/ui/RavenofButton'
import { EmptyState } from '@/components/digital/ui/HubKit'

export function FriendsClient() {
  const router = useRouter()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<Friend[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [trades, setTrades] = useState<TradeIncoming[]>([])
  const [tradeId, setTradeId] = useState<string | null>(null)
  const [chatWith, setChatWith] = useState<Friend | null>(null)
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [uname, setUname] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const [{ friends, pending }, ch, tr] = await Promise.all([friendsList(), challengeIncoming(), tradeIncoming()])
    setFriends(friends); setPending(pending); setChallenges(ch); setTrades(tr)
  }, [])

  useEffect(() => { reload(); const t = setInterval(() => { challengeIncoming().then(setChallenges); tradeIncoming().then(setTrades) }, 5000); return () => clearInterval(t) }, [reload])
  useEffect(() => {
    if (!chatWith) return
    let on = true
    const load = () => getConversation(chatWith.userId).then((m) => { if (on) setChatMsgs(m) })
    load(); const iv = setInterval(load, 2500); return () => { on = false; clearInterval(iv) }
  }, [chatWith])

  const add = async () => {
    if (!uname.trim() || busy) return
    setBusy(true); setMsg(null)
    const r = await friendRequest(uname.trim())
    setBusy(false)
    if ('error' in r) { setMsg(r.error || 'Nepavyko.'); return }
    setUname(''); setMsg('Užklausa išsiųsta.'); reload()
  }
  const respond = async (id: string, ok: boolean) => { await friendRespond(id, ok); reload() }
  const remove = async (id: string) => { if (!confirm('Pašalinti draugą?')) return; await friendRemove(id); reload() }

  const challenge = async (f: Friend) => {
    const code = randMatchCode()
    const ok = await challengeCreate(f.userId, code)
    if (!ok) { setMsg('Nepavyko išsiųsti iššūkio.'); return }
    router.push(`/digital/pvp?host=${code}`)
  }
  const accept = async (c: Challenge) => {
    const code = await challengeAccept(c.id)
    if (!code) { setMsg('Iššūkis nebegalioja.'); reload(); return }
    router.push(`/digital/pvp?join=${code}`)
  }
  const decline = async (c: Challenge) => { await challengeCancel(c.id); reload() }
  const startTrade = async (f: Friend) => { const id = await tradeCreate(f.userId); if (id) setTradeId(id); else setMsg('Nepavyko pradėti mainų.') }
  const acceptTrade = async (tr: TradeIncoming) => { await tradeAccept(tr.id); setTradeId(tr.id); reload() }
  const sendChat = async () => {
    if (!chatWith || !chatInput.trim()) return
    const body = chatInput.trim(); setChatInput('')
    setChatMsgs((m) => [...m, { id: 'tmp' + Date.now(), fromMe: true, body, createdAt: new Date().toISOString() }])
    await sendMessage(chatWith.userId, body)
    getConversation(chatWith.userId).then(setChatMsgs)
  }

  const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(20,16,28,0.96), rgba(9,7,12,0.98))', border: '1px solid rgba(96,165,250,0.25)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }
  const secTitle = (txt: string, col = 'var(--gold)') => (
    <p className="shrink-0 text-sm font-bold mb-2" style={{ color: col, fontFamily: 'var(--rvn-font-display)' }}>{txt}</p>
  )

  return (
    <div className="h-full min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(190px,0.95fr) minmax(0,1.9fr) minmax(190px,0.95fr)' }}>

      {/* ── KAIRĖ: pridėti draugą + užklausos ── */}
      <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={PANEL}>
        {secTitle('Pridėti draugą')}
        <div className="shrink-0 flex flex-col gap-2">
          <input id="friend-uname-input" value={uname} onChange={(e) => setUname(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Naudotojo vardas"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
          <RavenofButton variant="gold" size="md" onClick={add}><UserPlus className="w-4 h-4" /> Pridėti</RavenofButton>
          {msg && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{msg}</p>}
        </div>
        <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
          {secTitle('Draugystės užklausos')}
          {pending.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Naujų užklausų nėra.</p>
          ) : (
            <div className="space-y-1.5">
              {pending.map((f) => (
                <div key={f.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{f.displayName || f.username}</span>
                  <RavenofButton variant="gold" size="sm" onClick={() => respond(f.id, true)}><Check className="w-3 h-3" /></RavenofButton>
                  <RavenofButton variant="muted" size="sm" onClick={() => respond(f.id, false)}><X className="w-3 h-3" /></RavenofButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CENTRAS: draugų sąrašas ── */}
      <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={PANEL}>
        {secTitle(`Draugai (${friends.length})`)}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState icon="👥" title="Dar neturi draugų" sub="Pridėk draugą pagal naudotojo vardą ir kvieskite vienas kitą į kovą." accent="96,165,250"
                ctaLabel="➕ Pridėti draugą" onCta={() => { const el = document.getElementById('friend-uname-input') as HTMLInputElement | null; el?.focus() }} />
            </div>
          ) : (
            <div className="space-y-1.5">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl flex-wrap" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(96,165,250,0.18)' }}>
                  <span className="shrink-0 rounded-full" title={f.online ? 'Prisijungęs' : 'Neprisijungęs'} style={{ width: 8, height: 8, background: f.online ? '#34d399' : 'rgba(255,255,255,0.18)', boxShadow: f.online ? '0 0 7px #34d399' : 'none' }} />
                  <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{f.displayName || f.username}<span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>@{f.username}</span></span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <RavenofButton variant="muted" size="sm" onClick={() => { setChatWith(f); setChatMsgs([]) }}><MessageCircle className="w-3 h-3" /></RavenofButton>
                    <RavenofButton variant="secondary" size="sm" onClick={() => challenge(f)}><Swords className="w-3 h-3" /> Iššūkis</RavenofButton>
                    <RavenofButton variant="secondary" size="sm" onClick={() => startTrade(f)}><Repeat className="w-3 h-3" /> Mainai</RavenofButton>
                    <RavenofButton variant="muted" size="sm" onClick={() => remove(f.id)}><Trash2 className="w-3 h-3" /></RavenofButton>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── DEŠINĖ: iššūkiai + mainai ── */}
      <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={PANEL}>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
          <div>
            {secTitle('⚔ Iššūkiai tau', '#fdba74')}
            {challenges.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Šiuo metu iššūkių nėra.</p>
            ) : (
              <div className="space-y-1.5">
                {challenges.map((c) => (
                  <div key={c.id} className="px-2 py-2 rounded-lg" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.4)' }}>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>{c.displayName || c.username} kviečia į kovą</p>
                    <div className="flex items-center gap-1.5">
                      <RavenofButton variant="gold" size="sm" onClick={() => accept(c)}><Swords className="w-3 h-3" /> Priimti</RavenofButton>
                      <RavenofButton variant="muted" size="sm" onClick={() => decline(c)}><X className="w-3 h-3" /></RavenofButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            {secTitle('🔄 Mainų pasiūlymai', '#93c5fd')}
            {trades.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mainų pasiūlymų nėra.</p>
            ) : (
              <div className="space-y-1.5">
                {trades.map((tr) => (
                  <div key={tr.id} className="px-2 py-2 rounded-lg" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.4)' }}>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>{tr.displayName || tr.username} nori mainytis</p>
                    <RavenofButton variant="gold" size="sm" onClick={() => acceptTrade(tr)}><Repeat className="w-3 h-3" /> Atidaryti</RavenofButton>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-auto" style={{ fontSize: 9.5, color: 'rgba(150,160,185,0.5)', lineHeight: 1.4 }}>Iššūkiai ir mainai atnaujinami automatiškai kas 5 s.</p>
        </div>
      </section>

      {tradeId && <TradeWindow tradeId={tradeId} onClose={() => { setTradeId(null); reload() }} />}
      {chatWith && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.85)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }} onClick={() => setChatWith(null)}>
          <div className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden" style={{ background: 'linear-gradient(160deg,#17111f,#0a0810)', border: '1px solid rgba(240,180,41,0.35)', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', height: 'min(72vh,540px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>💬 {chatWith.displayName || chatWith.username}</p>
              <button onClick={() => setChatWith(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 flex flex-col">
              {chatMsgs.length === 0 && <p className="text-xs text-center my-auto" style={{ color: 'var(--text-muted)' }}>Parašyk pirmą žinutę.</p>}
              {chatMsgs.map((m) => (
                <div key={m.id} className={'max-w-[75%] px-3 py-1.5 rounded-2xl text-sm ' + (m.fromMe ? 'self-end' : 'self-start')}
                  style={{ background: m.fromMe ? 'rgba(240,180,41,0.18)' : 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid ' + (m.fromMe ? 'rgba(240,180,41,0.3)' : 'var(--bg-border)') }}>{m.body}</div>
              ))}
            </div>
            <div className="flex gap-2 px-3 py-3 border-t" style={{ borderColor: 'var(--bg-border)' }}>
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Žinutė…" maxLength={500}
                className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
              <RavenofButton variant="gold" size="md" onClick={sendChat}><Send className="w-4 h-4" /></RavenofButton>
            </div>
          </div>
        </div>, document.body)}
    </div>
  )
}
