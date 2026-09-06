// ── Maršrutai 1:1 su src/app/digital/**/page.tsx ─────────────────────────────
// Kliento puslapiai importuojami tiesiai (jie neturi serverio kodo); 4 serverio
// puslapiai (hub, decks, friends, ranked) – per screens/. Atšauktos funkcijos
// (campaign, coop, pvp2v2) į bundle'ą NEDEDAMOS.
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import DigitalLayout from '@/app/digital/layout'

const L = (loader: () => Promise<{ default: React.ComponentType }>) => lazy(loader)
const Collection = L(() => import('@/app/digital/collection/page'))
const More = L(() => import('@/app/digital/more/page'))
const Login = L(() => import('@/app/digital/login/page'))
const Register = L(() => import('@/app/digital/register/page'))
const Forgot = L(() => import('@/app/digital/forgot-password/page'))
const Onboarding = L(() => import('@/app/digital/onboarding/page'))
const Profile = L(() => import('@/app/digital/profile/page'))
const ProfilePublic = L(() => import('@/app/digital/profile/public/page'))
const Achievements = L(() => import('@/app/digital/profile/achievements/page'))
const Levels = L(() => import('@/app/digital/profile/levels/page'))
const PvE = L(() => import('@/app/digital/pve/page'))
const PvP = L(() => import('@/app/digital/pvp/page'))
const Quests = L(() => import('@/app/digital/quests/page'))
const Rewards = L(() => import('@/app/digital/rewards/page'))
const Season = L(() => import('@/app/digital/season/page'))
const Tutorial = L(() => import('@/app/digital/tutorial/page'))
const Hub = L(() => import('./screens/HubScreen'))
const Decks = L(() => import('./screens/DecksScreen'))
const Friends = L(() => import('./screens/FriendsScreen'))
const Ranked = L(() => import('./screens/RankedScreen'))

/** Next layout'as gauna children; jam reikia, kad kelias prasidėtų /digital. */
function Shell({ children }: { children: ReactNode }) {
  return <DigitalLayout>{children}</DigitalLayout>
}

function DeckRedirect() { const l = useLocation(); return <Navigate to={`/digital/decks?tab=builder${l.search ? '&' + l.search.slice(1) : ''}`} replace /> }

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/digital" replace />} />
          <Route path="/index.html" element={<Navigate to="/digital" replace />} />
          <Route path="/digital" element={<Shell><Hub /></Shell>} />
          <Route path="/digital/album" element={<Navigate to="/digital/collection" replace />} />
          <Route path="/digital/deck" element={<DeckRedirect />} />
          <Route path="/digital/collection" element={<Shell><Collection /></Shell>} />
          <Route path="/digital/decks" element={<Shell><Decks /></Shell>} />
          <Route path="/digital/more" element={<Shell><More /></Shell>} />
          <Route path="/digital/login" element={<Shell><Login /></Shell>} />
          <Route path="/digital/register" element={<Shell><Register /></Shell>} />
          <Route path="/digital/forgot-password" element={<Shell><Forgot /></Shell>} />
          <Route path="/digital/onboarding" element={<Shell><Onboarding /></Shell>} />
          <Route path="/digital/profile" element={<Shell><Profile /></Shell>} />
          <Route path="/digital/profile/public" element={<Shell><ProfilePublic /></Shell>} />
          <Route path="/digital/profile/achievements" element={<Shell><Achievements /></Shell>} />
          <Route path="/digital/profile/levels" element={<Shell><Levels /></Shell>} />
          <Route path="/digital/pve" element={<Shell><PvE /></Shell>} />
          <Route path="/digital/pvp" element={<Shell><PvP /></Shell>} />
          <Route path="/digital/ranked" element={<Shell><Ranked /></Shell>} />
          <Route path="/digital/friends" element={<Shell><Friends /></Shell>} />
          <Route path="/digital/quests" element={<Shell><Quests /></Shell>} />
          <Route path="/digital/rewards" element={<Shell><Rewards /></Shell>} />
          <Route path="/digital/season" element={<Shell><Season /></Shell>} />
          <Route path="/digital/tutorial" element={<Shell><Tutorial /></Shell>} />
          <Route path="*" element={<Navigate to="/digital" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
