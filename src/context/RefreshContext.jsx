import { createContext, useContext, useCallback, useState } from 'react'

const RefreshContext = createContext()

export function RefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback((scope = 'all') => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRefresh() {
  const context = useContext(RefreshContext)
  if (!context) {
    throw new Error('useRefresh must be used within RefreshProvider')
  }
  return context
}
