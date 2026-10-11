import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DiamondPhase, ExperienceLevel, Stage, Technique } from '../../data/models'
import { usePlannerStore } from '../../store/usePlannerStore'
import { TechniqueDetailModal } from '../TechniqueDetailModal'

const STAGES: Stage[] = ['Diverging', 'Reverging', 'Converging', 'Multiple']
const PHASES: DiamondPhase[] = ['Problem Finding', 'Idea Finding', 'Solution Finding']
const LEVELS: ExperienceLevel[] = ['Novice', 'Intermediate', 'Expert']

function Select<T extends string>({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: T | 'all'
  onChange: (v: T | 'all') => void
  options: T[]
  allLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | 'all')}
      className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

export function LibraryScreen() {
  const techniques = usePlannerStore((s) => s.techniques)
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [phaseFilter, setPhaseFilter] = useState<DiamondPhase | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<ExperienceLevel | 'all'>('all')
  const [selected, setSelected] = useState<Technique | null>(null)

  const filtered = useMemo(() => {
    return techniques.filter((t) => {
      if (stageFilter !== 'all' && t.stage !== stageFilter) return false
      if (phaseFilter !== 'all' && !t.diamond.includes(phaseFilter)) return false
      if (levelFilter !== 'all' && t.facilitatorLevel !== levelFilter && t.rgLevel !== levelFilter)
        return false
      return true
    })
  }, [techniques, stageFilter, phaseFilter, levelFilter])

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Technique library</h1>
      <p className="mt-1 text-sm text-stone-500">
        Book-sourced techniques are read-only in v1. Custom techniques are added as seed-data
        edits by the dev, not through this screen.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Select value={stageFilter} onChange={setStageFilter} options={STAGES} allLabel="All stages" />
        <Select value={phaseFilter} onChange={setPhaseFilter} options={PHASES} allLabel="All phases" />
        <Select value={levelFilter} onChange={setLevelFilter} options={LEVELS} allLabel="All experience levels" />
      </div>

      <ul className="mt-5 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white shadow-sm">
        {filtered.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setSelected(t)}
              className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-900">{t.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {t.stage} · {t.diamond.join(', ') || 'Outside the diamond'}
                  {t.time ? ` · ${t.time.minMinutes}–${t.time.maxMinutes} min` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {t.custom && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                    Custom
                  </span>
                )}
                {t.pendingTranscription && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Pending transcription
                  </span>
                )}
                <ChevronRight
                  size={16}
                  className="text-stone-300 transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">
            No techniques match these filters.
          </li>
        )}
      </ul>

      {selected && <TechniqueDetailModal technique={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
