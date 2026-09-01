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
import FeedingPlan from '../components/FeedingPlan'
import Footer from '../components/Footer'

const MORE_ITEMS = [
  { key: 'wissen', label: 'Wissen' },
  { key: 'futter', label: 'Futter' },
  { key: 'verlauf', label: 'Verlauf' },
  { key: 'einstellungen', label: 'Einstellungen' },
]

export default function Journal() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('neu')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showMore, setShowMore] = useState(false)
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

  const switchTab = (tab) => {
    setActiveTab(tab)
    setShowMore(false)
  }

  const isMoreTab = MORE_ITEMS.some((i) => i.key === activeTab)

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center bg-paper text-teal">Lädt...</div>
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[460px] flex-col bg-paper text-teal">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <h1 className="text-2xl font-semibold">Iggy Journal</h1>
        <button
          onClick={handleLogout}
          className="rounded bg-chestnut px-3 py-1 text-sm text-paper hover:bg-chestnut/90"
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
        {activeTab === 'futter' && <FeedingPlan />}
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

        <Footer />
      </div>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 border-t border-teal/20 bg-paper relative">
        {/* "Mehr" Dropdown */}
        {showMore && (
          <div className="absolute bottom-full left-0 right-0 border-t border-teal/20 bg-white shadow-lg">
            {MORE_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => switchTab(item.key)}
                className={`block w-full px-6 py-3 text-left text-sm font-medium transition ${
                  activeTab === item.key
                    ? 'bg-teal/10 text-teal'
                    : 'text-teal/60 hover:bg-teal/5 hover:text-teal'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-around py-2">
          <button
            onClick={() => switchTab('neu')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
              activeTab === 'neu' ? 'text-teal' : 'text-teal/40'
            }`}
          >
            <span className="text-xl leading-none">＋</span>
            <span className="text-[10px] font-medium">Neu</span>
          </button>

          <button
            onClick={() => switchTab('fällig')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
              activeTab === 'fällig' ? 'text-teal' : 'text-teal/40'
            }`}
          >
            <span className="text-xl leading-none">⏰</span>
            <span className="text-[10px] font-medium">Fällig</span>
          </button>

          <button
            onClick={() => switchTab('journal')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
              activeTab === 'journal' ? 'text-teal' : 'text-teal/40'
            }`}
          >
            <span className="text-xl leading-none">📓</span>
            <span className="text-[10px] font-medium">Journal</span>
          </button>

          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
              showMore || isMoreTab ? 'text-teal' : 'text-teal/40'
            }`}
          >
            <span className="text-xl leading-none">☰</span>
            <span className="text-[10px] font-medium">Mehr</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
