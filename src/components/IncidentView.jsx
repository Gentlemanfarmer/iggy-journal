import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { categoryColors } from '../lib/categories'
import { formatDateDE, formatDateSmart } from '../lib/dates'

export default function IncidentView() {
  const [incidents, setIncidents] = useState([])
  const [selectedTag, setSelectedTag] = useState(null)
  const [tagEntries, setTagEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data } = await supabase
        .from('entries')
        .select('incident_tag, date')
        .eq('user_id', session.user.id)
        .not('incident_tag', 'is', null)
        .order('date', { ascending: true })

      if (!data) return

      const grouped = {}
      for (const entry of data) {
        if (!grouped[entry.incident_tag]) {
          grouped[entry.incident_tag] = { count: 0, firstDate: entry.date, lastDate: entry.date }
        }
        grouped[entry.incident_tag].count++
        if (entry.date > grouped[entry.incident_tag].lastDate) {
          grouped[entry.incident_tag].lastDate = entry.date
        }
        if (entry.date < grouped[entry.incident_tag].firstDate) {
          grouped[entry.incident_tag].firstDate = entry.date
        }
      }

      setIncidents(
        Object.entries(grouped)
          .map(([tag, info]) => ({ tag, ...info }))
          .sort((a, b) => b.lastDate.localeCompare(a.lastDate)),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTag = async (tag) => {
    if (selectedTag === tag) {
      setSelectedTag(null)
      setTagEntries([])
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('incident_tag', tag)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })

    setTagEntries(data || [])
    setSelectedTag(tag)
  }

  const isPdf = (url) => url?.toLowerCase().endsWith('.pdf')

  if (loading) return <p className="text-sm text-teal/60">Lädt Vorfälle...</p>

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-teal">Vorfälle</h2>
      <p className="text-xs text-teal/60">
        Einträge kategorie-übergreifend verknüpfen. Vorfall-Stichwort beim Erstellen eines Eintrags vergeben.
      </p>

      {incidents.length === 0 ? (
        <p className="text-sm text-teal/60 italic">Noch keine Vorfälle dokumentiert</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => (
            <div key={incident.tag}>
              <button
                onClick={() => handleSelectTag(incident.tag)}
                className={`w-full rounded border p-3 text-left transition ${
                  selectedTag === incident.tag
                    ? 'border-teal bg-teal/10'
                    : 'border-teal/20 bg-white hover:border-teal/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-teal">{incident.tag}</p>
                  <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">
                    {incident.count} {incident.count === 1 ? 'Eintrag' : 'Einträge'}
                  </span>
                </div>
                <p className="text-xs text-teal/60 mt-1">
                  {formatDateDE(incident.firstDate)}
                  {incident.firstDate !== incident.lastDate && ` — ${formatDateDE(incident.lastDate)}`}
                </p>
              </button>

              {selectedTag === incident.tag && tagEntries.length > 0 && (
                <div className="ml-3 mt-2 space-y-2 border-l-2 border-teal/20 pl-3">
                  {tagEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 rounded border border-teal/20 bg-white p-3"
                    >
                      <div className={`mt-0.5 rounded px-2 py-0.5 text-xs font-medium ${categoryColors[entry.category]}`}>
                        {entry.subtype}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-teal/40">{formatDateSmart(entry.date)}</p>
                        {entry.note && <p className="text-sm text-teal">{entry.note}</p>}
                        {entry.value != null && (
                          <p className="text-xs text-chestnut">
                            {entry.value} {entry.category === 'Gewicht' ? 'kg' : ''}
                          </p>
                        )}
                        {entry.photo_url && (
                          <a href={entry.photo_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block">
                            {isPdf(entry.photo_url) ? (
                              <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">PDF ansehen</span>
                            ) : (
                              <img src={entry.photo_url} alt="" className="h-12 w-12 rounded object-cover border border-teal/20" />
                            )}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
