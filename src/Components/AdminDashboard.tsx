import { useEffect, useState } from 'react'
import { useAuth } from '../useAuth'
import DashboardCards, { type DashboardStats } from '../Components/DashboardCards'
import DashboardCharts, { TransactionTelemetryChart, type ProgressionPoint } from '../Components/DashboardCharts'
import { API_ENDPOINTS, axios,getAPI_HEADER } from '../endpoint'

type AdminAPIStat = {
  ColumnName: string
  Value: string
};

type PaymentAdminRecord = {
  PaymentDate: string
  TotalTransactions: number
  TotalAmount: number
};

type AdminRequestProgression = {
  CaseDate: string
  CompletedCases: number
  LoggedCases: number
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDefaultDateRange(timeframe: 'daily' | 'weekly' | 'monthly') {
  // Default range: last 7 days (today and previous 6)
  const today = new Date()
  const toDate = formatDate(today)
  let from = new Date(today)
  let fromDate
  if (timeframe === 'daily' || timeframe === 'weekly') {
    from.setDate(today.getDate() - 6)
    fromDate = formatDate(from)
  } else {
    from.setMonth(today.getMonth() - 1)
    fromDate = formatDate(from)
  }
  return { fromDate, toDate }
}

function AdminDashboard() {
  const { user } = useAuth()
  const userTypeNorm = (user?.Usertype || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
  const isSuperAdmin = userTypeNorm === 'superadmin'

  const [superAdminStats, setSuperAdminStats] = useState<DashboardStats | null>(null)
  const [superAdminStatsLoading, setSuperAdminStatsLoading] = useState(false)
  const [superAdminStatsError, setSuperAdminStatsError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // Payment data for TransactionTelemetryChart
  const [allRecords, setAllRecords] = useState<any[]>([])
  const [paymentDataLoading, setPaymentDataLoading] = useState(false)
  const [paymentDataError, setPaymentDataError] = useState<string | null>(null)

  // Appeals/Verification progression chart data
  const [progressionData, setProgressionData] = useState<ProgressionPoint[]>([])
  const [progressionLoading, setProgressionLoading] = useState(false)
  const [progressionError, setProgressionError] = useState<string | null>(null)

  // Date range state for analytics chart (used for both progression and transactions)
  const [dateRange, setDateRange] = useState<{ fromDate: string; toDate: string }>(
    getDefaultDateRange('daily')
  )

  // When timeframe changes, reset the dateRange to default for that view
  useEffect(() => {
    setDateRange(getDefaultDateRange(timeframe))
  }, [timeframe])

  useEffect(() => {
    let ignore = false
    if (isSuperAdmin) {
      setSuperAdminStatsLoading(true)
      setSuperAdminStatsError(null)
      axios.get(
        API_ENDPOINTS.AdminDash,
        {
          headers: getAPI_HEADER()
        }
      )
        .then((res) => {
          if (ignore) return
          if (res?.data?.data && Array.isArray(res.data.data)) {
            const getVal = (name: string) => {
              const found = res.data.data.find((stat: AdminAPIStat) => stat.ColumnName === name)
              return found ? parseInt(found.Value, 10) || 0 : 0
            }
            setSuperAdminStats({
              totalCases: getVal('TotalCases'),
              casePending: getVal('CasePending'),
              caseResponded: getVal('CaseResponded'),
              caseRejected: getVal('CaseRejected'),
              requestsPending: getVal('RequestsPending'),
              requestsResponded: getVal('RequestsResponded')
            })
          } else {
            setSuperAdminStatsError('Invalid stats data received.')
          }
        })
        .catch(() => {
          setSuperAdminStatsError('Failed to load superadmin dashboard stats.')
        })
        .finally(() => {
          if (!ignore) setSuperAdminStatsLoading(false)
        })
    }
    return () => { ignore = true }
  }, [isSuperAdmin])

  useEffect(() => {
    let ignore = false
    if (isSuperAdmin) {
      setPaymentDataLoading(true)
      setPaymentDataError(null)
      const { fromDate, toDate } = dateRange
      axios.post(
        API_ENDPOINTS.PaymentAdminData,
        {
          fromDate,
          toDate
        },
        {
          headers: getAPI_HEADER()
        }
      )
      .then((res) => {
        if (ignore) return
        if (res?.data?.data && Array.isArray(res.data.data)) {
          // Adapt PaymentAdminRecord[] into TransactionTelemetryChart expected format
          const formatted = res.data.data.map((item: PaymentAdminRecord) => ({
            submittedAt: item.PaymentDate,
            amount: item.TotalAmount ?? 0,
            status: 'Paid',
            count: item.TotalTransactions ?? 0
          }))
          setAllRecords(formatted)
        } else {
          setPaymentDataError('Invalid payment telemetry data.')
          setAllRecords([])
        }
      })
      .catch(() => {
        setPaymentDataError('Failed to load payment telemetry data.')
        setAllRecords([])
      })
      .finally(() => {
        if (!ignore) setPaymentDataLoading(false)
      })
    }
    return () => { ignore = true }
  }, [isSuperAdmin, dateRange])

  useEffect(() => {
    let ignore = false
    if (isSuperAdmin) {
      setProgressionLoading(true)
      setProgressionError(null)
      const { fromDate, toDate } = dateRange
      axios.post(
        API_ENDPOINTS.AdminRequestProgress,
        {
          fromDate,
          toDate
        },
        {
          headers: getAPI_HEADER()
        }
      ).then(res => {
        if (ignore) return
        if (res?.data?.data && Array.isArray(res.data.data)) {
          // Adapt to ProgressionPoint[]
          const points: ProgressionPoint[] = res.data.data.map((item: AdminRequestProgression) => ({
            day: item.CaseDate ? item.CaseDate.slice(0,10) : undefined,
            label: item.CaseDate ? item.CaseDate.slice(5, 10) : undefined, // MM-DD for axis label
            logged: item.LoggedCases ?? 0,
            completed: item.CompletedCases ?? 0
          }))
          setProgressionData(points)
        } else {
          setProgressionError('Invalid progression data received.')
          setProgressionData([])
        }
      }).catch(() => {
        setProgressionError('Failed to load progression chart data.')
        setProgressionData([])
      }).finally(() => {
        if (!ignore) setProgressionLoading(false)
      })
    }
    return () => { ignore = true }
  }, [isSuperAdmin, dateRange])

  if (!isSuperAdmin) {
    // Only render for superadmin, otherwise show nothing
    return null
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-start font-securitas w-full   pt-5">
      <div className="w-full">

        {superAdminStatsLoading && (
          <div className="mb-4 p-4 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs text-center">
            Loading dashboard statistics...
          </div>
        )}
        {superAdminStatsError && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
            Failed to load dashboard stats: {superAdminStatsError}
          </div>
        )}

        {superAdminStats && (
          <>
            <DashboardCards userType={user?.Usertype} stats={superAdminStats} />

            <div className="my-2">
              <div className="flex justify-end gap-2 mb-6">
                <button
                  onClick={() => setTimeframe('daily')}
                  className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${timeframe === 'daily' ? 'bg-[#031f30] text-white' : 'bg-gray-100 text-slate-700'}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setTimeframe('weekly')}
                  className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${timeframe === 'weekly' ? 'bg-[#031f30] text-white' : 'bg-gray-100 text-slate-700'}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTimeframe('monthly')}
                  className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${timeframe === 'monthly' ? 'bg-[#031f30] text-white' : 'bg-gray-100 text-slate-700'}`}
                >
                  Monthly
                </button>
              </div>
              {/* APPEALS & VERIFICATION PROGRESSION */}
              <div>
                {progressionLoading && (
                  <div className="mb-4 p-3 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs text-center">
                    Loading progression chart...
                  </div>
                )}
                {progressionError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
                    {progressionError}
                  </div>
                )}
                <DashboardCharts
                  timeframe={timeframe}
                  progressionData={progressionData}
                  distribution={{
                    total: superAdminStats.totalCases || 0,
                    pending: superAdminStats.casePending || 0,
                    responded: superAdminStats.caseResponded || 0,
                    rejected: superAdminStats.caseRejected || 0
                  }}
                />
              </div>
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-6">
                  {/* FROM DATE */}
                  <label className="text-xs text-slate-600 font-medium" htmlFor="admin-txn-from">
                    From:
                  </label>
                  <input
                    id="admin-txn-from"
                    type="date"
                    className="border rounded px-2 py-1 text-xs"
                    max={dateRange.toDate}
                    value={dateRange.fromDate}
                    onChange={e =>
                      setDateRange(dr => {
                        const val = e.target.value
                        // Prevent from > to
                        if (val && val <= dr.toDate) {
                          return { ...dr, fromDate: val }
                        }
                        return dr
                      })
                    }
                  />
                  {/* TO DATE */}
                  <label className="text-xs text-slate-600 font-medium ml-4" htmlFor="admin-txn-to">
                    To:
                  </label>
                  <input
                    id="admin-txn-to"
                    type="date"
                    className="border rounded px-2 py-1 text-xs"
                    min={dateRange.fromDate}
                    max={formatDate(new Date())}
                    value={dateRange.toDate}
                    onChange={e =>
                      setDateRange(dr => {
                        const val = e.target.value
                        // Prevent to < from
                        if (val && val >= dr.fromDate) {
                          return { ...dr, toDate: val }
                        }
                        return dr
                      })
                    }
                  />
                </div>
                {paymentDataLoading && (
                  <div className="mb-4 p-4 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs text-center">
                    Loading transaction & revenue analytics...
                  </div>
                )}
                {paymentDataError && (
                  <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
                    Failed to load transaction stats: {paymentDataError}
                  </div>
                )}
                <TransactionTelemetryChart timeframe={timeframe} records={allRecords} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default AdminDashboard
