import { create } from 'zustand'
import { LocalStorageRepository } from '../data/localStorageRepository'
import type {
  SectionId,
  SessionPlan,
  Technique,
  TechniqueInstance,
} from '../data/models'
import type { Repository } from '../data/repository'
import type { PlanFile } from '../export/planFile'
import { emptySections } from '../data/models'
import { retireRemovedTechniques } from '../data/retiredTechniques'

// Swap this one line for a backend-backed Repository implementation in v2.
const repository: Repository = new LocalStorageRepository()

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

interface PlannerState {
  loaded: boolean
  techniques: Technique[]
  plans: SessionPlan[]
  instances: TechniqueInstance[]
  activePlanId: string | null

  loadAll: () => Promise<void>

  cloneTemplate: (templateId: string, newName: string) => Promise<string>
  /** Adds a plan from a shared plan file as a new, independent copy. Returns its id. */
  importPlanFile: (file: PlanFile) => Promise<string>
  createBlankPlan: (name: string) => Promise<string>
  deletePlan: (planId: string) => Promise<void>
  setActivePlan: (planId: string | null) => void
  updatePlanMeta: (
    planId: string,
    patch: Partial<
      Pick<
        SessionPlan,
        | 'name'
        | 'targetLengthMinutes'
        | 'participantCount'
        | 'problemOwnerName'
        | 'problemOwnerDescription'
        | 'problemAsGiven'
        | 'introduction'
      >
    >,
  ) => Promise<void>

  /**
   * Places a step the user has already reviewed in the edit modal — either drawn
   * from the library (techniqueId set) or written from scratch (customName set).
   */
  addInstanceToSection: (
    planId: string,
    sectionId: SectionId,
    draft: Omit<TechniqueInstance, 'id'>,
  ) => Promise<void>
  updateInstance: (
    instanceId: string,
    patch: Partial<
      Pick<
        TechniqueInstance,
        | 'actualMinutes'
        | 'facilitatorNotes'
        | 'materialItems'
        | 'materialsNote'
        | 'description'
        | 'customName'
        | 'stage'
      >
    >,
  ) => Promise<void>
  removeInstanceFromSection: (
    planId: string,
    sectionId: SectionId,
    instanceId: string,
  ) => Promise<void>
  reorderWithinSection: (
    planId: string,
    sectionId: SectionId,
    orderedInstanceIds: string[],
  ) => Promise<void>
  moveInstanceAcrossSections: (
    planId: string,
    fromSectionId: SectionId,
    toSectionId: SectionId,
    instanceId: string,
    toIndex: number,
  ) => Promise<void>
}

export const usePlannerStore = create<PlannerState>((set, get) => {
  async function attachInstance(
    planId: string,
    sectionId: SectionId,
    instance: TechniqueInstance,
  ): Promise<void> {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan) throw new Error(`Plan ${planId} not found`)

    const updatedPlan: SessionPlan = {
      ...plan,
      sections: {
        ...plan.sections,
        [sectionId]: [...plan.sections[sectionId], instance.id],
      },
      updatedAt: new Date().toISOString(),
    }

    await repository.saveInstance(instance)
    await repository.savePlan(updatedPlan)
    set((state) => ({
      instances: [...state.instances, instance],
      plans: state.plans.map((p) => (p.id === planId ? updatedPlan : p)),
    }))
  }

  return {
  loaded: false,
  techniques: [],
  plans: [],
  instances: [],
  activePlanId: null,

  loadAll: async () => {
    const [techniques, plans, instances] = await Promise.all([
      repository.listTechniques(),
      repository.listPlans(),
      repository.listInstances(),
    ])
    set({ techniques, plans, instances, loaded: true })
  },

  cloneTemplate: async (templateId, newName) => {
    const source = get().plans.find((p) => p.id === templateId)
    if (!source) throw new Error(`Template ${templateId} not found`)

    const idMap = new Map<string, string>()
    const sourceInstances = get().instances.filter((i) =>
      Object.values(source.sections).some((ids) => ids.includes(i.id)),
    )
    const clonedInstances: TechniqueInstance[] = sourceInstances.map((inst) => {
      const clonedId = newId('instance')
      idMap.set(inst.id, clonedId)
      return { ...inst, id: clonedId }
    })

    const now = new Date().toISOString()
    const clonedSections = Object.fromEntries(
      Object.entries(source.sections).map(([sectionId, ids]) => [
        sectionId,
        ids.map((id) => idMap.get(id)!),
      ]),
    ) as SessionPlan['sections']

    const clonedPlan: SessionPlan = {
      ...source,
      id: newId('plan'),
      name: newName,
      isSeedTemplate: false,
      clonedFromId: source.id,
      sections: clonedSections,
      createdAt: now,
      updatedAt: now,
    }

    for (const inst of clonedInstances) await repository.saveInstance(inst)
    await repository.savePlan(clonedPlan)

    set((state) => ({
      plans: [...state.plans, clonedPlan],
      instances: [...state.instances, ...clonedInstances],
    }))
    return clonedPlan.id
  },

  importPlanFile: async (file) => {
    // Fresh ids for the plan and every step, so importing never overwrites anything
    // and the same file can be imported twice.
    const idMap = new Map<string, string>()
    const instances: TechniqueInstance[] = retireRemovedTechniques(file.instances).map((inst) => {
      const id = newId('instance')
      idMap.set(inst.id, id)
      return { ...inst, id }
    })
    const sections = emptySections()
    for (const sectionId of Object.keys(sections) as SectionId[]) {
      sections[sectionId] = (file.plan.sections?.[sectionId] ?? [])
        .map((id) => idMap.get(id))
        .filter((id): id is string => Boolean(id))
    }
    const taken = new Set(get().plans.map((p) => p.name))
    const baseName = file.plan.name || 'Imported plan'
    const now = new Date().toISOString()
    const plan: SessionPlan = {
      ...file.plan,
      id: newId('plan'),
      name: taken.has(baseName) ? `${baseName} (imported)` : baseName,
      isSeedTemplate: false,
      participantCount: file.plan.participantCount ?? 6,
      problemOwnerName: file.plan.problemOwnerName ?? '',
      problemOwnerDescription: file.plan.problemOwnerDescription ?? '',
      problemAsGiven: file.plan.problemAsGiven ?? '',
      introduction: file.plan.introduction ?? '',
      sections,
      createdAt: now,
      updatedAt: now,
    }
    for (const inst of instances) await repository.saveInstance(inst)
    await repository.savePlan(plan)
    set((state) => ({ plans: [...state.plans, plan], instances: [...state.instances, ...instances] }))
    return plan.id
  },

  createBlankPlan: async (name) => {
    const now = new Date().toISOString()
    const plan: SessionPlan = {
      id: newId('plan'),
      name,
      isSeedTemplate: false,
      targetLengthMinutes: 150,
      participantCount: 6,
      problemOwnerName: '',
      problemOwnerDescription: '',
      problemAsGiven: '',
      introduction: '',
      sections: {
        'problem-as-given': [],
        introduction: [],
        'problem-finding': [],
        'idea-finding': [],
        'solution-finding': [],
        'wrap-up': [],
      },
      createdAt: now,
      updatedAt: now,
    }
    await repository.savePlan(plan)
    set((state) => ({ plans: [...state.plans, plan] }))
    return plan.id
  },

  deletePlan: async (planId) => {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan) return
    const orphanedInstanceIds = new Set(Object.values(plan.sections).flat())

    await repository.deletePlan(planId)
    for (const instanceId of orphanedInstanceIds) await repository.deleteInstance(instanceId)

    set((state) => ({
      plans: state.plans.filter((p) => p.id !== planId),
      instances: state.instances.filter((i) => !orphanedInstanceIds.has(i.id)),
      activePlanId: state.activePlanId === planId ? null : state.activePlanId,
    }))
  },

  setActivePlan: (planId) => set({ activePlanId: planId }),

  updatePlanMeta: async (planId, patch) => {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan) return
    const updated: SessionPlan = { ...plan, ...patch, updatedAt: new Date().toISOString() }
    await repository.savePlan(updated)
    set((state) => ({
      plans: state.plans.map((p) => (p.id === planId ? updated : p)),
    }))
  },

  addInstanceToSection: async (planId, sectionId, draft) => {
    await attachInstance(planId, sectionId, { ...draft, id: newId('instance') })
  },

  updateInstance: async (instanceId, patch) => {
    const instance = get().instances.find((i) => i.id === instanceId)
    if (!instance) return
    const updated = { ...instance, ...patch }
    await repository.saveInstance(updated)
    set((state) => ({
      instances: state.instances.map((i) => (i.id === instanceId ? updated : i)),
    }))
  },

  removeInstanceFromSection: async (planId, sectionId, instanceId) => {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan) return
    const updatedPlan: SessionPlan = {
      ...plan,
      sections: {
        ...plan.sections,
        [sectionId]: plan.sections[sectionId].filter((id) => id !== instanceId),
      },
      updatedAt: new Date().toISOString(),
    }
    await repository.savePlan(updatedPlan)
    await repository.deleteInstance(instanceId)
    set((state) => ({
      plans: state.plans.map((p) => (p.id === planId ? updatedPlan : p)),
      instances: state.instances.filter((i) => i.id !== instanceId),
    }))
  },

  reorderWithinSection: async (planId, sectionId, orderedInstanceIds) => {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan) return
    const updatedPlan: SessionPlan = {
      ...plan,
      sections: { ...plan.sections, [sectionId]: orderedInstanceIds },
      updatedAt: new Date().toISOString(),
    }
    await repository.savePlan(updatedPlan)
    set((state) => ({
      plans: state.plans.map((p) => (p.id === planId ? updatedPlan : p)),
    }))
  },

  moveInstanceAcrossSections: async (planId, fromSectionId, toSectionId, instanceId, toIndex) => {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan) return
    const fromIds = plan.sections[fromSectionId].filter((id) => id !== instanceId)
    const toIds = [...plan.sections[toSectionId]]
    toIds.splice(toIndex, 0, instanceId)

    const updatedPlan: SessionPlan = {
      ...plan,
      sections: {
        ...plan.sections,
        [fromSectionId]: fromIds,
        [toSectionId]: toIds,
      },
      updatedAt: new Date().toISOString(),
    }
    await repository.savePlan(updatedPlan)
    set((state) => ({
      plans: state.plans.map((p) => (p.id === planId ? updatedPlan : p)),
    }))
  },
  }
})
