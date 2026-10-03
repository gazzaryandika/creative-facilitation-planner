import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import type { Stage } from '../data/models'
import { STAGE_STYLES } from '../lib/stageStyles'

interface StageFlowBadgesProps {
  stages: Stage[]
  className?: string
}

/** The diverge/reverge/converge sequence a section's techniques move through. */
export function StageFlowBadges({ stages, className = '' }: StageFlowBadgesProps) {
  if (stages.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {stages.map((stage, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight size={10} className="shrink-0 text-stone-300" />}
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STAGE_STYLES[stage].bg} ${STAGE_STYLES[stage].text}`}
          >
            {stage}
          </span>
        </Fragment>
      ))}
    </div>
  )
}
