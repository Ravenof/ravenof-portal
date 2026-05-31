'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, X } from 'lucide-react'
import { RULES_SECTIONS, RULE_CATEGORIES, QUICK_LINKS, type RuleCategory } from '@/data/rules'
import { RuleSectionCard } from './RuleSectionCard'
import { RulesQuickReference } from './RulesQuickReference'

// ── Hero ──────────────────────────────────────────────────────────────────────
const HERO_STATS = [
  { label: '1v1',    value: '40 HP'        },
  { label: '2v2',    value: '60 HP komandai' },
  { label: 'Kaladė', value: '30–40 kortų'  },
  { label: 'ŽMK',    value: '20 kortų'     },
]

function RulesHero({ onQuickLink }: { onQuickLink: (href: string) => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl mb-6" style={{ background: 'linear-gradient(135deg,#0c0c18 0%,#111122 60%,#0a0a16 100%)', border: '1px solid rgba(240,180,41,0.2)' }}>
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(240,180,41,0.06) 0%, transparent 60%)' }} />
      <div className="relative px-5 py-6">
        <div className="flex items-start gap-3 mb-3">
          <BookOpen className="w-6 h-6 shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
          <div>
            <h1 className="text-xl font-black leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
              Ravenof: Second Edition
            </h1>
            <p className="text-sm font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
              Taisyklių knyga
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)', maxWidth: 480 }}>
          Interaktyvi taisyklių knyga su paieška, kortų tipų aprašymais, Damage Modifier Deck, čempionų fazėmis ir greitos atmintinės.
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 mb-4">
          {HERO_STATS.map((s) => (
            <div key={s.label} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
              <span className="font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>GREITOS NUORODOS</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((ql) => (
              <button
                key={ql.href}
                onClick={() => onQuickLink(ql.href)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.4)] hover:text-[var(--gold)]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}
              >
                {ql.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Search ────────────────────────────────────────────────────────────────────
function RulesSearch({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <div className="relative">
      <label htmlFor="rules-search" className="sr-only">Ieškoti taisyklėse</label>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none" style={{ color: 'var(--text-muted)' }}>
        🔍
      </div>
      <input
        id="rules-search"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Ieškoti taisyklėse, ŽMK, raktažodžiuose, būsenose, aukojime…"
        className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none focus:ring-2"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--rvn-font-body)',
        }}
        aria-label="Ieškoti taisyklėse, ŽMK, raktažodžiuose, būsenose"
      />
      {query && (
        <button
          onClick={() => onQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Išvalyti paiešką"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function RulesSidebar({ activeId, onNav }: { activeId: string | null; onNav: (id: string) => void }) {
  return (
    <nav aria-label="Taisyklių turinys" className="flex flex-col gap-0.5">
      <p className="text-xs font-bold mb-2 px-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        TURINYS
      </p>
      {RULES_SECTIONS.map((s) => {
        const active = activeId === s.id
        return (
          <button
            key={s.id}
            onClick={() => onNav(s.id)}
            className="text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 w-full focus:ring-2 focus:ring-[rgba(240,180,41,0.4)] focus:outline-none"
            style={{
              background: active ? 'rgba(240,180,41,0.1)' : 'transparent',
              color: active ? 'var(--gold)' : 'var(--text-muted)',
              border: active ? '1px solid rgba(240,180,41,0.2)' : '1px solid transparent',
              fontFamily: active ? 'var(--rvn-font-display)' : 'var(--rvn-font-body)',
              fontWeight: active ? 600 : 400,
            }}
            aria-current={active ? 'true' : undefined}
          >
            <span className="w-5 shrink-0 text-center" style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', opacity: active ? 1 : 0.5, fontSize: '10px', fontFamily: 'var(--rvn-font-display)' }}>
              {s.number}
            </span>
            <span className="leading-tight truncate">{s.title}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ── Category chips ────────────────────────────────────────────────────────────
function CategoryChips({ active, onSelect }: { active: RuleCategory | 'viskas'; onSelect: (c: RuleCategory | 'viskas') => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtruoti pagal kategoriją">
      {RULE_CATEGORIES.map((cat) => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id as RuleCategory | 'viskas')}
            className="text-xs px-3 py-1 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(240,180,41,0.4)]"
            style={{
              background: isActive ? 'rgba(240,180,41,0.15)' : 'var(--bg-surface)',
              border: isActive ? '1px solid rgba(240,180,41,0.4)' : '1px solid var(--bg-border)',
              color: isActive ? 'var(--gold)' : 'var(--text-muted)',
              fontFamily: isActive ? 'var(--rvn-font-display)' : 'var(--rvn-font-body)',
              fontWeight: isActive ? 600 : 400,
              boxShadow: isActive ? '0 0 8px rgba(240,180,41,0.15)' : undefined,
            }}
            aria-pressed={isActive}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────
export function RulesPageClient() {
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState<RuleCategory | 'viskas'>('viskas')
  const [activeId, setActiveId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Scroll to hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const el = document.getElementById(hash)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
        setActiveId(hash)
      }
    }
  }, [])

  // Intersection observer for sidebar highlight
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    RULES_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const filteredSections = useMemo(() => {
    const rawQ = query.toLowerCase().trim()
    // Synonym map — anglicizmai → lietuviški terminai paieškoje
    const SYNONYMS: Record<string, string> = {
      'dmd': 'žmk žalos modifikatorių',
      'damage modifier': 'žalos modifikatorių',
      'coinflip': 'monetos metimas',
      'keyword': 'raktažodis',
      'statusas': 'būsena',
      'graveyard': 'panaudotų kortų krūva',
      'discard': 'panaudotų kortų krūva',
      'hand': 'ranka',
      'summon': 'iškviesti',
      'buff': 'pastiprinimas',
      'aoe': 'masinis efektas',
      'stack': 'efektų eilė',
      'phase': 'fazė',
      'tribute': 'aukojimas',
      'mulligan': 'pradinės rankos keitimas',
    }
    const q = SYNONYMS[rawQ] ? `${rawQ} ${SYNONYMS[rawQ]}` : rawQ
    return RULES_SECTIONS.filter((s) => {
      const matchCat = category === 'viskas' || s.category === category
      if (!matchCat) return false
      if (!rawQ) return true
      const haystack = [
        s.title, s.summary ?? '',
        ...(s.relatedTerms ?? []),
        ...s.content.flatMap((b) => [b.text ?? '', ...(b.items ?? []), ...(b.rows?.flat() ?? [])]),
      ].join(' ').toLowerCase()
      return q.split(' ').some(term => term && haystack.includes(term))
    })
  }, [query, category])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
      window.history.replaceState(null, '', `/rules#${id}`)
    }
  }

  const handleQuickLink = (href: string) => {
    const id = href.slice(1)
    scrollTo(id)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Page header */}
      <header className="sticky top-0 z-20 border-b px-4 py-3" style={{ background: 'rgba(7,7,15,0.96)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Pradžia
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="rvn-page-title text-lg flex-1">Taisyklės</h1>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Hero */}
        <RulesHero onQuickLink={handleQuickLink} />

        {/* Search + category */}
        <div className="flex flex-col gap-3 mb-6">
          <RulesSearch query={query} onQuery={setQuery} />
          <CategoryChips active={category} onSelect={setCategory} />
          {query && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Rasta skyrių: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{filteredSections.length}</span>
            </p>
          )}
        </div>

        {/* Body: sidebar + content + quick ref */}
        <div className="flex gap-6 items-start">

          {/* Sidebar — desktop sticky */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <RulesSidebar activeId={activeId} onNav={scrollTo} />
          </aside>

          {/* Main content */}
          <div ref={contentRef} className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Mobile section dropdown */}
            <div className="lg:hidden">
              <select
                value={activeId ?? ''}
                onChange={(e) => scrollTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
                aria-label="Pasirinkti skyrių"
              >
                <option value="">— Pasirinkti skyrių —</option>
                {RULES_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.number}. {s.title}</option>
                ))}
              </select>
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-xl flex flex-col items-center justify-center py-16 gap-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                <span className="text-4xl">📖</span>
                <p className="text-base font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                  Nieko nerasta
                </p>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Pabandyk ieškoti pagal kortų tipą, būseną, raktažodį ar taisyklės terminą.
                </p>
                <button
                  onClick={() => { setQuery(''); setCategory('viskas') }}
                  className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.25)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}
                >
                  Išvalyti filtrą
                </button>
              </div>
            ) : (
              filteredSections.map((section) => (
                <RuleSectionCard key={section.id} section={section} searchQuery={query} />
              ))
            )}
          </div>

          {/* Right sidebar — quick reference, desktop xl+ */}
          <aside className="hidden xl:block w-56 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <RulesQuickReference />
          </aside>
        </div>
      </main>

      {/* Mobile bottom padding for nav */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}
