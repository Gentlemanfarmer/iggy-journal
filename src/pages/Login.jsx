import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
      } else if (data) {
        navigate('/journal')
      }
    } catch (err) {
      setError('Fehler bei der Anmeldung. Bitte versuche es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[460px] flex-col items-center justify-center gap-8 bg-paper px-4 py-8 text-teal">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Iggy Journal</h1>
        <p className="mt-2 text-sm text-chestnut">Pflege-Tagebuch für Iggy</p>
      </div>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-teal">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-teal bg-white px-3 py-2 text-teal placeholder-teal/50 focus:outline-none focus:ring-2 focus:ring-chestnut"
            placeholder="deine@email.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-teal">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-teal bg-white px-3 py-2 text-teal placeholder-teal/50 focus:outline-none focus:ring-2 focus:ring-chestnut"
            placeholder="••••••••"
            required
          />
        </div>

        {error && <p className="text-sm text-chestnut">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-teal py-2 font-medium text-paper transition hover:bg-teal/90 disabled:opacity-50"
        >
          {loading ? 'Wird angemeldet...' : 'Einloggen'}
        </button>
      </form>
    </div>
  )
}
