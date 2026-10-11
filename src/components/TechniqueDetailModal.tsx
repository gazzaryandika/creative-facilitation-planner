import { X } from 'lucide-react'
import type { Technique } from '../data/models'

interface TechniqueDetailModalProps {
  technique: Technique
  onClose: () => void
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line font-serif text-[15px] text-stone-800">{value}</dd>
    </div>
  )
}

export function TechniqueDetailModal({ technique: t, onClose }: TechniqueDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{t.name}</h3>
            <p className="text-sm text-stone-500">
              {t.stage} · {t.diamond.join(', ') || 'Outside the diamond'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {t.custom && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              Custom
            </span>
          )}
          {t.pendingTranscription && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Pending transcription
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4">
          <Field label="Section reference" value={t.sectionReference} />
          <Field label="Family of techniques" value={t.familyOfTechniques} />
          <Field label="Type of problem" value={t.typeOfProblem} />
          <Field label="Type of options" value={t.typeOfOptions} />
          <Field label="Number of options" value={t.numberOfOptions} />
          <Field
            label="Level of experience"
            value={
              t.facilitatorLevel || t.rgLevel
                ? `${t.facilitatorLevel ?? '—'} facilitator, ${t.rgLevel ?? '—'} RG`
                : undefined
            }
          />
          <Field
            label="Time"
            value={t.time ? `${t.time.minMinutes} to ${t.time.maxMinutes} minutes` : undefined}
          />
          <Field label="Fun-factor" value={t.funFactor} />
          <Field label="Excursion safety" value={t.safety ? `${t.safety} / 5` : undefined} />
          <Field label="Materials" value={t.materials} />
          <Field label="Website" value={t.website} />
        </dl>

        <div className="mt-5 space-y-4 border-t border-stone-100 pt-4">
          <Field label="Purpose" value={t.purpose} />
          <Field label="In short" value={t.inShort} />

          {t.stepByStep && t.stepByStep.length > 0 ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Step by step
              </dt>
              <ol className="mt-1 list-decimal space-y-1.5 pl-5 font-serif text-[15px] text-stone-800">
                {t.stepByStep.map((step) => (
                  <li key={step.number}>
                    {step.text}
                    {step.subPoints && step.subPoints.length > 0 && (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-stone-600">
                        {step.subPoints.map((sp, i) => (
                          <li key={i}>{sp}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Step by step
              </dt>
              <dd className="mt-0.5 text-sm italic text-amber-700">
                Not transcribed yet — see Source below before relying on this in a session.
              </dd>
            </div>
          )}

          <Field label="Tips and tricks" value={t.tipsAndTricks} />
          <Field label="Variants" value={t.variants} />
          <Field label="Background" value={t.background} />
          <Field label="Source" value={t.source} />
        </div>
      </div>
    </div>
  )
}
