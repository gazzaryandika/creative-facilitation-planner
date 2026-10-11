import { NotebookPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LibraryScreen } from './components/Library/LibraryScreen'
import { SessionBuilderScreen } from './components/SessionBuilder/SessionBuilderScreen'
import { SessionViewScreen } from './components/SessionView/SessionViewScreen'
import { TemplatePickerScreen } from './components/TemplatePicker/TemplatePickerScreen'
import { usePlannerStore } from './store/usePlannerStore'

type View = 'templates' | 'library' | 'view' | 'builder'

function NavTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-teal-700 text-white'
          : disabled
            ? 'cursor-not-allowed text-stone-300'
            : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  )
}

function App() {
  const { loaded, activePlanId, loadAll, setActivePlan, plans } = usePlannerStore()
  const [view, setView] = useState<View>('templates')

  useEffect(() => {
    loadAll()
  }, [loadAll])

  if (!loaded) {
    return <div className="p-8 text-stone-500">Loading seed data…</div>
  }

  const activePlan = plans.find((p) => p.id === activePlanId)

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={() => setView('templates')}
            className="flex items-center gap-2 rounded-md py-0.5 pr-1 hover:opacity-80"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700 text-white">
              <NotebookPen size={15} strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight text-stone-900">
              Creative Facilitation Session Planner
            </span>
          </button>
          <nav className="flex gap-1">
            <NavTab active={view === 'templates'} onClick={() => setView('templates')}>
              Templates
            </NavTab>
            <NavTab active={view === 'library'} onClick={() => setView('library')}>
              Library
            </NavTab>
            <NavTab
              active={view === 'builder' || view === 'view'}
              disabled={!activePlan}
              onClick={() => setView('view')}
            >
              {activePlan ? activePlan.name : 'Open a plan'}
            </NavTab>
          </nav>
        </div>
      </header>

      <main>
        {view === 'templates' && (
          <TemplatePickerScreen
            onPlanReady={(planId, mode) => {
              setActivePlan(planId)
              setView(mode === 'edit' ? 'builder' : 'view')
            }}
          />
        )}
        {view === 'library' && <LibraryScreen />}
        {view === 'view' && activePlanId && (
          <SessionViewScreen
            planId={activePlanId}
            onEdit={() => setView('builder')}
          />
        )}
        {view === 'builder' && activePlanId && (
          <SessionBuilderScreen planId={activePlanId} onDone={() => setView('view')} />
        )}
      </main>
    </div>
  )
}

export default App
