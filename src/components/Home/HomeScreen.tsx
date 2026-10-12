import { ArrowRight, BookOpen, CalendarClock, ChevronRight, Library, ListChecks, PlayCircle } from 'lucide-react'
import type { DiamondPhase } from '../../data/models'
import { STAGE_STYLES } from '../../lib/stageStyles'
import { usePlannerStore } from '../../store/usePlannerStore'

interface HomeScreenProps {
  onStartPlanning: () => void
  onOpenLibrary: () => void
  onOpenPlan: (planId: string) => void
}

const DIAMONDS: { phase: DiamondPhase; question: string; color: string }[] = [
  { phase: 'Problem Finding', question: 'What is the real problem?', color: 'border-rose-300 bg-rose-50 text-rose-800' },
  { phase: 'Idea Finding', question: 'What could we do about it?', color: 'border-orange-300 bg-orange-50 text-orange-800' },
  { phase: 'Solution Finding', question: 'Which ideas are worth building?', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
]

const STAGES: { stage: 'Diverging' | 'Reverging' | 'Converging'; what: string; rule: string }[] = [
  { stage: 'Diverging', what: 'Generate as many options as possible.', rule: 'Postpone judgment: quantity breeds quality, hitchhike, freewheel.' },
  { stage: 'Reverging', what: 'Revisit, explain and rearrange the options.', rule: 'Use the inquiring mind: be jointly active, listen, move around.' },
  { stage: 'Converging', what: 'Select the options worth taking forward.', rule: 'Affirmative judgment: protect originality, trust your gut, keep action in mind.' },
]

const ROLES = [
  {
    role: 'Problem owner',
    short: 'PO',
    text: 'Brings the problem and decides what happens with the outcome. Owns the content decisions.',
  },
  {
    role: 'Resource group',
    short: 'RG',
    text: 'Usually 5 to 8 people with varied backgrounds who generate and develop the options.',
  },
  {
    role: 'Facilitator',
    short: 'You',
    text: 'Designs and runs the process: picks the techniques, guards time and energy, and stays out of content decisions.',
  },
]

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">{title}</h2>
    </>
  )
}

export function HomeScreen({ onStartPlanning, onOpenLibrary, onOpenPlan }: HomeScreenProps) {
  const plans = usePlannerStore((s) => s.plans)
  const techniqueCount = usePlannerStore((s) => s.techniques.length)
  const latest = plans
    .filter((p) => !p.isSeedTemplate)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  return (
    <div>
      {/* What this is */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            IDEM104 Creative Facilitation · TU Delft
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Plan and run creative facilitation sessions, step by step.
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-stone-600">
            Build a timed session plan from the techniques in the <em>Road Map for Creative Problem Solving
            Techniques</em>, keep track of what to prepare, share the plan with your co-facilitator, and run it live
            with a timer in the room.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartPlanning}
              className="flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
            >
              Start planning
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <Library size={16} />
              Browse the {techniqueCount} techniques
            </button>
          </div>
          {latest && (
            <button
              type="button"
              onClick={() => onOpenPlan(latest.id)}
              className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
            >
              Continue “{latest.name}”
              <ChevronRight size={15} />
            </button>
          )}

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: BookOpen, title: 'Techniques from the book', text: 'Every technique with its steps, tips, materials and when to use it.' },
              { icon: ListChecks, title: 'Timed plans', text: 'Sections from the introduction to the wrap-up, with a time budget and a bill of materials.' },
              { icon: PlayCircle, title: 'Run it live', text: 'A timer that follows your plan and shows when a step runs over.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">{title}</p>
                  <p className="mt-0.5 text-sm text-stone-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-14 sm:px-6">
        {/* What is creative facilitation */}
        <section>
          <SectionHeading eyebrow="The basics" title="What is creative facilitation?" />
          <div className="mt-4 grid gap-8 md:grid-cols-2">
            <div className="space-y-3 font-serif text-[17px] leading-relaxed text-stone-700">
              <p>
                Creative facilitation means guiding a group through a structured creative process, so that together
                they find new and useful answers to someone else's problem.
              </p>
              <p>
                The key idea is a split of responsibilities: the <strong>group owns the content</strong>, the{' '}
                <strong>facilitator owns the process</strong>. The facilitator doesn't solve the problem; they choose
                the right technique for each moment, keep the group in the right mindset, and make sure the result ends
                up with the person who has to act on it.
              </p>
            </div>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <div key={r.role} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white">
                    {r.short}
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">{r.role}</p>
                    <p className="mt-0.5 text-sm text-stone-600">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section>
          <SectionHeading eyebrow="The process" title="How does it work?" />
          <p className="mt-3 max-w-3xl font-serif text-[17px] leading-relaxed text-stone-700">
            The Delft approach, <strong>integrated Creative Problem Solving (iCPS)</strong>, moves a session through
            three phases. The problem owner arrives with a <em>Problem as Given</em>; the group reframes it into a{' '}
            <em>Problem as Posed</em> that's clear enough to solve, then finds and develops ideas for it.
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            {DIAMONDS.map((d, i) => (
              <div key={d.phase} className="flex flex-1 flex-col items-center gap-2 md:flex-row">
                <div className={`w-full flex-1 rounded-xl border-2 p-4 text-center ${d.color}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Phase {i + 1}</p>
                  <p className="mt-0.5 text-lg font-bold">{d.phase}</p>
                  <p className="mt-1 text-sm opacity-90">{d.question}</p>
                </div>
                {i < DIAMONDS.length - 1 && (
                  <ArrowRight size={20} className="shrink-0 rotate-90 text-stone-400 md:rotate-0" />
                )}
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-3xl font-serif text-[17px] leading-relaxed text-stone-700">
            Each phase is a <strong>creative diamond</strong>: the group first opens up, then makes sense of what it
            has, then narrows down. Each stage has its own mindset and ground rules, and mixing them up (judging ideas
            while generating them, for example) is what kills creativity in ordinary meetings.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {STAGES.map((s, i) => (
              <div key={s.stage} className="rounded-xl border border-stone-200 bg-white p-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_STYLES[s.stage].bg} ${STAGE_STYLES[s.stage].text}`}
                >
                  {i + 1}. {s.stage}
                </span>
                <p className="mt-2 font-semibold text-stone-900">{s.what}</p>
                <p className="mt-1 text-sm text-stone-500">{s.rule}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
            <p className="font-semibold text-stone-900">Around the three phases</p>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
              <li>
                <strong className="text-stone-800">Acceptance Finding</strong>: getting the ideas accepted by the
                people who must adopt them (for example Force Field Analysis, Devil's and Angel's Advocates).
              </li>
              <li>
                <strong className="text-stone-800">Information Finding</strong>: collecting what nobody in the room
                knows, to find out after the session (for example the Parking Lot).
              </li>
              <li>
                <strong className="text-stone-800">Project management</strong>: the session as a project in its own
                right, from the intake with the problem owner to the room, materials and report.
              </li>
            </ul>
          </div>
        </section>

        {/* Purpose */}
        <section>
          <SectionHeading eyebrow="Why bother" title="What is it for?" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['Beyond the first idea', 'Groups tend to grab the first obvious answer. A structured process pushes past it to options nobody would have found alone.'],
              ['Wild ideas survive', 'Separating generating from judging gives unusual ideas a chance before anyone shoots them down.'],
              ['Everyone contributes', 'Techniques like silent brainwriting give quiet people the same voice as the loudest in the room.'],
              ['Ready to act on', 'A session ends with ideas the problem owner understands, supports and knows how to take forward.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="font-semibold text-stone-900">{title}</p>
                <p className="mt-1 text-sm text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Source */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <SectionHeading eyebrow="Source" title="Based on the Road Map book" />
          <p className="mt-3 max-w-3xl font-serif text-[17px] leading-relaxed text-stone-700">
            The techniques, phases and ground rules in this planner come from{' '}
            <em>Road Map for Creative Problem Solving Techniques: Organizing and facilitating group sessions</em> by
            Heijne and van der Meer (Boom, 2019), the course book for IDEM104 Creative Facilitation at TU Delft's
            Faculty of Industrial Design Engineering. Technique descriptions are summaries, with a page reference to the
            book on each; the photos are from the book. For the full text, see the book.
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-stone-500">
            <CalendarClock size={15} />
            Built as a student project for IDEM104, 2026.
          </p>
        </section>

        <div className="flex flex-col items-center gap-3 pb-6 text-center">
          <p className="text-lg font-semibold text-stone-900">Ready to plan a session?</p>
          <button
            type="button"
            onClick={onStartPlanning}
            className="flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
          >
            Start planning
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
