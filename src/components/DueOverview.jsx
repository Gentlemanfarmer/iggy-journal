import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { categoryColors } from '../lib/categories'
import { useRefresh } from '../context/RefreshContext'

function DueOverviewComponent() {
  const [rules, setRules] = useState([])
  const [lastEntries, setLastEntries] = useState({})
  const [loading, setLoading] = useState(true)
  const { refreshKey } = useRefresh()

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      // Fetch user's custom rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('user_rules')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('enabled', true)
        .order('interval_days', { ascending: false })

      if (rulesError) throw rulesError
      setRules(rulesData || [])

      // Fetch last entry for each rule
      const lastEntriesMap = {}
      for (const rule of rulesData || []) {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('category', rule.category)
          .eq('subtype', rule.subtype)
          .order('date', { ascending: false })
          .limit(1)

        if (!error && data?.length > 0) {
          lastEntriesMap[`${rule.category}-${rule.subtype}`] = data[0]
        }
      }
      setLastEntries(lastEntriesMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculateDue = (lastEntry, intervalDays) => {
    if (!lastEntry) return { status: 'niemals', days: null, label: 'Noch nie durchgeführt' }

    const lastDate = new Date(lastEntry.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    lastDate.setHours(0, 0, 0, 0)

    const diffTime = today - lastDate
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const daysUntilDue = intervalDays - diffDays

    if (daysUntilDue < 0) {
      return { status: 'overdue', days: Math.abs(daysUntilDue), label: `${Math.abs(daysUntilDue)} Tage überfällig` }
    } else if (daysUntilDue === 0) {
      return { status: 'today', days: 0, label: 'Heute fällig' }
    } else {
      return { status: 'pending', days: daysUntilDue, label: `In ${daysUntilDue} Tagen` }
    }
  }

  if (loading) {
    return <p className="text-sm text-teal/60">Lädt...</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-teal/60">Pflege-Fälligkeiten basierend auf den letzten Einträgen:</p>
      <div className="space-y-3">
        {rules.map((rule) => {
          const lastEntry = lastEntries[`${rule.category}-${rule.subtype}`]
          const dueInfo = calculateDue(lastEntry, rule.interval_days)

          const statusColors = {
            overdue: 'border-red-500 bg-red-50',
            today: 'border-amber-500 bg-amber-50',
            pending: 'border-teal/30 bg-teal/5',
            niemals: 'border-gray-300 bg-gray-50',
          }

          return (
            <div
              key={`${rule.category}-${rule.subtype}`}
              className={`flex items-center justify-between rounded border-2 p-3 ${statusColors[dueInfo.status]}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`${categoryColors[rule.category]} rounded px-2 py-0.5 text-xs font-medium`}>
                    {rule.subtype}
                  </span>
                  <span className="text-xs text-teal/60">{rule.interval_days}d</span>
                </div>
                {lastEntry && (
                  <p className="mt-1 text-xs text-teal/60">
                    Letztens: {lastEntry.date}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-medium ${
                    dueInfo.status === 'overdue'
                      ? 'text-red-600'
                      : dueInfo.status === 'today'
                        ? 'text-amber-600'
                        : 'text-teal'
                  }`}
                >
                  {dueInfo.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DueOverviewComponent
