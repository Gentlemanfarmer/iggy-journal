import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function FeedingPlan() {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [message, setMessage] = useState('')
  const [newComponent, setNewComponent] = useState({ name: '', quantity_g: '', quantity_available_g: '' })

  useEffect(() => {
    fetchComponents()
  }, [])

  const fetchComponents = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('feeding_components')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at')

      if (error) throw error
      setComponents(data || [])
    } catch (err) {
      setMessage(`Fehler: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComponent = async () => {
    if (!newComponent.name || !newComponent.quantity_g || newComponent.quantity_available_g === '') {
      setMessage('❌ Bitte füllen Sie alle Felder aus')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { error } = await supabase
        .from('feeding_components')
        .insert({
          user_id: session.user.id,
          name: newComponent.name,
          quantity_g: parseInt(newComponent.quantity_g),
          quantity_available_g: parseInt(newComponent.quantity_available_g),
        })

      if (error) throw error

      setMessage('✅ Komponente hinzugefügt')
      setNewComponent({ name: '', quantity_g: '', quantity_available_g: '' })
      await fetchComponents()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`❌ Fehler: ${err.message}`)
    }
  }

  const handleEdit = (component) => {
    setEditing(component.id)
    setEditValues({ ...component })
  }

  const handleCancel = () => {
    setEditing(null)
    setEditValues({})
  }

  const handleSave = async (componentId) => {
    try {
      const { error } = await supabase
        .from('feeding_components')
        .update({
          quantity_g: editValues.quantity_g,
          quantity_available_g: editValues.quantity_available_g,
          notes: editValues.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', componentId)

      if (error) throw error

      setMessage('✅ Komponente aktualisiert')
      setEditing(null)
      await fetchComponents()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`❌ Fehler: ${err.message}`)
    }
  }

  const handleDelete = async (componentId) => {
    if (!confirm('Komponente wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('feeding_components')
        .delete()
        .eq('id', componentId)

      if (error) throw error

      setMessage('✅ Komponente gelöscht')
      await fetchComponents()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`❌ Fehler: ${err.message}`)
    }
  }

  const calculateDailyConsumption = () => {
    return components.reduce((sum, c) => sum + c.quantity_g, 0)
  }

  if (loading) {
    return <p className="text-sm text-teal/60">Lädt Fütterungsplan...</p>
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <div className="rounded border border-teal/20 bg-teal/5 p-4">
        <p className="text-xs text-teal/60">Pro Mahlzeit (3x täglich)</p>
        <p className="text-2xl font-bold text-teal">{calculateDailyConsumption()}g</p>
        <p className="text-xs text-teal/60">Täglich: ~{calculateDailyConsumption() * 3}g</p>
      </div>

      {/* Add New Component */}
      <div className="space-y-3 rounded border border-teal/20 bg-white p-4">
        <h3 className="text-sm font-semibold text-teal">Komponente hinzufügen</h3>

        <input
          type="text"
          placeholder="Name (z.B. ActivDog Wildschwein)"
          value={newComponent.name}
          onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
          className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
        />

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Menge pro Mahlzeit (g)"
            value={newComponent.quantity_g}
            onChange={(e) => setNewComponent({ ...newComponent, quantity_g: e.target.value })}
            className="flex-1 rounded border border-teal text-sm px-2 py-1 text-teal"
          />
          <input
            type="number"
            placeholder="Verfügbar (g)"
            value={newComponent.quantity_available_g}
            onChange={(e) => setNewComponent({ ...newComponent, quantity_available_g: e.target.value })}
            className="flex-1 rounded border border-teal text-sm px-2 py-1 text-teal"
          />
        </div>

        <button
          onClick={handleAddComponent}
          className="w-full rounded bg-teal py-2 text-xs font-medium text-paper hover:bg-teal/90 transition"
        >
          ➕ Hinzufügen
        </button>
      </div>

      {/* Components List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-teal">Aktuelle Zusammensetzung</h3>

        {components.length === 0 ? (
          <p className="text-sm text-teal/60 italic">Noch keine Komponenten hinzugefügt</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {components.map((component) => (
              <div key={component.id} className="border border-teal/20 rounded p-3 bg-white">
                {editing === component.id ? (
                  // Edit mode
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editValues.name}
                      disabled
                      className="w-full rounded border border-teal/50 bg-gray-100 px-2 py-1 text-xs text-teal"
                    />

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-teal/60 block mb-1">pro Mahlzeit (g)</label>
                        <input
                          type="number"
                          value={editValues.quantity_g}
                          onChange={(e) =>
                            setEditValues({ ...editValues, quantity_g: parseInt(e.target.value) })
                          }
                          className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-teal/60 block mb-1">Verfügbar (g)</label>
                        <input
                          type="number"
                          value={editValues.quantity_available_g}
                          onChange={(e) =>
                            setEditValues({ ...editValues, quantity_available_g: parseInt(e.target.value) })
                          }
                          className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(component.id)}
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
                      <p className="text-sm font-medium text-teal">{component.name}</p>
                      <p className="text-xs text-teal/60">
                        <strong>{component.quantity_g}g</strong> pro Mahlzeit
                      </p>
                      <p className="text-xs text-chestnut">
                        Verfügbar: <strong>{component.quantity_available_g}g</strong>
                      </p>
                      {component.notes && (
                        <p className="text-xs text-teal/50 mt-1 italic">💬 {component.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(component)}
                        className="px-2 py-1 text-xs rounded font-medium bg-teal/10 text-teal hover:bg-teal/20 transition"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(component.id)}
                        className="px-2 py-1 text-xs rounded font-medium bg-red-100/50 text-red-600 hover:bg-red-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {message && (
        <p className={`text-xs ${message.includes('✅') ? 'text-teal' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
