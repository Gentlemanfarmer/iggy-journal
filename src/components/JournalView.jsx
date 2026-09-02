import { useState, useMemo, memo } from 'react'
import { categories, categoryColors, getCategoryLabel } from '../lib/categories'
import { formatDateSmart } from '../lib/dates'
import { useFetchEntries } from '../hooks/useFetchEntries'
import { useToast } from '../context/ToastContext'
import { groupEntriesByDate } from '../utils/memoize'

function JournalViewComponent() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [incidentFilter, setIncidentFilter] = useState(null)
  const { entries, loading, error, hasMore, loadMore, deleteEntry } = useFetchEntries()
  const { addToast } = useToast()

  const filteredEntries = useMemo(() => {
    let filtered = entries
    if (selectedCategory) filtered = filtered.filter((e) => e.category === selectedCategory)
    if (incidentFilter) filtered = filtered.filter((e) => e.incident_tag === incidentFilter)
    return filtered
  }, [entries, selectedCategory, incidentFilter])

  const groupedEntries = useMemo(
    () => groupEntriesByDate(filteredEntries),
    [filteredEntries],
  )

  const sortedDates = Object.keys(groupedEntries).sort().reverse()

  const handleDelete = async (id) => {
    if (!confirm('Eintrag löschen?')) return
    try {
      await deleteEntry(id)
      addToast('Eintrag gelöscht', 'success')
    } catch (err) {
      addToast(`Fehler beim Löschen: ${err.message}`, 'error')
    }
  }

  const isPdf = (url) => url?.toLowerCase().endsWith('.pdf')

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

      {/* Incident Filter */}
      {incidentFilter && (
        <div className="flex items-center gap-2 rounded bg-amber-50 border border-amber-200 px-3 py-1.5">
          <span className="text-xs text-amber-700">Vorfall: <strong>{incidentFilter}</strong></span>
          <button
            onClick={() => setIncidentFilter(null)}
            className="text-xs text-amber-500 hover:text-amber-700"
          >
            ✕ Filter aufheben
          </button>
        </div>
      )}

      {/* Zeitstrahl */}
      {loading ? (
        <p className="text-sm text-teal/60">Lädt...</p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-sm text-teal/60">Keine Einträge</p>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="mb-2 text-sm font-semibold text-chestnut">
                {formatDateSmart(date)}
              </h3>
              <div className="space-y-2">
                {groupedEntries[date].map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded border border-teal/20 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${categoryColors[entry.category]}`}>
                        {entry.subtype}
                      </span>
                      {entry.incident_tag && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setIncidentFilter(entry.incident_tag)
                            setSelectedCategory(null)
                          }}
                          className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-200 transition"
                        >
                          {entry.incident_tag}
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.note && <p className="text-sm text-teal">{entry.note}</p>}
                      {entry.value && (
                        <p className="text-xs text-chestnut">
                          {entry.value} {entry.category === 'Gewicht' ? 'kg' : ''}
                        </p>
                      )}
                      {entry.photo_url && (
                        <a
                          href={entry.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block"
                        >
                          {isPdf(entry.photo_url) ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                              PDF ansehen
                            </span>
                          ) : (
                            <img
                              src={entry.photo_url}
                              alt=""
                              className="h-12 w-12 rounded object-cover border border-teal/20"
                            />
                          )}
                        </a>
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

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full rounded border border-teal py-2 text-sm text-teal hover:bg-teal/5 disabled:opacity-50 transition"
            >
              {loading ? 'Lädt...' : 'Mehr laden'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(JournalViewComponent)
