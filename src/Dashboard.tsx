import { useLocation, Link, Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { type MenuRoute, getDefaultDashboardRoute } from './auth-context'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import ServiceRequest from './Components/ServiceRequest'
import ServiceRequestReview from './Components/ServiceRequestReview'
import CandidateVerificationForm from './Components/CandidateVerificationForm'
import Contributor from './Components/Contributor'
import OrgMaster from './Components/OrgMaster'
import UserMaster from './Components/Usermaster'
import Recyclebin from './Components/Recyclebin'
import OtherServices from './Components/OtherServices'
import Invoice from './Components/Invoice'
import ClientRequest from './Components/ClientRequest'
import RecentAppealsTable from './Components/RecentAppealsTable'
import ConAdminUsermaster from './ContributorAdmin/ConAdminUsermaster'
import ConUserAddEmployee from './ContributorUser/ConUserAddEmployee'
import Client from './Components/Client'
import Navbar from './Components/Navbar'
import Sidebar from './Components/Sidebar'
import { flattenMenu, menuPath } from './Components/sidebar-utils'
import bgVideo from './assets/video/the_element_related_to_BGV.mp4'
import DashboardCards, {
  type DashboardStats,
  type FacilitatorDashboardCounts
} from './Components/DashboardCards'
import DashboardCharts, {
  TransactionTelemetryChart,
  type ProgressionPoint,
  type ComplianceDistribution
} from './Components/DashboardCharts'
import {
  type VerificationRecord
} from './Components/CandidateVerificationForm'
import { axios, API_ENDPOINTS, getAPI_HEADER } from './endpoint'
import ConAdminAddEmployee from './ContributorAdmin/ConAdminAddEmployee'
import ContributorServicerequest from './Components/ContributorServicerequest'
import ContributorDashboard from './ContributorDashboard'
import ClientDashboard from './ClientDashboard'
import AdminDashboard from './Components/AdminDashboard'
import Facilitatororgmap from './Components/Facilitatororgmap'
const EXTERNAL_LINKS: Record<string, boolean> = {
  'Privacypolicy.tsx': true,
  'Termsandconditions.tsx': true
}
import { CheckCircle2 } from 'lucide-react'

function MenuComponent({ item }: { item: MenuRoute | undefined }) {
  const { user } = useAuth()
  if (!item) return null
  if (item.components === 'ServiceRequest.tsx') return <ServiceRequest />
  if (item.components === 'ServiceRequestReview.tsx') return <ServiceRequestReview />
  if (item.components === 'ConUserAddEmployee.tsx') return <ConUserAddEmployee />
  if (item.components === 'ConAdminAddEmployee.tsx') return <ConAdminAddEmployee />
  if (item.components === 'Client.tsx') return <Client/>
  if (item.components === 'ClientRequest.tsx') return <ClientRequest />
  if (item.components === 'CandidateVerificationForm.tsx') return <CandidateVerificationForm />
  if (item.components === 'Contributor.tsx') return <Contributor />
  if (item.components === 'OrgMaster.tsx') return <OrgMaster />
  if (item.components === 'Usermaster.tsx') return <UserMaster />
  if (item.components === 'Recyclebin.tsx') return <Recyclebin />
  if (item.components === 'OtherServices.tsx') return <OtherServices />
  if (item.components === 'Invoice.tsx') return <Invoice />
  if (item.components === 'ConAdminUsermaster.tsx') return <ConAdminUsermaster />
  if (item.components === 'ContributorServicerequest.tsx') return <ContributorServicerequest />
  if (item.components === 'ContributorDashboard.tsx') return <ContributorDashboard />
  if (item.components === 'ClientDashboard.tsx') return <ClientDashboard />
  if (item.components === 'AdminDashboard.tsx') return <AdminDashboard />
  if (item.components === 'Facilitatororgmap.tsx') return <Facilitatororgmap />

  return null
}

function Dashboard() {
  const { user, menu, isMenuLoading, menuError } = useAuth()
  const location = useLocation()

  const [sidebarState, setSidebarState] = useState<'full' | 'mini' | 'closed'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'closed'
    }
    return 'full'
  })

  // Auto-close sidebar on mobile on route change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarState('closed')
    }
  }, [location.pathname])

  // Handle window resize between desktop and mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarState((prev) => (prev === 'mini' ? 'closed' : prev))
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const menuItems = flattenMenu(menu)

  const userTypeNorm = (user?.Usertype || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
  const isClientUser = userTypeNorm === 'client'
  const isContributorUser = userTypeNorm.includes('contributor')
  const isFacilitatorUser = userTypeNorm === 'fascilator' || userTypeNorm === 'facilitator'
  const showComplianceCharts = !isClientUser && !isContributorUser

  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [isRecordsLoading, setIsRecordsLoading] = useState(false)
  const [facilitatorCounts, setFacilitatorCounts] = useState<FacilitatorDashboardCounts | null>(null)
  const [facilitatorChartRecords, setFacilitatorChartRecords] = useState<Array<{
    submittedAt: string
    status: VerificationRecord['status']
  }>>([])
  const [facilitatorDashboardLoading, setFacilitatorDashboardLoading] = useState(false)
  const [facilitatorDashboardError, setFacilitatorDashboardError] = useState<string | null>(null)

  const loadFacilitatorDashboard = useCallback(async () => {
    setFacilitatorDashboardLoading(true)
    setFacilitatorDashboardError(null)
    try {
      const response = await axios.post(
        API_ENDPOINTS.FacilitatorDashboard,
        {},
        { headers: getAPI_HEADER() }
      )
      const counts = response.data?.counts
      if (!counts || typeof counts.total !== 'number') {
        throw new Error('The facilitator dashboard returned an invalid response.')
      }
      setFacilitatorCounts(counts)
      const rows = Array.isArray(response.data?.data) ? response.data.data : []
      setFacilitatorChartRecords(rows.map((row: { CreatedAt?: string; Status?: string }) => {
        const status = String(row.Status || '').toLowerCase().replace(/[\s_-]+/g, '')
        return {
          submittedAt: row.CreatedAt || '',
          status: status === 'approved' || status === 'downloaded'
            ? 'Verified'
            : status === 'inprogress' || status === 'appeal'
              ? 'In Progress'
              : status === 'rejected'
                ? 'Rejected'
                : 'Pending'
        }
      }))
    } catch (error: any) {
      setFacilitatorCounts(null)
      setFacilitatorChartRecords([])
      setFacilitatorDashboardError(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to load facilitator dashboard counts.'
      )
    } finally {
      setFacilitatorDashboardLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isFacilitatorUser && location.pathname === '/dashboard') {
      void loadFacilitatorDashboard()
    } else {
      setFacilitatorCounts(null)
      setFacilitatorChartRecords([])
      setFacilitatorDashboardError(null)
    }
  }, [isFacilitatorUser, location.pathname, user?.id, loadFacilitatorDashboard])

  // Dynamic records loaded directly from live API (ClientEmpData / ClientEmpStatus)
  const [allRecords, setAllRecords] = useState<VerificationRecord[]>([])

  // Unified client identification mapped to authenticated user
  const clientInfo = useMemo(() => {
    const idStr = user?.id ? `CL-${user.id}` : ''
    const nameStr =
      user?.CompanyName 
    const emailStr = (
      user?.EmailID ||
      'Client.worktrial@Securitas-india.com'
    ).trim()
    const derivedClientId =
      (user as any)?.clientId ||
      (user as any)?.ClientId ||
      (user as any)?.clientEmployeeId ||
      idStr ||
      (user?.username ? `CL-${user.username.split('@')[0]}` : 'CL-2026')
    return {
      clientId: derivedClientId,
      clientName: nameStr,
      clientEmail: emailStr,
      rawId: user?.id ? String(user.id) : '',
    }
  }, [user])



  useEffect(() => {
    try {
      localStorage.removeItem('worktrail_verification_records')
    } catch {}

  }, [location.pathname, user])

  // Dynamic records for stats & telemetry charts
  const filteredRecords = allRecords

  // 1. Dynamic Dashboard Stats
  const stats: DashboardStats = {
    totalCases: filteredRecords.length,
    casePending: filteredRecords.filter(r => r.status === 'Pending' || (r.status as any) === 'In Progress').length,
    caseResponded: filteredRecords.filter(r => r.status === 'Verified').length,
    caseRejected: filteredRecords.filter(r => r.status === 'Rejected').length,
    requestsPending: filteredRecords.filter(r => r.status === 'Pending').length,
    requestsResponded: filteredRecords.filter(r => r.status === 'Verified').length,
  }

  // 2. Dynamic Compliance Distribution
  const distribution: ComplianceDistribution = {
    total: isFacilitatorUser ? facilitatorCounts?.total || 0 : filteredRecords.length,
    pending: isFacilitatorUser
      ? (facilitatorCounts?.pending || 0) + (facilitatorCounts?.inProgress || 0)
      : stats.casePending,
    responded: isFacilitatorUser
      ? (facilitatorCounts?.approved || 0) + (facilitatorCounts?.downloaded || 0)
      : stats.caseResponded,
    rejected: isFacilitatorUser ? facilitatorCounts?.rejected || 0 : stats.caseRejected,
    ...(isFacilitatorUser ? { appeal: facilitatorCounts?.appeal || 0 } : {}),
  }

  // 3. Dynamic Progression Points based on Timeframe
  const getProgressionData = (): ProgressionPoint[] => {
    if (timeframe === 'daily') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const counts: Record<string, { logged: number; completed: number }> = {}
      days.forEach(d => { counts[d] = { logged: 0, completed: 0 } })

      const chartRecords = isFacilitatorUser ? facilitatorChartRecords : filteredRecords
      chartRecords.forEach(r => {
        const d = new Date(r.submittedAt)
        const dayIdx = (d.getDay() + 6) % 7 // 0 = Mon, 6 = Sun
        const dayName = days[dayIdx]
        if (counts[dayName]) {
          counts[dayName].logged += 1
          if (r.status === 'Verified') {
            counts[dayName].completed += 1
          }
        }
      })

      return days.map(day => ({
        label: day,
        logged: counts[day].logged,
        completed: counts[day].completed
      }))
    } else if (timeframe === 'weekly') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      const counts: Record<string, { logged: number; completed: number }> = {}
      weeks.forEach(w => { counts[w] = { logged: 0, completed: 0 } })

      const chartRecords = isFacilitatorUser ? facilitatorChartRecords : filteredRecords
      chartRecords.forEach(r => {
        const d = new Date(r.submittedAt)
        const dateNum = d.getDate()
        const weekIdx = Math.min(Math.floor((dateNum - 1) / 7), 3)
        const weekName = weeks[weekIdx]
        if (counts[weekName]) {
          counts[weekName].logged += 1
          if (r.status === 'Verified') {
            counts[weekName].completed += 1
          }
        }
      })

      return weeks.map(w => ({
        label: w,
        logged: counts[w].logged,
        completed: counts[w].completed
      }))
    } else {
      // monthly
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const counts: Record<string, { logged: number; completed: number }> = {}
      months.forEach(m => { counts[m] = { logged: 0, completed: 0 } })

      const chartRecords = isFacilitatorUser ? facilitatorChartRecords : filteredRecords
      chartRecords.forEach(r => {
        const d = new Date(r.submittedAt)
        const mIdx = d.getMonth()
        const mName = months[mIdx]
        if (counts[mName]) {
          counts[mName].logged += 1
          if (r.status === 'Verified') {
            counts[mName].completed += 1
          }
        }
      })

      return months.map(m => ({
        label: m,
        logged: counts[m].logged,
        completed: counts[m].completed
      }))
    }
  }

  const progressionData = getProgressionData()

  // If user is Client and currently on the /CandidateVerification route, render the verification form
  if (user?.Usertype?.toLowerCase() === 'client' && location.pathname === '/CandidateVerification') {
    return <CandidateVerificationForm />
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex font-securitas w-full">
      <Sidebar
        state={sidebarState}
        onClose={() => setSidebarState('closed')}
        userType={user?.Usertype}
        menu={menu}
        isLoading={isMenuLoading}
        error={menuError}
      />
      <section className="flex-1 flex flex-col justify-between min-h-screen bg-[#F8FAFC] p-6 sm:p-8 transition-all duration-300 overflow-x-hidden">
        <div>
          <Navbar sidebarState={sidebarState} onToggleSidebar={() => {
            setSidebarState((prev) => {
              if (window.innerWidth < 768) {
                return prev === 'closed' ? 'full' : 'closed'
              }
              if (prev === 'full') return 'mini'
              if (prev === 'mini') return 'closed'
              return 'full'
            })
          }} />

          {location.pathname === '/dashboard' ? (
            <>
              {/* Success Notification Banner if just submitted */}
              {location.state?.newRequestId && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between text-emerald-900 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">
                        Candidate Verificatdkdkion Request {location.state.newRequestId} Submitted!
                      </h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Request for <strong>{location.state.candidateName || 'Candidate'}</strong> is now queued as <strong>'Pending'</strong> and shown in the table below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Banner Card */}
              <div className="relative rounded-3xl overflow-hidden bg-[#031f30] text-white p-8 mb-8 shadow-sm flex flex-col items-end justify-between min-h-[220px]">
                {/* Background Video */}
                <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none opacity-45">
                  <video
                    className="object-fill absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src={bgVideo} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-l from-[#031f30] via-[#031f30]/10 to-transparent z-10"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-lg mt-auto flex flex-col items-end">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                    {user?.Usertype?.toLowerCase() === 'client' ? 'CLIENT VERIFICATION PORTAL' : 'WORKTRAIL DASHBOARD'}
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm text-end leading-relaxed mb-6">
                    {user?.Usertype?.toLowerCase() === 'client'
                      ? 'Submit candidate verification requests and monitor live background screening progress in real-time.'
                      : 'Candidate background verification portal. Access compliance audit parameters, telemetry signals, and physical checks.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {/* {user?.Usertype?.toLowerCase() === 'client' && (
                      <>
                        <Link to="/ClientRequest">
                          <button className="flex items-center gap-2 h-11 px-5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs tracking-wider uppercase rounded-full transition-all shadow-sm cursor-pointer select-none">
                            CLIENT REQUESTS
                          </button>
                        </Link>
                      
                      </>
                    )} */}
                    {/* <Link
                      to={
                        isClientUser
                          ? '/CandidateVerification'
                          : userTypeNorm.includes('contributoradmin') || userTypeNorm === 'admincontributor'
                          ? '/ConAdminAddEmployee'
                          : '/AddEmployee'
                      }
                    >
                      <button className="flex items-center gap-2.5 h-11 px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_4px_15px_rgba(8,33,54,0.25)] active:scale-[0.98] text-white font-bold text-xs tracking-wider uppercase rounded-full transition-all shadow-md cursor-pointer select-none">
                        {isClientUser ? 'NEW VERIFICATION REQUEST' : 'ADD CANDIDATE'}
                      </button>
                    </Link> */}
                  </div>
                </div>
              </div>

              {/* Six Metrics Cards Component */}
              {isFacilitatorUser && facilitatorDashboardError && (
                <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <span>{facilitatorDashboardError}</span>
                  <button
                    type="button"
                    onClick={() => void loadFacilitatorDashboard()}
                    disabled={facilitatorDashboardLoading}
                    className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-100 disabled:opacity-60"
                  >
                    {facilitatorDashboardLoading ? 'Retrying…' : 'Retry'}
                  </button>
                </div>
              )}
              {isFacilitatorUser && facilitatorDashboardLoading && !facilitatorCounts ? (
                <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Loading counts for your mapped organizations…
                </div>
              ) : (
                <DashboardCards
                  userType={user?.Usertype}
                  stats={stats}
                  facilitatorCounts={facilitatorCounts}
                />
              )}

              {/* Switcher Header & Charts Component - Hidden for Client and Contributor roles (Contributor User & Admin) per user request */}
              {showComplianceCharts && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none uppercase">Compliance Analytics</h3>
                      <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-1.5 block">SENTINEL TELEMETRY CHARTS</span>
                    </div>
                    <div className="bg-slate-100 rounded-full p-1 flex gap-1.5 text-xs font-bold text-slate-500">
                      <button
                        type="button"
                        onClick={() => setTimeframe('daily')}
                        className={`px-3.5 py-1.5 rounded-full uppercase cursor-pointer transition-all ${
                          timeframe === 'daily'
                            ? 'bg-[#031f30] text-white shadow-xs'
                            : 'hover:text-slate-800 text-slate-500'
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeframe('weekly')}
                        className={`px-3.5 py-1.5 rounded-full uppercase cursor-pointer transition-all ${
                          timeframe === 'weekly'
                            ? 'bg-[#031f30] text-white shadow-xs'
                            : 'hover:text-slate-800 text-slate-500'
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeframe('monthly')}
                        className={`px-3.5 py-1.5 rounded-full uppercase cursor-pointer transition-all ${
                          timeframe === 'monthly'
                            ? 'bg-[#031f30] text-white shadow-xs'
                            : 'hover:text-slate-800 text-slate-500'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>

                  {/* Two Column Charts Component */}
                  <DashboardCharts
                    timeframe={timeframe}
                    progressionData={progressionData}
                    distribution={distribution}
                  />

                  {/* Superadmin Exclusive: Full-Width Transaction & Revenue Telemetry Chart Under Compliance Analytics */}
                  {userTypeNorm === 'superadmin' && (
                    <div className="mt-8">
                      <TransactionTelemetryChart timeframe={timeframe} records={allRecords} />
                    </div>
                  )}
                </>
              )}

              {/* Recent Appeals Title & Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-8 select-none">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none uppercase">
                    {user?.Usertype?.toLowerCase() === 'client' ? 'Candidate Verification Requests' : 'Recent Appeals'}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-1.5 block">
                    {user?.Usertype?.toLowerCase() === 'client' ? 'LIVE VERIFICATION STATUS & CANDIDATE LOGS' : 'VERIFICATION LOGS & APPEALS ACTION'}
                  </span>
                </div>
                {clientInfo.clientId && (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                      Client ID
                    </span>
                    <span className="font-extrabold text-slate-900 ">{clientInfo.clientId}</span>
                    {clientInfo.clientName && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-600 truncate max-w-[180px]">{clientInfo.clientName}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Appeals Data Table */}
              <RecentAppealsTable
                records={allRecords}
                onRecordsLoaded={(recs) => setAllRecords(recs)}
                refreshing={isRecordsLoading}
                isClient={isClientUser}
                defaultClientId={clientInfo.clientId}
              />
            </>
          ) : location.pathname === '/ServiceRequestReview' || location.pathname.startsWith('/ServiceRequestReview') ? (
            <ServiceRequestReview />
          ) : location.pathname === '/ClientRequest' || location.pathname.startsWith('/ClientRequest') ? (
            <ClientRequest />
          ) : (
            (() => {
              const activeMenuItem = menuItems.find((item) => menuPath(item.Route) === location.pathname)
              if (activeMenuItem && activeMenuItem.components && EXTERNAL_LINKS[activeMenuItem.components]) {
                return null
              }
              if (!activeMenuItem) {
                return <Navigate to={getDefaultDashboardRoute(user?.Usertype)} replace />
              }
              return <MenuComponent item={activeMenuItem} />
            })()
          )}
        </div>

        {/* Secure Network Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-12 border-t border-slate-100 pt-6">
          <span>WALSONS SECURED NETWORK</span>
          <div className="flex items-center gap-4">
            <Link to="/Privacypolicy" className="hover:underline text-slate-400">PRIVACY POLICY</Link>
            <span>|</span>
            <span>COPYRIGHT © DESIGNED & DEVELOPED BY SECURITAS BGV 2026</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Dashboard
