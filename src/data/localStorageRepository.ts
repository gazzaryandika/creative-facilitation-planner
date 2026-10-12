import type { Repository } from './repository'
import { retireRemovedTechniques } from './retiredTechniques'
import type { SessionPlan, Technique, TechniqueInstance } from './models'
import seedInstances from './seed/instances.json'
import seedTechniques from './seed/techniques.json'
import seedTemplates from './seed/templates.json'

const KEYS = {
  techniques: 'cfp.techniques.v3',
  plans: 'cfp.plans.v3',
  instances: 'cfp.instances.v3',
} as const

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/** Replaces entries that share an id with `updates`, keeps everything else untouched. */
function upsertById<T extends { id: string }>(existing: T[], updates: T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]))
  for (const update of updates) byId.set(update.id, update)
  return Array.from(byId.values())
}

/**
 * Techniques and seed templates are canonical, dev-managed content — there's no
 * UI path for a user to edit them in v1 (confirmed: no "create technique" form,
 * seed templates are read-only starting points you clone). So every load mirrors
 * the latest seed JSON for those, while plans a user actually created or cloned
 * (and their instances) are only ever upserted by id, never overwritten wholesale —
 * real work in someone's browser survives a seed-data update like this one.
 */
function syncSeedData(): void {
  write(KEYS.techniques, seedTechniques as Technique[])

  // Seed templates that were retired from the seed file are removed with their steps.
  // Only built-in templates go: a user's own plans (and clones of templates, which
  // have their own ids) are never touched.
  const seedIds = new Set((seedTemplates as SessionPlan[]).map((p) => p.id))
  const storedPlans = read<SessionPlan[]>(KEYS.plans, [])
  const retired = storedPlans.filter((p) => p.isSeedTemplate && !seedIds.has(p.id))
  const retiredSteps = new Set(retired.flatMap((p) => Object.values(p.sections ?? {}).flat()))
  const keptPlans = storedPlans.filter((p) => !retired.includes(p))
  const keptSteps = retireRemovedTechniques(
    read<TechniqueInstance[]>(KEYS.instances, []).filter((i) => !retiredSteps.has(i.id)),
  )

  write(KEYS.plans, upsertById(keptPlans, seedTemplates as SessionPlan[]))
  write(KEYS.instances, upsertById(keptSteps, seedInstances as TechniqueInstance[]))
}

const DEFAULT_PARTICIPANT_COUNT = 6

/** Backfills fields added to SessionPlan after some plans were already saved. */
function normalizePlan(plan: SessionPlan): SessionPlan {
  return {
    ...plan,
    problemOwnerName: plan.problemOwnerName ?? '',
    problemOwnerDescription: plan.problemOwnerDescription ?? '',
    participantCount: plan.participantCount ?? DEFAULT_PARTICIPANT_COUNT,
  }
}

/**
 * v1 implementation of Repository, backed by localStorage. A v2 backend
 * implementation (REST/tRPC/whatever) implements the same Repository
 * interface — nothing above this file needs to change when that happens.
 */
export class LocalStorageRepository implements Repository {
  constructor() {
    syncSeedData()
  }

  async listTechniques(): Promise<Technique[]> {
    return read(KEYS.techniques, [])
  }

  async getTechnique(id: string): Promise<Technique | undefined> {
    const all = await this.listTechniques()
    return all.find((t) => t.id === id)
  }

  async saveTechnique(technique: Technique): Promise<void> {
    const all = await this.listTechniques()
    const idx = all.findIndex((t) => t.id === technique.id)
    if (idx >= 0) all[idx] = technique
    else all.push(technique)
    write(KEYS.techniques, all)
  }

  async deleteTechnique(id: string): Promise<void> {
    const all = await this.listTechniques()
    write(
      KEYS.techniques,
      all.filter((t) => t.id !== id),
    )
  }

  async listPlans(): Promise<SessionPlan[]> {
    return read<SessionPlan[]>(KEYS.plans, []).map(normalizePlan)
  }

  async getPlan(id: string): Promise<SessionPlan | undefined> {
    const all = await this.listPlans()
    return all.find((p) => p.id === id)
  }

  async savePlan(plan: SessionPlan): Promise<void> {
    const all = await this.listPlans()
    const idx = all.findIndex((p) => p.id === plan.id)
    if (idx >= 0) all[idx] = plan
    else all.push(plan)
    write(KEYS.plans, all)
  }

  async deletePlan(id: string): Promise<void> {
    const all = await this.listPlans()
    write(
      KEYS.plans,
      all.filter((p) => p.id !== id),
    )
  }

  async listInstances(): Promise<TechniqueInstance[]> {
    return read(KEYS.instances, [])
  }

  async getInstance(id: string): Promise<TechniqueInstance | undefined> {
    const all = await this.listInstances()
    return all.find((i) => i.id === id)
  }

  async saveInstance(instance: TechniqueInstance): Promise<void> {
    const all = await this.listInstances()
    const idx = all.findIndex((i) => i.id === instance.id)
    if (idx >= 0) all[idx] = instance
    else all.push(instance)
    write(KEYS.instances, all)
  }

  async deleteInstance(id: string): Promise<void> {
    const all = await this.listInstances()
    write(
      KEYS.instances,
      all.filter((i) => i.id !== id),
    )
  }
}
