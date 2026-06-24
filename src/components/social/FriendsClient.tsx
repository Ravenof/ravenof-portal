'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Swords, Check, X, Trash2, Repeat, MessageCircle, Send } from 'lucide-react'
import { friendRequest, friendRespond, friendRemove, friendsList, challengeCreate, challengeIncoming, challengeAccept, challengeCancel, randMatchCode, sendMessage, getConversation, type Friend, type Challenge, type ChatMessage } from '@/lib/social'
import { tradeCreate, tradeIncoming, tradeAccept, type TradeIncoming } from '@/lib/trade'
import { TradeWindow } from './TradeWindow'
import { RavenofButton } from '@/components/ui/RavenofButton'

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

  const card = { background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Pridėti draugą */}
      <div className="rounded-xl p-4" style={card}>
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Pridėti draugą</p>
        <div className="flex gap-2">
          <input value={uname} onChange={(e) => setUname(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Naudotojo vardas"
            className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
          <RavenofButton variant="gold" size="md" onClick={add}><UserPlus className="w-4 h-4" /> Pridėti</RavenofButton>
        </div>
        {msg && <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{msg}</p>}
      </div>

      {/* Gauti iššūkiai */}
      {challenges.length > 0 && (
        <div className="rounded-xl p-4" style={{ ...card, borderColor: 'rgba(251,146,60,0.4)' }}>
          <p className="text-sm font-bold mb-2" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>⚔ Iššūkiai tau</p>
          <div className="space-y-2">
            {challenges.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{c.displayName || c.username} kviečia į kovą</span>
                <RavenofButton variant="gold" size="sm" onClick={() => accept(c)}><Swords className="w-3 h-3" /> Priimti</RavenofButton>
                <RavenofButton variant="muted" size="sm" onClick={() => decline(c)}><X className="w-3 h-3" /></RavenofButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gauti mainų pasiūlymai */}
      {trades.length > 0 && (
        <div className="rounded-xl p-4" style={{ ...card, borderColor: 'rgba(96,165,250,0.4)' }}>
          <p className="text-sm font-bold mb-2" style={{ color: '#93c5fd', fontFamily: 'var(--rvn-font-display)' }}>🔄 Mainų pasiūlymai</p>
          <div className="space-y-2">
            {trades.map((tr) => (
              <div key={tr.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{tr.displayName || tr.username} nori mainytis</span>
                <RavenofButton variant="gold" size="sm" onClick={() => acceptTrade(tr)}><Repeat className="w-3 h-3" /> Atidaryti</RavenofButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Laukiančios užklausos */}
      {pending.length > 0 && (
        <div className="rounded-xl p-4" style={card}>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Draugystės užklausos</p>
          <div className="space-y-2">
            {pending.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{f.displayName || f.username}</span>
                <RavenofButton variant="gold" size="sm" onClick={() => respond(f.id, true)}><Check className="w-3 h-3" /></RavenofButton>
                <RavenofButton variant="muted" size="sm" onClick={() => respond(f.id, false)}><X className="w-3 h-3" /></RavenofButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draugų sąrašas */}
      <div className="rounded-xl p-4" style={card}>
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Draugai ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Dar neturi draugų. Pridėk pagal naudotojo vardą.</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.displayName || f.username}<span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>@{f.username}</span></span>
                <RavenofButton variant="muted" size="sm" onClick={() => { setChatWith(f); setChatMsgs([]) }}><MessageCircle className="w-3 h-3" /></RavenofButton>
                <RavenofButton variant="secondary" size="sm" onClick={() => challenge(f)}><Swords className="w-3 h-3" /> Iššūkis</RavenofButton>
                <RavenofButton variant="secondary" size="sm" onClick={() => startTrade(f)}><Repeat className="w-3 h-3" /> Mainai</RavenofButton>
                <RavenofButton variant="muted" size="sm" onClick={() => remove(f.id)}><Trash2 className="w-3 h-3" /></RavenofButton>
              </div>
            ))}
          </div>
        )}
      </div>
      {tradeId && <TradeWindow tradeId={tradeId} onClose={() => { setTradeId(null); reload() }} />}
      {chatWith && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setChatWith(null)}>
          <div className="w-full max-w-md rounded-2xl flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', height: 'min(70vh,520px)' }} onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}
    </div>
  )
}
