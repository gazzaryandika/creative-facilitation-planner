import { ChevronLeft, ChevronRight, Pause, Play, Square } from 'lucide-react'
import { SECTION_LABELS, type SectionId } from '../../data/models'
import { effectiveName, type FlatStep } from '../../lib/planMath'

interface LiveSessionBarProps {
  steps: FlatStep[]
  index: number
  stepSeconds: number
  sessionSeconds: number
  running: boolean
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onEnd: () => void
}

function clock(totalSeconds: number): string {
  const s = Math.abs(Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/**
 * The live-session controls, pinned to the bottom of the saved plan while a session
 * runs. It never moves on by itself: when a step's time is up it turns red and keeps
 * counting the overtime until the facilitator skips.
 */
export function LiveSessionBar({
  steps,
  index,
  stepSeconds,
  sessionSeconds,
  running,
  onToggle,
  onPrev,
  onNext,
  onEnd,
}: LiveSessionBarProps) {
  const current = steps[index]
  const planned = current.instance.actualMinutes * 60
  const remaining = planned - stepSeconds
  const over = remaining < 0
  const stepProgress = planned > 0 ? Math.min(1, stepSeconds / planned) : 1

  // Where the session should be by now, if every step had kept to its time.
  const plannedSoFar = steps.slice(0, index).reduce((s, x) => s + x.instance.actualMinutes * 60, 0) + Math.min(stepSeconds, planned)
  const drift = sessionSeconds - plannedSoFar
  const totalPlanned = steps.reduce((s, x) => s + x.instance.actualMinutes * 60, 0)

  // Sections as proportional segments, for "where are we in the whole session".
  const sections: { id: SectionId; minutes: number; first: number; last: number }[] = []
  steps.forEach((s, i) => {
    const last = sections[sections.length - 1]
    if (last && last.id === s.sectionId) {
      last.minutes += s.instance.actualMinutes
      last.last = i
    } else {
      sections.push({ id: s.sectionId, minutes: s.instance.actualMinutes, first: i, last: i })
    }
  })
  const totalMinutes = sections.reduce((s, x) => s + x.minutes, 0) || 1

  const button =
    'flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t text-white shadow-[0_-8px_24px_rgba(0,0,0,0.18)] transition-colors ${
        over ? 'border-rose-400 bg-rose-700' : 'border-stone-700 bg-stone-900'
      }`}
      role="region"
      aria-label="Live session timer"
    >
      {/*
        Whole-session progress: fills with session time against the planned total.
        Dividers mark where each section starts; hovering a segment names the section.
      */}
      <div className="relative flex h-2 w-full bg-white/15">
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
            sessionSeconds > totalPlanned ? 'bg-amber-400' : 'bg-teal-400'
          }`}
          style={{ width: `${Math.min(1, totalPlanned > 0 ? sessionSeconds / totalPlanned : 0) * 100}%` }}
        />
        {sections.map((sec, i) => (
          <div
            key={`${sec.id}-${sec.first}`}
            style={{ width: `${(sec.minutes / totalMinutes) * 100}%` }}
            className={`relative h-full ${i > 0 ? 'border-l-2 border-black/50' : ''}`}
            title={`${SECTION_LABELS[sec.id]} · ${sec.minutes} min`}
          />
        ))}
      </div>

      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:flex-nowrap">
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
            {SECTION_LABELS[current.sectionId]} · step {index + 1} of {steps.length}
          </p>
          <p className="truncate text-base font-semibold">{effectiveName(current.instance, current.technique)}</p>
          {steps[index + 1] && (
            <p className="truncate text-xs text-white/60">
              Next: {effectiveName(steps[index + 1].instance, steps[index + 1].technique)}
            </p>
          )}
        </div>

        <div className="w-44 shrink-0 sm:w-60">
          {over ? (
            <div className="animate-pulse">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-white/90">Overtime by</span>
              <span className="text-3xl font-bold leading-none tabular-nums">{clock(-remaining)}</span>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-3xl font-bold tabular-nums">{clock(remaining)}</span>
              <span className="text-xs text-white/70">of {current.instance.actualMinutes} min</span>
            </div>
          )}
          <div className={`mt-1 h-2 overflow-hidden rounded-full ${over ? 'bg-rose-950/50' : 'bg-white/15'}`}>
            <div
              className={`h-full rounded-full ${over ? 'bg-white' : stepProgress > 0.8 ? 'bg-amber-400' : 'bg-teal-400'}`}
              style={{ width: `${stepProgress * 100}%` }}
            />
          </div>
          <p className="mt-1 whitespace-nowrap text-[11px] tabular-nums text-white/60">
            Session {clock(sessionSeconds)} / {clock(totalPlanned)}
            {Math.abs(drift) >= 60 && (
              <span className={drift > 0 ? 'text-amber-300' : 'text-teal-300'}>
                {' '}· {Math.round(Math.abs(drift) / 60)} min {drift > 0 ? 'behind' : 'ahead'}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onPrev} disabled={index === 0} aria-label="Previous step" className={`${button} hover:bg-white/10`}>
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={running ? 'Pause timer' : 'Resume timer'}
            className={`${button} h-12 w-12 bg-white text-stone-900 hover:bg-white/90`}
          >
            {running ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index === steps.length - 1}
            aria-label="Skip to next step"
            className={`${button} ${over ? 'bg-white/20 ring-2 ring-white' : ''} hover:bg-white/10`}
          >
            <ChevronRight size={20} />
          </button>
          <button
            type="button"
            onClick={onEnd}
            aria-label="End live session"
            title="End live session"
            className={`${button} ml-1 hover:bg-white/10`}
          >
            <Square size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
