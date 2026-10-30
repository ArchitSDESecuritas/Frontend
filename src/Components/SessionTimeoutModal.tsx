import { useEffect } from 'react'
import { useAuth } from '../useAuth'
import { AlertTriangle, Clock, LogOut, ShieldAlert } from 'lucide-react'

export default function SessionTimeoutModal() {
  const { isAuthenticated, isExpiringSoon, remainingSeconds, resetInactivityTimer, extendSession, logout } = useAuth()

  // If user is not authenticated or not expiring soon, do not show modal
  if (!isAuthenticated || !isExpiringSoon) {
    return null
  }

  // Allow pressing Enter or Space to stay logged in
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        resetInactivityTimer()
        extendSession()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetInactivityTimer, extendSession])

  const handleStayLoggedIn = async () => {
    resetInactivityTimer()
    await extendSession()
  }

  const handleLogout = () => {
    logout(false)
  }

  const formattedSeconds = String(Math.max(0, remainingSeconds)).padStart(2, '0')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 overflow-hidden transform transition-all animate-scale-in">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon & Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-pulse text-amber-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-black shadow-md">
              !
            </div>
          </div>

          <h3
            id="session-timeout-title"
            className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-tech uppercase"
          >
            Session Expiring Soon
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            You have been inactive for over 9 minutes. For security compliance, your session will automatically terminate in:
          </p>

          {/* Countdown Clock Display */}
          <div className="my-6 flex items-center justify-center gap-3 px-6 py-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-black text-amber-700 tracking-wider">
                00:{formattedSeconds}
              </span>
              <span className="text-[11px] font-bold text-amber-600/80 uppercase">sec</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 max-w-xs mb-6">
            Move your cursor, tap a key, or click <strong className="text-slate-600 font-semibold">Stay Signed In</strong> below to continue your current session.
          </p>

          {/* Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleStayLoggedIn}
              className="flex-1 flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold tracking-wider uppercase shadow-lg shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              Stay Signed In
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
