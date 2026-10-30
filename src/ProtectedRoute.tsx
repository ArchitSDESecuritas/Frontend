import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { useAuth } from './useAuth'
import {
  isRouteAllowedForUser,
  getDefaultDashboardRoute,
  normalizeUserRole
} from './auth-context'
import { ShieldX, ArrowLeft, LogOut, Home } from 'lucide-react'

type ProtectedRouteProps = {
  children?: ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()

  // 1. Unauthenticated users: redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const userRole = user?.Usertype || 'Client'
  const normUserRole = normalizeUserRole(userRole)
  const isSuperadmin = normUserRole.includes('superadmin')

  // 2. Explicit allowedRoles check if specified
  if (allowedRoles && allowedRoles.length > 0 && !isSuperadmin) {
    const isExplicitlyAllowed = allowedRoles.some((role) => {
      const normRole = normalizeUserRole(role)
      return normUserRole === normRole || normUserRole.includes(normRole)
    })

    if (!isExplicitlyAllowed) {
      return (
        <AccessDeniedView
          currentPath={location.pathname}
          userRole={userRole}
          defaultDashboard={getDefaultDashboardRoute(userRole)}
          onLogout={() => logout(false)}
        />
      )
    }
  }

  // 3. Global RBAC route permission check for current path
  const isAllowed = isRouteAllowedForUser(location.pathname, userRole)

  if (!isAllowed) {
    return (
      <AccessDeniedView
        currentPath={location.pathname}
        userRole={userRole}
        defaultDashboard={getDefaultDashboardRoute(userRole)}
        onLogout={() => logout(false)}
      />
    )
  }

  return children ? <>{children}</> : <Outlet />
}

/**
 * Access Denied display when a user tries to access a route beyond their role permissions
 */
function AccessDeniedView({
  currentPath,
  userRole,
  defaultDashboard,
  onLogout
}: {
  currentPath: string
  userRole: string
  defaultDashboard: string
  onLogout: () => void
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/90 text-center relative overflow-hidden animate-scale-in">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldX className="w-10 h-10 animate-bounce" style={{ animationDuration: '2s' }} />
        </div>

        <span className="inline-block text-[10px] font-black tracking-widest uppercase bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200 mb-3">
          403 Forbidden Access
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-tech uppercase">
          Access Restricted
        </h2>

        <p className="text-slate-500 text-xs sm:text-sm mt-3 leading-relaxed max-w-md mx-auto">
          Your account type <strong className="text-slate-800 font-bold">[{userRole}]</strong> does not have permission to view <code className="bg-slate-100 text-rose-600 px-2 py-0.5 rounded font-mono text-xs">{currentPath}</code>.
        </p>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={defaultDashboard}
            replace
            className="flex-1 flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-[#031f30] to-[#083344] hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold tracking-wider uppercase shadow-md transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Go to My Dashboard
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Route guard for public guest-only pages (e.g. /login, /register)
 * If user is already authenticated, redirects directly to their dashboard.
 */
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    const defaultRoute = getDefaultDashboardRoute(user.Usertype)
    return <Navigate to={defaultRoute} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
