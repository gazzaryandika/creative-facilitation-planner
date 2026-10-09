import { ChevronLeft, ChevronRight, Pause, Play, Square } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SECTION_LABELS } from '../../data/models'
import { effectiveDescription, effectiveMaterials, effectiveName, flattenInstances, instanceMap } from '../../lib/planMath'
import { usePlannerStore } from '../../store/usePlannerStore'
import { StageFlowBadges } from '../StageFlowBadges'
import { TimeBudgetBar } from '../TimeBudgetBar'
import { TimeTimerDial } from './TimeTimerDial'

interface LiveSessionScreenProps {
  planId: string
  onEnd: () => void
}

export function LiveSessionScreen({ planId, onEnd }: LiveSessionScreenProps) {
  const plan = usePlannerStore((s) => s.plans.find((p) => p.id === planId))
  const allInstances = usePlannerStore((s) => s.instances)
  const allTechniques = usePlannerStore((s) => s.techniques)

  const instances = useMemo(() => instanceMap(allInstances), [allInstances])
  const techniques = useMemo(() => new Map(allTechniques.map((t) => [t.id, t])), [allTechniques])
  const steps = useMemo(
    () => (plan ? flattenInstances(plan, instances, techniques) : []),
    [plan, instances, techniques],
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [running, setRunning] = useState(true)
  const [secondsElapsedInStep, setSecondsElapsedInStep] = useState(0)
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecondsElapsedInStep((s) => s + 1)
      setTotalSecondsElapsed((s) => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  function goTo(index: number) {
    setCurrentIndex(index)
    setSecondsElapsedInStep(0)
  }

  function handleEnd() {
    if (!window.confirm('End this live session?')) return
    onEnd()
  }

  if (!plan) {
    return <div className="p-8 text-stone-500">Plan not found.</div>
  }

  if (steps.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-stone-500">This plan has no techniques yet — there's nothing to run live.</p>
        <button
          type="button"
          onClick={onEnd}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Back
        </button>
      </div>
    )
  }

  const current = steps[currentIndex]
  const next = steps[currentIndex + 1]
  const currentTotalSeconds = current.instance.actualMinutes * 60
  const currentRemaining = currentTotalSeconds - secondsElapsedInStep
  const wholeTotalSeconds = steps.reduce((sum, s) => sum + s.instance.actualMinutes * 60, 0)
  const aim = effectiveDescription(current.instance, current.technique)
  const materials = effectiveMaterials(current.instance, current.technique)

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-stone-900">{plan.name}</p>
          <p className="text-xs text-stone-400">Live session · step {currentIndex + 1} of {steps.length}</p>
        </div>
        <div className="w-64 shrink-0">
          <TimeBudgetBar
            actualMinutes={Math.round(totalSecondsElapsed / 60)}
            targetMinutes={Math.round(wholeTotalSeconds / 60)}
            label="Whole session"
          />
        </div>
        <button
          type="button"
          onClick={handleEnd}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-rose-200 px-3.5 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <Square size={14} />
          End session
        </button>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-5">
          <TimeTimerDial totalSeconds={currentTotalSeconds} remainingSeconds={currentRemaining} size={320} />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1.5 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === steps.length - 1}
              className="flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
              {SECTION_LABELS[current.sectionId]}
            </span>
            <StageFlowBadges stages={current.technique ? [current.technique.stage] : []} />
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {effectiveName(current.instance, current.technique)}
          </h1>

          {aim && <p className="mt-3 font-serif text-lg leading-relaxed text-stone-700">{aim}</p>}

          {materials && (
            <p className="mt-4 text-sm text-stone-600">
              <span className="font-semibold text-stone-700">Materials: </span>
              {materials}
            </p>
          )}

          {current.instance.facilitatorNotes && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Facilitator notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-amber-900">
                {current.instance.facilitatorNotes}
              </p>
            </div>
          )}

          {next ? (
            <div className="mt-8 rounded-lg border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Up next</p>
              <p className="mt-1 font-semibold text-stone-900">{effectiveName(next.instance, next.technique)}</p>
              <p className="text-xs text-stone-500">
                {SECTION_LABELS[next.sectionId]} · {next.instance.actualMinutes} min
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed border-stone-300 bg-white px-4 py-3 text-sm text-stone-500">
              This is the last step. End the session when you're done.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
