import { PenLine, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { Technique } from '../../data/models'
import { usePlannerStore } from '../../store/usePlannerStore'

interface TechniquePickerPopoverProps {
  onPickLibrary: (techniqueId: string) => void
  /** Opens a blank step in the edit modal — a one-off just for this plan, not added to the library. */
  onWriteOwn: () => void
  onClose: () => void
}

export function TechniquePickerPopover({ onPickLibrary, onWriteOwn, onClose }: TechniquePickerPopoverProps) {
  const techniques = usePlannerStore((s) => s.techniques)
  const [query, setQuery] = useState('')

  const filtered = techniques.filter((t: Technique) =>
    t.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-md flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-stone-900">Add a step</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">Pick a technique to review and edit it before it's placed.</p>

        <div className="relative mt-3">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            className="w-full rounded-md border border-stone-300 py-1.5 pl-8 pr-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <ul className="mt-3 min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onPickLibrary(t.id)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-2 text-left text-sm hover:bg-stone-50"
              >
                <span className="text-stone-900">{t.name}</span>
                <span className="shrink-0 text-xs text-stone-400">
                  {t.stage}
                  {t.time ? ` · ${t.time.minMinutes}–${t.time.maxMinutes}m` : ''}
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-4 text-center text-sm text-stone-400">No matches.</li>
          )}
        </ul>

        <button
          type="button"
          onClick={onWriteOwn}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
        >
          <PenLine size={14} />
          Write your own step
        </button>
      </div>
    </div>
  )
}
