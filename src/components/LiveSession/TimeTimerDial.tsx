interface TimeTimerDialProps {
  totalSeconds: number
  remainingSeconds: number
  size?: number
}

function formatClock(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * A Time Timer-style countdown dial: a red wedge, measured clockwise from 12
 * o'clock, shrinks as time passes. Counts into overtime past zero rather than
 * stopping, since a facilitator running long still needs to see how long by.
 */
export function TimeTimerDial({ totalSeconds, remainingSeconds, size = 360 }: TimeTimerDialProps) {
  const overtime = remainingSeconds < 0
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0
  const sweepDeg = fraction * 360
  const innerSize = size * 0.62
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full border border-stone-300"
        style={{
          background: overtime
            ? '#fecdd3'
            : `conic-gradient(from 0deg, #ef4444 0deg ${sweepDeg}deg, #f1f5f9 ${sweepDeg}deg 360deg)`,
        }}
      />
      <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {ticks.map((deg) => {
          const rad = (deg * Math.PI) / 180
          const cx = size / 2
          const cy = size / 2
          const outerR = size / 2 - 2
          const innerR = outerR - (deg % 90 === 0 ? 14 : 8)
          const x1 = cx + outerR * Math.sin(rad)
          const y1 = cy - outerR * Math.cos(rad)
          const x2 = cx + innerR * Math.sin(rad)
          const y2 = cy - innerR * Math.cos(rad)
          return (
            <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78716c" strokeWidth={deg % 90 === 0 ? 3 : 1.5} />
          )
        })}
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center rounded-full bg-white shadow-inner"
        style={{
          width: innerSize,
          height: innerSize,
          top: (size - innerSize) / 2,
          left: (size - innerSize) / 2,
        }}
      >
        <span
          className={`font-bold tabular-nums tracking-tight ${overtime ? 'text-rose-600' : 'text-stone-900'}`}
          style={{ fontSize: innerSize * 0.26 }}
        >
          {overtime ? '+' : ''}
          {formatClock(remainingSeconds)}
        </span>
        <span className="mt-1 text-sm font-medium uppercase tracking-wide text-stone-400">
          {overtime ? 'over time' : 'remaining'}
        </span>
      </div>
    </div>
  )
}
