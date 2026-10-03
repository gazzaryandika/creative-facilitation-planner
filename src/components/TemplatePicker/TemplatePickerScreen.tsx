import { Copy, FilePlus, FolderOpen, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { instanceMap, planTotalMinutes } from '../../lib/planMath'
import { relativeTime } from '../../lib/relativeTime'
import { usePlannerStore } from '../../store/usePlannerStore'

interface TemplatePickerScreenProps {
  /** 'edit' for a freshly cloned/blank plan (nothing to look at yet); 'view' for opening an existing one. */
  onPlanReady: (planId: string, mode: 'edit' | 'view') => void
}

export function TemplatePickerScreen({ onPlanReady }: TemplatePickerScreenProps) {
  const plans = usePlannerStore((s) => s.plans)
  const allInstances = usePlannerStore((s) => s.instances)
  const cloneTemplate = usePlannerStore((s) => s.cloneTemplate)
  const createBlankPlan = usePlannerStore((s) => s.createBlankPlan)
  const deletePlan = usePlannerStore((s) => s.deletePlan)
  const [busy, setBusy] = useState<string | null>(null)

  const templates = plans.filter((p) => p.isSeedTemplate)
  const savedPlans = useMemo(
    () =>
      plans
        .filter((p) => !p.isSeedTemplate)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [plans],
  )
  const instances = useMemo(() => instanceMap(allInstances), [allInstances])
  const isPending = (description?: string) => description?.startsWith('PENDING')

  async function handleClone(templateId: string, templateName: string) {
    setBusy(templateId)
    try {
      const defaultName = `${templateName} (copy)`
      const entered = window.prompt('Name this plan', defaultName)?.trim()
      const newPlanId = await cloneTemplate(templateId, entered || defaultName)
      onPlanReady(newPlanId, 'edit')
    } finally {
      setBusy(null)
    }
  }

  async function handleBlank() {
    setBusy('blank')
    try {
      const defaultName = 'New session plan'
      const entered = window.prompt('Name this plan', defaultName)?.trim()
      const newPlanId = await createBlankPlan(entered || defaultName)
      onPlanReady(newPlanId, 'edit')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(planId: string, planName: string) {
    if (!window.confirm(`Delete "${planName}"? This can't be undone.`)) return
    await deletePlan(planId)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {savedPlans.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900">Your plans</h2>
          <p className="mt-1 text-sm text-stone-500">
            Every change saves automatically — pick up any of these where you left off.
          </p>
          <div className="mt-4 space-y-3">
            {savedPlans.map((p) => {
              const total = planTotalMinutes(p, instances)
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-900">{p.name}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      Updated {relativeTime(p.updatedAt)} · {total}
                      {p.targetLengthMinutes > 0 ? ` / ${p.targetLengthMinutes}` : ''} min
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      className="rounded-md p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlanReady(p.id, 'view')}
                      className="flex items-center gap-1.5 rounded-md bg-stone-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                    >
                      <FolderOpen size={14} />
                      Open
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Start a session plan</h1>
      <p className="mt-1 text-sm text-stone-500">
        Clone a seed template to start from its structure and techniques, or start blank from
        the base framework alone.
      </p>

      <div className="mt-5 space-y-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-stone-900">{t.name}</p>
              <p className="mt-1 text-sm text-stone-500">{t.description}</p>
              {isPending(t.description) && (
                <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Placeholder — no real content yet
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={busy === t.id}
              onClick={() => handleClone(t.id, t.name)}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
            >
              <Copy size={14} />
              {busy === t.id ? 'Cloning…' : 'Clone'}
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-stone-300 bg-white p-4">
          <div>
            <p className="font-semibold text-stone-900">Blank plan</p>
            <p className="mt-1 text-sm text-stone-500">
              Six empty sections from the base framework. Add every technique instance by hand.
            </p>
          </div>
          <button
            type="button"
            disabled={busy === 'blank'}
            onClick={handleBlank}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            <FilePlus size={14} />
            {busy === 'blank' ? 'Creating…' : 'Start blank'}
          </button>
        </div>
      </div>
    </div>
  )
}
