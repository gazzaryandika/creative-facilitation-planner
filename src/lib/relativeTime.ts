const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function relativeTime(isoString: string): string {
  const seconds = (Date.now() - new Date(isoString).getTime()) / 1000
  if (seconds < 45) return 'just now'

  for (const [unit, secondsInUnit] of UNITS) {
    const value = Math.floor(seconds / secondsInUnit)
    if (value >= 1) return formatter.format(-value, unit)
  }
  return 'just now'
}
