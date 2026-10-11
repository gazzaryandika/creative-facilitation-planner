import {
  TECHNIQUE_SECTION_ORDER,
  type MaterialLine,
  type MaterialScaling,
  type SessionPlan,
  type Technique,
  type TechniqueInstance,
} from '../data/models'
import { resolveTechnique, type InstanceFields } from './planMath'

export interface CatalogItem {
  id: string
  name: string
  category: string
  quantity: number
  scaling: MaterialScaling
  /**
   * Reusable items (markers, a stand, a timer) carry over from step to step, so the
   * bill of materials counts them once at the highest quantity any step asks for.
   * Consumables (Post-its, flip-over sheets, dot stickers) are used up, so they add up.
   */
  reusable: boolean
}

/** The common kit for a CPS session. Anything not here can still be typed in as a custom item. */
export const MATERIALS_CATALOG: CatalogItem[] = [
  // Paper and surfaces
  { id: 'flip-over-sheets', name: 'Flip-over sheets', category: 'Paper and surfaces', quantity: 3, scaling: 'fixed', reusable: false },
  { id: 'flip-chart-stand', name: 'Flip-chart stand', category: 'Paper and surfaces', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'a2-sheets', name: 'A2 sheets', category: 'Paper and surfaces', quantity: 1, scaling: 'perParticipant', reusable: false },
  { id: 'a3-sheets', name: 'A3 sheets', category: 'Paper and surfaces', quantity: 1, scaling: 'perParticipant', reusable: false },
  { id: 'a4-paper', name: 'A4 paper', category: 'Paper and surfaces', quantity: 2, scaling: 'perParticipant', reusable: false },
  { id: 'worksheets', name: 'Printed worksheets', category: 'Paper and surfaces', quantity: 1, scaling: 'perParticipant', reusable: false },
  { id: 'index-cards', name: 'Index cards', category: 'Paper and surfaces', quantity: 3, scaling: 'perParticipant', reusable: false },
  { id: 'brown-paper-roll', name: 'Brown paper roll', category: 'Paper and surfaces', quantity: 1, scaling: 'fixed', reusable: false },
  { id: 'whiteboard', name: 'Whiteboard', category: 'Paper and surfaces', quantity: 1, scaling: 'fixed', reusable: true },

  // Sticky notes and dots
  { id: 'post-it-pads', name: 'Post-it pads', category: 'Sticky notes and dots', quantity: 1, scaling: 'perParticipant', reusable: false },
  { id: 'large-post-its', name: 'Large Post-its', category: 'Sticky notes and dots', quantity: 1, scaling: 'fixed', reusable: false },
  { id: 'dot-stickers', name: 'Dot stickers (sheets)', category: 'Sticky notes and dots', quantity: 1, scaling: 'perParticipant', reusable: false },

  // Writing
  { id: 'black-markers', name: 'Black markers', category: 'Writing', quantity: 1, scaling: 'perParticipant', reusable: true },
  { id: 'coloured-markers', name: 'Coloured markers (set)', category: 'Writing', quantity: 1, scaling: 'perParticipant', reusable: true },
  { id: 'pens', name: 'Pens', category: 'Writing', quantity: 1, scaling: 'perParticipant', reusable: true },
  { id: 'pencils', name: 'Pencils', category: 'Writing', quantity: 1, scaling: 'perParticipant', reusable: true },
  { id: 'whiteboard-markers', name: 'Whiteboard markers', category: 'Writing', quantity: 3, scaling: 'fixed', reusable: true },

  // Fixing and making
  { id: 'masking-tape', name: 'Masking tape (roll)', category: 'Fixing and making', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'blu-tack', name: 'Blu-tack', category: 'Fixing and making', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'scissors', name: 'Scissors', category: 'Fixing and making', quantity: 2, scaling: 'fixed', reusable: true },
  { id: 'glue-sticks', name: 'Glue sticks', category: 'Fixing and making', quantity: 2, scaling: 'fixed', reusable: true },
  { id: 'magazines', name: 'Magazines for cutting', category: 'Fixing and making', quantity: 10, scaling: 'fixed', reusable: false },

  // Stimuli
  { id: 'pap-printed-large', name: 'PaP / PaG printed large', category: 'Stimuli', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'random-word-cards', name: 'Random word cards (jar or box)', category: 'Stimuli', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'random-objects-box', name: 'Box of random objects', category: 'Stimuli', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'picture-cards', name: 'Picture cards (set)', category: 'Stimuli', quantity: 1, scaling: 'fixed', reusable: true },

  // Handouts and presenting
  { id: 'printed-brief', name: 'Printed brief / PaG', category: 'Handouts and presenting', quantity: 1, scaling: 'perParticipant', reusable: false },
  { id: 'printed-agenda', name: 'Printed agenda', category: 'Handouts and presenting', quantity: 1, scaling: 'perParticipant', reusable: false },
  { id: 'name-tags', name: 'Name tags', category: 'Handouts and presenting', quantity: 1, scaling: 'perParticipant', reusable: false },
  { id: 'slides', name: 'Slides on screen', category: 'Handouts and presenting', quantity: 1, scaling: 'fixed', reusable: true },

  // Room and tech
  { id: 'timer', name: 'Timer', category: 'Room and tech', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'speaker', name: 'Speaker for music', category: 'Room and tech', quantity: 1, scaling: 'fixed', reusable: true },
  { id: 'projector', name: 'Projector or screen', category: 'Room and tech', quantity: 1, scaling: 'fixed', reusable: true },
]

const catalogById = new Map(MATERIALS_CATALOG.map((c) => [c.id, c]))

export function catalogItem(id: string | undefined): CatalogItem | undefined {
  return id ? catalogById.get(id) : undefined
}

export function lineFromCatalog(item: CatalogItem): MaterialLine {
  return { catalogId: item.id, name: item.name, quantity: item.quantity, scaling: item.scaling }
}

export function customLine(name: string): MaterialLine {
  return { name, quantity: 1, scaling: 'fixed' }
}

/** The line's actual count for this plan: per-participant lines multiply by the RG size. */
export function resolvedQuantity(line: MaterialLine, participantCount: number): number {
  return line.scaling === 'perParticipant' ? line.quantity * participantCount : line.quantity
}

/** e.g. "6× Post-it pads" — with "(1 each)" when it scales by participant. */
export function formatLine(line: MaterialLine, participantCount: number): string {
  const total = resolvedQuantity(line, participantCount)
  const per = line.scaling === 'perParticipant' ? ` (${line.quantity} each)` : ''
  return `${total}× ${line.name}${per}`
}

/** The instance's own material items if set, otherwise the technique's defaults. */
export function effectiveMaterialItems(
  instance: InstanceFields,
  technique: Technique | undefined,
): MaterialLine[] {
  return instance.materialItems ?? technique?.materialItems ?? []
}

/**
 * The instance's own materials note if set, otherwise the technique's. An instance
 * edited before material items existed may still carry a free-text `materials`
 * override — that's kept as the note when it differs from the book's text.
 */
export function effectiveMaterialsNote(
  instance: InstanceFields,
  technique: Technique | undefined,
): string {
  if (instance.materialsNote !== undefined) return instance.materialsNote
  if (instance.materials !== undefined && instance.materials !== technique?.materials) return instance.materials
  return technique?.materialsNote ?? ''
}

/** One line of text for compact places (cards, live mode): items, then the note. */
export function formatMaterialsInline(
  instance: InstanceFields,
  technique: Technique | undefined,
  participantCount: number,
): string {
  const items = effectiveMaterialItems(instance, technique).map((l) => formatLine(l, participantCount))
  const note = effectiveMaterialsNote(instance, technique)
  return [...items, note].filter(Boolean).join(', ')
}

export interface BillOfMaterialsRow {
  name: string
  quantity: number
  reusable: boolean
  usedIn: string[]
}

/**
 * The whole plan's shopping list. Lines are grouped by catalog id, or by name for
 * custom items. Consumables add up across steps; reusable items count once, at the
 * highest quantity any single step needs. Custom items are treated as consumables,
 * the safe side to err on when packing.
 */
export function billOfMaterials(
  plan: SessionPlan,
  instances: Map<string, TechniqueInstance>,
  techniques: Map<string, Technique>,
  stepName: (instance: TechniqueInstance, technique: Technique | undefined) => string,
): BillOfMaterialsRow[] {
  const rows = new Map<string, BillOfMaterialsRow>()
  for (const sectionId of TECHNIQUE_SECTION_ORDER) {
    for (const id of plan.sections[sectionId]) {
      const instance = instances.get(id)
      if (!instance) continue
      const technique = resolveTechnique(instance, techniques)
      for (const line of effectiveMaterialItems(instance, technique)) {
        const key = line.catalogId ?? `custom:${line.name.trim().toLowerCase()}`
        const reusable = catalogItem(line.catalogId)?.reusable ?? false
        const qty = resolvedQuantity(line, plan.participantCount)
        const row = rows.get(key) ?? { name: line.name, quantity: 0, reusable, usedIn: [] }
        row.quantity = reusable ? Math.max(row.quantity, qty) : row.quantity + qty
        const step = stepName(instance, technique)
        if (!row.usedIn.includes(step)) row.usedIn.push(step)
        rows.set(key, row)
      }
    }
  }
  return Array.from(rows.values())
}
