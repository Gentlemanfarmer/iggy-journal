import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { categories, categoryColors, getCategoryLabel } from '../lib/categories'
import { useAsyncOperation } from '../hooks/useAsyncOperation'

export default function JournalView() {
  const [entries, setEntries] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const { loading, error, execute, clearError } = useAsyncOperation()
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    await execute(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    })
  }

  const filteredEntries = selectedCategory
    ? entries.filter((e) => e.category === selectedCategory)
    : entries

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const dateStr = entry.date
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(entry)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedEntries).sort().reverse()

  const handleDelete = async (id) => {
    if (!confirm('Eintrag löschen?')) return

    setDeleting(id)
    try {
      const { error } = await supabase.from('entries').delete().eq('id', id)
      if (error) throw error
      await fetchEntries()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">❌ {error}</p>
          <button
            onClick={clearError}
            className="text-xs text-red-600 hover:text-red-800 mt-1"
          >
            Schließen
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`whitespace-nowrap rounded px-3 py-1 text-sm font-medium transition ${
            selectedCategory === null
              ? 'bg-teal text-paper'
              : 'bg-gray-200 text-teal hover:bg-gray-300'
          }`}
        >
          Alle
        </button>
        {Object.keys(categories).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap rounded px-3 py-1 text-sm font-medium transition ${
              selectedCategory === cat
                ? `${categoryColors[cat]}`
                : 'bg-gray-200 text-teal hover:bg-gray-300'
            }`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Zeitstrahl */}
      {loading ? (
        <p className="text-sm text-teal/60">Lädt...</p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-sm text-teal/60">Keine Einträge</p>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="mb-2 text-sm font-semibold text-chestnut">{date}</h3>
              <div className="space-y-2">
                {groupedEntries[date].map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded border border-teal/20 bg-white p-3"
                  >
                    <div className={`mt-0.5 rounded px-2 py-0.5 text-xs font-medium ${categoryColors[entry.category]}`}>
                      {entry.subtype}
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.note && <p className="text-sm text-teal">{entry.note}</p>}
                      {entry.value && (
                        <p className="text-xs text-chestnut">
                          {entry.value} {entry.category === 'Gewicht' ? 'kg' : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deleting === entry.id ? '...' : '✕'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
