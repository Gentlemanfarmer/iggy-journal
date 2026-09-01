import { useState, useCallback } from 'react'
import { useToast } from '../context/ToastContext'

export function useAsyncWithToast() {
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const execute = useCallback(
    async (asyncFn, options = {}) => {
      const { showSuccess = true, successMsg = 'Erfolgreich gespeichert' } = options

      setLoading(true)
      try {
        const result = await asyncFn()
        if (showSuccess) {
          addToast(successMsg, 'success')
        }
        return result
      } catch (err) {
        const errorMsg = err.message || 'Ein Fehler ist aufgetreten'
        addToast(errorMsg, 'error')
        console.error('Operation failed:', err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [addToast],
  )

  return { loading, execute }
}
