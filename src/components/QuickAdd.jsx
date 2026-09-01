import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { categories } from '../lib/categories'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { getRule, getDependencies, buildDependentEntries } from '../lib/dependencies'

export default function QuickAdd({ onEntryAdded }) {
  const [step, setStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubtype, setSelectedSubtype] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [value, setValue] = useState('')
  const [dependencies, setDependencies] = useState([])
  const [selectedDeps, setSelectedDeps] = useState({})
  const { loading: saving, execute } = useAsyncWithToast()

  const resetForm = () => {
    setStep(0)
    setSelectedCategory(null)
    setSelectedSubtype(null)
    setDate(new Date().toISOString().split('T')[0])
    setNote('')
    setValue('')
    setDependencies([])
    setSelectedDeps({})
  }

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat)
    setStep(1)
  }

  const handleSelectSubtype = async (subtype) => {
    setSelectedSubtype(subtype)
    setStep(2)
    setDependencies([])
    setSelectedDeps({})

    // Load dependent tasks for this rule (if any)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const rule = await getRule(session.user.id, selectedCategory, subtype)
    if (!rule) return

    const deps = await getDependencies(session.user.id, rule.id)
    if (deps.length > 0) {
      setDependencies(deps)
      const initial = {}
      deps.forEach((dep) => {
        initial[dep.dependent_rule_id] = true
      })
      setSelectedDeps(initial)
    }
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

        // Create entries for selected dependent tasks (same date)
        const dependentEntries = buildDependentEntries(
          session.user.id,
          dependencies,
          selectedDeps,
          date,
        )
        if (dependentEntries.length > 0) {
          const { error: depError } = await supabase.from('entries').insert(dependentEntries)
          if (depError) throw depError
        }

        resetForm()
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(categories).map((cat) => (
              <button
                key={cat}
                onClick={() => handleSelectCategory(cat)}
                className="rounded border-2 border-teal py-2 text-sm sm:text-base font-medium text-teal hover:bg-teal hover:text-paper transition"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories[selectedCategory].map((subtype) => (
              <button
                key={subtype}
                onClick={() => handleSelectSubtype(subtype)}
                className="rounded bg-teal/10 py-2 px-2 font-medium text-sm sm:text-base text-teal hover:bg-teal hover:text-paper transition"
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

          {dependencies.length > 0 && (
            <div className="space-y-2 border-t border-teal/10 pt-3">
              <p className="text-xs font-medium text-teal">Abhängige Aufgaben:</p>
              {dependencies.map((dep) => (
                <label key={dep.dependent_rule_id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDeps[dep.dependent_rule_id] || false}
                    onChange={(e) =>
                      setSelectedDeps({
                        ...selectedDeps,
                        [dep.dependent_rule_id]: e.target.checked,
                      })
                    }
                    className="rounded border-teal"
                  />
                  <span className="text-teal">{dep.user_rules.subtype} auch erledigt?</span>
                </label>
              ))}
            </div>
          )}

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
