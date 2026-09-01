import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'

export default function FoodLibrary() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', brand: '', notes: '' })
  const [fileFront, setFileFront] = useState(null)
  const [fileBack, setFileBack] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const { execute, loading: saving } = useAsyncWithToast()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data, error } = await supabase
        .from('food_products')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')
      if (error) throw error
      setProducts(data || [])
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
          {products.map((p) => (
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
                    className="px-2 py-1 text-xs rounded font-medium bg-teal/10 text-teal hover:bg-teal/20 transition"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-2 py-1 text-xs rounded font-medium bg-red-100/50 text-red-600 hover:bg-red-100 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

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

              {expanded === p.id && (
                <div className="mt-3 space-y-3 border-t border-teal/10 pt-3">
                  {(p.photo_front_url || p.photo_back_url) && (
                    <div className="flex gap-3">
                      {p.photo_front_url && (
                        <a href={p.photo_front_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <img src={p.photo_front_url} alt="Vorderseite" className="w-full rounded border border-teal/20" />
                          <p className="text-[10px] text-teal/40 text-center mt-1">Vorderseite</p>
                        </a>
                      )}
                      {p.photo_back_url && (
                        <a href={p.photo_back_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <img src={p.photo_back_url} alt="Rückseite" className="w-full rounded border border-teal/20" />
                          <p className="text-[10px] text-teal/40 text-center mt-1">Rückseite</p>
                        </a>
                      )}
                    </div>
                  )}
                  {p.notes && (
                    <p className="text-xs text-teal/60 whitespace-pre-wrap">{p.notes}</p>
                  )}
                  {!p.photo_front_url && !p.photo_back_url && !p.notes && (
                    <p className="text-xs text-teal/40 italic">Keine Details hinterlegt</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
