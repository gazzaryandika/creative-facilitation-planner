import { AlertTriangle, Check, Download, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TECHNIQUE_SECTION_ORDER } from '../../data/models'
import { exportPlanToDocx } from '../../export/planToDocx'
import { instanceMap, planTotalMinutes } from '../../lib/planMath'
import { usePlannerStore } from '../../store/usePlannerStore'
import { TimeBudgetBar } from '../TimeBudgetBar'
import { SectionColumn } from './SectionColumn'

interface SessionBuilderScreenProps {
  planId: string
  onDone: () => void
}

export function SessionBuilderScreen({ planId, onDone }: SessionBuilderScreenProps) {
  const plan = usePlannerStore((s) => s.plans.find((p) => p.id === planId))
  const allInstances = usePlannerStore((s) => s.instances)
  const allTechniques = usePlannerStore((s) => s.techniques)
  const updatePlanMeta = usePlannerStore((s) => s.updatePlanMeta)
  const [showIncompleteModal, setShowIncompleteModal] = useState(false)

  const instances = useMemo(() => instanceMap(allInstances), [allInstances])
  const techniques = useMemo(() => new Map(allTechniques.map((t) => [t.id, t])), [allTechniques])

  if (!plan) {
    return <div className="p-8 text-stone-500">Plan not found.</div>
  }

  const total = planTotalMinutes(plan, instances)
  const techniqueCount = TECHNIQUE_SECTION_ORDER.reduce((sum, id) => sum + plan.sections[id].length, 0)
  const missingFields = [
    !plan.name.trim() && 'Plan name',
    !plan.problemOwnerName.trim() && 'Problem owner name',
    !plan.problemOwnerDescription.trim() && 'Problem owner description',
    !plan.problemAsGiven.trim() && 'Problem as Given',
    !plan.introduction.trim() && 'Introduction',
    plan.targetLengthMinutes <= 0 && 'Target length',
    techniqueCount === 0 && 'At least one technique',
  ].filter((x): x is string => Boolean(x))

  function handleSaveClick() {
    if (missingFields.length > 0) setShowIncompleteModal(true)
    else onDone()
  }

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <input
              value={plan.name}
              onChange={(e) => updatePlanMeta(plan.id, { name: e.target.value })}
              className="w-full border-none bg-transparent text-2xl font-bold tracking-tight text-stone-900 focus:outline-none"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <label htmlFor="target-length" className="text-xs font-medium text-stone-500">
                Target length
              </label>
              <input
                id="target-length"
                type="number"
                min={0}
                value={plan.targetLengthMinutes}
                onChange={(e) =>
                  updatePlanMeta(plan.id, { targetLengthMinutes: Number(e.target.value) || 0 })
                }
                className="w-20 rounded-md border border-stone-300 px-1.5 py-0.5 text-sm tabular-nums focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-xs text-stone-500">min</span>
              <span className="ml-1 flex items-center gap-1 text-xs text-stone-400">
                <Check size={12} strokeWidth={2.5} className="text-teal-600" />
                Saves automatically
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => exportPlanToDocx(plan, allInstances, allTechniques)}
              className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <Download size={15} />
              Export .docx
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800"
            >
              <Save size={15} />
              Save
            </button>
          </div>
        </div>

        <div className="mt-4">
          <TimeBudgetBar actualMinutes={total} targetMinutes={plan.targetLengthMinutes} label="Whole plan" />
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Problem Owner
            </label>
            <input
              value={plan.problemOwnerName}
              onChange={(e) => updatePlanMeta(plan.id, { problemOwnerName: e.target.value })}
              placeholder="Name…"
              className="mt-1 w-full rounded-md border border-stone-200 px-3 py-2 text-sm font-medium text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <textarea
              value={plan.problemOwnerDescription}
              onChange={(e) => updatePlanMeta(plan.id, { problemOwnerDescription: e.target.value })}
              rows={2}
              placeholder="Who they are, their role, what they want from this session…"
              className="mt-2 w-full rounded-md border border-stone-200 px-3 py-2 font-serif text-[15px] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Problem as Given
            </label>
            <textarea
              value={plan.problemAsGiven}
              onChange={(e) => updatePlanMeta(plan.id, { problemAsGiven: e.target.value })}
              rows={3}
              placeholder="The brief as the problem owner states it…"
              className="mt-1 w-full rounded-md border border-stone-200 px-3 py-2 font-serif text-[15px] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Introduction
            </label>
            <textarea
              value={plan.introduction}
              onChange={(e) => updatePlanMeta(plan.id, { introduction: e.target.value })}
              rows={3}
              placeholder="Case background, target user, what the problem owner wants…"
              className="mt-1 w-full rounded-md border border-stone-200 px-3 py-2 font-serif text-[15px] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {TECHNIQUE_SECTION_ORDER.map((sectionId) => (
            <SectionColumn
              key={sectionId}
              plan={plan}
              sectionId={sectionId}
              instances={instances}
              techniques={techniques}
            />
          ))}
        </div>
      </div>

      {showIncompleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          onClick={() => setShowIncompleteModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h3 className="font-semibold text-stone-900">This plan isn't complete yet</h3>
                <p className="mt-1 text-sm text-stone-500">Still missing:</p>
              </div>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-9 text-sm text-stone-700">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowIncompleteModal(false)}
                className="rounded-md px-3.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIncompleteModal(false)
                  onDone()
                }}
                className="rounded-md bg-teal-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
              >
                Save anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
