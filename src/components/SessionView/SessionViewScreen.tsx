import { Download, FileJson, Info, Pencil, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SECTION_LABELS, TECHNIQUE_SECTION_ORDER } from '../../data/models'
import { downloadPlanFile } from '../../export/planFile'
import { exportPlanToDocx } from '../../export/planToDocx'
import { billOfMaterials, effectiveMaterialItems, effectiveMaterialsNote, formatLine } from '../../lib/materials'
import {
  effectiveDescription,
  effectiveName,
  flattenInstances,
  instanceMap,
  planTotalMinutes,
  resolveTechnique,
  sectionStageFlow,
  sectionTotalMinutes,
} from '../../lib/planMath'
import { usePlannerStore } from '../../store/usePlannerStore'
import { StageFlowBadges } from '../StageFlowBadges'
import { TechniqueDetailModal } from '../TechniqueDetailModal'
import { TimeBudgetBar } from '../TimeBudgetBar'
import { LiveSessionBar } from './LiveSessionBar'

interface SessionViewScreenProps {
  planId: string
  onEdit: () => void
}

/**
 * A running session. Time is kept as wall-clock timestamps rather than ticks, so it
 * stays right when the laptop sleeps or the tab is in the background.
 */
interface LiveState {
  index: number
  running: boolean
  /** Seconds banked in the current step / whole session up to `since`. */
  stepBanked: number
  sessionBanked: number
  /** When the timer last started running (ms). */
  since: number
}

function Prose({ text, placeholder }: { text: string; placeholder: string }) {
  if (!text) return <p className="font-serif text-[15px] italic text-stone-400">{placeholder}</p>
  return <p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-stone-800">{text}</p>
}

export function SessionViewScreen({ planId, onEdit }: SessionViewScreenProps) {
  const plan = usePlannerStore((s) => s.plans.find((p) => p.id === planId))
  const allInstances = usePlannerStore((s) => s.instances)
  const allTechniques = usePlannerStore((s) => s.techniques)

  const instances = useMemo(() => instanceMap(allInstances), [allInstances])
  const techniques = useMemo(() => new Map(allTechniques.map((t) => [t.id, t])), [allTechniques])
  // The library method behind a step, opened from the step's info button to recall how it works.
  const [infoTechniqueId, setInfoTechniqueId] = useState<string | null>(null)
  const infoTechnique = infoTechniqueId ? techniques.get(infoTechniqueId) : undefined

  const steps = useMemo(
    () => (plan ? flattenInstances(plan, instances, techniques) : []),
    [plan, instances, techniques],
  )
  const [live, setLive] = useState<LiveState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())

  useEffect(() => {
    if (!live?.running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [live?.running])

  const liveIndex = live?.index
  useEffect(() => {
    if (liveIndex === undefined) return
    const id = steps[liveIndex]?.instance.id
    // A hidden page runs no animation frames, so a smooth scroll would never move; jump instead.
    const behavior = document.visibilityState === 'visible' ? 'smooth' : 'auto'
    if (id) rowRefs.current.get(id)?.scrollIntoView({ behavior, block: 'center' })
  }, [liveIndex, steps])

  const runningFor = live?.running ? Math.max(0, (now - live.since) / 1000) : 0
  const stepSeconds = live ? live.stepBanked + runningFor : 0
  const sessionSeconds = live ? live.sessionBanked + runningFor : 0
  const currentStepId = live ? steps[live.index]?.instance.id : undefined
  const currentOver = live ? stepSeconds > (steps[live.index]?.instance.actualMinutes ?? 0) * 60 : false
  const stepPosition = new Map(steps.map((s, i) => [s.instance.id, i]))

  function startLive() {
    const t = Date.now()
    setNow(t)
    setLive({ index: 0, running: true, stepBanked: 0, sessionBanked: 0, since: t })
  }

  function toggleRunning() {
    if (!live) return
    const t = Date.now()
    setNow(t)
    setLive(
      live.running
        ? { ...live, running: false, stepBanked: stepSeconds, sessionBanked: sessionSeconds }
        : { ...live, running: true, since: t },
    )
  }

  function goToStep(index: number) {
    if (!live) return
    const t = Date.now()
    setNow(t)
    setLive({ ...live, index, stepBanked: 0, sessionBanked: sessionSeconds, since: t })
  }

  function endLive() {
    if (window.confirm('End the live session? The timer will reset.')) setLive(null)
  }

  if (!plan) {
    return <div className="p-8 text-stone-500">Plan not found.</div>
  }

  const total = planTotalMinutes(plan, instances)
  const bom = billOfMaterials(plan, instances, techniques, effectiveName)
  const sectionsWithContent = TECHNIQUE_SECTION_ORDER.filter((id) => plan.sections[id].length > 0)

  return (
    <article className={`mx-auto max-w-5xl px-6 py-8 ${live ? 'pb-56 sm:pb-40' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{plan.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadPlanFile(plan, allInstances)}
            title="Download this plan as a file you can send to someone else"
            className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            <FileJson size={15} />
            Download .json
          </button>
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
            onClick={startLive}
            disabled={sectionsWithContent.length === 0 || live !== null}
            title={sectionsWithContent.length === 0 ? 'Add at least one technique before going live' : undefined}
            className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            <Play size={15} />
            {live ? 'Session running' : 'Start Live Session'}
          </button>
        </div>
      </div>

      <p className="mt-1 text-sm text-stone-500">
        RG of <span className="font-semibold tabular-nums text-stone-700">{plan.participantCount}</span> participants
      </p>

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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Case background</h2>
        <div className="mt-1">
          <Prose text={plan.introduction} placeholder="No case background recorded yet." />
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

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                        <th className="w-[18%] py-2 pr-3 pl-3 font-semibold">Step</th>
                        <th className="w-[7%] py-2 pr-3 text-right font-semibold">Time</th>
                        <th className="w-[30%] py-2 pr-3 font-semibold">Description</th>
                        <th className="w-[22%] py-2 pr-3 font-semibold">Materials</th>
                        <th className="w-[23%] py-2 font-semibold">Facilitator notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instanceIds.map((instanceId) => {
                        const instance = instances.get(instanceId)
                        if (!instance) return null
                        const technique = resolveTechnique(instance, techniques)
                        const aim = effectiveDescription(instance, technique)
                        const items = effectiveMaterialItems(instance, technique)
                        const note = effectiveMaterialsNote(instance, technique)

                        return (
                          <tr
                            key={instanceId}
                            ref={(el) => {
                              if (el) rowRefs.current.set(instanceId, el)
                              else rowRefs.current.delete(instanceId)
                            }}
                            className={`border-b border-stone-100 align-top transition-colors ${
                              instanceId === currentStepId
                                ? currentOver
                                  ? 'bg-rose-50 shadow-[inset_4px_0_0_var(--color-rose-600)]'
                                  : 'bg-sky-50 shadow-[inset_4px_0_0_var(--color-sky-500)]'
                                : live && (stepPosition.get(instanceId) ?? 0) < live.index
                                  ? 'opacity-45'
                                  : ''
                            }`}
                          >
                            <td className="py-2.5 pr-3 pl-3 font-semibold text-stone-900">
                              {effectiveName(instance, technique)}
                              {technique && (
                                <button
                                  type="button"
                                  onClick={() => setInfoTechniqueId(technique.id)}
                                  aria-label={`How ${technique.name} works`}
                                  title="How this method works"
                                  className="ml-1 inline-flex translate-y-0.5 rounded-full p-0.5 text-stone-400 hover:bg-teal-50 hover:text-teal-700"
                                >
                                  <Info size={15} />
                                </button>
                              )}
                              {!technique && (
                                <span className="block text-xs font-normal text-stone-400">free text</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-xs font-semibold whitespace-nowrap tabular-nums text-stone-600">
                              {instance.actualMinutes} min
                            </td>
                            <td className="py-2.5 pr-3 font-serif text-[15px] leading-snug text-stone-700">
                              {aim || <span className="text-stone-300">—</span>}
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-stone-600">
                              {items.length > 0 && (
                                <ul className="space-y-0.5">
                                  {items.map((line, i) => (
                                    <li key={i} className="tabular-nums">{formatLine(line, plan.participantCount)}</li>
                                  ))}
                                </ul>
                              )}
                              {note && <p className={`italic text-stone-500 ${items.length ? 'mt-1' : ''}`}>{note}</p>}
                              {!items.length && !note && <span className="text-stone-300">—</span>}
                            </td>
                            <td className="py-2.5 text-xs whitespace-pre-line text-stone-600">
                              {instance.facilitatorNotes || <span className="text-stone-300">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {bom.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-3 border-b border-stone-200 pb-2">
            <h2 className="text-lg font-bold tracking-tight text-stone-900">Bill of materials</h2>
            <span className="text-xs text-stone-500">for an RG of {plan.participantCount}</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 text-right font-semibold">Qty</th>
                  <th className="py-2 font-semibold">Used in</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((row) => (
                  <tr key={row.name} className="border-b border-stone-100 align-top">
                    <td className="py-2 pr-3 text-stone-900">
                      {row.name}
                      {row.reusable && <span className="ml-1.5 text-xs text-stone-400">reusable</span>}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums text-stone-900">{row.quantity}</td>
                    <td className="py-2 text-xs text-stone-500">{row.usedIn.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-stone-400">
            Consumables add up across steps. Reusable items (markers, pens, tape, stands) count once, at the most any
            single step needs.
          </p>
        </section>
      )}

      {live && steps.length > 0 && (
        <LiveSessionBar
          steps={steps}
          index={live.index}
          stepSeconds={stepSeconds}
          sessionSeconds={sessionSeconds}
          running={live.running}
          onToggle={toggleRunning}
          onPrev={() => goToStep(Math.max(0, live.index - 1))}
          onNext={() => goToStep(Math.min(steps.length - 1, live.index + 1))}
          onEnd={endLive}
        />
      )}

      {infoTechnique && <TechniqueDetailModal technique={infoTechnique} onClose={() => setInfoTechniqueId(null)} />}
    </article>
  )
}
