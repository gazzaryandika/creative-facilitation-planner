import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { SECTION_LABELS, type SectionId, type SessionPlan, type Technique, type TechniqueInstance } from '../../data/models'
import { resolveTechnique, sectionStageFlow, sectionTotalMinutes } from '../../lib/planMath'
import { usePlannerStore } from '../../store/usePlannerStore'
import { StageFlowBadges } from '../StageFlowBadges'
import { InstanceCard } from './InstanceCard'
import { InstanceEditModal } from './InstanceEditModal'
import { TechniquePickerPopover } from './TechniquePickerPopover'

interface SectionColumnProps {
  plan: SessionPlan
  sectionId: SectionId
  instances: Map<string, TechniqueInstance>
  techniques: Map<string, Technique>
}

export function SectionColumn({ plan, sectionId, instances, techniques }: SectionColumnProps) {
  const reorderWithinSection = usePlannerStore((s) => s.reorderWithinSection)
  const addInstanceToSection = usePlannerStore((s) => s.addInstanceToSection)
  const addFreeTextInstanceToSection = usePlannerStore((s) => s.addFreeTextInstanceToSection)
  const [collapsed, setCollapsed] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null)

  const instanceIds = plan.sections[sectionId]
  const sectionTotal = sectionTotalMinutes(plan, sectionId, instances)
  const stageFlow = sectionStageFlow(instanceIds, instances, techniques)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = instanceIds.indexOf(String(active.id))
    const newIndex = instanceIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    reorderWithinSection(plan.id, sectionId, arrayMove(instanceIds, oldIndex, newIndex))
  }

  const editingInstance = editingInstanceId ? instances.get(editingInstanceId) : undefined

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 text-left"
        >
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            className={`shrink-0 text-stone-400 transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
          />
          <span className="truncate font-semibold text-stone-900">{SECTION_LABELS[sectionId]}</span>
          <span className="shrink-0 text-xs font-medium text-stone-400">({instanceIds.length})</span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-stone-600">
            {sectionTotal} min
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add
          </button>
        </div>
      </div>

      <StageFlowBadges stages={stageFlow} className="px-4 pb-2.5 pl-9" />

      <div className="accordion-panel" data-collapsed={collapsed}>
        <div>
          <div className="space-y-2 border-t border-stone-100 px-4 pt-3 pb-4">
            {instanceIds.length === 0 && (
              <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-5 text-center text-xs text-stone-400">
                No techniques yet.
              </p>
            )}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={instanceIds} strategy={verticalListSortingStrategy}>
                {instanceIds.map((instanceId) => {
                  const instance = instances.get(instanceId)
                  if (!instance) return null
                  return (
                    <InstanceCard
                      key={instanceId}
                      instance={instance}
                      technique={resolveTechnique(instance, techniques)}
                      onEdit={() => setEditingInstanceId(instanceId)}
                    />
                  )
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <TechniquePickerPopover
          onClose={() => setPickerOpen(false)}
          onPickLibrary={async (techniqueId) => {
            await addInstanceToSection(plan.id, sectionId, techniqueId)
            setPickerOpen(false)
          }}
          onAddFreeText={async (customName, description) => {
            await addFreeTextInstanceToSection(plan.id, sectionId, customName, description)
            setPickerOpen(false)
          }}
        />
      )}

      {editingInstance && (
        <InstanceEditModal
          instance={editingInstance}
          technique={resolveTechnique(editingInstance, techniques)}
          planId={plan.id}
          sectionId={sectionId}
          onClose={() => setEditingInstanceId(null)}
        />
      )}
    </div>
  )
}
