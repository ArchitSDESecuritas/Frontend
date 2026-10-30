import { useState, useEffect } from 'react'
import {
  Folder,
  CheckCircle2,
  ListChecks,
  Ban,
  ListTodo,
  Activity,
  Maximize2,
  Columns,
} from 'lucide-react'

export interface ProgressionPoint {
  day?: string
  label?: string
  logged: number
  completed: number
}

export interface ComplianceDistribution {
  total: number
  pending: number
  responded: number
  rejected: number
  appeal?: number
}

interface DashboardChartsProps {
  timeframe?: 'daily' | 'weekly' | 'monthly'
  progressionData?: ProgressionPoint[]
  distribution?: ComplianceDistribution
}

export function DashboardCharts({
  timeframe = 'daily',
  progressionData,
  distribution
}: DashboardChartsProps) {
  const defaultDailyData: ProgressionPoint[] = [
    { label: 'Mon', logged: 0, completed: 0 },
    { label: 'Tue', logged: 0, completed: 0 },
    { label: 'Wed', logged: 0, completed: 0 },
    { label: 'Thu', logged: 0, completed: 0 },
    { label: 'Fri', logged: 0, completed: 0 },
    { label: 'Sat', logged: 0, completed: 0 },
    { label: 'Sun', logged: 0, completed: 0 },
  ]

  const chartData = progressionData && progressionData.length > 0
    ? progressionData.map(d => ({ ...d, label: d.label || d.day || '' }))
    : defaultDailyData

  // Calculate dynamic max value for scaling bar heights
  const maxVal = Math.max(...chartData.map(d => Math.max(d.logged, d.completed)), 1)
  const yTicks = [
    Math.round(maxVal),
    Math.round((maxVal * 2) / 3),
    Math.round(maxVal / 3),
    0
  ]

  // Distribution calculations
  const dist = distribution || {
    total: 0,
    pending: 0,
    responded: 0,
    rejected: 0
  }

  const total = Math.max(dist.total, dist.pending + dist.responded + dist.rejected, 1)
  const respondedPct = (dist.responded / total) * 100
  const pendingPct = (dist.pending / total) * 100
  const rejectedPct = (dist.rejected / total) * 100
  const appealPct = ((dist.appeal || 0) / total) * 100

  // SVG Circumference: 2 * PI * 38 ≈ 238.76
  const C = 238.76
  const respondedOffset = C - (respondedPct / 100) * C
  const pendingOffset = C - (pendingPct / 100) * C
  const rejectedOffset = C - (rejectedPct / 100) * C

  const respondedRotation = -90
  const pendingRotation = -90 + (respondedPct / 100) * 360
  const rejectedRotation = pendingRotation + (pendingPct / 100) * 360
  const appealOffset = C - (appealPct / 100) * C
  const appealRotation = rejectedRotation + (rejectedPct / 100) * 360

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Chart 1: Appeals Progression */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            APPEALS & VERIFICATION PROGRESSION
          </span>
          <span className="text-[9px] font-bold text-[#42638C] bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {timeframe.toUpperCase()} METRICS
          </span>
        </div>
        
        {/* Legends */}
        <div className="flex gap-4 justify-center mb-6 text-[11px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#5850EC]"></span>
            <span>Logged Cases</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]"></span>
            <span>Completed Cases</span>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="relative h-60 flex flex-col justify-between pt-4">
          {/* Grid lines */}
          <div className="absolute inset-x-0 bottom-6 top-4 flex flex-col justify-between pointer-events-none">
            <div className="border-b border-slate-100 w-full h-0"></div>
            <div className="border-b border-slate-100 w-full h-0"></div>
            <div className="border-b border-slate-100 w-full h-0"></div>
            <div className="border-b border-slate-200 w-full h-0"></div>
          </div>

          {/* Y-Axis & Bars */}
          <div className="flex-1 flex items-stretch">
            {/* Y Axis Labels */}
            <div className="w-7 flex flex-col justify-between text-[10px] text-slate-400 font-bold pr-2 pb-6">
              <span>{yTicks[0]}</span>
              <span>{yTicks[1]}</span>
              <span>{yTicks[2]}</span>
              <span>0</span>
            </div>

            {/* Columns Area */}
            <div className="flex-1 flex justify-around items-end pb-6">
              {chartData.map((item, idx) => (
                <div key={item.label || idx} className="flex flex-col items-center gap-2 group">
                  <div className="flex items-end gap-1.5 h-32 relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-1.5 py-0.5 bg-slate-900 text-white text-[9px] rounded font-mono z-20 whitespace-nowrap shadow-md">
                      L:{item.logged} | C:{item.completed}
                    </div>

                    {/* Logged Bar */}
                    <div 
                      style={{ height: `${Math.max((item.logged / maxVal) * 100, 4)}%` }} 
                      className="w-3 bg-[#5850EC] rounded-t transition-all duration-300 group-hover:brightness-110"
                    />
                    {/* Completed Bar */}
                    <div 
                      style={{ height: `${Math.max((item.completed / maxVal) * 100, 4)}%` }} 
                      className="w-3 bg-[#10B981] rounded-t transition-all duration-300 group-hover:brightness-110"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart 2: Compliance Distribution */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">COMPLIANCE DISTRIBUTION</span>
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            STATUS BREAKDOWN
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Dynamic Donut Chart SVG */}
          <div className="flex flex-col justify-center items-center relative">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#F1F5F9" 
                  strokeWidth="12" 
                />
                {/* Responded segment (Green) */}
                {dist.responded > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="transparent" 
                    stroke="#10B981" 
                    strokeWidth="12" 
                    strokeDasharray={C} 
                    strokeDashoffset={respondedOffset}
                    transform={`rotate(${respondedRotation} 50 50)`}
                    className="transition-all duration-500"
                  />
                )}
                {/* Pending segment (Orange/Amber) */}
                {dist.pending > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="transparent" 
                    stroke="#F59E0B" 
                    strokeWidth="12" 
                    strokeDasharray={C} 
                    strokeDashoffset={pendingOffset} 
                    transform={`rotate(${pendingRotation} 50 50)`}
                    className="transition-all duration-500"
                  />
                )}
                {/* Rejected segment (Red) */}
                {dist.rejected > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="transparent" 
                    stroke="#EF4444" 
                    strokeWidth="12" 
                    strokeDasharray={C} 
                    strokeDashoffset={rejectedOffset} 
                    transform={`rotate(${rejectedRotation} 50 50)`}
                    className="transition-all duration-500"
                  />
                )}
                {(dist.appeal || 0) > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#8B5CF6"
                    strokeWidth="12"
                    strokeDasharray={C}
                    strokeDashoffset={appealOffset}
                    transform={`rotate(${appealRotation} 50 50)`}
                    className="transition-all duration-500"
                  />
                )}
              </svg>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-900">{dist.total}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Cases</span>
              </div>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Total Cases', value: dist.total, pct: '100%', color: 'bg-[#5850EC]' },
              { label: 'Pending', value: dist.pending, pct: `${Math.round(pendingPct)}%`, color: 'bg-[#F59E0B]' },
              { label: 'Responded / Verified', value: dist.responded, pct: `${Math.round(respondedPct)}%`, color: 'bg-[#10B981]' },
              { label: 'Rejected', value: dist.rejected, pct: `${Math.round(rejectedPct)}%`, color: 'bg-[#EF4444]' },
              ...(dist.appeal ? [{ label: 'Appeals', value: dist.appeal, pct: `${Math.round(appealPct)}%`, color: 'bg-violet-500' }] : []),
            ].map((legend) => (
              <div key={legend.label} className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-slate-600 transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${legend.color}`}></span>
                  <span>{legend.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-extrabold">{legend.value}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({legend.pct})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export interface TransactionDataPoint {
  label: string
  revenue: number
  count: number
  paid: number
}

interface TransactionTelemetryChartProps {
  timeframe?: 'daily' | 'weekly' | 'monthly'
  records?: any[]
}

function computeTelemetryData(timeframe: 'daily' | 'weekly' | 'monthly', passedRecords?: any[]): TransactionDataPoint[] {
  const records: any[] = passedRecords || []

  if (timeframe === 'daily') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const map: Record<string, { revenue: number; count: number; paid: number }> = {}
    days.forEach((d) => { map[d] = { revenue: 0, count: 0, paid: 0 } })

    records.forEach((r) => {
      const d = new Date(r.submittedAt || Date.now())
      const dayIdx = (d.getDay() + 6) % 7
      const dayName = days[dayIdx]
      const amt = r.amount || 1499
      if (map[dayName]) {
        map[dayName].count += 1
        map[dayName].revenue += amt
        if (r.status !== 'Rejected') map[dayName].paid += 1
      }
    })

    return days.map((label) => ({
      label,
      revenue: map[label].revenue,
      count: map[label].count,
      paid: map[label].paid
    }))
  } else if (timeframe === 'weekly') {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    const map: Record<string, { revenue: number; count: number; paid: number }> = {}
    weeks.forEach((w) => { map[w] = { revenue: 0, count: 0, paid: 0 } })

    records.forEach((r) => {
      const d = new Date(r.submittedAt || Date.now())
      const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 3)
      const weekName = weeks[weekIdx]
      const amt = r.amount || 1499
      if (map[weekName]) {
        map[weekName].count += 1
        map[weekName].revenue += amt
        if (r.status !== 'Rejected') map[weekName].paid += 1
      }
    })

    return weeks.map((label) => ({
      label,
      revenue: map[label].revenue,
      count: map[label].count,
      paid: map[label].paid
    }))
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const map: Record<string, { revenue: number; count: number; paid: number }> = {}
    months.forEach((m) => { map[m] = { revenue: 0, count: 0, paid: 0 } })

    records.forEach((r) => {
      const d = new Date(r.submittedAt || Date.now())
      const mIdx = d.getMonth()
      const mName = months[mIdx]
      const amt = r.amount || 1499
      if (map[mName]) {
        map[mName].count += 1
        map[mName].revenue += amt
        if (r.status !== 'Rejected') map[mName].paid += 1
      }
    })

    return months.map((label) => ({
      label,
      revenue: map[label].revenue,
      count: map[label].count,
      paid: map[label].paid
    }))
  }
}

export function TransactionTelemetryChart({ timeframe = 'daily', records }: TransactionTelemetryChartProps) {
  const [currentData, setCurrentData] = useState<TransactionDataPoint[]>(() => {
    return computeTelemetryData(timeframe, records)
  })

  useEffect(() => {
    setCurrentData(computeTelemetryData(timeframe, records))
  }, [timeframe, records])
  const maxRevenue = Math.max(...currentData.map(d => d.revenue), 1)
  const totalRevenue = currentData.reduce((acc, d) => acc + d.revenue, 0)
  const totalTransactions = currentData.reduce((acc, d) => acc + d.count, 0)
  const avgTicket = Math.round(totalRevenue / Math.max(totalTransactions, 1))

  const yTicks = [
    `₹${(maxRevenue / 1000).toFixed(0)}k`,
    `₹${((maxRevenue * 2) / 3000).toFixed(0)}k`,
    `₹${(maxRevenue / 3000).toFixed(0)}k`,
    '₹0'
  ]

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow mb-8 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold text-slate-400 tracking-wider uppercase">
              TRANSACTION & REVENUE ANALYTICS
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase tracking-wider border border-emerald-200">
              Superadmin Only
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time multi-gateway inflows, verification settlement telemetry, and invoicing volume.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2 flex flex-col items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Period Volume</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2 flex flex-col items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Orders</span>
            <span className="text-sm font-extrabold text-indigo-600 font-mono">
              {totalTransactions} txns
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2 flex flex-col items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Ticket</span>
            <span className="text-sm font-extrabold text-emerald-600 font-mono">
              ₹{avgTicket.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 text-[11px] font-bold text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gradient-to-tr from-[#0680A6] to-[#10B981]"></span>
            <span>Settled Revenue (₹)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Transaction Count</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Gateway: <strong className="text-slate-700">Razorpay Auto-Settlement</strong> (99.8% SLA)
        </div>
      </div>

      {/* Full Width Bar Chart Container */}
      <div className="relative h-64 flex flex-col justify-between pt-4">
        {/* Grid lines */}
        <div className="absolute inset-x-0 bottom-6 top-4 flex flex-col justify-between pointer-events-none">
          <div className="border-b border-slate-100 w-full h-0"></div>
          <div className="border-b border-slate-100 w-full h-0"></div>
          <div className="border-b border-slate-100 w-full h-0"></div>
          <div className="border-b border-slate-200 w-full h-0"></div>
        </div>

        {/* Y-Axis & Bars */}
        <div className="flex-1 flex items-stretch">
          {/* Y Axis Labels */}
          <div className="w-12 flex flex-col justify-between text-[10px] text-slate-400 font-mono font-bold pr-2 pb-6">
            <span>{yTicks[0]}</span>
            <span>{yTicks[1]}</span>
            <span>{yTicks[2]}</span>
            <span>{yTicks[3]}</span>
          </div>

          {/* Columns Area */}
          <div className="flex-1 flex justify-around items-end pb-6 gap-2">
            {currentData.map((item, idx) => {
              const heightPct = Math.max((item.revenue / maxRevenue) * 100, 6)
              return (
                <div key={item.label || idx} className="flex-1 flex flex-col items-center gap-2 group max-w-[60px]">
                  <div className="w-full flex items-end justify-center h-40 relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center px-2.5 py-1.5 bg-slate-900 text-white text-[10px] rounded-xl font-mono z-30 whitespace-nowrap shadow-xl border border-slate-700">
                      <span className="font-bold text-emerald-400">₹{item.revenue.toLocaleString('en-IN')}</span>
                      <span className="text-[9px] text-slate-300">{item.count} orders ({item.paid} paid)</span>
                    </div>

                    {/* Gradient Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[32px] bg-gradient-to-t from-[#0680A6] to-[#10B981] rounded-t-xl transition-all duration-300 group-hover:brightness-110 shadow-xs relative"
                    >
                      {/* Inner highlight */}
                      <div className="absolute inset-x-1 top-1 h-1 bg-white/30 rounded-full"></div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold truncate max-w-full">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

 
export interface ContributorCardItem {
  columnName: string
  value: string | number
}
 
export interface ContributorBarChartProps {
  cards: ContributorCardItem[]
  loading?: boolean
}
 
const contributorMetricMeta: Record<
  string,
  {
    title: string
    shortLabel: string
    color: string
    gradient: string
    border: string
    iconBg: string
    textColor: string
    icon: React.ElementType
  }
> = {
  ContributorCount: {
    title: 'Contributor Count',
    shortLabel: 'Contributors',
    color: '#6366F1',
    gradient: 'from-[#4F46E5] to-[#6366F1]',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-50 text-indigo-600',
    textColor: 'text-indigo-600',
    icon: Folder,
  },
  TotalRequest: {
    title: 'Total Requests',
    shortLabel: 'Total Requests',
    color: '#3B82F6',
    gradient: 'from-[#2563EB] to-[#38BDF8]',
    border: 'border-blue-200',
    iconBg: 'bg-blue-50 text-blue-600',
    textColor: 'text-blue-600',
    icon: ListChecks,
  },
  CompletedRequest: {
    title: 'Completed Requests',
    shortLabel: 'Completed',
    color: '#10B981',
    gradient: 'from-[#059669] to-[#10B981]',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-600',
    textColor: 'text-emerald-600',
    icon: CheckCircle2,
  },
  PendingRequest: {
    title: 'Pending Requests',
    shortLabel: 'Pending',
    color: '#F59E0B',
    gradient: 'from-[#D97706] to-[#F59E0B]',
    border: 'border-amber-200',
    iconBg: 'bg-amber-50 text-amber-600',
    textColor: 'text-amber-600',
    icon: Ban,
  },
  InProgressRequest: {
    title: 'In Progress Requests',
    shortLabel: 'In Progress',
    color: '#EC4899',
    gradient: 'from-[#DB2777] to-[#EC4899]',
    border: 'border-pink-200',
    iconBg: 'bg-pink-50 text-pink-600',
    textColor: 'text-pink-600',
    icon: ListTodo,
  },
}
 
function getContributorMeta(columnName: string) {
  if (contributorMetricMeta[columnName]) {
    return contributorMetricMeta[columnName]
  }
  const key = Object.keys(contributorMetricMeta).find(
    (k) => k.toLowerCase() === columnName.toLowerCase()
  )
  if (key) return contributorMetricMeta[key]
 
  const title =
    columnName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (str) => str.toUpperCase()) || columnName
 
  return {
    title,
    shortLabel: title,
    color: '#0D9488',
    gradient: 'from-[#0D9488] to-[#14B8A6]',
    border: 'border-teal-200',
    iconBg: 'bg-teal-50 text-teal-600',
    textColor: 'text-teal-600',
    icon: Activity,
  }
}
 
export function ContributorBarChart({
  cards = [],
  loading = false,
}: ContributorBarChartProps) {
  const [viewMode, setViewMode] = useState<'split' | 'expanded'>('split')
 
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 animate-pulse">
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 h-80 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="h-4 bg-slate-200 rounded w-48"></div>
            <div className="h-4 bg-slate-200 rounded w-24"></div>
          </div>
          <div className="h-44 flex items-end justify-around gap-4 pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-10 bg-slate-200 rounded-t-xl"
                  style={{ height: `${30 + i * 15}%` }}
                ></div>
                <div className="w-12 h-3 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 h-80 flex flex-col justify-between shadow-sm">
          <div className="h-4 bg-slate-200 rounded w-36 mb-6"></div>
          <div className="w-40 h-40 rounded-full border-8 border-slate-100 self-center"></div>
          <div className="h-3 bg-slate-100 rounded w-3/4 self-center mt-4"></div>
        </div>
      </div>
    )
  }
 
  // Parse card values into numbers
  const chartItems = cards.map((card) => {
    const rawVal =
      typeof card.value === 'number'
        ? card.value
        : parseInt(String(card.value || '0').replace(/[^0-9.-]+/g, ''), 10)
    const numericVal = isNaN(rawVal) ? 0 : rawVal
    const meta = getContributorMeta(card.columnName)
    return {
      columnName: card.columnName,
      numericVal,
      meta,
    }
  })
 
  if (chartItems.length === 0) {
    return null
  }
 
  // Extract core metric values
  const totalItem = chartItems.find((i) =>
    i.columnName.toLowerCase().includes('total')
  )
  const completedItem = chartItems.find((i) =>
    i.columnName.toLowerCase().includes('complet')
  )
  const pendingItem = chartItems.find((i) =>
    i.columnName.toLowerCase().includes('pend')
  )
  const inProgressItem = chartItems.find(
    (i) =>
      i.columnName.toLowerCase().includes('progress') ||
      i.columnName.toLowerCase().includes('process')
  )
  const contributorCountItem = chartItems.find((i) =>
    i.columnName.toLowerCase().includes('contributor')
  )
 
  const completedCount = completedItem?.numericVal || 0
  const pendingCount = pendingItem?.numericVal || 0
  const inProgressCount = inProgressItem?.numericVal || 0
  const totalCount = totalItem
    ? totalItem.numericVal
    : completedCount + pendingCount + inProgressCount
 
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
 
  // Chart scaling
  const maxVal = Math.max(...chartItems.map((d) => d.numericVal), 1)
  const chartMax = Math.max(Math.ceil(maxVal * 1.15), 5)
  const yTicks = [
    chartMax,
    Math.round((chartMax * 3) / 4),
    Math.round((chartMax * 2) / 4),
    Math.round(chartMax / 4),
    0,
  ]
 
  // Distribution Donut SVG math
  const donutTotal = Math.max(
    totalCount,
    completedCount + pendingCount + inProgressCount,
    1
  )
  const completedPct = (completedCount / donutTotal) * 100
  const inProgressPct = (inProgressCount / donutTotal) * 100
  const pendingPct = (pendingCount / donutTotal) * 100
 
  const C = 238.76
  const completedOffset = C - (completedPct / 100) * C
  const inProgressOffset = C - (inProgressPct / 100) * C
  const pendingOffset = C - (pendingPct / 100) * C
 
  const completedRotation = -90
  const inProgressRotation = -90 + (completedPct / 100) * 360
  const pendingRotation = inProgressRotation + (inProgressPct / 100) * 360
 
  return (
    <div className="w-full mb-8">
      {/* Chart Section Header with View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 select-none">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-slate-500 tracking-wider uppercase">
              Contributor Performance Telemetry
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase tracking-wider border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Card Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time request metrics, completion ratio, and workflow volume visualized from your contributor cards.
          </p>
        </div>
 
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'split'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('expanded')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'expanded'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Bar Chart</span>
          </button>
        </div>
      </div>
 
      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 1. Bar Chart Card */}
        <div
          className={`${
            viewMode === 'expanded' ? 'lg:col-span-12' : 'lg:col-span-7'
          } bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
 
          {/* Card Top Title & Quick Legend */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
                Verification Request Telemetry
              </span>
              <span className="text-base font-extrabold text-slate-800 tracking-tight">
                Contributor Metrics Comparison
              </span>
            </div>
 
            {/* Quick KPI Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200">
                Total: <strong className="font-mono">{totalCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-[11px] border border-emerald-200">
                Completed: <strong className="font-mono">{completedCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-[11px] border border-indigo-200">
                Resolution: <strong className="font-mono">{completionRate}%</strong>
              </span>
            </div>
          </div>
 
          {/* Bar Chart Area */}
          <div className="relative h-64 sm:h-72 flex flex-col justify-between pt-4">
            {/* Grid lines */}
            <div className="absolute inset-x-0 bottom-12 top-4 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-slate-100 w-full h-0"></div>
              <div className="border-b border-slate-100 w-full h-0"></div>
              <div className="border-b border-slate-100 w-full h-0"></div>
              <div className="border-b border-slate-100 w-full h-0"></div>
              <div className="border-b border-slate-200 w-full h-0"></div>
            </div>
 
            {/* Y-Axis & Bars */}
            <div className="flex-1 flex items-stretch">
              {/* Y Axis Labels */}
              <div className="w-8 flex flex-col justify-between text-[10px] text-slate-400 font-mono font-bold pr-2 pb-12">
                <span>{yTicks[0]}</span>
                <span>{yTicks[1]}</span>
                <span>{yTicks[2]}</span>
                <span>{yTicks[3]}</span>
                <span>0</span>
              </div>
 
              {/* Columns Area */}
              <div className="flex-1 flex justify-around items-end pb-12 gap-2 sm:gap-4">
                {chartItems.map((item, idx) => {
                  const heightPct = Math.max(
                    (item.numericVal / chartMax) * 100,
                    item.numericVal > 0 ? 8 : 4
                  )
                  const Icon = item.meta.icon
                  const isTotal = item.columnName.toLowerCase().includes('total')
                  const isContributor = item.columnName.toLowerCase().includes('contributor')
                  const shareOfTotal =
                    !isTotal && !isContributor && totalCount > 0
                      ? ((item.numericVal / totalCount) * 100).toFixed(1)
                      : null
 
                  return (
                    <div
                      key={item.columnName || idx}
                      className="flex-1 flex flex-col items-center gap-2 group max-w-[85px] sm:max-w-[100px] relative select-none"
                    >
                      {/* Metric value on top of bar */}
                      <span className="text-xs sm:text-sm font-extrabold text-slate-700 font-mono tracking-tight transition-transform group-hover:scale-110 group-hover:text-slate-900">
                        {item.numericVal}
                      </span>
 
                      {/* Bar Container */}
                      <div className="w-full flex items-end justify-center h-40 sm:h-44 relative">
                        {/* Interactive Tooltip on Hover */}
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center px-3 py-1.5 bg-slate-900 text-white text-[10px] rounded-xl font-mono z-30 whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none transition-all">
                          <span className="font-bold text-slate-100">{item.meta.title}</span>
                          <span className="text-emerald-400 font-extrabold text-xs">
                            {item.numericVal}{' '}
                            {isContributor ? 'contributors' : 'requests'}
                          </span>
                          {shareOfTotal && (
                            <span className="text-[9px] text-slate-300">
                              {shareOfTotal}% of total requests
                            </span>
                          )}
                        </div>
 
                        {/* Styled Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[36px] sm:max-w-[48px] bg-gradient-to-t ${item.meta.gradient} rounded-t-xl sm:rounded-t-2xl transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-110 shadow-xs relative`}
                        >
                          {/* Inner gloss highlight */}
                          <div className="absolute inset-x-1.5 top-1 h-1 bg-white/35 rounded-full pointer-events-none" />
                        </div>
                      </div>
 
                      {/* Bottom Icon & Label */}
                      <div className="flex flex-col items-center gap-1 w-full mt-1">
                        <div
                          className={`p-1.5 rounded-lg ${item.meta.iconBg} transition-transform group-hover:scale-110`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 text-center leading-tight line-clamp-2 max-w-full">
                          {item.meta.shortLabel}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
 
        {/* 2. Status Distribution Donut Chart Card (in Split View mode) */}
        {viewMode === 'split' && (
          <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
 
            {/* Top Title */}
            <div className="relative z-10 flex justify-between items-center mb-6">
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
                  Status Compliance
                </span>
                <span className="text-base font-extrabold text-slate-800 tracking-tight">
                  Request Breakdown
                </span>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                Resolution Ratio
              </span>
            </div>
 
            {/* Donut Chart & Center Stat */}
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto py-2">
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="12"
                  />
                  {/* Completed segment (Emerald) */}
                  {completedCount > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeDasharray={C}
                      strokeDashoffset={completedOffset}
                      transform={`rotate(${completedRotation} 50 50)`}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* In Progress segment (Pink) */}
                  {inProgressCount > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#EC4899"
                      strokeWidth="12"
                      strokeDasharray={C}
                      strokeDashoffset={inProgressOffset}
                      transform={`rotate(${inProgressRotation} 50 50)`}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* Pending segment (Amber) */}
                  {pendingCount > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      strokeDasharray={C}
                      strokeDashoffset={pendingOffset}
                      transform={`rotate(${pendingRotation} 50 50)`}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                </svg>
 
                {/* Center Stat */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {completionRate}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Completed
                  </span>
                </div>
              </div>
 
              {/* Status Breakdown Legend Rows */}
              <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
                <div className="bg-slate-50/80 hover:bg-slate-50 rounded-xl p-2.5 flex justify-between items-center text-xs font-bold text-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-900 font-extrabold">{completedCount}</span>
                    <span className="text-[10px] text-slate-400">({Math.round(completedPct)}%)</span>
                  </div>
                </div>
 
                <div className="bg-slate-50/80 hover:bg-slate-50 rounded-xl p-2.5 flex justify-between items-center text-xs font-bold text-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]"></span>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-900 font-extrabold">{inProgressCount}</span>
                    <span className="text-[10px] text-slate-400">({Math.round(inProgressPct)}%)</span>
                  </div>
                </div>
 
                <div className="bg-slate-50/80 hover:bg-slate-50 rounded-xl p-2.5 flex justify-between items-center text-xs font-bold text-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-900 font-extrabold">{pendingCount}</span>
                    <span className="text-[10px] text-slate-400">({Math.round(pendingPct)}%)</span>
                  </div>
                </div>
 
                <div className="bg-blue-50/60 rounded-xl p-2.5 flex justify-between items-center text-xs font-bold text-blue-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>
                    <span>Total Volume</span>
                  </div>
                  <span className="font-extrabold font-mono">{totalCount} cases</span>
                </div>
              </div>
            </div>
 
            {/* Bottom Contributor count footnote if present */}
            {contributorCountItem && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-500" />
                  Assigned Contributors
                </span>
                <span className="font-extrabold text-slate-800 font-mono">
                  {contributorCountItem.numericVal}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
 
export const ContributorDashboardCharts = ContributorBarChart
 
 

export default DashboardCharts
