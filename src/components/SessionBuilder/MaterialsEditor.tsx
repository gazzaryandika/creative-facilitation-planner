import { Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { MaterialLine, MaterialScaling } from '../../data/models'
import { MATERIALS_CATALOG, customLine, lineFromCatalog, resolvedQuantity, type CatalogItem } from '../../lib/materials'

interface MaterialsEditorProps {
  lines: MaterialLine[]
  onChange: (lines: MaterialLine[]) => void
  participantCount: number
}

export function MaterialsEditor({ lines, onChange, participantCount }: MaterialsEditorProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const usedCatalogIds = new Set(lines.map((l) => l.catalogId).filter(Boolean))
  const trimmed = query.trim()

  const q = trimmed.toLowerCase()
  // Items whose own name matches come first; items matched only by their category follow.
  const available = MATERIALS_CATALOG.filter((c) => !usedCatalogIds.has(c.id))
  const suggestions = q
    ? [
        ...available.filter((c) => c.name.toLowerCase().includes(q)),
        ...available.filter((c) => !c.name.toLowerCase().includes(q) && c.category.toLowerCase().includes(q)),
      ]
    : available

  const exactMatch = MATERIALS_CATALOG.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
  const offerCustom = trimmed.length > 0 && !exactMatch
  const optionCount = suggestions.length + (offerCustom ? 1 : 0)

  function updateLine(index: number, patch: Partial<MaterialLine>) {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index))
  }

  function addLine(line: MaterialLine) {
    onChange([...lines, line])
    setQuery('')
    setHighlight(0)
    inputRef.current?.focus()
  }

  function pick(index: number) {
    if (index < suggestions.length) addLine(lineFromCatalog(suggestions[index]))
    else if (offerCustom) addLine(customLine(trimmed))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, optionCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (optionCount > 0) pick(highlight)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Browsing (empty query) groups the catalog by category; a search shows one flat,
  // ranked list so the on-screen order always matches the arrow-key order.
  const grouped: { category: string; items: { item: CatalogItem; index: number }[] }[] = []
  suggestions.forEach((item, index) => {
    const category = q ? '' : item.category
    const group = grouped.find((g) => g.category === category)
    if (group) group.items.push({ item, index })
    else grouped.push({ category, items: [{ item, index }] })
  })

  return (
    <div className="mt-1 space-y-2">
      {lines.length > 0 && (
        <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
          {lines.map((line, index) => (
            <li key={`${line.catalogId ?? 'custom'}-${index}`} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5">
              {line.catalogId ? (
                <span className="min-w-0 basis-full truncate text-sm text-stone-800 sm:basis-0 sm:flex-1">{line.name}</span>
              ) : (
                <input
                  value={line.name}
                  onChange={(e) => updateLine(index, { name: e.target.value })}
                  aria-label="Custom item name"
                  className="min-w-0 basis-full rounded border border-transparent px-1 py-0.5 sm:basis-0 sm:flex-1 text-sm text-stone-800 hover:border-stone-200 focus:border-teal-500 focus:outline-none"
                />
              )}
              <input
                type="number"
                min={0}
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                aria-label={`Quantity of ${line.name}`}
                className="w-14 rounded-md border border-stone-300 px-1.5 py-0.5 text-sm tabular-nums focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <select
                value={line.scaling}
                onChange={(e) => updateLine(index, { scaling: e.target.value as MaterialScaling })}
                aria-label={`How ${line.name} is counted`}
                className="rounded-md border border-stone-300 px-1.5 py-0.5 text-xs text-stone-600 focus:border-teal-500 focus:outline-none"
              >
                <option value="fixed">in total</option>
                <option value="perParticipant">per person</option>
              </select>
              <span className="ml-auto w-12 text-right text-xs font-semibold tabular-nums text-stone-500">
                {line.scaling === 'perParticipant' ? `= ${resolvedQuantity(line, participantCount)}` : ''}
              </span>
              <button
                type="button"
                onClick={() => removeLine(index)}
                aria-label={`Remove ${line.name}`}
                className="rounded p-0.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Plus size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder="Add an item — pick from the list or type your own…"
          role="combobox"
          aria-expanded={open}
          aria-controls="materials-catalog-list"
          className="w-full rounded-md border border-stone-300 py-1.5 pl-8 pr-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {open && optionCount > 0 && (
          <ul
            id="materials-catalog-list"
            role="listbox"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg"
          >
            {grouped.map((group) => (
              <li key={group.category || 'matches'}>
                {group.category && (
                  <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    {group.category}
                  </p>
                )}
                <ul>
                  {group.items.map(({ item, index }) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={highlight === index}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(index)}
                        onMouseEnter={() => setHighlight(index)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                          highlight === index ? 'bg-teal-50 text-teal-800' : 'text-stone-800'
                        }`}
                      >
                        <span>{item.name}</span>
                        <span className="text-xs text-stone-400">
                          {item.quantity} {item.scaling === 'perParticipant' ? 'per person' : 'in total'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {offerCustom && (
              <li className="border-t border-stone-100">
                <button
                  type="button"
                  role="option"
                  aria-selected={highlight === suggestions.length}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(suggestions.length)}
                  onMouseEnter={() => setHighlight(suggestions.length)}
                  className={`w-full px-3 py-1.5 text-left text-sm ${
                    highlight === suggestions.length ? 'bg-teal-50 text-teal-800' : 'text-stone-700'
                  }`}
                >
                  Add “{trimmed}” as a custom item
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
