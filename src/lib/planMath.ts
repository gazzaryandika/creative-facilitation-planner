import { TECHNIQUE_SECTION_ORDER, type SectionId, type SessionPlan, type Stage, type Technique, type TechniqueInstance } from '../data/models'

export function instanceMap(instances: TechniqueInstance[]): Map<string, TechniqueInstance> {
  return new Map(instances.map((i) => [i.id, i]))
}

/** The instance's own materials override if set, otherwise the technique's default. */
export function effectiveMaterials(instance: TechniqueInstance, technique: Technique | undefined): string {
  return instance.materials ?? technique?.materials ?? ''
}

export function sectionTotalMinutes(
  plan: SessionPlan,
  sectionId: SectionId,
  instances: Map<string, TechniqueInstance>,
): number {
  return plan.sections[sectionId].reduce((sum, id) => {
    const inst = instances.get(id)
    return sum + (inst?.actualMinutes ?? 0)
  }, 0)
}

export function planTotalMinutes(plan: SessionPlan, instances: Map<string, TechniqueInstance>): number {
  return (Object.keys(plan.sections) as SectionId[]).reduce(
    (sum, sectionId) => sum + sectionTotalMinutes(plan, sectionId, instances),
    0,
  )
}

/**
 * The sequence of diverge/reverge/converge stages a section's techniques actually
 * move through, in instance order, with consecutive repeats collapsed. e.g. a
 * Problem Finding section running Diverging, Diverging, Reverging, Diverging
 * techniques reports as [Diverging, Reverging, Diverging] — the diamond shape.
 */
export function sectionStageFlow(
  instanceIds: string[],
  instances: Map<string, TechniqueInstance>,
  techniques: Map<string, Technique>,
): Stage[] {
  const flow: Stage[] = []
  for (const id of instanceIds) {
    const instance = instances.get(id)
    const technique = instance && techniques.get(instance.techniqueId)
    if (!technique) continue
    if (flow[flow.length - 1] !== technique.stage) flow.push(technique.stage)
  }
  return flow
}

export interface FlatStep {
  sectionId: SectionId
  instance: TechniqueInstance
  technique: Technique | undefined
}

/**
 * Every technique instance across the plan's technique-bearing sections, in
 * running order — Problem Finding through Wrap Up, each section's own instance
 * order preserved. This is the sequence a live-facilitated session actually
 * steps through, one technique at a time.
 */
export function flattenInstances(
  plan: SessionPlan,
  instances: Map<string, TechniqueInstance>,
  techniques: Map<string, Technique>,
): FlatStep[] {
  const steps: FlatStep[] = []
  for (const sectionId of TECHNIQUE_SECTION_ORDER) {
    for (const id of plan.sections[sectionId]) {
      const instance = instances.get(id)
      if (!instance) continue
      steps.push({ sectionId, instance, technique: techniques.get(instance.techniqueId) })
    }
  }
  return steps
}
