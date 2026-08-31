import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import JournalView from '../components/JournalView'
import QuickAdd from '../components/QuickAdd'
import DueOverview from '../components/DueOverview'
import WeightChart from '../components/WeightChart'
import KnowledgeBase from '../components/KnowledgeBase'
import AuditTrail from '../components/AuditTrail'
import ExportData from '../components/ExportData'
import RulesEditor from '../components/RulesEditor'

export default function Journal() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('journal')
  const [refreshKey, setRefreshKey] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      } else {
        navigate('/login')
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleEntryAdded = () => {
    setRefreshKey((k) => k + 1)
    setActiveTab('journal')
  }

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center bg-paper text-teal">Lädt...</div>
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-[460px] bg-paper px-4 py-8 text-teal">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Iggy Journal</h1>
        <button
          onClick={handleLogout}
          className="rounded bg-chestnut px-3 py-1 text-sm text-paper hover:bg-chestnut/90"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-teal/20 overflow-x-auto">
        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-2 px-1 text-sm font-medium transition whitespace-nowrap ${
            activeTab === 'journal'
              ? 'border-b-2 border-teal text-teal'
              : 'text-teal/50 hover:text-teal'
          }`}
        >
          Journal
        </button>
        <button
          onClick={() => setActiveTab('neu')}
          className={`pb-2 px-1 text-sm font-medium transition whitespace-nowrap ${
            activeTab === 'neu'
              ? 'border-b-2 border-teal text-teal'
              : 'text-teal/50 hover:text-teal'
          }`}
        >
          Neu
        </button>
        <button
          onClick={() => setActiveTab('fällig')}
          className={`pb-2 px-1 text-sm font-medium transition whitespace-nowrap ${
            activeTab === 'fällig'
              ? 'border-b-2 border-teal text-teal'
              : 'text-teal/50 hover:text-teal'
          }`}
        >
          Fällig
        </button>
        <button
          onClick={() => setActiveTab('wissen')}
          className={`pb-2 px-1 text-sm font-medium transition whitespace-nowrap ${
            activeTab === 'wissen'
              ? 'border-b-2 border-teal text-teal'
              : 'text-teal/50 hover:text-teal'
          }`}
        >
          Wissen
        </button>
        <button
          onClick={() => setActiveTab('verlauf')}
          className={`pb-2 px-1 text-sm font-medium transition whitespace-nowrap ${
            activeTab === 'verlauf'
              ? 'border-b-2 border-teal text-teal'
              : 'text-teal/50 hover:text-teal'
          }`}
        >
          Verlauf
        </button>
        <button
          onClick={() => setActiveTab('einstellungen')}
          className={`pb-2 px-1 text-sm font-medium transition whitespace-nowrap ${
            activeTab === 'einstellungen'
              ? 'border-b-2 border-teal text-teal'
              : 'text-teal/50 hover:text-teal'
          }`}
        >
          ⚙️
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'journal' && (
          <div key={refreshKey}>
            <JournalView />
          </div>
        )}
        {activeTab === 'neu' && <QuickAdd onEntryAdded={handleEntryAdded} />}
        {activeTab === 'fällig' && (
          <div key={refreshKey}>
            <DueOverview />
            <WeightChart />
          </div>
        )}
        {activeTab === 'wissen' && <KnowledgeBase />}
        {activeTab === 'verlauf' && <AuditTrail />}
        {activeTab === 'einstellungen' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-teal mb-3">Fälligkeitsregeln</h2>
              <RulesEditor />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-teal mb-3">Daten-Export</h2>
              <ExportData />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
