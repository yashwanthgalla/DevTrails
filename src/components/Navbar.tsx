import { NavLink } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

function navLinkClass(isActive: boolean) {
  return [
    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900',
  ].join(' ')
}

export function Navbar() {
  const { state, logout } = useAppContext()

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <NavLink to="/" className="text-sm font-semibold tracking-tight text-neutral-900">
          GigGuard AI
        </NavLink>

        <nav className="flex items-center gap-1.5" aria-label="Main">
          <NavLink to="/" className={({ isActive }) => navLinkClass(isActive)}>
            Home
          </NavLink>
          {state.isAuthenticated && state.userRole === 'admin' ? (
            <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive)}>
              Admin
            </NavLink>
          ) : (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => navLinkClass(isActive)}>
                Dashboard
              </NavLink>
              <NavLink to="/payment" className={({ isActive }) => navLinkClass(isActive)}>
                Payment (Soon)
              </NavLink>
            </>
          )}
          {state.isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              Logout
            </button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => navLinkClass(isActive)}>
              Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}