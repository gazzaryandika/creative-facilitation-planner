// Core data model for the Creative Facilitation Session Planner.
// Field names and shapes trace back to the Road Map for CPS Techniques book layout
// as described in the PRD's "Technique entity schema" section — not invented for the app.

/**
 * 'Multiple' covers techniques that run their own diverge/reverge/converge cycle or fit
 * any stage — the book's Acceptance Finding (§3.4) and Information Finding (§3.5) techniques.
 */
export type Stage = 'Diverging' | 'Reverging' | 'Converging' | 'Multiple'

export type DiamondPhase = 'Problem Finding' | 'Idea Finding' | 'Solution Finding'

export type ExperienceLevel = 'Novice' | 'Intermediate' | 'Expert'

export interface TimeRange {
  minMinutes: number
  maxMinutes: number
}

/**
 * How a material line's quantity is read: a fixed total for the whole step
 * (one flip-chart stand), or an amount per RG member (one Post-it pad each),
 * multiplied by the plan's participant count when the plan is printed.
 */
export type MaterialScaling = 'fixed' | 'perParticipant'

export interface MaterialLine {
  /** Set when the line came from the materials catalog; absent for a custom item. */
  catalogId?: string
  name: string
  quantity: number
  scaling: MaterialScaling
}

export interface StepByStepEntry {
  number: number
  text: string
  subPoints?: string[]
}

/**
 * A technique is "pending transcription" when only the fields the v1 seed-list
 * table gives (name, stage, phase, source) are known, and the book's own
 * Step by step / Tips and tricks / Variants text hasn't been typed in yet.
 * The PRD's risk section calls this out explicitly for everything but
 * Brainwriting, Spontaneous Clustering and Mind Mapping.
 */
export interface Technique {
  id: string
  sectionReference?: string
  name: string
  stage: Stage
  diamond: DiamondPhase[]
  diamondNote?: string // e.g. "Mainly Idea Finding, also Problem and Solution Finding"
  familyOfTechniques?: string
  typeOfProblem?: string
  /** Diverging techniques only. */
  typeOfOptions?: string
  /** Reverging / Converging techniques only. */
  numberOfOptions?: string
  facilitatorLevel?: ExperienceLevel
  rgLevel?: ExperienceLevel
  time?: TimeRange
  funFactor?: string
  /** The book's own materials text, shown as-is in the technique detail view. */
  materials?: string
  /** The same materials as countable items — the default bill of materials for a new instance. */
  materialItems?: MaterialLine[]
  /** Anything in the materials text that isn't a countable item (e.g. "wall space"). */
  materialsNote?: string
  website?: string
  purpose?: string
  inShort?: string
  stepByStep?: StepByStepEntry[]
  tipsAndTricks?: string
  variants?: string
  /** History and origins, as summarised from the book's History section. */
  background?: string
  /** Excursions only: the book's Table 3.1 safety rating, 1 (risky) to 5 (safe). */
  safety?: number
  custom: boolean
  source: string
  /** True when stepByStep/tipsAndTricks/variants still need transcribing from the book. */
  pendingTranscription: boolean
}

export interface TechniqueInstance {
  id: string
  /** Absent for a free-text step: a one-off written directly into this plan, not drawn from (or added to) the technique library. */
  techniqueId?: string
  /** The step's name when it has no techniqueId. Ignored for a library-backed instance, which uses the technique's own name. */
  customName?: string
  /** A free-text step's stage, chosen by hand. Undefined means "not set". Ignored for a library-backed instance, which uses the technique's own stage. */
  stage?: Stage
  /** Overrides the technique's purpose/aim for this plan only; the whole description for a free-text step. Undefined falls back to the technique's own purpose/inShort. */
  description?: string
  actualMinutes: number
  facilitatorNotes: string
  /** Overrides the technique's default material items for this plan only. Undefined falls back to the technique's own; an empty array means "none for this plan." */
  materialItems?: MaterialLine[]
  /** Overrides the technique's materials note for this plan only. */
  materialsNote?: string
  /** @deprecated Free-text materials from before materialItems existed. Read only as a fallback note. */
  materials?: string
}

export const SECTION_ORDER = [
  'problem-as-given',
  'introduction',
  'problem-finding',
  'idea-finding',
  'solution-finding',
  'wrap-up',
] as const

export type SectionId = (typeof SECTION_ORDER)[number]

export const SECTION_LABELS: Record<SectionId, string> = {
  'problem-as-given': 'Problem as Given',
  introduction: 'Introduction',
  'problem-finding': 'Problem Finding',
  'idea-finding': 'Idea Finding',
  'solution-finding': 'Solution Finding',
  'wrap-up': 'Wrap Up and Reflection',
}

/**
 * Problem as Given and Introduction are free-text brief fields, not technique-bearing
 * stages — the UI already has dedicated inputs for them. This is the subset of
 * SECTION_ORDER that actually renders as an accordion and accepts technique instances.
 */
export const TECHNIQUE_SECTION_ORDER = SECTION_ORDER.filter(
  (id): id is Exclude<SectionId, 'problem-as-given' | 'introduction'> =>
    id !== 'problem-as-given' && id !== 'introduction',
)

export type SectionInstances = Record<SectionId, string[]> // ordered TechniqueInstance ids

export function emptySections(): SectionInstances {
  return {
    'problem-as-given': [],
    introduction: [],
    'problem-finding': [],
    'idea-finding': [],
    'solution-finding': [],
    'wrap-up': [],
  }
}

/**
 * A Session Plan and a Session Template are the same shape — the PRD's own
 * definition is "a session plan is a template, filled with technique instances".
 * isSeedTemplate marks the two read-only starting points (Xemia, Creativity Guru)
 * shown in the Template Picker; cloning one produces a plan with isSeedTemplate: false.
 */
export interface SessionPlan {
  id: string
  name: string
  description?: string
  isSeedTemplate: boolean
  clonedFromId?: string
  targetLengthMinutes: number
  /** Resource Group size — scales every per-participant material line. */
  participantCount: number
  problemOwnerName: string
  problemOwnerDescription: string
  problemAsGiven: string
  introduction: string
  sections: SectionInstances
  createdAt: string
  updatedAt: string
}
