import { Search, X } from 'lucide-react'
import { useState } from 'react'
import type { Technique } from '../../data/models'
import { usePlannerStore } from '../../store/usePlannerStore'

interface TechniquePickerPopoverProps {
  onPick: (techniqueId: string) => void
  onClose: () => void
}

export function TechniquePickerPopover({ onPick, onClose }: TechniquePickerPopoverProps) {
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
        className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-stone-900">Add a technique</h4>
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
            placeholder="Filter by name…"
            className="w-full rounded-md border border-stone-300 py-1.5 pl-8 pr-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <ul className="mt-3 divide-y divide-stone-100">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onPick(t.id)}
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
      </div>
    </div>
  )
}
