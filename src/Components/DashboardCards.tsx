import { Folder, Clock, Check, CheckCircle2, AlertTriangle, HelpCircle, ThumbsUp } from 'lucide-react'

export interface DashboardStats {
  totalCases: number
  casePending: number
  caseResponded: number
  caseRejected: number
  requestsPending: number
  requestsResponded: number
}

export interface FacilitatorDashboardCounts {
  total: number
  pending: number
  inProgress: number
  approved: number
  downloaded: number
  appeal: number
  rejected: number
  downloadStatusComplete: number
}

interface DashboardCardsProps {
  userType?: string
  stats?: Partial<DashboardStats>
  facilitatorCounts?: FacilitatorDashboardCounts | null
}

export function DashboardCards({ userType, stats, facilitatorCounts }: DashboardCardsProps) {
  const ut = (userType || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
  const isFacilitator = ut === 'fascilator' || ut === 'facilitator'
  const isContributor = ut.includes('contributor') || isFacilitator
  const isClient = ut === 'client'

  const formatNumber = (val: number | undefined, fallback: number = 0) => {
    const num = val !== undefined ? val : fallback
    return String(num).padStart(2, '0')
  }

  const clientCards = [
    {
      title: 'TOTAL REQUESTS',
      value: formatNumber(stats?.totalCases, 0),
      sub: 'All submitted requests',
      icon: Folder,
      colorClass: 'text-[#5850EC]',
      barColor: 'bg-[#5850EC]',
      iconBg: 'bg-indigo-50 text-[#5850EC]',
    },
    {
      title: 'PENDING REQUESTS',
      value: formatNumber(stats?.casePending, 0),
      sub: 'Awaiting verifier review',
      icon: Clock,
      colorClass: 'text-orange-500',
      barColor: 'bg-orange-500',
      iconBg: 'bg-orange-50 text-orange-500',
    },
    {
      title: 'REJECTED REQUESTS',
      value: formatNumber(stats?.caseRejected, 0),
      sub: 'Discrepancy / Rejected',
      icon: AlertTriangle,
      colorClass: 'text-red-500',
      barColor: 'bg-red-500',
      iconBg: 'bg-red-50 text-red-500',
    },
    {
      title: 'VERIFIED REQUESTS',
      value: formatNumber(stats?.caseResponded, 0),
      sub: 'Cleared verifications',
      icon: CheckCircle2,
      colorClass: 'text-emerald-500',
      barColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-500',
    },
  ]

  const cards = [
    {
      title: 'TOTAL CASES',
      value: formatNumber(stats?.totalCases, 0),
      sub: 'Database records',
      icon: Folder,
      colorClass: 'text-[#5850EC]',
      barColor: 'bg-[#5850EC]',
      iconBg: 'bg-indigo-50 text-[#5850EC]',
    },
    {
      title: 'CASE PENDING',
      value: formatNumber(stats?.casePending, 0),
      sub: 'Active running checks',
      icon: Clock,
      colorClass: 'text-orange-500',
      barColor: 'bg-orange-500',
      iconBg: 'bg-orange-50 text-orange-500',
    },
    {
      title: 'CASE RESPONDED',
      value: formatNumber(stats?.caseResponded, 0),
      sub: 'Completed checks',
      icon: CheckCircle2,
      colorClass: 'text-emerald-500',
      barColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-500',
    },
    {
      title: 'CASE REJECTED',
      value: formatNumber(stats?.caseRejected, 0),
      sub: 'Disputed compliance',
      icon: AlertTriangle,
      colorClass: 'text-red-500',
      barColor: 'bg-red-500',
      iconBg: 'bg-red-50 text-red-500',
    },
    {
      title: 'REQUESTS PENDING',
      value: formatNumber(stats?.requestsPending, 0),
      sub: 'Running queries',
      icon: HelpCircle,
      colorClass: 'text-blue-500',
      barColor: 'bg-blue-500',
      iconBg: 'bg-blue-50 text-blue-500',
    },
    {
      title: 'REQUESTS RESPONDED',
      value: formatNumber(stats?.requestsResponded, 0),
      sub: 'Completed queries',
      icon: ThumbsUp,
      colorClass: 'text-pink-500',
      barColor: 'bg-pink-500',
      iconBg: 'bg-pink-50 text-pink-500',
    },
  ]

  const facilitatorCards = [
    {
      title: 'TOTAL CASES',
      value: formatNumber(facilitatorCounts?.total),
      sub: 'Cases for mapped organizations',
      icon: Folder,
      colorClass: 'text-[#5850EC]',
      barColor: 'bg-[#5850EC]',
      iconBg: 'bg-indigo-50 text-[#5850EC]',
    },
    {
      title: 'PENDING',
      value: formatNumber(facilitatorCounts?.pending),
      sub: 'Awaiting action',
      icon: Clock,
      colorClass: 'text-orange-500',
      barColor: 'bg-orange-500',
      iconBg: 'bg-orange-50 text-orange-500',
    },
    {
      title: 'IN PROGRESS',
      value: formatNumber(facilitatorCounts?.inProgress),
      sub: 'Currently being processed',
      icon: HelpCircle,
      colorClass: 'text-blue-500',
      barColor: 'bg-blue-500',
      iconBg: 'bg-blue-50 text-blue-500',
    },
    {
      title: 'APPROVED',
      value: formatNumber(facilitatorCounts?.approved),
      sub: 'Approved cases',
      icon: CheckCircle2,
      colorClass: 'text-emerald-500',
      barColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-500',
    },
    {
      title: 'DOWNLOADED',
      value: formatNumber(facilitatorCounts?.downloaded),
      sub: 'Downloaded cases',
      icon: ThumbsUp,
      colorClass: 'text-pink-500',
      barColor: 'bg-pink-500',
      iconBg: 'bg-pink-50 text-pink-500',
    },
    {
      title: 'APPEALS',
      value: formatNumber(facilitatorCounts?.appeal),
      sub: 'Cases under appeal',
      icon: AlertTriangle,
      colorClass: 'text-red-500',
      barColor: 'bg-red-500',
      iconBg: 'bg-red-50 text-red-500',
    },
    {
      title: 'DOWNLOAD STATUS 1',
      value: formatNumber(facilitatorCounts?.downloadStatusComplete),
      sub: 'Records flagged as downloaded',
      icon: Check,
      colorClass: 'text-teal-600',
      barColor: 'bg-teal-600',
      iconBg: 'bg-teal-50 text-teal-600',
    },
  ]

  const filteredCards = isFacilitator
    ? facilitatorCards
    : isClient
      ? clientCards
      : isContributor
        ? cards.filter(card => card.title !== 'CASE RESPONDED' && card.title !== 'CASE REJECTED')
        : cards;

  const gridColsClass = isFacilitator
    ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-7'
    : filteredCards.length === 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
  
  // Dynamic design variables based on role (Admin = small text / Contributor = large text)
  const titleSize = isClient || isContributor ? 'text-[12px]' : 'text-[11px]';
  const valueSize = isClient || isContributor ? 'text-3.5xl' : 'text-2.5xl';
  const subSize = isClient || isContributor ? 'text-[12px]' : 'text-[11px]';
  const cardPadding = isClient || isContributor ? 'p-6' : 'p-5';
  const contentSpacing = isClient || isContributor ? 'mt-5' : 'mt-4';

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${gridColsClass} gap-4 mb-8`}>
      {filteredCards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.title} className={`relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${cardPadding} flex flex-col`}>
            {/* Top Color Bar */}
            <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${card.barColor}`} />

            <div className="flex justify-between items-start mb-3">
              <span className={`font-bold text-slate-600 tracking-widest ${titleSize}`}>{card.title}</span>
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className={contentSpacing}>
              <span className={`font-extrabold block ${valueSize} ${card.colorClass}`}>{card.value}</span>
              <span className={`text-slate-500 font-medium mt-1.5 block ${subSize}`}>{card.sub}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
export default DashboardCards
