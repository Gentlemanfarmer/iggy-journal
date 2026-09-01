export function memoize(fn, keyGenerator) {
  const cache = new Map()

  return (...args) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = fn(...args)
    cache.set(key, result)

    // Limit cache size to 100 entries
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    return result
  }
}

export const groupEntriesByDate = memoize(
  (entries) => {
    return entries.reduce((acc, entry) => {
      const dateStr = entry.date
      if (!acc[dateStr]) acc[dateStr] = []
      acc[dateStr].push(entry)
      return acc
    }, {})
  },
  (entries) => entries.map((e) => e.id).join(','),
)

export const calculateDailyTotal = memoize(
  (components) => {
    return components.reduce((sum, c) => sum + (c.quantity_g || 0), 0)
  },
  (components) => components.map((c) => c.id).join(','),
)
