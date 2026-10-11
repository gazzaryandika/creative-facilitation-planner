import { Clock, Smile, UserRound } from 'lucide-react'
import type { DiamondPhase, ExperienceLevel, Technique } from '../data/models'
import { STAGE_STYLES } from '../lib/stageStyles'
import { FIT_ORDER, PHASES, phaseFit } from '../lib/techniqueFit'

const PHASE_STYLES: Record<DiamondPhase, { solid: string; soft: string }> = {
  'Problem Finding': { solid: 'bg-rose-600 text-white', soft: 'border border-dashed border-rose-300 text-rose-700' },
  'Idea Finding': { solid: 'bg-orange-500 text-white', soft: 'border border-dashed border-orange-300 text-orange-700' },
  'Solution Finding': { solid: 'bg-emerald-600 text-white', soft: 'border border-dashed border-emerald-300 text-emerald-700' },
}

const LEVEL_STYLES: Record<ExperienceLevel, string> = {
  Novice: 'bg-lime-50 text-lime-800',
  Intermediate: 'bg-yellow-50 text-yellow-800',
  Expert: 'bg-red-50 text-red-700',
}

const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium'

/** "Mainly Problem Finding" (solid) and "also Idea Finding" (dashed) chips. */
export function PhaseFitTags({ technique }: { technique: Technique }) {
  const fits = PHASES.map((phase) => ({ phase, fit: phaseFit(technique, phase) })).filter((f) => f.fit !== 'notUsual')
    .sort((a, b) => FIT_ORDER[a.fit] - FIT_ORDER[b.fit])
  if (fits.length === 0) {
    return <span className={`${chip} bg-stone-100 text-stone-600`}>Outside the diamond</span>
  }
  return (
    <>
      {fits.map(({ phase, fit }) => (
        <span
          key={phase}
          className={`${chip} ${fit === 'mainly' ? PHASE_STYLES[phase].solid : PHASE_STYLES[phase].soft}`}
          title={fit === 'mainly' ? `Mainly used in ${phase}` : `Also used in ${phase}`}
        >
          {fit === 'also' && 'also '}
          {phase}
        </span>
      ))}
    </>
  )
}

function FunDots({ value }: { value: string }) {
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n)) return null
  return (
    <span className={`${chip} bg-fuchsia-50 text-fuchsia-700`} title={`Fun factor ${n} out of 5`}>
      <Smile size={12} />
      {'●'.repeat(n)}
      <span className="text-fuchsia-200">{'●'.repeat(Math.max(0, 5 - n))}</span>
    </span>
  )
}

/** Stage, phase fit, fun factor, time and experience as colour-coded chips. */
export function TechniqueTags({ technique: t, compact = false }: { technique: Technique; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className={`${chip} ${STAGE_STYLES[t.stage].bg} ${STAGE_STYLES[t.stage].text}`}>
        {t.stage === 'Multiple' ? 'Multiple stages' : t.stage}
      </span>
      <PhaseFitTags technique={t} />
      {t.funFactor && <FunDots value={t.funFactor} />}
      {t.time && (
        <span className={`${chip} bg-stone-100 text-stone-600`}>
          <Clock size={11} />
          {t.time.minMinutes === t.time.maxMinutes ? t.time.minMinutes : `${t.time.minMinutes}–${t.time.maxMinutes}`} min
        </span>
      )}
      {!compact && t.facilitatorLevel && (
        <span className={`${chip} ${LEVEL_STYLES[t.facilitatorLevel]}`} title="Facilitator experience needed">
          <UserRound size={11} />
          {t.facilitatorLevel} facilitator
        </span>
      )}
      {!compact && t.rgLevel && (
        <span className={`${chip} ${LEVEL_STYLES[t.rgLevel]}`} title="Resource group experience needed">
          {t.rgLevel} RG
        </span>
      )}
      {t.custom && <span className={`${chip} bg-violet-100 text-violet-700`}>Custom</span>}
      {t.pendingTranscription && <span className={`${chip} bg-amber-100 text-amber-700`}>Pending transcription</span>}
    </div>
  )
}
