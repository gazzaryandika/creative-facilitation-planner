import type { DiamondPhase, SectionId, Technique } from '../data/models'

/**
 * How well a technique suits a phase, read from the book's diamond line, e.g.
 * "Mainly Idea Finding, also Solution Finding": Idea Finding is 'mainly',
 * Solution Finding is 'also', Problem Finding is 'not usual'. It's guidance for
 * sorting and labelling only — any technique can still go in any section.
 */
export type Fit = 'mainly' | 'also' | 'notUsual'

export const PHASES: DiamondPhase[] = ['Problem Finding', 'Idea Finding', 'Solution Finding']

const SECTION_PHASE: Partial<Record<SectionId, DiamondPhase>> = {
  'problem-finding': 'Problem Finding',
  'idea-finding': 'Idea Finding',
  'solution-finding': 'Solution Finding',
}

function mentions(text: string, phase: DiamondPhase): boolean {
  return text.toLowerCase().includes(phase.split(' ')[0].toLowerCase())
}

export function phaseFit(technique: Technique, phase: DiamondPhase): Fit {
  if (!technique.diamond.includes(phase)) return 'notUsual'
  const note = technique.diamondNote ?? ''
  if (/^any\b/i.test(note)) return 'mainly'
  const [main, secondary = ''] = note.split(/,\s*(?:sometimes|also)\s+/i)
  if (mentions(main, phase)) return 'mainly'
  if (mentions(secondary, phase)) return 'also'
  // A note that names no phase at all (team techniques) — trust the diamond list.
  return PHASES.some((p) => mentions(note, p)) ? 'also' : 'mainly'
}

/**
 * Fit for a plan section. The three diamond sections map to their phase. Wrap Up
 * sits outside the diamond: closing techniques fit mainly, and Acceptance and
 * Information Finding techniques (which prepare what happens after the session) fit too.
 */
export function sectionFit(technique: Technique, sectionId: SectionId): Fit {
  const phase = SECTION_PHASE[sectionId]
  if (phase) return phaseFit(technique, phase)
  if (sectionId === 'introduction') {
    return /ice ?breaker|energi[sz]er|warm[- ]?up/i.test(technique.name) ? 'mainly' : 'notUsual'
  }
  if (sectionId === 'wrap-up') {
    if (technique.diamond.length === 0) return 'mainly'
    if (/acceptance finding|information finding/i.test(technique.familyOfTechniques ?? '')) return 'also'
  }
  return 'notUsual'
}

export const FIT_ORDER: Record<Fit, number> = { mainly: 0, also: 1, notUsual: 2 }

/** Every word of the query must appear somewhere in the technique's text. */
export function matchesQuery(technique: Technique, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [
    technique.name,
    technique.sectionReference,
    technique.stage,
    technique.familyOfTechniques,
    technique.diamondNote,
    technique.purpose,
    technique.inShort,
    technique.variants,
    technique.tipsAndTricks,
    technique.materials,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return words.every((w) => haystack.includes(w))
}

/** Name hits rank above hits buried in the description. */
export function nameMatches(technique: Technique, query: string): boolean {
  const q = query.trim().toLowerCase()
  return q.length > 0 && technique.name.toLowerCase().includes(q)
}

/** Full URL of a technique's header photo, respecting the app's base path. */
export function headerImageUrl(technique: Technique): string | undefined {
  return technique.headerImage ? `${import.meta.env.BASE_URL}${technique.headerImage}` : undefined
}

/** The book's short "how it works" (or purpose) as one line for list rows. */
export function shortDescription(technique: Technique): string {
  const text = technique.inShort || technique.purpose || ''
  return text.split('\n')[0]
}
