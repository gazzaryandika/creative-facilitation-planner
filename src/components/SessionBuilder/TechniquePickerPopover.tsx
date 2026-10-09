import { PenLine, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { Technique } from '../../data/models'
import { usePlannerStore } from '../../store/usePlannerStore'

interface TechniquePickerPopoverProps {
  onPickLibrary: (techniqueId: string) => void
  onAddFreeText: (customName: string, description: string) => void
  onClose: () => void
}

type Mode = 'library' | 'freeText'

export function TechniquePickerPopover({ onPickLibrary, onAddFreeText, onClose }: TechniquePickerPopoverProps) {
  const techniques = usePlannerStore((s) => s.techniques)
  const [mode, setMode] = useState<Mode>('library')
  const [query, setQuery] = useState('')
  const [freeName, setFreeName] = useState('')
  const [freeDescription, setFreeDescription] = useState('')

  const filtered = techniques.filter((t: Technique) =>
    t.name.toLowerCase().includes(query.toLowerCase()),
  )

  function handleAddFreeText() {
    if (!freeName.trim()) return
    onAddFreeText(freeName.trim(), freeDescription.trim())
  }

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

        <div className="mt-3 flex gap-1 rounded-md bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setMode('library')}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === 'library' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            From library
          </button>
          <button
            type="button"
            onClick={() => setMode('freeText')}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === 'freeText' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Write your own
          </button>
        </div>

        {mode === 'library' ? (
          <>
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
            <ul className="mt-3 divide-y divide-stone-100">
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
          </>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-stone-500">
              A one-off step just for this plan — it won't be added to the technique library.
            </p>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">Name</span>
              <input
                autoFocus
                value={freeName}
                onChange={(e) => setFreeName(e.target.value)}
                placeholder="What is this step called?"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">Description</span>
              <textarea
                value={freeDescription}
                onChange={(e) => setFreeDescription(e.target.value)}
                rows={3}
                placeholder="What happens in this step…"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </label>
            <button
              type="button"
              onClick={handleAddFreeText}
              disabled={!freeName.trim()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
            >
              <PenLine size={14} />
              Add step
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
