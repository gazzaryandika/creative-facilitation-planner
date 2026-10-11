import { Info, PenLine, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SECTION_LABELS, type SectionId, type Stage, type Technique } from '../../data/models'
import { FIT_ORDER, headerImageUrl, matchesQuery, nameMatches, sectionFit, shortDescription, type Fit } from '../../lib/techniqueFit'
import { usePlannerStore } from '../../store/usePlannerStore'
import { TechniqueDetailModal } from '../TechniqueDetailModal'
import { TechniqueTags } from '../TechniqueTags'

interface TechniquePickerPopoverProps {
  sectionId: SectionId
  onPickLibrary: (techniqueId: string) => void
  /** Opens a blank step in the edit modal — a one-off just for this plan, not added to the library. */
  onWriteOwn: () => void
  onClose: () => void
}

const STAGE_FILTERS: (Stage | 'all')[] = ['all', 'Diverging', 'Reverging', 'Converging', 'Multiple']

const GROUP_STYLES: Record<Fit, { dot: string; text: string }> = {
  mainly: { dot: 'bg-teal-500', text: 'text-teal-800' },
  also: { dot: 'bg-sky-400', text: 'text-sky-800' },
  notUsual: { dot: 'bg-stone-300', text: 'text-stone-500' },
}

function groupHeading(fit: Fit, section: string): string {
  if (fit === 'mainly') return `Recommended for ${section}`
  if (fit === 'also') return `Also used in ${section}`
  return `Other techniques — not usual here, but free to use`
}

export function TechniquePickerPopover({ sectionId, onPickLibrary, onWriteOwn, onClose }: TechniquePickerPopoverProps) {
  const techniques = usePlannerStore((s) => s.techniques)
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<Stage | 'all'>('all')
  const [detail, setDetail] = useState<Technique | null>(null)
  const section = SECTION_LABELS[sectionId]

  const groups = useMemo(() => {
    const bookOrder = new Map(techniques.map((t, i) => [t.id, i]))
    const list = techniques
      .filter((t) => matchesQuery(t, query) && (stage === 'all' || t.stage === stage))
      .map((t) => ({ t, fit: sectionFit(t, sectionId) }))
      .sort(
        (a, b) =>
          FIT_ORDER[a.fit] - FIT_ORDER[b.fit] ||
          Number(nameMatches(b.t, query)) - Number(nameMatches(a.t, query)) ||
          bookOrder.get(a.t.id)! - bookOrder.get(b.t.id)!,
      )
    return (['mainly', 'also', 'notUsual'] as Fit[])
      .map((fit) => ({ fit, items: list.filter((x) => x.fit === fit).map((x) => x.t) }))
      .filter((g) => g.items.length > 0)
  }, [techniques, query, stage, sectionId])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-100 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Add a step to</p>
              <h4 className="font-semibold text-stone-900">{section}</h4>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative mt-3">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything — name, what it does, “sketch”, “quiet group”…"
              className="w-full rounded-md border border-stone-300 py-1.5 pl-8 pr-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {STAGE_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  stage === s ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {s === 'all' ? 'All stages' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {sectionId === 'introduction' && (
            <button
              type="button"
              onClick={onWriteOwn}
              className="mt-2 flex w-full items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-left transition-colors hover:border-teal-300 hover:bg-teal-100"
            >
              <PenLine size={16} className="mt-0.5 shrink-0 text-teal-700" />
              <span>
                <span className="block text-sm font-medium text-teal-900">Write an introduction item</span>
                <span className="block text-xs text-teal-800">
                  Welcome, the brief, the agenda, ground rules… set the time, what you'll introduce and what to prepare.
                </span>
              </span>
            </button>
          )}
          {groups.map((group) => (
            <section key={group.fit} className="py-2">
              <h5 className={`flex items-center gap-1.5 text-xs font-semibold ${GROUP_STYLES[group.fit].text}`}>
                <span className={`h-2 w-2 rounded-full ${GROUP_STYLES[group.fit].dot}`} />
                {groupHeading(group.fit, section)}
                <span className="font-normal text-stone-400">({group.items.length})</span>
              </h5>
              <ul className="mt-1 divide-y divide-stone-100">
                {group.items.map((t) => (
                  <li key={t.id} className="flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => onPickLibrary(t.id)}
                      className="flex min-w-0 flex-1 gap-3 rounded-md px-1.5 py-2 text-left hover:bg-stone-50"
                    >
                      {t.headerImage && (
                        <img
                          src={headerImageUrl(t)}
                          alt=""
                          loading="lazy"
                          className="mt-0.5 h-14 w-16 shrink-0 rounded object-cover sm:w-20"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900">{t.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{shortDescription(t)}</p>
                        <div className="mt-1.5">
                          <TechniqueTags technique={t} compact />
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetail(t)}
                      aria-label={`Full details of ${t.name}`}
                      title="Full details"
                      className="mt-2 shrink-0 rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-teal-700"
                    >
                      <Info size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {total === 0 && <p className="py-6 text-center text-sm text-stone-400">No matches. Try fewer words.</p>}
        </div>

        <div className="border-t border-stone-100 p-3">
          <button
            type="button"
            onClick={onWriteOwn}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <PenLine size={14} />
            Write your own step
          </button>
        </div>
      </div>

      {detail && <TechniqueDetailModal technique={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
