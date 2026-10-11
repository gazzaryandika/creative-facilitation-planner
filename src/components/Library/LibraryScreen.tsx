import { ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DiamondPhase, ExperienceLevel, Stage, Technique } from '../../data/models'
import { FIT_ORDER, PHASES, headerImageUrl, matchesQuery, nameMatches, phaseFit, shortDescription } from '../../lib/techniqueFit'
import { usePlannerStore } from '../../store/usePlannerStore'
import { TechniqueDetailModal } from '../TechniqueDetailModal'
import { TechniqueTags } from '../TechniqueTags'

const STAGES: Stage[] = ['Diverging', 'Reverging', 'Converging', 'Multiple']
const LEVELS: ExperienceLevel[] = ['Novice', 'Intermediate', 'Expert']
const LEVEL_RANK: Record<ExperienceLevel, number> = { Novice: 0, Intermediate: 1, Expert: 2 }

type SortKey = 'book' | 'name' | 'fun' | 'short'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'book', label: 'Book order' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'fun', label: 'Most fun first' },
  { key: 'short', label: 'Shortest first' },
]

function Select<T extends string>({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: T | 'all'
  onChange: (v: T | 'all') => void
  options: { value: T; label: string }[]
  allLabel?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | 'all')}
      className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
    >
      {allLabel && <option value="all">{allLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const asOptions = <T extends string>(values: T[]) => values.map((v) => ({ value: v, label: v }))

export function LibraryScreen() {
  const techniques = usePlannerStore((s) => s.techniques)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [phaseFilter, setPhaseFilter] = useState<DiamondPhase | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<ExperienceLevel | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('book')
  const [selected, setSelected] = useState<Technique | null>(null)

  const filtered = useMemo(() => {
    const bookOrder = new Map(techniques.map((t, i) => [t.id, i]))
    const list = techniques.filter((t) => {
      if (!matchesQuery(t, query)) return false
      if (stageFilter !== 'all' && t.stage !== stageFilter) return false
      if (phaseFilter !== 'all' && phaseFit(t, phaseFilter) === 'notUsual') return false
      // "Novice" shows what a novice can run: nothing that needs more experience than the level picked.
      if (levelFilter !== 'all') {
        const need = Math.max(
          t.facilitatorLevel ? LEVEL_RANK[t.facilitatorLevel] : 0,
          t.rgLevel ? LEVEL_RANK[t.rgLevel] : 0,
        )
        if (need > LEVEL_RANK[levelFilter]) return false
      }
      return true
    })
    const compare: Record<SortKey, (a: Technique, b: Technique) => number> = {
      book: (a, b) => bookOrder.get(a.id)! - bookOrder.get(b.id)!,
      name: (a, b) => a.name.localeCompare(b.name),
      fun: (a, b) => (Number.parseInt(b.funFactor ?? '0', 10) || 0) - (Number.parseInt(a.funFactor ?? '0', 10) || 0),
      short: (a, b) => (a.time?.minMinutes ?? 999) - (b.time?.minMinutes ?? 999),
    }
    return list.sort((a, b) => {
      // Within a phase filter, "mainly" techniques come before "also" ones.
      if (phaseFilter !== 'all') {
        const byFit = FIT_ORDER[phaseFit(a, phaseFilter)] - FIT_ORDER[phaseFit(b, phaseFilter)]
        if (byFit) return byFit
      }
      const byName = Number(nameMatches(b, query)) - Number(nameMatches(a, query))
      return byName || compare[sort](a, b) || compare.book(a, b)
    })
  }, [techniques, query, stageFilter, phaseFilter, levelFilter, sort])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Technique library</h1>
      <p className="mt-1 text-sm text-stone-500">
        {techniques.length} techniques from the Road Map book and the team's own. Click one for the full step by step.
      </p>

      <div className="relative mt-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, descriptions, variants… e.g. “sketch”, “analogy”, “stakeholders”"
          className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-9 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={stageFilter} onChange={setStageFilter} options={asOptions(STAGES)} allLabel="All stages" />
        <Select value={phaseFilter} onChange={setPhaseFilter} options={asOptions(PHASES)} allLabel="All phases" />
        <Select
          value={levelFilter}
          onChange={setLevelFilter}
          options={LEVELS.map((l) => ({ value: l, label: `Runnable at ${l.toLowerCase()} level` }))}
          allLabel="Any experience level"
        />
        <Select value={sort} onChange={(v) => setSort(v as SortKey)} options={SORTS.map((s) => ({ value: s.key, label: s.label }))} />
      </div>
      <p className="mt-2 text-xs text-stone-400">
        Showing {filtered.length} of {techniques.length}. Solid phase tag = mainly used there; dashed = also used there.
      </p>

      <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white shadow-sm">
        {filtered.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setSelected(t)}
              className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50"
            >
              {t.headerImage && (
                <img
                  src={headerImageUrl(t)}
                  alt=""
                  loading="lazy"
                  className="h-16 w-20 shrink-0 rounded-md object-cover sm:h-20 sm:w-28"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900">
                  {t.name}
                  {t.sectionReference && (
                    <span className="ml-1.5 text-xs font-normal text-stone-400">§{t.sectionReference}</span>
                  )}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{shortDescription(t)}</p>
                <div className="mt-1.5">
                  <TechniqueTags technique={t} />
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5" />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No techniques match. Try fewer words or clear a filter.</li>
        )}
      </ul>

      {selected && <TechniqueDetailModal technique={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
