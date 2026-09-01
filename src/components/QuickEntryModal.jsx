import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { useRefresh } from '../context/RefreshContext'

export default function QuickEntryModal({ rule, isOpen, onClose, onSuccess }) {
  const [note, setNote] = useState('')
  const [value, setValue] = useState('')
  const [dependencies, setDependencies] = useState([])
  const [selectedDeps, setSelectedDeps] = useState({})
  const { execute, isLoading } = useAsyncWithToast()
  const { triggerRefresh } = useRefresh()

  useEffect(() => {
    if (isOpen && rule) {
      loadDependencies()
    }
  }, [isOpen, rule])

  const loadDependencies = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: deps } = await supabase
        .from('rule_dependencies')
        .select('dependent_rule_id, user_rules!dependent_rule_id(*)')
        .eq('main_rule_id', rule.id)
        .eq('user_id', session.user.id)

      if (deps?.length > 0) {
        setDependencies(deps)
        // Initialize all as checked
        const initial = {}
        deps.forEach((dep) => {
          initial[dep.dependent_rule_id] = true
        })
        setSelectedDeps(initial)
      }
    } catch (err) {
      console.log('Dependencies not available yet')
    }
  }

  const handleSubmit = async () => {
    await execute(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Not authenticated')

        const today = new Date().toISOString().split('T')[0]

        // Create main entry
        const { error: entryError } = await supabase
          .from('entries')
          .insert({
            user_id: session.user.id,
            category: rule.category,
            subtype: rule.subtype,
            date: today,
            note: note || null,
            value: value ? parseFloat(value) : null,
          })

        if (entryError) throw entryError

        // Create entries for selected dependent rules
        const selectedDepsArray = dependencies.filter(
          (dep) => selectedDeps[dep.dependent_rule_id],
        )

        if (selectedDepsArray.length > 0) {
          const dependentEntries = selectedDepsArray.map((dep) => ({
            user_id: session.user.id,
            category: dep.user_rules.category,
            subtype: dep.user_rules.subtype,
            date: today,
            note: null,
            value: null,
          }))

          const { error: depError } = await supabase
            .from('entries')
            .insert(dependentEntries)

          if (depError) throw depError
        }

        triggerRefresh()
        onSuccess?.()
        handleClose()
      },
      { successMsg: `${rule.subtype} erledigt` },
    )
  }

  const handleClose = () => {
    setNote('')
    setValue('')
    setDependencies([])
    setSelectedDeps({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 max-h-96 overflow-y-auto rounded-lg border border-teal/20 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-teal">
          {rule.category} - {rule.subtype}
        </h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-teal">
            Notiz (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z.B. Gut geklappt, leichte Entzündung..."
            className="w-full rounded border border-teal/20 px-3 py-2 text-sm text-teal placeholder:text-teal/40"
          />
        </div>

        {rule.category === 'Gewicht' && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-teal">
              Gewicht (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="z.B. 5.2"
              className="w-full rounded border border-teal/20 px-3 py-2 text-sm text-teal placeholder:text-teal/40"
            />
          </div>
        )}

        {dependencies.length > 0 && (
          <div className="mb-4 space-y-2 border-t border-teal/10 pt-3">
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
                <span className="text-teal">
                  {dep.user_rules.subtype} auch erledigt?
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="mb-6 text-xs text-teal/60">
          Datum: Heute ({new Date().toLocaleDateString('de-DE')})
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 rounded bg-teal py-2 text-sm font-medium text-paper hover:bg-teal/90 disabled:opacity-50 transition"
          >
            {isLoading ? 'Speichert...' : 'Erledigt'}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 rounded border border-teal bg-white py-2 text-sm font-medium text-teal hover:bg-teal/5 disabled:opacity-50 transition"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
