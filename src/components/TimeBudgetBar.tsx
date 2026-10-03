interface TimeBudgetBarProps {
  actualMinutes: number
  targetMinutes: number
  label?: string
}

export function TimeBudgetBar({ actualMinutes, targetMinutes, label }: TimeBudgetBarProps) {
  const hasTarget = targetMinutes > 0
  const remaining = targetMinutes - actualMinutes
  const over = hasTarget && remaining < 0
  const pct = hasTarget ? Math.min(100, (actualMinutes / targetMinutes) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      {label && <span className="shrink-0 text-xs font-medium text-stone-500">{label}</span>}
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${over ? 'bg-rose-500' : 'bg-teal-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-600">
        {actualMinutes}
        {hasTarget ? ` / ${targetMinutes} min` : ' min'}
      </span>
      {hasTarget && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
            over ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
          }`}
        >
          {over ? `${-remaining} min over` : `${remaining} min left`}
        </span>
      )}
    </div>
  )
}
