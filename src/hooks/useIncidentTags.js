import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useIncidentTags() {
  const [tags, setTags] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data } = await supabase
        .from('entries')
        .select('incident_tag')
        .eq('user_id', session.user.id)
        .not('incident_tag', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (data) {
        setTags([...new Set(data.map((d) => d.incident_tag))])
      }
    }
    fetch()
  }, [])

  return tags
}
