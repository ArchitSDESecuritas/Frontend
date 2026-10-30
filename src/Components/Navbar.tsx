import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { Menu, LogOut, User as UserIcon, Clock } from 'lucide-react'
import securitasLogo from '../assets/Img/logo_w.png'

type NavbarProps = {
  sidebarState: 'full' | 'mini' | 'closed'
  onToggleSidebar: () => void
}

function Navbar({ sidebarState, onToggleSidebar }: NavbarProps) {
  const { user, logout, remainingSeconds } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout(false)
  }

  const displayName = user?.username || 'User'
  const companyName = user?.CompanyName

  const minutes = Math.floor((remainingSeconds || 0) / 60)
  const seconds = String((remainingSeconds || 0) % 60).padStart(2, '0')

  return (
    <header className="flex items-center justify-between w-full h-16 mb-6 select-none bg-white rounded-2xl p-3 shadow-xs border border-slate-100">
      {/* Toggle button and Brand Logo */}
      <div className="w-full flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#031f30] transition-colors cursor-pointer select-none focus:outline-none"
            type="button"
            aria-label={sidebarState === 'full' ? 'Collapse sidebar' : sidebarState === 'mini' ? 'Close sidebar' : 'Open sidebar'}
            onClick={onToggleSidebar}
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src={securitasLogo}
            alt="Securitas"
            className="h-6 sm:h-7 object-contain hidden xs:block"
          />
        </div>

        {/* Welcome Text & Company */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600">
            <span>Welcome,</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-[#0680A6]" />
              {displayName}
            </span>
          </div>
          {companyName && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 hidden sm:inline-flex">
              {companyName}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions & Session Timer */}
      <div className="flex items-center gap-2 sm:gap-3 ml-3 shrink-0">
        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-50 border border-slate-200/80 text-slate-600"
          title="Session auto-logs out after 10m inactivity. Active movements reset timer."
        >
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden lg:inline text-slate-400">Session:</span>
          <span className="font-mono text-slate-800 font-semibold">{minutes}:{seconds}</span>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          title="Logout"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/60 hover:border-rose-200 text-xs font-bold transition-all cursor-pointer select-none"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}

export default Navbar
