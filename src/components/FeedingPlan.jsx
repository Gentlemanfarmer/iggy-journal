import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { formatDateDE } from '../lib/dates'
import { categoryColors } from '../lib/categories'
import { getProductRemaining, getProductDaysRemaining, getMealsPerDay, formatUnit, formatMealTotals, formatDailyTotals } from '../lib/feeding'
import AktivDogRechner from './AktivDogRechner'

const UNITS = [
  { value: 'g', label: 'g' },
  { value: 'TL', label: 'TL' },
  { value: 'EL', label: 'EL' },
]

export default function FeedingPlan() {
  const [components, setComponents] = useState([])
  const [libraryProducts, setLibraryProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [selectedProductId, setSelectedProductId] = useState('')
  const [manualName, setManualName] = useState('')
  const [newComponent, setNewComponent] = useState({ quantity_g: '' })
  const [newUnit, setNewUnit] = useState('g')
  const [lastWeight, setLastWeight] = useState(null)
  const [futterEntries, setFutterEntries] = useState([])
  const [mealsPerDay, setMealsPerDay] = useState(getMealsPerDay)
  const { loading: saving, execute } = useAsyncWithToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const [compRes, weightRes, futterRes, libRes] = await Promise.all([
        supabase
          .from('feeding_components')
          .select('*, food_products(photo_front_url, photo_back_url)')
          .eq('user_id', session.user.id)
          .order('created_at'),
        supabase
          .from('entries')
          .select('date, value')
          .eq('user_id', session.user.id)
          .eq('category', 'Gewicht')
          .eq('subtype', 'Gewogen')
          .order('date', { ascending: false })
          .limit(1),
        supabase
          .from('entries')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('category', 'Futter')
          .order('date', { ascending: false })
          .limit(20),
        supabase
          .from('food_products')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name'),
      ])

      setComponents(compRes.data || [])
      if (weightRes.data?.length > 0) setLastWeight(weightRes.data[0])
      setFutterEntries(futterRes.data || [])
      setLibraryProducts(libRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComponent = async () => {
    const name = selectedProductId && selectedProductId !== 'manual'
      ? libraryProducts.find((p) => p.id === parseInt(selectedProductId))?.name
      : manualName
    if (!name || !newComponent.quantity_g) return

    await execute(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('feeding_components')
          .insert({
            user_id: session.user.id,
            name,
            product_id: selectedProductId && selectedProductId !== 'manual' ? parseInt(selectedProductId) : null,
            quantity_g: parseFloat(newComponent.quantity_g),
            unit: newUnit,
          })
        if (error) throw error

        setNewComponent({ quantity_g: '' })
        setNewUnit('g')
        setSelectedProductId('')
        setManualName('')
        await fetchData()
      },
      { successMsg: 'Komponente hinzugefügt' },
    )
  }

  const handleEdit = (component) => {
    setEditing(component.id)
    setEditValues({ quantity_g: component.quantity_g, notes: component.notes || '' })
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
            quantity_g: parseFloat(editValues.quantity_g),
            notes: editValues.notes || null,
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

  const mealTotal = useMemo(() => formatMealTotals(components), [components])
  const dailyTotal = useMemo(() => formatDailyTotals(components, mealsPerDay), [components, mealsPerDay])

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
        <p className="text-2xl font-bold text-teal">
          {mealTotal} <span className="text-sm font-normal text-teal/60">pro Mahlzeit</span>
        </p>
        <p className="text-xs text-teal/60">Täglich: {dailyTotal}</p>
        {lastWeight && (
          <p className="text-xs text-chestnut">
            Letztes Gewicht: {lastWeight.value} kg am {formatDateDE(lastWeight.date)}
          </p>
        )}
      </div>

      {/* AktivDog Recommendation */}
      <AktivDogRechner lastWeight={lastWeight} feedingComponents={components} />

      {/* Add Component */}
      <div className="space-y-3 rounded border border-teal/20 bg-white p-4">
        <h3 className="text-sm font-semibold text-teal">Komponente hinzufügen</h3>

        {libraryProducts.length > 0 ? (
          <>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value)
                if (e.target.value !== 'manual') {
                  setManualName('')
                  const prod = libraryProducts.find((p) => p.id === parseInt(e.target.value))
                  if (prod?.stock_unit) setNewUnit(prod.stock_unit)
                }
              }}
              className="w-full rounded border border-teal text-sm px-2 py-1.5 text-teal bg-white"
            >
              <option value="">Aus Bibliothek wählen...</option>
              {libraryProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.brand ? ` (${p.brand})` : ''}
                </option>
              ))}
              <option value="manual">— Manuell eingeben —</option>
            </select>
            {selectedProductId === 'manual' && (
              <input
                type="text"
                placeholder="Name (z.B. Hühnerhälse)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
              />
            )}
          </>
        ) : (
          <input
            type="text"
            placeholder="Name (z.B. ActivDog Wildschwein)"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
          />
        )}

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Menge pro Mahlzeit"
            value={newComponent.quantity_g}
            onChange={(e) => setNewComponent({ ...newComponent, quantity_g: e.target.value })}
            className="flex-1 rounded border border-teal text-sm px-2 py-1 text-teal"
          />
          <select
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            className="w-16 rounded border border-teal text-sm px-1 py-1 text-teal bg-white"
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
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
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {components.map((component) => {
              const unit = component.unit || 'g'
              const product = component.product_id
                ? libraryProducts.find((p) => p.id === component.product_id)
                : null
              const linked = product
                ? components.filter((c) => c.product_id === product.id)
                : []
              const remaining = product
                ? getProductRemaining(product, linked, mealsPerDay)
                : null
              const daysLeft = product
                ? getProductDaysRemaining(remaining, product, linked, mealsPerDay)
                : null
              const stockUnit = product?.stock_unit || unit

              return (
                <div key={component.id} className="border border-teal/20 rounded p-3 bg-white">
                  {editing === component.id ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-teal">{component.name}</p>
                      <div>
                        <label className="text-xs text-teal/60 block mb-1">pro Mahlzeit ({unit})</label>
                        <input
                          type="number"
                          value={editValues.quantity_g}
                          onChange={(e) =>
                            setEditValues({ ...editValues, quantity_g: parseFloat(e.target.value) })
                          }
                          className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-teal/60 block mb-1">Notizen</label>
                        <input
                          type="text"
                          value={editValues.notes}
                          onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                          className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
                        />
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
                    <div className="flex items-start gap-3">
                      {component.food_products?.photo_front_url && (
                        <img
                          src={component.food_products.photo_front_url}
                          alt=""
                          className="h-12 w-12 rounded border border-teal/20 object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-teal">{component.name}</p>
                        <p className="text-xs text-teal/60">
                          <strong>{formatUnit(component.quantity_g, unit)}</strong> pro Mahlzeit
                        </p>

                        {remaining != null ? (
                          <p className={`text-xs mt-0.5 ${daysLeft <= 7 ? 'text-red-600 font-medium' : daysLeft <= 14 ? 'text-amber-600' : 'text-teal/60'}`}>
                            Vorrat: ~{Math.round(remaining)}{stockUnit}
                            {daysLeft != null && daysLeft !== Infinity && ` (noch ~${daysLeft} Tage)`}
                            {daysLeft != null && daysLeft <= 7 && ' ⚠️'}
                          </p>
                        ) : product ? (
                          <p className="text-xs text-teal/40 mt-0.5 italic">Keine Inventur</p>
                        ) : null}

                        {component.notes && (
                          <p className="text-xs text-teal/50 mt-1 italic">{component.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
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
              )
            })}
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
