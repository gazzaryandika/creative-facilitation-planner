import type { MaterialLine, Stage, TechniqueInstance } from './models'
import retired from './seed/retiredTechniques.json'

interface RetiredTechnique {
  name: string
  stage: Stage
  description: string
  materialItems?: MaterialLine[]
  materialsNote?: string
}

const RETIRED = retired as Record<string, RetiredTechnique>

/**
 * The library holds book techniques only. Steps saved before the team's own techniques
 * were removed still point at them; this turns each such step into a write-your-own
 * step with the same name, stage, description and materials, keeping anything the
 * plan had already overridden. Steps pointing at anything else are left alone.
 */
export function retireRemovedTechniques(instances: TechniqueInstance[]): TechniqueInstance[] {
  return instances.map((inst) => {
    const old = inst.techniqueId ? RETIRED[inst.techniqueId] : undefined
    if (!old) return inst
    const { techniqueId: _dropped, ...rest } = inst
    return {
      ...rest,
      customName: old.name,
      stage: inst.stage ?? old.stage,
      description: inst.description ?? old.description,
      materialItems: inst.materialItems ?? old.materialItems ?? [],
      materialsNote: inst.materialsNote ?? old.materialsNote ?? '',
    }
  })
}
