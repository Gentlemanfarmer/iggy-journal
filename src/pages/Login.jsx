import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (authError) {
          setError(authError.message)
        } else if (data) {
          setError('')
          setEmail('')
          setPassword('')
          setIsSignup(false)
          setError('✅ Konto erstellt! Bitte melden Sie sich an.')
          setTimeout(() => setError(''), 3000)
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) {
          setError(authError.message)
        } else if (data) {
          navigate('/journal')
        }
      }
    } catch (err) {
      setError('Fehler bei der Authentifizierung. Bitte versuchen Sie es später erneut.')
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

      <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
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

        {error && (
          <p className={`text-sm ${error.includes('✅') ? 'text-teal' : 'text-chestnut'}`}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-teal py-2 font-medium text-paper transition hover:bg-teal/90 disabled:opacity-50"
        >
          {loading ? 'Wird verarbeitet...' : isSignup ? 'Konto erstellen' : 'Einloggen'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup)
              setError('')
              setEmail('')
              setPassword('')
            }}
            className="text-sm text-teal/70 hover:text-teal transition"
          >
            {isSignup ? 'Haben Sie bereits ein Konto? Einloggen' : 'Kein Konto? Jetzt erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
