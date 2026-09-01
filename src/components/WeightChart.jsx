import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

export default function WeightChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeights()
  }, [])

  const fetchWeights = async () => {
    setLoading(true)
    try {
      const { data: entries, error } = await supabase
        .from('entries')
        .select('date, value')
        .eq('category', 'Gewicht')
        .eq('subtype', 'Gewogen')
        .order('date', { ascending: true })

      if (error) throw error

      const chartData = (entries || []).map((entry) => ({
        date: entry.date,
        weight: parseFloat(entry.value),
      }))

      setData(chartData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-teal/60">Lädt...</p>
  }

  if (data.length === 0) {
    return <p className="text-sm text-teal/60">Noch keine Gewichtsmessungen vorhanden.</p>
  }

  return (
    <div className="mt-6 space-y-2">
      <h3 className="text-sm font-medium text-teal">Gewichtskurve</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F5A57" opacity={0.2} />
          <XAxis dataKey="date" stroke="#1F5A57" style={{ fontSize: '12px' }} />
          <YAxis stroke="#1F5A57" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#F1EDE2', border: '1px solid #1F5A57' }}
            labelStyle={{ color: '#1F5A57' }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#1F5A57"
            dot={{ fill: '#98552F', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
