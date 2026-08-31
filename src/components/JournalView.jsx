import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { categories, categoryColors, getCategoryLabel } from '../lib/categories'

export default function JournalView() {
  const [entries, setEntries] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
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
    if (confirm('Eintrag löschen?')) {
      await supabase.from('entries').delete().eq('id', id)
      fetchEntries()
    }
  }

  return (
    <div className="space-y-4">
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
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      ✕
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
