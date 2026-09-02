import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { categoryColors } from '../lib/categories'
import { formatDateDE } from '../lib/dates'
import { getProductRemaining, getProductDaysRemaining, getMealsPerDay } from '../lib/feeding'
import { useRefresh } from '../context/RefreshContext'
import QuickEntryModal from './QuickEntryModal'

function DueOverviewComponent() {
  const [rules, setRules] = useState([])
  const [lastEntries, setLastEntries] = useState({})
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRule, setSelectedRule] = useState(null)
  const { refreshKey } = useRefresh()

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: rulesData, error: rulesError } = await supabase
        .from('user_rules')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('enabled', true)
        .order('interval_days', { ascending: false })

      if (rulesError) throw rulesError
      setRules(rulesData || [])

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

      const [prodRes, compRes] = await Promise.all([
        supabase
          .from('food_products')
          .select('*')
          .eq('user_id', session.user.id),
        supabase
          .from('feeding_components')
          .select('*')
          .eq('user_id', session.user.id),
      ])
      const allProducts = prodRes.data || []
      const allComponents = compRes.data || []
      const mealsPerDay = getMealsPerDay()
      const stockWarnings = allProducts
        .filter((p) => p.inventory_date && p.stock_amount != null)
        .map((p) => {
          const linked = allComponents.filter((c) => c.product_id === p.id)
          const remaining = getProductRemaining(p, linked, mealsPerDay)
          const daysLeft = getProductDaysRemaining(remaining, p, linked, mealsPerDay)
          return { ...p, remaining, daysLeft, unit: p.stock_unit || 'g' }
        })
        .filter((item) => item.daysLeft != null && item.daysLeft <= 14)
        .sort((a, b) => a.daysLeft - b.daysLeft)
      setLowStockItems(stockWarnings)
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
    <>
      <div className="space-y-4">
        {/* Low Stock Warnings */}
        {lowStockItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-teal">Futtervorrat</p>
            {lowStockItems.map((item) => {
              const unit = item.unit || 'g'
              const isUrgent = item.daysLeft <= 7
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded border-2 p-3 ${
                    isUrgent ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
                      {item.name} nachbestellen
                    </p>
                    <p className="text-xs text-teal/60">
                      Noch ~{Math.round(item.remaining)}{unit} (~{item.daysLeft} Tage)
                    </p>
                  </div>
                  <span className="text-lg">{isUrgent ? '🚨' : '⚠️'}</span>
                </div>
              )
            })}
          </div>
        )}

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
                      Letztens: {formatDateDE(lastEntry.date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                  <button
                    onClick={() => setSelectedRule(rule)}
                    className="whitespace-nowrap rounded bg-teal px-3 py-1 text-xs font-medium text-paper hover:bg-teal/90 transition"
                  >
                    ✓ Erledigt
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <QuickEntryModal
        rule={selectedRule}
        isOpen={!!selectedRule}
        onClose={() => setSelectedRule(null)}
        onSuccess={() => {
          fetchData()
        }}
      />
    </>
  )
}

export default DueOverviewComponent
