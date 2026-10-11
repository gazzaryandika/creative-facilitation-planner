import { saveAs } from 'file-saver'
import { SECTION_ORDER, type SessionPlan, type TechniqueInstance } from '../data/models'

/**
 * A plan saved as a file so it can be handed to someone else. It carries the plan
 * and its own steps; library techniques are referenced by id, so the person
 * importing it needs the same app (same technique library) to see them.
 */
export interface PlanFile {
  format: 'cfp-session-plan'
  version: 1
  exportedAt: string
  plan: SessionPlan
  instances: TechniqueInstance[]
}

export function downloadPlanFile(plan: SessionPlan, allInstances: TechniqueInstance[]): void {
  const ids = new Set(Object.values(plan.sections).flat())
  const file: PlanFile = {
    format: 'cfp-session-plan',
    version: 1,
    exportedAt: new Date().toISOString(),
    plan,
    instances: allInstances.filter((i) => ids.has(i.id)),
  }
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const filename = `${plan.name.replace(/[^a-z0-9 -]/gi, '').trim() || 'session-plan'}.json`
  saveAs(blob, filename)
}

export class PlanFileError extends Error {}

/** Parses and sanity-checks a plan file's text. Throws PlanFileError with a readable message. */
export function parsePlanFile(text: string): PlanFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new PlanFileError("This file isn't valid JSON.")
  }
  const file = data as Partial<PlanFile>
  if (file?.format !== 'cfp-session-plan' || !file.plan || !Array.isArray(file.instances)) {
    throw new PlanFileError("This isn't a session plan file from this app.")
  }
  if (file.version !== 1) {
    throw new PlanFileError(`This plan file is version ${file.version}; this app reads version 1.`)
  }
  const sections = file.plan.sections ?? {}
  for (const id of SECTION_ORDER) {
    if (sections[id] !== undefined && !Array.isArray(sections[id])) {
      throw new PlanFileError('The plan file is damaged (a section is not a list of steps).')
    }
  }
  return file as PlanFile
}
