import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, GripVertical, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { Technique, TechniqueInstance } from '../../data/models'
import { formatMaterialsInline } from '../../lib/materials'
import { effectiveDescription, effectiveName } from '../../lib/planMath'

interface InstanceCardProps {
  instance: TechniqueInstance
  technique: Technique | undefined
  participantCount: number
  onEdit: () => void
}

export function InstanceCard({ instance, technique, participantCount, onEdit }: InstanceCardProps) {
  const [expanded, setExpanded] = useState(true)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // A techniqueId pointing at nothing is a real data problem; no techniqueId at
  // all just means this is a free-text step, which is the normal, intended case.
  if (instance.techniqueId && !technique) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600"
      >
        Missing technique (id: {instance.techniqueId})
      </div>
    )
  }

  const isFreeText = !instance.techniqueId
  const description = effectiveDescription(instance, technique)
  const materials = formatMaterialsInline(instance, technique, participantCount)
  const hasDetail = Boolean(description || materials || instance.facilitatorNotes)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-stone-200 bg-white transition-colors hover:border-stone-300"
    >
      <div className="group flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab touch-none items-center self-stretch px-2 text-stone-300 hover:text-stone-500"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        {hasDetail && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="flex shrink-0 items-center self-stretch px-1 text-stone-300 hover:text-stone-500"
          >
            <ChevronDown
              size={15}
              strokeWidth={2.5}
              className={`transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
            />
          </button>
        )}

        <button
          type="button"
          onClick={onEdit}
          className={`flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left ${hasDetail ? '' : 'pl-2'}`}
        >
          <p className="min-w-0 flex-1 truncate font-medium text-stone-900">
            {effectiveName(instance, technique)}
            {isFreeText && (
              <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-violet-700">
                free text
              </span>
            )}
          </p>
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-stone-600">
            {instance.actualMinutes} min
          </span>
          <Pencil
            size={14}
            className="shrink-0 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </button>
      </div>

      {hasDetail && (
        <div className="accordion-panel" data-collapsed={!expanded}>
          <div>
            <div className="space-y-1.5 py-2 pr-3 pl-11">
              {description && <p className="text-xs text-stone-600">{description}</p>}
              {instance.facilitatorNotes && (
                <p className="whitespace-pre-wrap text-xs text-stone-600">{instance.facilitatorNotes}</p>
              )}
              {materials && (
                <p className="text-xs text-stone-400">
                  <span className="font-medium text-stone-500">Materials: </span>
                  {materials}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
