import type { SessionPlan, Technique, TechniqueInstance } from './models'

/**
 * Data-access contract for the app. v1 implements this against localStorage
 * (see localStorageRepository.ts). A v2 backend implements the same interface
 * against a real API — components and the Zustand store only ever talk to
 * this interface, so swapping the implementation is not a rewrite.
 */
export interface Repository {
  listTechniques(): Promise<Technique[]>
  getTechnique(id: string): Promise<Technique | undefined>
  saveTechnique(technique: Technique): Promise<void>
  deleteTechnique(id: string): Promise<void>

  listPlans(): Promise<SessionPlan[]>
  getPlan(id: string): Promise<SessionPlan | undefined>
  savePlan(plan: SessionPlan): Promise<void>
  deletePlan(id: string): Promise<void>

  listInstances(): Promise<TechniqueInstance[]>
  getInstance(id: string): Promise<TechniqueInstance | undefined>
  saveInstance(instance: TechniqueInstance): Promise<void>
  deleteInstance(id: string): Promise<void>
}
