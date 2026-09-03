import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { formatDateDE, todayLocal } from '../lib/dates'
import { getProductRemaining, getProductDaysRemaining, getMealsPerDay, formatUnit } from '../lib/feeding'

const UNITS = [
  { value: 'g', label: 'g' },
  { value: 'TL', label: 'TL' },
  { value: 'EL', label: 'EL' },
]

export default function FoodLibrary() {
  const [products, setProducts] = useState([])
  const [feedingComponents, setFeedingComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', brand: '', notes: '' })
  const [fileFront, setFileFront] = useState(null)
  const [fileBack, setFileBack] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [zoomImg, setZoomImg] = useState(null)
  const [inventoryId, setInventoryId] = useState(null)
  const [inventoryAmount, setInventoryAmount] = useState('')
  const [inventoryUnit, setInventoryUnit] = useState('g')
  const { execute, loading: saving } = useAsyncWithToast()

  const mealsPerDay = getMealsPerDay()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const [prodRes, compRes] = await Promise.all([
        supabase
          .from('food_products')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name'),
        supabase
          .from('feeding_components')
          .select('*')
          .eq('user_id', session.user.id),
      ])

      if (prodRes.error) throw prodRes.error
      setProducts(prodRes.data || [])
      setFeedingComponents(compRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (userId, file) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!form.name) return
    await execute(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Not authenticated')

        const frontUrl = await uploadFile(session.user.id, fileFront)
        const backUrl = await uploadFile(session.user.id, fileBack)

        if (editing) {
          const updates = {
            name: form.name,
            brand: form.brand || null,
            notes: form.notes || null,
            updated_at: new Date().toISOString(),
          }
          if (frontUrl) updates.photo_front_url = frontUrl
          if (backUrl) updates.photo_back_url = backUrl

          const { error } = await supabase
            .from('food_products')
            .update(updates)
            .eq('id', editing)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('food_products')
            .insert({
              user_id: session.user.id,
              name: form.name,
              brand: form.brand || null,
              photo_front_url: frontUrl,
              photo_back_url: backUrl,
              notes: form.notes || null,
            })
          if (error) throw error
        }

        resetForm()
        await fetchProducts()
      },
      { successMsg: editing ? 'Produkt aktualisiert' : 'Produkt hinzugefügt' },
    )
  }

  const handleDelete = async (id) => {
    if (!confirm('Produkt wirklich löschen?')) return
    await execute(
      async () => {
        const { error } = await supabase.from('food_products').delete().eq('id', id)
        if (error) throw error
        await fetchProducts()
      },
      { successMsg: 'Produkt gelöscht' },
    )
  }

  const handleInventory = async (productId) => {
    if (!inventoryAmount && inventoryAmount !== '0') return
    await execute(
      async () => {
        const { error } = await supabase
          .from('food_products')
          .update({
            stock_amount: parseFloat(inventoryAmount),
            stock_unit: inventoryUnit,
            inventory_date: todayLocal(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
        if (error) throw error

        setInventoryId(null)
        setInventoryAmount('')
        setInventoryUnit('g')
        await fetchProducts()
      },
      { successMsg: 'Inventur gespeichert' },
    )
  }

  const startEdit = (product) => {
    setEditing(product.id)
    setForm({ name: product.name, brand: product.brand || '', notes: product.notes || '' })
    setShowForm(true)
    setFileFront(null)
    setFileBack(null)
  }

  const resetForm = () => {
    setForm({ name: '', brand: '', notes: '' })
    setFileFront(null)
    setFileBack(null)
    setEditing(null)
    setShowForm(false)
  }

  const getLinkedComponents = (productId) =>
    feedingComponents.filter((c) => c.product_id === productId)

  if (loading) return <p className="text-sm text-teal/60">Lädt Bibliothek...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-teal">Futterbibliothek</h2>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="rounded bg-teal px-3 py-1 text-xs font-medium text-paper hover:bg-teal/90 transition"
        >
          {showForm ? 'Abbrechen' : '+ Neues Produkt'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded border border-teal/20 bg-white p-4">
          <h3 className="text-sm font-semibold text-teal">
            {editing ? 'Produkt bearbeiten' : 'Neues Produkt'}
          </h3>

          <input
            type="text"
            placeholder="Name (z.B. ActivDog Wildschwein)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
          />
          <input
            type="text"
            placeholder="Marke (optional)"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
          />

          <div>
            <label className="text-xs text-teal/60 block mb-1">Foto Vorderseite</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFileFront(e.target.files?.[0] || null)}
              className="w-full text-sm text-teal file:mr-2 file:rounded file:border-0 file:bg-teal/10 file:px-3 file:py-1 file:text-sm file:text-teal"
            />
            {fileFront && <p className="mt-1 text-xs text-teal/60">{fileFront.name}</p>}
          </div>

          <div>
            <label className="text-xs text-teal/60 block mb-1">Foto Rückseite</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFileBack(e.target.files?.[0] || null)}
              className="w-full text-sm text-teal file:mr-2 file:rounded file:border-0 file:bg-teal/10 file:px-3 file:py-1 file:text-sm file:text-teal"
            />
            {fileBack && <p className="mt-1 text-xs text-teal/60">{fileBack.name}</p>}
          </div>

          <textarea
            placeholder="Notizen (Inhaltsstoffe, Zusammensetzung...)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded border border-teal text-sm px-2 py-1 text-teal"
          />

          <button
            onClick={handleSubmit}
            disabled={saving || !form.name}
            className="w-full rounded bg-teal py-2 text-xs font-medium text-paper hover:bg-teal/90 disabled:opacity-50 transition"
          >
            {saving ? 'Speichert...' : editing ? 'Aktualisieren' : 'Hinzufügen'}
          </button>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-teal/60 italic">Noch keine Produkte in der Bibliothek</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const linked = getLinkedComponents(p.id)
            const remaining = getProductRemaining(p, linked, mealsPerDay)
            const daysLeft = getProductDaysRemaining(remaining, p, linked, mealsPerDay)
            const stockUnit = p.stock_unit || 'g'
            const mismatchedUnits = p.inventory_date
              ? linked.filter((c) => (c.unit || 'g') !== stockUnit)
              : []

            return (
              <div key={p.id} className="rounded border border-teal/20 bg-white p-3">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-teal">{p.name}</p>
                    {p.brand && <p className="text-xs text-teal/60">{p.brand}</p>}
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(p)}
                      aria-label="Bearbeiten"
                      className="px-2 py-1 text-xs rounded font-medium bg-teal/10 text-teal hover:bg-teal/20 transition"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      aria-label="Löschen"
                      className="px-2 py-1 text-xs rounded font-medium bg-red-100/50 text-red-600 hover:bg-red-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Stock info */}
                <div className="mt-2">
                  {remaining != null ? (
                    <p className={`text-xs ${daysLeft <= 7 ? 'text-red-600 font-medium' : daysLeft <= 14 ? 'text-amber-600' : 'text-teal/60'}`}>
                      Vorrat: ~{Math.round(remaining)}{stockUnit}
                      {daysLeft != null && daysLeft !== Infinity && ` (noch ~${daysLeft} Tage)`}
                      {daysLeft != null && daysLeft <= 7 && ' ⚠️'}
                    </p>
                  ) : linked.length > 0 ? (
                    <p className="text-xs text-teal/60 italic">Keine Inventur</p>
                  ) : null}
                  {p.inventory_date && (
                    <p className="text-[10px] text-teal/60">Inventur: {formatDateDE(p.inventory_date)}</p>
                  )}
                  {mismatchedUnits.length > 0 && (
                    <p className="text-[10px] text-amber-600">
                      Einheit im Futterplan ({mismatchedUnits.map((c) => c.unit).join(', ')}) weicht von Inventur ({stockUnit}) ab
                    </p>
                  )}
                </div>

                {/* Inventory form */}
                {inventoryId === p.id ? (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-teal/10">
                    <input
                      type="number"
                      placeholder="Aktueller Vorrat"
                      value={inventoryAmount}
                      onChange={(e) => setInventoryAmount(e.target.value)}
                      className="flex-1 rounded border border-teal text-sm px-2 py-1 text-teal"
                      autoFocus
                    />
                    <select
                      value={inventoryUnit}
                      onChange={(e) => setInventoryUnit(e.target.value)}
                      className="w-14 rounded border border-teal text-sm px-1 py-1 text-teal bg-white"
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleInventory(p.id)}
                      disabled={saving}
                      className="rounded bg-teal px-3 py-1 text-xs font-medium text-paper hover:bg-teal/90 disabled:opacity-50 transition"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => { setInventoryId(null); setInventoryAmount(''); setInventoryUnit('g') }}
                      aria-label="Abbrechen"
                      className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-teal hover:bg-gray-300 transition"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setInventoryId(p.id)
                      setInventoryAmount('')
                      setInventoryUnit(p.stock_unit || 'g')
                    }}
                    className="mt-2 w-full rounded border border-teal/20 py-1 text-xs font-medium text-teal/60 hover:bg-teal/5 hover:text-teal transition"
                  >
                    📋 Inventur
                  </button>
                )}

                {/* Thumbnails (collapsed) */}
                {(p.photo_front_url || p.photo_back_url) && expanded !== p.id && (
                  <div className="flex gap-2 mt-2">
                    {p.photo_front_url && (
                      <img
                        src={p.photo_front_url}
                        alt="Vorderseite"
                        className="h-14 w-14 rounded border border-teal/20 object-cover"
                      />
                    )}
                    {p.photo_back_url && (
                      <img
                        src={p.photo_back_url}
                        alt="Rückseite"
                        className="h-14 w-14 rounded border border-teal/20 object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Expanded details */}
                {expanded === p.id && (
                  <div className="mt-3 space-y-3 border-t border-teal/10 pt-3">
                    {(p.photo_front_url || p.photo_back_url) && (
                      <div className="space-y-3">
                        {p.photo_front_url && (
                          <button onClick={() => setZoomImg(p.photo_front_url)} className="w-full text-left">
                            <img src={p.photo_front_url} alt="Vorderseite" className="w-full rounded border border-teal/20" />
                            <p className="text-[10px] text-teal/60 text-center mt-1">Vorderseite — antippen zum Vergrössern</p>
                          </button>
                        )}
                        {p.photo_back_url && (
                          <button onClick={() => setZoomImg(p.photo_back_url)} className="w-full text-left">
                            <img src={p.photo_back_url} alt="Rückseite" className="w-full rounded border border-teal/20" />
                            <p className="text-[10px] text-teal/60 text-center mt-1">Rückseite — antippen zum Vergrössern</p>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Linked feeding components */}
                    {linked.length > 0 && (
                      <div>
                        <p className="text-xs text-teal/60 font-medium mb-1">Im Futterplan:</p>
                        {linked.map((c) => (
                          <p key={c.id} className="text-xs text-teal/50">
                            {formatUnit(c.quantity_g, c.unit || 'g')} pro Mahlzeit
                          </p>
                        ))}
                      </div>
                    )}

                    {p.notes && (
                      <p className="text-xs text-teal/60 whitespace-pre-wrap">{p.notes}</p>
                    )}
                    {!p.photo_front_url && !p.photo_back_url && !p.notes && linked.length === 0 && (
                      <p className="text-xs text-teal/60 italic">Keine Details hinterlegt</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {zoomImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomImg(null)}
        >
          <button
            onClick={() => setZoomImg(null)}
            aria-label="Schliessen"
            className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-black shadow"
          >
            ✕
          </button>
          <img
            src={zoomImg}
            alt="Vergrössert"
            className="max-h-[90vh] max-w-full rounded object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
