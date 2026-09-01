import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { useRefresh } from '../context/RefreshContext'

export default function QuickEntryModal({ rule, isOpen, onClose, onSuccess }) {
  const [note, setNote] = useState('')
  const [value, setValue] = useState('')
  const { execute, isLoading } = useAsyncWithToast()
  const { triggerRefresh } = useRefresh()

  if (!isOpen) return null

  const handleSubmit = async () => {
    await execute(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Not authenticated')

        const today = new Date().toISOString().split('T')[0]

        // Create main entry
        const { data: mainEntry, error: entryError } = await supabase
          .from('entries')
          .insert({
            user_id: session.user.id,
            category: rule.category,
            subtype: rule.subtype,
            date: today,
            note: note || null,
            value: value ? parseFloat(value) : null,
          })
          .select()

        if (entryError) throw entryError

        // Get dependencies for this rule (gracefully handle if table doesn't exist yet)
        try {
          const { data: deps, error: depsError } = await supabase
            .from('rule_dependencies')
            .select('dependent_rule_id, user_rules!dependent_rule_id(*)')
            .eq('main_rule_id', rule.id)
            .eq('user_id', session.user.id)

          if (!depsError && deps?.length > 0) {
            // Create entries for all dependent rules
            const dependentEntries = deps.map((dep) => ({
              user_id: session.user.id,
              category: dep.user_rules.category,
              subtype: dep.user_rules.subtype,
              date: today,
              note: `Auto-created via ${rule.subtype}`,
              value: null,
            }))

            await supabase.from('entries').insert(dependentEntries)
          }
        } catch (err) {
          // Dependencies feature not yet available (migration pending)
          console.log('Rule dependencies not yet configured')
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
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg border border-teal/20 bg-white p-6 shadow-lg">
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
