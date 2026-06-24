'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Swords, Check, X, Trash2 } from 'lucide-react'
import { friendRequest, friendRespond, friendRemove, friendsList, challengeCreate, challengeIncoming, challengeAccept, challengeCancel, randMatchCode, type Friend, type Challenge } from '@/lib/social'
import { RavenofButton } from '@/components/ui/RavenofButton'

export function FriendsClient() {
  const router = useRouter()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<Friend[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [uname, setUname] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const [{ friends, pending }, ch] = await Promise.all([friendsList(), challengeIncoming()])
    setFriends(friends); setPending(pending); setChallenges(ch)
  }, [])

  useEffect(() => { reload(); const t = setInterval(() => challengeIncoming().then(setChallenges), 5000); return () => clearInterval(t) }, [reload])

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
                <RavenofButton variant="secondary" size="sm" onClick={() => challenge(f)}><Swords className="w-3 h-3" /> Iššūkis</RavenofButton>
                <RavenofButton variant="muted" size="sm" onClick={() => remove(f.id)}><Trash2 className="w-3 h-3" /></RavenofButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
