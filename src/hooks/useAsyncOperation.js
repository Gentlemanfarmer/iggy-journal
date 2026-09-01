import { useState, useCallback } from 'react'

export function useAsyncOperation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const execute = useCallback(async (asyncFn) => {
    setLoading(true)
    setError('')
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      const errorMsg = err.message || 'Ein Fehler ist aufgetreten'
      setError(errorMsg)
      console.error('Operation failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(''), [])

  return { loading, error, execute, clearError }
}
