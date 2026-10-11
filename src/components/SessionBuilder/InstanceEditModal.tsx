import { ArrowLeft, ArrowRight, Check, Info, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  SECTION_LABELS,
  TECHNIQUE_SECTION_ORDER,
  type SectionId,
  type Stage,
  type Technique,
  type TechniqueInstance,
} from '../../data/models'
import { effectiveMaterialItems, effectiveMaterialsNote } from '../../lib/materials'
import { effectiveDescription, effectiveName, instanceMap, planTotalMinutes, type InstanceFields } from '../../lib/planMath'
import { usePlannerStore } from '../../store/usePlannerStore'
import { TechniqueDetailModal } from '../TechniqueDetailModal'
import { TimeBudgetBar } from '../TimeBudgetBar'
import { MaterialsEditor } from './MaterialsEditor'

interface InstanceEditModalBaseProps {
  technique: Technique | undefined
  planId: string
  sectionId: SectionId
  onClose: () => void
}

/**
 * "edit" changes a step already in the plan. "create" reviews a step before it's
 * placed — nothing is written to the plan until "Confirm placement".
 */
type InstanceEditModalProps = InstanceEditModalBaseProps &
  (
    | { mode: 'edit'; instance: TechniqueInstance }
    | { mode: 'create'; instance: InstanceFields; onBack: () => void }
  )

const fieldClass =
  'mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'
const labelClass = 'text-xs font-medium uppercase tracking-wide text-stone-400'

export function InstanceEditModal(props: InstanceEditModalProps) {
  const { instance, technique, planId, sectionId, onClose, mode } = props
  const addInstanceToSection = usePlannerStore((s) => s.addInstanceToSection)
  const updateInstance = usePlannerStore((s) => s.updateInstance)
  const removeInstanceFromSection = usePlannerStore((s) => s.removeInstanceFromSection)
  const moveInstanceAcrossSections = usePlannerStore((s) => s.moveInstanceAcrossSections)
  const plan = usePlannerStore((s) => s.plans.find((p) => p.id === planId))
  const allInstances = usePlannerStore((s) => s.instances)
  const [showDetail, setShowDetail] = useState(false)

  const isFreeText = !instance.techniqueId
  const isCreate = mode === 'create'
  const participantCount = plan?.participantCount ?? 0

  const initialName = isFreeText ? (instance.customName ?? '') : effectiveName(instance, technique)
  const initialDescription = effectiveDescription(instance, technique)
  const initialItems = effectiveMaterialItems(instance, technique)
  const initialNote = effectiveMaterialsNote(instance, technique)

  // Edits are staged here and only written to the store on confirm —
  // nothing in this modal takes effect until then.
  const [draftMinutes, setDraftMinutes] = useState(instance.actualMinutes)
  const [draftSectionId, setDraftSectionId] = useState<SectionId>(sectionId)
  const [draftName, setDraftName] = useState(initialName)
  const [draftDescription, setDraftDescription] = useState(initialDescription)
  const [draftItems, setDraftItems] = useState(initialItems)
  const [draftNote, setDraftNote] = useState(initialNote)
  const [draftNotes, setDraftNotes] = useState(instance.facilitatorNotes)
  const [draftStage, setDraftStage] = useState<Stage | undefined>(instance.stage)

  const movingSection = !isCreate && draftSectionId !== sectionId
  const isDirty =
    draftMinutes !== instance.actualMinutes ||
    movingSection ||
    (isFreeText && draftName !== initialName) ||
    draftDescription !== initialDescription ||
    JSON.stringify(draftItems) !== JSON.stringify(initialItems) ||
    draftNote !== initialNote ||
    draftNotes !== instance.facilitatorNotes ||
    (isFreeText && draftStage !== instance.stage)
  const canConfirm = isCreate ? !isFreeText || draftName.trim().length > 0 : isDirty

  // Preview the whole-plan total as if the draft were already confirmed.
  const planTotal = useMemo(() => {
    if (!plan) return 0
    const overlaid = instanceMap(allInstances)
    if (mode === 'edit') {
      const current = overlaid.get(props.instance.id)
      if (current) overlaid.set(props.instance.id, { ...current, actualMinutes: draftMinutes })
      return planTotalMinutes(plan, overlaid)
    }
    return planTotalMinutes(plan, overlaid) + draftMinutes
  }, [plan, allInstances, mode, props.instance, draftMinutes])

  function handleConfirm() {
    const fields = {
      actualMinutes: draftMinutes,
      facilitatorNotes: draftNotes,
      materialItems: draftItems,
      materialsNote: draftNote,
      description: draftDescription,
      ...(isFreeText ? { customName: draftName.trim(), stage: draftStage } : {}),
    }
    if (mode === 'create') {
      addInstanceToSection(planId, draftSectionId, { ...instance, ...fields })
    } else {
      updateInstance(props.instance.id, fields)
      if (movingSection) moveInstanceAcrossSections(planId, sectionId, draftSectionId, props.instance.id, 0)
    }
    onClose()
  }

  function handleRemove() {
    if (mode !== 'edit') return
    if (!window.confirm(`Remove "${effectiveName(instance, technique)}" from the plan?`)) return
    removeInstanceFromSection(planId, sectionId, props.instance.id)
    onClose()
  }

  const eyebrow = isCreate
    ? `Adding to ${SECTION_LABELS[draftSectionId]}${isFreeText ? ' · your own step' : ''}`
    : `Editing${isFreeText ? ' · free text' : ''}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className={labelClass}>{eyebrow}</p>
            {isFreeText ? (
              <input
                autoFocus={isCreate}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Name this step…"
                className="mt-0.5 w-full border-none bg-transparent text-lg font-semibold text-stone-900 focus:outline-none"
              />
            ) : (
              <h3 className="truncate text-lg font-semibold text-stone-900">
                {technique?.name ?? 'Unknown technique'}
              </h3>
            )}
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
          <div className="flex flex-wrap items-end gap-4">
            <label className="basis-full sm:basis-0 sm:flex-1">
              <span className={labelClass}>Time</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={draftMinutes}
                  onChange={(e) => setDraftMinutes(Number(e.target.value) || 0)}
                  className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm tabular-nums focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-sm text-stone-500">minutes</span>
                {technique?.time && (
                  <span className="whitespace-nowrap text-xs text-stone-400">
                    book: {technique.time.minMinutes}–{technique.time.maxMinutes}
                  </span>
                )}
              </div>
            </label>

            <label className="flex-1">
              <span className={labelClass}>Section</span>
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

            {isFreeText && (
              <label className="flex-1">
                <span className={labelClass}>Stage</span>
                <select
                  value={draftStage ?? ''}
                  onChange={(e) => setDraftStage((e.target.value || undefined) as Stage | undefined)}
                  className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Not set</option>
                  <option value="Diverging">Diverging</option>
                  <option value="Reverging">Reverging</option>
                  <option value="Converging">Converging</option>
                </select>
              </label>
            )}
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
            <span className={labelClass}>{isFreeText ? 'Description' : 'Description / aim'}</span>
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder={
                isFreeText
                  ? draftSectionId === 'introduction'
                    ? 'What will be introduced — e.g. welcome, who we are, the brief, the agenda, the ground rules…'
                    : 'What happens in this step…'
                  : "Override this technique's purpose for this plan…"
              }
              rows={3}
              className={fieldClass}
            />
            {!isFreeText && technique && (technique.purpose || technique.inShort) && draftDescription !== (technique.purpose || technique.inShort) && (
              <p className="mt-1 text-xs text-stone-400">
                Overrides this technique's usual description for this plan only.
              </p>
            )}
          </label>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className={labelClass}>Materials</span>
              <span className="text-xs text-stone-400">
                RG of {participantCount} — “per person” counts multiply by this
              </span>
            </div>
            <MaterialsEditor lines={draftItems} onChange={setDraftItems} participantCount={participantCount} />
            <input
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="What to prepare, in your own words — e.g. just talking, print the brief, slides on screen, wall space…"
              className="mt-2 w-full rounded-md border border-stone-200 px-3 py-1.5 text-xs text-stone-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {technique?.materials && (
              <p className="mt-1 text-xs text-stone-400">Book lists: {technique.materials}</p>
            )}
          </div>

          <label className="block">
            <span className={labelClass}>Facilitator notes for this plan</span>
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Notes specific to this session…"
              rows={4}
              className={fieldClass}
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
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={15} />
              Remove from plan
            </button>
          ) : (
            <button
              type="button"
              onClick={props.onBack}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              <ArrowLeft size={15} />
              Back to library
            </button>
          )}
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
              disabled={!canConfirm}
              className="flex items-center gap-1.5 rounded-md bg-teal-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
            >
              {isCreate && <Check size={15} />}
              {isCreate ? 'Confirm placement' : 'Confirm changes'}
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
