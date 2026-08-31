import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ExportData() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const exportAsCSV = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Fetch all entries for this user
      const { data: entries, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })

      if (error) throw error

      // Convert to CSV
      const headers = ['Datum', 'Kategorie', 'Subtyp', 'Notiz', 'Wert', 'Erstellt am']
      const rows = entries.map((e) => [
        e.date,
        e.category,
        e.subtype,
        e.note || '',
        e.value || '',
        new Date(e.created_at).toLocaleString('de-DE'),
      ])

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `iggy-journal-export-${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      setMessage('✅ Export erfolgreich: iggy-journal-export.csv')
    } catch (err) {
      setMessage(`❌ Export-Fehler: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const exportAsJSON = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Fetch all entries
      const { data: entries, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })

      if (error) throw error

      // Convert to JSON
      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: session.user.id,
        total_entries: entries.length,
        entries,
      }

      const json = JSON.stringify(exportData, null, 2)

      // Download
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `iggy-journal-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()

      setMessage('✅ Export erfolgreich: iggy-journal-export.json')
    } catch (err) {
      setMessage(`❌ Export-Fehler: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-teal/60">Exportiere deine Einträge als Backup:</p>

      <div className="flex gap-2">
        <button
          onClick={exportAsCSV}
          disabled={loading}
          className="flex-1 rounded bg-teal py-2 text-sm font-medium text-paper hover:bg-teal/90 disabled:opacity-50 transition"
        >
          📊 CSV exportieren
        </button>
        <button
          onClick={exportAsJSON}
          disabled={loading}
          className="flex-1 rounded bg-chestnut py-2 text-sm font-medium text-paper hover:bg-chestnut/90 disabled:opacity-50 transition"
        >
          📋 JSON exportieren
        </button>
      </div>

      {message && (
        <p className={`text-xs ${message.includes('✅') ? 'text-teal' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
