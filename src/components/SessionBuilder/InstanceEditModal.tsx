import { ArrowRight, Info, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SECTION_LABELS, TECHNIQUE_SECTION_ORDER, type SectionId, type Technique, type TechniqueInstance } from '../../data/models'
import { effectiveMaterials, instanceMap, planTotalMinutes } from '../../lib/planMath'
import { usePlannerStore } from '../../store/usePlannerStore'
import { TechniqueDetailModal } from '../TechniqueDetailModal'
import { TimeBudgetBar } from '../TimeBudgetBar'

interface InstanceEditModalProps {
  instance: TechniqueInstance
  technique: Technique | undefined
  planId: string
  sectionId: SectionId
  onClose: () => void
}

export function InstanceEditModal({ instance, technique, planId, sectionId, onClose }: InstanceEditModalProps) {
  const updateInstance = usePlannerStore((s) => s.updateInstance)
  const removeInstanceFromSection = usePlannerStore((s) => s.removeInstanceFromSection)
  const moveInstanceAcrossSections = usePlannerStore((s) => s.moveInstanceAcrossSections)
  const plan = usePlannerStore((s) => s.plans.find((p) => p.id === planId))
  const allInstances = usePlannerStore((s) => s.instances)
  const [showDetail, setShowDetail] = useState(false)

  // Edits are staged here and only written to the store on "Confirm changes" —
  // nothing in this modal takes effect until then.
  const [draftMinutes, setDraftMinutes] = useState(instance.actualMinutes)
  const [draftSectionId, setDraftSectionId] = useState<SectionId>(sectionId)
  const [draftMaterials, setDraftMaterials] = useState(effectiveMaterials(instance, technique))
  const [draftNotes, setDraftNotes] = useState(instance.facilitatorNotes)

  const movingSection = draftSectionId !== sectionId
  const isDirty =
    draftMinutes !== instance.actualMinutes ||
    movingSection ||
    draftMaterials !== effectiveMaterials(instance, technique) ||
    draftNotes !== instance.facilitatorNotes

  // Preview the whole-plan total as if the draft time were already confirmed.
  const planTotal = useMemo(() => {
    if (!plan) return 0
    const overlaid = instanceMap(allInstances)
    const current = overlaid.get(instance.id)
    if (current) overlaid.set(instance.id, { ...current, actualMinutes: draftMinutes })
    return planTotalMinutes(plan, overlaid)
  }, [plan, allInstances, instance, draftMinutes])

  function handleConfirm() {
    updateInstance(instance.id, {
      actualMinutes: draftMinutes,
      facilitatorNotes: draftNotes,
      materials: draftMaterials,
    })
    if (movingSection) {
      moveInstanceAcrossSections(planId, sectionId, draftSectionId, instance.id, 0)
    }
    onClose()
  }

  function handleRemove() {
    if (!window.confirm(`Remove "${technique?.name ?? 'this technique'}" from the plan?`)) return
    removeInstanceFromSection(planId, sectionId, instance.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Editing</p>
            <h3 className="truncate text-lg font-semibold text-stone-900">
              {technique?.name ?? 'Unknown technique'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close without saving"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-end gap-4">
            <label className="flex-1">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">Time</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={draftMinutes}
                  onChange={(e) => setDraftMinutes(Number(e.target.value) || 0)}
                  className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm tabular-nums focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-sm text-stone-500">minutes</span>
              </div>
            </label>

            <label className="flex-1">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">Section</span>
              <select
                value={draftSectionId}
                onChange={(e) => setDraftSectionId(e.target.value as SectionId)}
                className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                  movingSection
                    ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                    : 'border-stone-300 focus:border-teal-500 focus:ring-teal-500'
                }`}
              >
                {TECHNIQUE_SECTION_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {SECTION_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {movingSection && (
            <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <ArrowRight size={13} className="shrink-0" />
              Will move from {SECTION_LABELS[sectionId]} to {SECTION_LABELS[draftSectionId]} when confirmed.
            </p>
          )}

          {plan && (
            <TimeBudgetBar actualMinutes={planTotal} targetMinutes={plan.targetLengthMinutes} label="Whole plan" />
          )}

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-400">Materials</span>
            <textarea
              value={draftMaterials}
              onChange={(e) => setDraftMaterials(e.target.value)}
              placeholder="What this technique needs for this plan…"
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {technique?.materials && draftMaterials !== technique.materials && (
              <p className="mt-1 text-xs text-stone-400">
                Overrides this technique's usual materials ({technique.materials}) for this plan only.
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Facilitator notes for this plan
            </span>
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Notes specific to this session…"
              rows={4}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </label>

          {technique && (
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <Info size={15} />
              View full technique details
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 px-5 py-4">
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={15} />
            Remove from plan
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isDirty}
              className="rounded-md bg-teal-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
            >
              Confirm changes
            </button>
          </div>
        </div>
      </div>

      {showDetail && technique && (
        <TechniqueDetailModal technique={technique} onClose={() => setShowDetail(false)} />
      )}
    </div>
  )
}
