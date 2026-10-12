import { Copy, Eye, FilePlus, FileUp, FolderOpen, PlayCircle, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { PlanFileError, parsePlanFile } from '../../export/planFile'
import { instanceMap, planTotalMinutes } from '../../lib/planMath'
import { relativeTime } from '../../lib/relativeTime'
import { usePlannerStore } from '../../store/usePlannerStore'

interface TemplatePickerScreenProps {
  /** 'edit' for a freshly cloned/blank plan (nothing to look at yet); 'view' for opening an existing one. */
  onPlanReady: (planId: string, mode: 'edit' | 'view') => void
}

const card = 'flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm'
const primaryButton =
  'flex items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50'
const secondaryButton =
  'flex items-center justify-center gap-1.5 rounded-md border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50'

/** The "Start planning" page: three ways to begin, then the plans saved in this browser. */
export function TemplatePickerScreen({ onPlanReady }: TemplatePickerScreenProps) {
  const plans = usePlannerStore((s) => s.plans)
  const allInstances = usePlannerStore((s) => s.instances)
  const cloneTemplate = usePlannerStore((s) => s.cloneTemplate)
  const createBlankPlan = usePlannerStore((s) => s.createBlankPlan)
  const deletePlan = usePlannerStore((s) => s.deletePlan)
  const importPlanFile = usePlannerStore((s) => s.importPlanFile)
  const [busy, setBusy] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const demos = plans.filter((p) => p.isSeedTemplate)
  const savedPlans = useMemo(
    () => plans.filter((p) => !p.isSeedTemplate).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [plans],
  )
  const instances = useMemo(() => instanceMap(allInstances), [allInstances])

  async function handleClone(templateId: string, templateName: string) {
    setBusy(templateId)
    try {
      const defaultName = `${templateName.replace(/^Demo:\s*/, '')} (my copy)`
      const entered = window.prompt('Name your copy', defaultName)?.trim()
      if (entered === undefined) return
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
      if (entered === undefined) return
      const newPlanId = await createBlankPlan(entered || defaultName)
      onPlanReady(newPlanId, 'edit')
    } finally {
      setBusy(null)
    }
  }

  async function handleImport(file: File) {
    setImportError(null)
    setBusy('import')
    try {
      const planId = await importPlanFile(parsePlanFile(await file.text()))
      onPlanReady(planId, 'view')
    } catch (err) {
      setImportError(err instanceof PlanFileError ? err.message : "Couldn't import that file.")
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleDelete(planId: string, planName: string) {
    if (!window.confirm(`Delete "${planName}"? This can't be undone.`)) return
    await deletePlan(planId)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Start planning</h1>
      <p className="mt-1 text-sm text-stone-500">Look at a finished example, open a plan someone shared, or start from scratch.</p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {demos.map((d) => (
          <div key={d.id} className={`${card} border-teal-200 bg-teal-50/40`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
              <PlayCircle size={18} />
            </span>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-700">See the demo</p>
            <p className="mt-0.5 font-semibold text-stone-900">{d.name.replace(/^Demo:\s*/, '')}</p>
            <p className="mt-1 flex-1 text-sm text-stone-600">{d.description}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={() => onPlanReady(d.id, 'view')} className={primaryButton}>
                <Eye size={15} />
                Open the demo
              </button>
              <button
                type="button"
                disabled={busy === d.id}
                onClick={() => handleClone(d.id, d.name)}
                className={secondaryButton}
              >
                <Copy size={14} />
                {busy === d.id ? 'Copying…' : 'Use as a starting point'}
              </button>
            </div>
          </div>
        ))}

        <div className={card}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white">
            <FileUp size={18} />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Open a shared plan</p>
          <p className="mt-0.5 font-semibold text-stone-900">Import from .json</p>
          <p className="mt-1 flex-1 text-sm text-stone-600">
            Someone sent you a plan made with “Download .json”? Open it here. It's added as your own copy, so your
            changes don't affect theirs.
          </p>
          <button
            type="button"
            disabled={busy === 'import'}
            onClick={() => fileInput.current?.click()}
            className={`mt-4 ${secondaryButton}`}
          >
            <FileUp size={14} />
            {busy === 'import' ? 'Importing…' : 'Choose a file'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
            }}
          />
          {importError && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{importError}</p>}
        </div>

        <div className={card}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white">
            <FilePlus size={18} />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">From scratch</p>
          <p className="mt-0.5 font-semibold text-stone-900">Start from blank</p>
          <p className="mt-1 flex-1 text-sm text-stone-600">
            Empty sections from Introduction to Wrap Up. Fill in the brief, then add techniques from the library or
            write your own steps.
          </p>
          <button type="button" disabled={busy === 'blank'} onClick={handleBlank} className={`mt-4 ${secondaryButton}`}>
            <FilePlus size={14} />
            {busy === 'blank' ? 'Creating…' : 'Start blank'}
          </button>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-stone-900">Your plans</h2>
        <p className="mt-1 text-sm text-stone-500">
          Saved in this browser and every change saves automatically. To use a plan on another computer, open it and
          press “Download .json”.
        </p>
        {savedPlans.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-400">
            No plans yet. Start one above.
          </p>
        ) : (
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
        )}
      </section>
    </div>
  )
}
