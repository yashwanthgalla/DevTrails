import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { NotificationCenter } from './components/NotificationCenter'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PaymentPage } from './pages/PaymentPage'
import { AdminPage } from './pages/AdminPage'

function App() {
  const location = useLocation()
  const isHomeRoute = location.pathname === '/'

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Navbar />
      <NotificationCenter />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={['client']}>
              <DashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/payment"
          element={(
            <ProtectedRoute allowedRoles={['client']}>
              <PaymentPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isHomeRoute ? (
        <footer className="border-t border-black/5 py-8">
          <p className="mx-auto w-full max-w-6xl px-6 text-center text-sm text-neutral-500 md:px-10">
            © {new Date().getFullYear()} GigGuard AI. Automated income protection for gig workers.
          </p>
        </footer>
      ) : null}
    </div>
  )
}

export default App
