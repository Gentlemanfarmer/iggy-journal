import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { categories } from '../lib/categories'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'

export default function QuickAdd({ onEntryAdded }) {
  const [step, setStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubtype, setSelectedSubtype] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [value, setValue] = useState('')
  const { loading: saving, execute } = useAsyncWithToast()

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat)
    setStep(1)
  }

  const handleSelectSubtype = (subtype) => {
    setSelectedSubtype(subtype)
    setStep(2)
  }

  const handleSave = async () => {
    if (!selectedCategory || !selectedSubtype) return

    await execute(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Not authenticated')

        const entry = {
          user_id: session.user.id,
          date,
          category: selectedCategory,
          subtype: selectedSubtype,
          note: note || null,
          value: value ? parseFloat(value) : null,
        }

        const { error } = await supabase.from('entries').insert([entry])
        if (error) throw error

        setStep(0)
        setSelectedCategory(null)
        setSelectedSubtype(null)
        setDate(new Date().toISOString().split('T')[0])
        setNote('')
        setValue('')

        onEntryAdded()
      },
      { successMsg: 'Eintrag erstellt' },
    )
  }

  return (
    <div className="space-y-4">
      {step === 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-teal">Kategorie wählen:</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(categories).map((cat) => (
              <button
                key={cat}
                onClick={() => handleSelectCategory(cat)}
                className="rounded border-2 border-teal py-2 text-teal hover:bg-teal hover:text-paper transition"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <button
            onClick={() => setStep(0)}
            className="text-xs text-teal/60 hover:text-teal"
          >
            ← Zurück
          </button>
          <p className="text-sm font-medium text-teal">{selectedCategory}:</p>
          <div className="grid grid-cols-2 gap-2">
            {categories[selectedCategory].map((subtype) => (
              <button
                key={subtype}
                onClick={() => handleSelectSubtype(subtype)}
                className="rounded bg-teal/10 py-2 text-teal hover:bg-teal hover:text-paper transition text-sm"
              >
                {subtype}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <button
            onClick={() => setStep(1)}
            className="text-xs text-teal/60 hover:text-teal"
          >
            ← Zurück
          </button>
          <p className="text-sm font-medium text-teal">{selectedSubtype}</p>

          <div>
            <label className="block text-xs font-medium text-teal">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border border-teal bg-white px-2 py-1 text-sm text-teal"
            />
          </div>

          {selectedCategory === 'Gewicht' && (
            <div>
              <label className="block text-xs font-medium text-teal">Gewicht (kg)</label>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded border border-teal bg-white px-2 py-1 text-sm text-teal"
                placeholder="z. B. 11.5"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-teal">Notiz (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded border border-teal bg-white px-2 py-1 text-sm text-teal"
              placeholder="Besonderheiten, Beobachtungen..."
              rows="3"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded bg-teal py-2 text-sm font-medium text-paper hover:bg-teal/90 disabled:opacity-50 transition"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      )}
    </div>
  )
}
