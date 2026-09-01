import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncOperation } from './useAsyncOperation'

export function useFetchEntries() {
  const [entries, setEntries] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const { loading, error, execute } = useAsyncOperation()
  const pageSize = 50

  const fetchEntries = async (pageNum = 1) => {
    await execute(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const start = (pageNum - 1) * pageSize
      const end = start + pageSize

      const { data, error: err, count } = await supabase
        .from('entries')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(start, end - 1)

      if (err) throw err

      setEntries(data || [])
      setHasMore((count || 0) > end)
      setPage(pageNum)
    })
  }

  const loadMore = async () => {
    await execute(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const start = page * pageSize
      const end = start + pageSize

      const { data, error: err, count } = await supabase
        .from('entries')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(start, end - 1)

      if (err) throw err

      setEntries((prev) => [...prev, ...(data || [])])
      setHasMore((count || 0) > end)
      setPage((prev) => prev + 1)
    })
  }

  const deleteEntry = async (id) => {
    // Optimistic update
    setEntries((prev) => prev.filter((e) => e.id !== id))

    await execute(async () => {
      const { error: err } = await supabase.from('entries').delete().eq('id', id)
      if (err) {
        // Revert on error
        await fetchEntries(1)
        throw err
      }
    })
  }

  useEffect(() => {
    fetchEntries(1)
  }, [])

  return {
    entries,
    loading,
    error,
    hasMore,
    fetchEntries,
    loadMore,
    deleteEntry,
  }
}
