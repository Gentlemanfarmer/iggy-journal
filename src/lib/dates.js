export function formatDateDE(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

export function formatDateSmart(isoDate) {
  if (!isoDate) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(isoDate + 'T00:00:00')
  const diffMs = today - date
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}
