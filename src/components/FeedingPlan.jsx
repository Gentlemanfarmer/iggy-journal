import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { calculateDailyTotal } from '../utils/memoize'
import { formatDateDE } from '../lib/dates'
import { categoryColors } from '../lib/categories'

export default function FeedingPlan() {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [newComponent, setNewComponent] = useState({ name: '', quantity_g: '', quantity_available_g: '' })
  const [lastWeight, setLastWeight] = useState(null)
  const [futterEntries, setFutterEntries] = useState([])
  const [mealsPerDay, setMealsPerDay] = useState(() => {
    try { return parseInt(localStorage.getItem('iggy_meals_per_day') || '3') } catch { return 3 }
  })
  const { loading: saving, execute } = useAsyncWithToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: compData, error: compErr } = await supabase
        .from('feeding_components')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at')
      if (compErr) throw compErr
      setComponents(compData || [])

      const { data: weightData } = await supabase
        .from('entries')
        .select('date, value')
        .eq('user_id', session.user.id)
        .eq('category', 'Gewicht')
        .eq('subtype', 'Gewogen')
        .order('date', { ascending: false })
        .limit(1)
      if (weightData?.length > 0) setLastWeight(weightData[0])

      const { data: futterData } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('category', 'Futter')
        .order('date', { ascending: false })
        .limit(20)
      setFutterEntries(futterData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComponent = async () => {
    if (!newComponent.name || !newComponent.quantity_g || newComponent.quantity_available_g === '') return

    await execute(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('feeding_components')
          .insert({
            user_id: session.user.id,
            name: newComponent.name,
            quantity_g: parseInt(newComponent.quantity_g),
            quantity_available_g: parseInt(newComponent.quantity_available_g),
          })
        if (error) throw error

        setNewComponent({ name: '', quantity_g: '', quantity_available_g: '' })
        await fetchData()
      },
      { successMsg: 'Komponente hinzugefügt' },
    )
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
    await execute(
      async () => {
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

        setEditing(null)
        await fetchData()
      },
      { successMsg: 'Komponente aktualisiert' },
    )
  }

  const handleDelete = async (componentId) => {
    if (!confirm('Komponente wirklich löschen?')) return

    await execute(
      async () => {
        const { error } = await supabase
          .from('feeding_components')
          .delete()
          .eq('id', componentId)
        if (error) throw error
        await fetchData()
      },
      { successMsg: 'Komponente gelöscht' },
    )
  }

  const updateMealsPerDay = (val) => {
    const n = Math.max(1, Math.min(10, parseInt(val) || 1))
    setMealsPerDay(n)
    try { localStorage.setItem('iggy_meals_per_day', String(n)) } catch {}
  }

  const perMeal = useMemo(() => calculateDailyTotal(components), [components])

  if (loading) {
    return <p className="text-sm text-teal/60">Lädt Fütterungsplan...</p>
  }

  return (
    <div className="space-y-6">

      {/* ── Aktueller Futterplan ── */}
      <h2 className="text-sm font-semibold text-teal">Aktueller Futterplan</h2>

      {/* Daily Summary */}
      <div className="rounded border border-teal/20 bg-teal/5 p-4 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-teal/60">Mahlzeiten pro Tag:</p>
          <input
            type="number"
            min="1"
            max="10"
            value={mealsPerDay}
            onChange={(e) => updateMealsPerDay(e.target.value)}
            className="w-14 rounded border border-teal/30 bg-white px-2 py-0.5 text-sm text-teal text-center"
          />
        </div>
        <p className="text-2xl font-bold text-teal">{perMeal}g <span className="text-sm font-normal text-teal/60">pro Mahlzeit</span></p>
        <p className="text-xs text-teal/60">Täglich: ~{perMeal * mealsPerDay}g</p>
        {lastWeight && (
          <p className="text-xs text-chestnut">
            Letztes Gewicht: {lastWeight.value} kg am {formatDateDE(lastWeight.date)}
          </p>
        )}
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
          Hinzufügen
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
                        <p className="text-xs text-teal/50 mt-1 italic">{component.notes}</p>
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

      {/* ── Futter-Ereignisse ── */}
      <h2 className="text-sm font-semibold text-teal border-t border-teal/10 pt-4">Futter-Ereignisse</h2>

      {futterEntries.length === 0 ? (
        <p className="text-sm text-teal/60 italic">Noch keine Futter-Einträge vorhanden</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {futterEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded border border-teal/20 bg-white p-3"
            >
              <div className={`mt-0.5 rounded px-2 py-0.5 text-xs font-medium ${categoryColors.Futter}`}>
                {entry.subtype}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-teal/60">{formatDateDE(entry.date)}</p>
                {entry.note && <p className="text-sm text-teal">{entry.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
