const UNITS: [number, string][] = [
  [60, 'minute'],
  [60 * 24, 'hour'],
  [60 * 24 * 7, 'day'],
  [60 * 24 * 30, 'week'],
]

// "just now", "5 minutes ago", "3 days ago", ... older than ~30 days falls back to a date
export const formatRelative = (iso: string): string => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'

  const divisors = [1, 60, 60 * 24, 60 * 24 * 7]
  for (let i = 0; i < UNITS.length; i++) {
    if (minutes < UNITS[i][0]) {
      const value = Math.floor(minutes / divisors[i])
      return `${value} ${UNITS[i][1]}${value === 1 ? '' : 's'} ago`
    }
  }
  return new Date(iso).toLocaleDateString()
}
