import { useRef, useEffect } from 'react'

const globalCache = new Map()

export function useQueryCache() {
  const requestsInFlight = useRef(new Map())

  const cachedFetch = async (key, fetchFn, ttl = 60000) => {
    // Check if request is already in flight
    if (requestsInFlight.current.has(key)) {
      return requestsInFlight.current.get(key)
    }

    // Check cache
    const cached = globalCache.get(key)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return Promise.resolve(cached.data)
    }

    // Fetch and cache
    const promise = fetchFn()
      .then((data) => {
        globalCache.set(key, { data, timestamp: Date.now() })
        requestsInFlight.current.delete(key)
        return data
      })
      .catch((err) => {
        requestsInFlight.current.delete(key)
        throw err
      })

    requestsInFlight.current.set(key, promise)
    return promise
  }

  const invalidateCache = (pattern) => {
    if (!pattern) {
      globalCache.clear()
      return
    }

    for (const key of globalCache.keys()) {
      if (key.includes(pattern)) {
        globalCache.delete(key)
      }
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
    }
  }, [])

  return { cachedFetch, invalidateCache }
}
