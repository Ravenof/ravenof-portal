import type { Metadata } from 'next'
import Link from 'next/link'
import { getCachedUser } from '@/lib/supabase/server'
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection'

// ── Viešas paskyros ištrynimo puslapis (Google Play „Delete account URL") ─────
// Neprisijungus – instrukcija ir nuoroda prisijungti; prisijungus – pats ištrynimas.
export const metadata: Metadata = {
  title: 'Paskyros ištrynimas | Ravenof',
  description: 'Kaip ištrinti Ravenof Digital paskyrą ir visus su ja susietus duomenis.',
}

export default async function DeleteAccountPage() {
  const user = await getCachedUser()
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>Paskyros ištrynimas</h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Ravenof Digital · Kaukas Games · <a href="#en" style={{ color: 'var(--gold)' }}>English below</a></p>

        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Paskyrą galite ištrinti dviem būdais:
        </p>
        <ol className="list-decimal pl-5 text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          <li className="mb-1"><b>Programėlėje:</b> Nustatymai → Paskyra → „Ištrinti paskyrą“ → įrašykite žodį IŠTRINTI.</li>
          <li className="mb-1"><b>Čia, svetainėje:</b> prisijunkite ir patvirtinkite žemiau.</li>
        </ol>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Ištrinama <b>iš karto ir visam laikui</b>: el. paštas, slapyvardis, profilis, kortų kolekcija, kaladės, kovų istorija, reitingas, pasiekimai, draugai, žinutės, pirkiniai ir valiuta. Anoniminė žaidimo statistika ir klaidų pranešimai be nuorodos į jus išlieka. Duomenų saugojimo laikotarpio po ištrynimo nėra – atkurti neįmanoma. Daugiau: <Link href="/privacy" style={{ color: 'var(--gold)' }}>privatumo politika</Link>.
        </p>

        {user ? (
          <div className="rounded-lg p-4 mb-8" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Prisijungta kaip <b style={{ color: 'var(--text-primary)' }}>{user.email}</b></p>
            <DeleteAccountSection compact />
          </div>
        ) : (
          <div className="rounded-lg p-4 mb-8" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Norėdami ištrinti paskyrą svetainėje, pirmiausia prisijunkite.</p>
            <Link href="/login?next=/account/delete" className="inline-block text-sm px-4 py-2 rounded-lg font-semibold" style={{ background: 'var(--gold)', color: '#0a0a0f' }}>Prisijungti →</Link>
          </div>
        )}

        <p className="text-xs mb-10" style={{ color: 'var(--text-muted)' }}>Negalite prisijungti? Rašykite <a href="mailto:info@ravenof.lt" style={{ color: 'var(--gold)' }}>info@ravenof.lt</a> iš paskyros el. pašto – ištrinsime per 7 dienas.</p>

        <hr className="mb-8" style={{ borderColor: 'var(--bg-border)' }} />
        <h2 id="en" className="text-xl font-bold mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>Delete your account</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>You can delete your Ravenof Digital account either <b>in the app</b> (Settings → Account → Delete account, then type the confirmation word) or <b>on this page</b> after signing in.</p>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Deletion is <b>immediate and permanent</b>: email, username, profile, card collection, decks, match history, rating, achievements, friends, messages, purchases and currency are all removed. Anonymous game statistics and bug reports not linked to you are retained. There is no retention period after deletion and recovery is not possible. See the <Link href="/privacy" style={{ color: 'var(--gold)' }}>privacy policy</Link>.</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cannot sign in? Email <a href="mailto:info@ravenof.lt" style={{ color: 'var(--gold)' }}>info@ravenof.lt</a> from your account address and we will delete it within 7 days.</p>
      </div>
    </div>
  )
}
