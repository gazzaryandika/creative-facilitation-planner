import { NotebookPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HomeScreen } from './components/Home/HomeScreen'
import { LibraryScreen } from './components/Library/LibraryScreen'
import { SessionBuilderScreen } from './components/SessionBuilder/SessionBuilderScreen'
import { SessionViewScreen } from './components/SessionView/SessionViewScreen'
import { TemplatePickerScreen } from './components/TemplatePicker/TemplatePickerScreen'
import { usePlannerStore } from './store/usePlannerStore'

type View = 'home' | 'start' | 'library' | 'view' | 'builder'

function NavTab({
  active,
  disabled,
  onClick,
  children,
  className = '',
}: {
  active: boolean
  disabled?: boolean
  className?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${className} shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-3 ${
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
  const { loaded, activePlanId, loadAll, setActivePlan, plans, cloneTemplate } = usePlannerStore()
  const [view, setView] = useState<View>('home')

  useEffect(() => {
    loadAll()
  }, [loadAll])

  if (!loaded) {
    return <div className="p-8 text-stone-500">Loading seed data…</div>
  }

  const activePlan = plans.find((p) => p.id === activePlanId)

  function go(next: View) {
    setView(next)
    window.scrollTo({ top: 0 })
  }

  function openPlan(planId: string, mode: 'edit' | 'view') {
    setActivePlan(planId)
    go(mode === 'edit' ? 'builder' : 'view')
  }

  // The demo is shared by everyone, so editing it starts from a personal copy instead.
  async function editActivePlan() {
    if (!activePlan) return
    if (!activePlan.isSeedTemplate) {
      go('builder')
      return
    }
    const defaultName = `${activePlan.name.replace(/^Demo:\s*/, '')} (my copy)`
    const entered = window.prompt('The demo stays as it is. Name your own copy to edit:', defaultName)?.trim()
    if (entered === undefined) return
    openPlan(await cloneTemplate(activePlan.id, entered || defaultName), 'edit')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => go('home')}
            className="flex shrink-0 items-center gap-2 rounded-md py-0.5 pr-1 hover:opacity-80"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700 text-white">
              <NotebookPen size={15} strokeWidth={2.5} />
            </span>
            <span className="hidden font-semibold tracking-tight text-stone-900 lg:inline">
              Creative Facilitation Session Planner
            </span>
            <span className="hidden font-semibold tracking-tight text-stone-900 sm:inline lg:hidden">CF Planner</span>
          </button>
          <nav className="flex min-w-0 gap-0.5 overflow-x-auto sm:gap-1">
            {/* On small screens the logo is the way home, to leave room for the other tabs. */}
            <NavTab active={view === 'home'} onClick={() => go('home')} className="hidden sm:block">
              Home
            </NavTab>
            <NavTab active={view === 'start'} onClick={() => go('start')}>
              Plans
            </NavTab>
            <NavTab active={view === 'library'} onClick={() => go('library')}>
              Library
            </NavTab>
            <NavTab
              active={view === 'builder' || view === 'view'}
              disabled={!activePlan}
              onClick={() => go('view')}
            >
              <span className="block max-w-[9rem] truncate sm:max-w-[16rem]">
                {activePlan ? activePlan.name : 'Open a plan'}
              </span>
            </NavTab>
          </nav>
        </div>
      </header>

      <main>
        {view === 'home' && (
          <HomeScreen
            onStartPlanning={() => go('start')}
            onOpenLibrary={() => go('library')}
            onOpenPlan={(planId) => openPlan(planId, 'view')}
          />
        )}
        {view === 'start' && <TemplatePickerScreen onPlanReady={openPlan} />}
        {view === 'library' && <LibraryScreen />}
        {view === 'view' && activePlanId && (
          <SessionViewScreen
            planId={activePlanId}
            onEdit={editActivePlan}
          />
        )}
        {view === 'builder' && activePlanId && (
          <SessionBuilderScreen planId={activePlanId} onDone={() => go('view')} />
        )}
      </main>
    </div>
  )
}

export default App
