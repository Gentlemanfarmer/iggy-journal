import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { todayLocal } from '../lib/dates'
import { useAsyncWithToast } from '../hooks/useAsyncWithToast'
import { useIncidentTags } from '../hooks/useIncidentTags'
import { useRefresh } from '../context/RefreshContext'
import { getDependencies, buildDependentEntries } from '../lib/dependencies'

export default function QuickEntryModal({ rule, isOpen, onClose, onSuccess }) {
  const [note, setNote] = useState('')
  const [value, setValue] = useState('')
  const [file, setFile] = useState(null)
  const [incidentTag, setIncidentTag] = useState('')
  const [dependencies, setDependencies] = useState([])
  const [selectedDeps, setSelectedDeps] = useState({})
  const { execute, loading } = useAsyncWithToast()
  const { triggerRefresh } = useRefresh()
  const existingTags = useIncidentTags()

  useEffect(() => {
    if (isOpen && rule) {
      loadDependencies()
    }
  }, [isOpen, rule])

  const loadDependencies = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

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

  const uploadFile = async (userId) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (rule.category === 'Gewicht' && !value) return
    await execute(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Not authenticated')

        const today = todayLocal()
        const photoUrl = await uploadFile(session.user.id)

        const { error: entryError } = await supabase
          .from('entries')
          .insert({
            user_id: session.user.id,
            category: rule.category,
            subtype: rule.subtype,
            date: today,
            note: note || null,
            value: value ? parseFloat(value) : null,
            photo_url: photoUrl,
            incident_tag: incidentTag || null,
          })

        if (entryError) throw entryError

        const dependentEntries = buildDependentEntries(
          session.user.id,
          dependencies,
          selectedDeps,
          today,
        )
        if (dependentEntries.length > 0) {
          const { error: depError } = await supabase.from('entries').insert(dependentEntries)
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
    setFile(null)
    setIncidentTag('')
    setDependencies([])
    setSelectedDeps({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 max-h-[80vh] overflow-y-auto rounded-lg border border-teal/20 bg-white p-6 shadow-lg">
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

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-teal">
            Vorfall (optional)
          </label>
          <input
            list="incident-tags-modal"
            type="text"
            value={incidentTag}
            onChange={(e) => setIncidentTag(e.target.value)}
            placeholder="z.B. Durchfall Sep 26"
            className="w-full rounded border border-teal/20 px-3 py-2 text-sm text-teal placeholder:text-teal/40"
          />
          <datalist id="incident-tags-modal">
            {existingTags.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-teal">
            Foto / PDF (optional)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-teal file:mr-2 file:rounded file:border-0 file:bg-teal/10 file:px-3 file:py-1 file:text-sm file:text-teal"
          />
          {file && (
            <p className="mt-1 text-xs text-teal/60">{file.name}</p>
          )}
        </div>

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
            disabled={loading || (rule.category === 'Gewicht' && !value)}
            className="flex-1 rounded bg-teal py-2 text-sm font-medium text-paper hover:bg-teal/90 disabled:opacity-50 transition"
          >
            {loading ? 'Speichert...' : 'Erledigt'}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded border border-teal bg-white py-2 text-sm font-medium text-teal hover:bg-teal/5 disabled:opacity-50 transition"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
