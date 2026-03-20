import { Navigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import type { ReactNode } from 'react'

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode
  allowedRoles?: Array<'admin' | 'client'>
}) {
  const { state } = useAppContext()
  const location = useLocation()

  if (state.authLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10 text-sm text-neutral-600 md:px-10">
        Checking account role...
      </div>
    )
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(state.userRole)) {
    const fallback = state.userRole === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}