import type { Stage } from '../data/models'

export const STAGE_STYLES: Record<Stage, { bg: string; text: string }> = {
  Diverging: { bg: 'bg-teal-50', text: 'text-teal-700' },
  Reverging: { bg: 'bg-sky-50', text: 'text-sky-700' },
  Converging: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  Multiple: { bg: 'bg-amber-50', text: 'text-amber-700' },
}
