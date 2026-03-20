import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

type LocationState = {
  from?: string
}

export function LoginPage() {
  const { registerUser, loginUser } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const fromPath = (location.state as LocationState | null)?.from

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (mode === 'register') {
      const result = await registerUser(fullName, email, password)
      if (!result.ok) {
        setError(result.error ?? 'Unable to register.')
        return
      }

      setError('')
      navigate(fromPath ?? (result.role === 'admin' ? '/admin' : '/dashboard'))
      return
    }

    const result = await loginUser(email, password)
    if (!result.ok) {
      setError(result.error ?? 'Unable to login.')
      return
    }

    setError('')
    navigate(fromPath ?? (result.role === 'admin' ? '/admin' : '/dashboard'))
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-6 py-10 md:px-10">
      <section className="animate-fade-up w-full rounded-3xl bg-white p-6 shadow-[0_20px_56px_rgba(0,0,0,0.08)] md:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 md:text-5xl">
          {mode === 'login' ? 'Login' : 'Register'}
        </h1>
        <p className="mt-3 text-neutral-600">
          Access your GigGuard AI dashboard to monitor risk and automated payouts.
        </p>

        <div className="mt-7 inline-flex rounded-full bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'register' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >
            Register
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          {mode === 'register' ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Full Name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none ring-neutral-900 transition focus:ring-2"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none ring-neutral-900 transition focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none ring-neutral-900 transition focus:ring-2"
            />
          </label>

          {error ? <p className="text-sm text-neutral-600">{error}</p> : null}

          <button
            type="submit"
            className="inline-flex rounded-full bg-neutral-900 px-8 py-3 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-0.5"
          >
            {mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </section>
    </div>
  )
}