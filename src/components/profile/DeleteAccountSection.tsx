'use client'

// ── Paskyros ištrynimas svetainėje (Google Play „web deletion URL" reikalavimas)
// Naudojama /profile/settings ir /account/delete. Patvirtinimas – žodis IŠTRINTI.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function DeleteAccountSection({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ok = word.trim().toUpperCase() === 'IŠTRINTI' || word.trim().toUpperCase() === 'DELETE'

  const doDelete = async () => {
    if (!ok || busy) return
    setBusy(true); setErr(null)
    const sb = createClient()
    const { error } = await sb.rpc('rvn_delete_my_account', { p_platform: 'web', p_reason: null })
    if (error) {
      setErr(error.message.includes('admin_account_protected') ? 'Administratoriaus paskyra taip ištrinama negali būti.' : `Nepavyko ištrinti: ${error.message}`)
      setBusy(false); return
    }
    try { await sb.auth.signOut({ scope: 'local' }) } catch { /* sesijos serveryje nebėra */ }
    router.replace('/login?deleted=1')
    router.refresh()
  }

  return (
    <div className={compact ? '' : 'mt-8 pt-6'} style={compact ? undefined : { borderTop: '1px solid var(--bg-border)' }}>
      {!compact && <h2 className="text-sm font-semibold mb-3" style={{ color: '#f87171' }}>Ištrinti paskyrą</h2>}
      {!open ? (
        <>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Pašalina paskyrą, kolekciją, kaladės, kovų istoriją, draugus ir pirkinius visam laikui. Atkurti nebus įmanoma.</p>
          <button type="button" onClick={() => setOpen(true)} className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
            Ištrinti paskyrą…
          </button>
        </>
      ) : (
        <div className="rounded-lg p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.4)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Tai negrįžtama. Ištrynus paskyrą iš karto pašalinama:</p>
          <ul className="list-disc pl-5 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            <li>el. paštas, slapyvardis, avataras ir profilis</li>
            <li>kortų kolekcija, kaladės, atidaryti paketai ir visa valiuta</li>
            <li>kovų istorija, reitingas, pasiekimai, lygis, sezono progresas</li>
            <li>draugai, žinutės, kvietimai ir mainai</li>
            <li>pirkiniai ir kosmetika (pinigai negrąžinami)</li>
          </ul>
          <label className="block text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Patvirtinimui įrašyk žodį <b>IŠTRINTI</b>:
            <input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy}
              className="block w-full mt-1 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', letterSpacing: 2 }} />
          </label>
          {err && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setWord('') }} disabled={busy} className="text-sm px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>Atšaukti</button>
            <button type="button" onClick={doDelete} disabled={!ok || busy} className="text-sm px-4 py-2 rounded-lg font-semibold"
              style={{ background: ok ? '#dc2626' : 'rgba(239,68,68,0.3)', color: '#fff', opacity: busy ? .7 : 1 }}>
              {busy ? 'Trinama…' : 'Ištrinti visam laikui'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
