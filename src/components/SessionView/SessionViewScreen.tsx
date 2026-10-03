import { Download, Pencil, Play } from 'lucide-react'
import { useMemo } from 'react'
import { SECTION_LABELS, TECHNIQUE_SECTION_ORDER } from '../../data/models'
import { exportPlanToDocx } from '../../export/planToDocx'
import {
  effectiveMaterials,
  instanceMap,
  planTotalMinutes,
  sectionStageFlow,
  sectionTotalMinutes,
} from '../../lib/planMath'
import { usePlannerStore } from '../../store/usePlannerStore'
import { StageFlowBadges } from '../StageFlowBadges'
import { TimeBudgetBar } from '../TimeBudgetBar'

interface SessionViewScreenProps {
  planId: string
  onEdit: () => void
  onStartLive: () => void
}

function Prose({ text, placeholder }: { text: string; placeholder: string }) {
  if (!text) return <p className="font-serif text-[15px] italic text-stone-400">{placeholder}</p>
  return <p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-stone-800">{text}</p>
}

export function SessionViewScreen({ planId, onEdit, onStartLive }: SessionViewScreenProps) {
  const plan = usePlannerStore((s) => s.plans.find((p) => p.id === planId))
  const allInstances = usePlannerStore((s) => s.instances)
  const allTechniques = usePlannerStore((s) => s.techniques)

  const instances = useMemo(() => instanceMap(allInstances), [allInstances])
  const techniques = useMemo(() => new Map(allTechniques.map((t) => [t.id, t])), [allTechniques])

  if (!plan) {
    return <div className="p-8 text-stone-500">Plan not found.</div>
  }

  const total = planTotalMinutes(plan, instances)
  const sectionsWithContent = TECHNIQUE_SECTION_ORDER.filter((id) => plan.sections[id].length > 0)

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{plan.name}</h1>
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
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800"
          >
            <Pencil size={15} />
            Edit
          </button>
          <button
            type="button"
            onClick={onStartLive}
            disabled={sectionsWithContent.length === 0}
            title={sectionsWithContent.length === 0 ? 'Add at least one technique before going live' : undefined}
            className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            <Play size={15} />
            Start Live Session
          </button>
        </div>
      </div>

      <div className="mt-4">
        <TimeBudgetBar actualMinutes={total} targetMinutes={plan.targetLengthMinutes} label="Whole plan" />
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Problem Owner</h2>
        {plan.problemOwnerName ? (
          <p className="mt-1 font-semibold text-stone-900">{plan.problemOwnerName}</p>
        ) : (
          <p className="mt-1 italic text-stone-400">Not named yet</p>
        )}
        <div className="mt-1">
          <Prose text={plan.problemOwnerDescription} placeholder="No description yet." />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Problem as Given</h2>
        <div className="mt-1">
          <Prose text={plan.problemAsGiven} placeholder="No brief recorded yet." />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Introduction</h2>
        <div className="mt-1">
          <Prose text={plan.introduction} placeholder="No introduction recorded yet." />
        </div>
      </section>

      {sectionsWithContent.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-400">
          No techniques added yet. Click Edit to start building the session.
        </p>
      ) : (
        <div className="mt-10 space-y-8">
          {sectionsWithContent.map((sectionId) => {
            const instanceIds = plan.sections[sectionId]
            const stageFlow = sectionStageFlow(instanceIds, instances, techniques)
            const sectionTotal = sectionTotalMinutes(plan, sectionId, instances)

            return (
              <section key={sectionId}>
                <div className="flex items-baseline justify-between gap-3 border-b border-stone-200 pb-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-stone-900">
                      {SECTION_LABELS[sectionId]}
                    </h2>
                    <StageFlowBadges stages={stageFlow} />
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-500">
                    {sectionTotal} min
                  </span>
                </div>

                <ol className="mt-3 space-y-4">
                  {instanceIds.map((instanceId) => {
                    const instance = instances.get(instanceId)
                    const technique = instance && techniques.get(instance.techniqueId)
                    if (!instance || !technique) return null
                    const aim = technique.purpose || technique.inShort
                    const materials = effectiveMaterials(instance, technique)

                    return (
                      <li key={instanceId}>
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-semibold text-stone-900">{technique.name}</h3>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-500">
                            {instance.actualMinutes} min
                          </span>
                        </div>
                        {aim && <p className="mt-0.5 font-serif text-[15px] text-stone-700">{aim}</p>}
                        {materials && (
                          <p className="mt-1 text-xs text-stone-500">
                            <span className="font-medium text-stone-600">Materials: </span>
                            {materials}
                          </p>
                        )}
                        {instance.facilitatorNotes && (
                          <p className="mt-1 text-xs text-stone-500 italic">{instance.facilitatorNotes}</p>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </section>
            )
          })}
        </div>
      )}
    </article>
  )
}
