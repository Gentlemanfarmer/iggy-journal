import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { useRefresh } from '../context/RefreshContext'

export default function RulesEditor() {
  const { triggerRefresh } = useRefresh()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editValues, setEditValues] = useState({})
  const { execute } = useAsyncWithToast()

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      await supabase.rpc('init_user_rules')

      const { data, error } = await supabase
        .from('user_rules')
        .select('*')
        .eq('user_id', session.user.id)
        .order('category')

      if (error) throw error
      setRules(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rule) => {
    setEditing(rule.id)
    setEditValues({ ...rule })
  }

  const handleCancel = () => {
    setEditing(null)
    setEditValues({})
  }

  const handleSave = async (ruleId) => {
    await execute(
      async () => {
        const { error } = await supabase
          .from('user_rules')
          .update({
            interval_days: editValues.interval_days,
            label: editValues.label,
            enabled: editValues.enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ruleId)

        if (error) throw error
        setEditing(null)
        await fetchRules()
        triggerRefresh()
      },
      { successMsg: 'Regel gespeichert' },
    )
  }

  const handleToggle = async (rule) => {
    await execute(
      async () => {
        const { error } = await supabase
          .from('user_rules')
          .update({ enabled: !rule.enabled })
          .eq('id', rule.id)

        if (error) throw error
        await fetchRules()
        triggerRefresh()
      },
      { successMsg: rule.enabled ? 'Regel deaktiviert' : 'Regel aktiviert' },
    )
  }

  if (loading) {
    return <p className="text-sm text-teal/60">Lädt Fälligkeitsregeln...</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-teal/60">Passe die Fälligkeitsintervalle nach Bedarf an:</p>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {rules.map((rule) => (
          <div key={rule.id} className="border border-teal/20 rounded p-3 bg-white">
            {editing === rule.id ? (
              // Edit mode
              <div className="space-y-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-teal block mb-1">
                      {rule.category} - {rule.subtype}
                    </label>
                    <input
                      type="number"
                      value={editValues.interval_days}
                      onChange={(e) =>
                        setEditValues({ ...editValues, interval_days: parseInt(e.target.value) })
                      }
                      className="w-full rounded border border-teal bg-white px-2 py-1 text-sm text-teal"
                    />
                  </div>
                  <span className="text-xs text-teal/60">Tage</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(rule.id)}
                    className="flex-1 rounded bg-teal py-1 text-xs font-medium text-paper hover:bg-teal/90 transition"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 rounded bg-gray-200 py-1 text-xs font-medium text-teal hover:bg-gray-300 transition"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-teal">
                    {rule.category} - {rule.subtype}
                  </div>
                  <div className="text-xs text-teal/60">
                    Alle <strong>{rule.interval_days}</strong> Tage
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`px-2 py-1 text-xs rounded font-medium transition ${
                      rule.enabled
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {rule.enabled ? 'An' : 'Aus'}
                  </button>

                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-2 py-1 text-xs rounded font-medium bg-teal/10 text-teal hover:bg-teal/20 transition"
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>


      <p className="text-xs text-teal/50 italic">
        💡 Tipp: Im ersten Lebenjahr (bis 13.04.2027) empfehlen wir monatliches Entwurmen (30 Tage).
      </p>
    </div>
  )
}
