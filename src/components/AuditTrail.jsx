import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateDE } from '../lib/dates'

export default function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, INSERT, UPDATE, DELETE

  useEffect(() => {
    fetchAuditLogs()
  }, [filter])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('operation', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const operationColor = (op) => {
    if (op === 'INSERT') return 'bg-green-100 text-green-800'
    if (op === 'UPDATE') return 'bg-blue-100 text-blue-800'
    if (op === 'DELETE') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const operationLabel = (op) => {
    if (op === 'INSERT') return '✚ Erstellt'
    if (op === 'UPDATE') return '✎ Bearbeitet'
    if (op === 'DELETE') return '✕ Gelöscht'
    return op
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-teal/60">Alle Änderungen an deinen Einträgen (letzte 50):</p>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'INSERT', 'UPDATE', 'DELETE'].map((op) => (
          <button
            key={op}
            onClick={() => setFilter(op)}
            className={`text-xs px-3 py-1 rounded transition ${
              filter === op
                ? 'bg-teal text-paper'
                : 'bg-gray-200 text-teal hover:bg-gray-300'
            }`}
          >
            {op === 'all' ? 'Alle' : operationLabel(op)}
          </button>
        ))}
      </div>

      {/* Logs */}
      {loading ? (
        <p className="text-sm text-teal/60">Lädt...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-teal/60">Keine Einträge gefunden</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border-l-4 border-teal/30 bg-white p-3 rounded text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${operationColor(log.operation)}`}>
                  {operationLabel(log.operation)}
                </span>
                <span className="text-xs text-teal/60">{formatDate(log.timestamp)}</span>
              </div>

              {/* Changed fields */}
              {log.operation === 'UPDATE' && log.old_values && log.new_values && (
                <div className="text-xs text-teal/70 mt-2 space-y-1">
                  {Object.keys(log.new_values || {}).map((key) => {
                    const oldVal = log.old_values?.[key]
                    const newVal = log.new_values?.[key]
                    if (oldVal === newVal || key === 'created_at' || key === 'id' || key === 'user_id') return null
                    return (
                      <div key={key}>
                        <strong>{key}:</strong> "{oldVal}" → "{newVal}"
                      </div>
                    )
                  })}
                </div>
              )}

              {log.operation === 'DELETE' && log.old_values && (
                <div className="text-xs text-teal/70 mt-2">
                  <strong>Gelöscht:</strong> {log.old_values.category} - {log.old_values.subtype} ({formatDateDE(log.old_values.date)})
                </div>
              )}

              {log.operation === 'INSERT' && log.new_values && (
                <div className="text-xs text-teal/70 mt-2">
                  <strong>Neu:</strong> {log.new_values.category} - {log.new_values.subtype}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
