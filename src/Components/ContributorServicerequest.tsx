import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import {
  ShieldCheck,
  Building2,
  User,
  ChevronDown,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Layers,
  Clock,
  CheckCheck,
  FileSpreadsheet,
  Inbox,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { API_ENDPOINTS,API_HEADER,getAPI_HEADER } from '../endpoint'
import axios from 'axios'

type DynamicRequestRow = Array<{
  Id: number
  DBFieldName: string
  DisplayFieldName: string
  DBFieldData: string | null
}>

type APIResponse = {
  data: DynamicRequestRow[]
  message: string
}

const API_URL = 'https://worktrail.ai/api/ContributorServiceRequest'
const API_KEY = 'Securitas@#!1234'

const DROPDOWN_STATUS_OPTIONS = [
  { label: 'All Status', value: '', color: 'bg-slate-400', desc: 'Display all records' },
  { label: 'Pending', value: 'Pending', color: 'bg-orange-500', desc: 'Awaiting verifier review' },
  { label: 'In Progress', value: 'InProgress', color: 'bg-[#0680A6]', desc: 'Currently in review' },
  { label: 'YTD from Client', value: 'YTDfromClient', color: 'bg-[#5850EC]', desc: 'Year-to-date downloads' },
]

const ContributorServicerequest: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<DynamicRequestRow[]>([])

  // Tabs & Filter states
  const [activeTab, setActiveTab] = useState<'completed' | 'raised_appeal' | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Detail modal state
  const [selectedRecord, setSelectedRecord] = useState<DynamicRequestRow | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const userTypeNorm = (user?.Usertype || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
  const isContributor = userTypeNorm.includes('contributor')

  if (!isContributor) {
    return <Navigate to="/dashboard" replace />
  }

  const isContributorAdmin = userTypeNorm.includes('contributoradmin') || userTypeNorm === 'admincontributor'
  const roleDisplayName = isContributorAdmin ? 'Contributor Admin' : 'Contributor User'
  const contributorName = user?.CompanyName ?? ''

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, pageSize])

  const fetchRequests = () => {
    if (!contributorName) return

    setLoading(true)
    setError(null)

    let reqBody: any = {
      Contributor: contributorName,
      ClientEmail: '',
      CreatedAt: '',
      EmployeeCode: '',
    }

    if (statusFilter === 'YTDfromClient') {
      reqBody.Downloadstatus = '1'
      reqBody.Status = ''
    } else if (statusFilter === 'Completed') {
      reqBody.Status = 'Downloaded'
      reqBody.Downloadstatus = '0'
    } else if (statusFilter === 'RaisedAppeal') {
      reqBody.Status = 'Appeal'
      reqBody.Downloadstatus = ''
    } else {
      reqBody.Status = statusFilter
      reqBody.Downloadstatus = ''
    }

    axios
      .post(
        API_ENDPOINTS.ContributorServiceRequest,
        reqBody,
        { headers: getAPI_HEADER() }
      )
      .then((resp) => {
        const apiData: APIResponse = resp.data
        if (apiData && Array.isArray(apiData.data)) {
          setRequests(apiData.data)
        } else {
          setRequests([])
        }
      })
      .catch((err) => {
        const message =
          (err.response && err.response.data && err.response.data.message) ||
          err.message ||
          'Error loading data'
        setError(message)
        setRequests([])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchRequests()
  }, [contributorName, statusFilter])

  // Tab Selection Handler
  const handleTabChange = (tab: 'completed' | 'raised_appeal') => {
    if (activeTab === tab) {
      setActiveTab(null)
      setStatusFilter('')
    } else {
      setActiveTab(tab)
      if (tab === 'completed') {
        setStatusFilter('Completed')
      } else {
        setStatusFilter('RaisedAppeal')
      }
    }
    setDropdownOpen(false)
  }

  // Dropdown Selection Handler
  const handleStatusSelect = (value: string) => {
    setStatusFilter(value)
    if (value === 'Completed') {
      setActiveTab('completed')
    } else if (value === 'RaisedAppeal') {
      setActiveTab('raised_appeal')
    } else {
      setActiveTab(null)
    }
    setDropdownOpen(false)
  }

  // Live Multi-Column Search
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests
    const q = searchQuery.toLowerCase().trim()
    return requests.filter((row) =>
      row.some((col) => (col.DBFieldData ? String(col.DBFieldData).toLowerCase().includes(q) : false))
    )
  }, [requests, searchQuery])

  // Summary Metrics
  const stats = useMemo(() => {
    const total = requests.length
    let completedCount = 0
    let pendingCount = 0
    let inProgressCount = 0

    requests.forEach((row) => {
      const statusCol = row.find(
        (c) =>
          c.DBFieldName?.toLowerCase().includes('status') ||
          c.DisplayFieldName?.toLowerCase().includes('status')
      )
      const val = String(statusCol?.DBFieldData || '').toLowerCase()
      if (val.includes('complet') || val.includes('verif') || val.includes('download')) {
        completedCount++
      } else if (val.includes('progress') || val.includes('review') || val.includes('appeal')) {
        inProgressCount++
      } else {
        pendingCount++
      }
    })

    return { total, completedCount, pendingCount, inProgressCount }
  }, [requests])

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize))
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRequests.slice(start, start + pageSize)
  }, [filteredRequests, currentPage, pageSize])

  // Dynamic Table Column Schema: unify schema across all rows so missing/partial fields still align properly
  const tableColumns = useMemo(() => {
    const seen = new Set<string>()
    const cols: { key: string; label: string; dbField: string }[] = []

    requests.forEach((row) => {
      if (Array.isArray(row)) {
        row.forEach((col) => {
          const key = (col.DisplayFieldName || col.DBFieldName || '').trim()
          if (key && !seen.has(key.toLowerCase())) {
            seen.add(key.toLowerCase())
            cols.push({
              key,
              label: col.DisplayFieldName || col.DBFieldName,
              dbField: col.DBFieldName || '',
            })
          }
        })
      }
    })

    return cols
  }, [requests])

  const tableHeaders = useMemo(() => {
    return tableColumns.map((col) => col.label)
  }, [tableColumns])

  // Smart Cell Content Renderer with Securitas Color Badges
  const renderCellContent = (col: { DBFieldName: string; DisplayFieldName: string; DBFieldData: string | null }) => {
    const val = col.DBFieldData
    if (val === null || val === undefined || String(val).trim() === '') {
      return <span className="text-slate-300 italic font-normal">—</span>
    }

    const fieldLower = (col.DisplayFieldName || col.DBFieldName || '').toLowerCase()
    const valLower = String(val).toLowerCase()

    // Status Badges adhering to Worktrail palette
    if (fieldLower.includes('status')) {
      let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200'
      let dotColor = 'bg-slate-400'

      if (valLower.includes('complet') || valLower.includes('verif') || valLower.includes('download')) {
        badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs'
        dotColor = 'bg-[#10B981]'
      } else if (valLower.includes('progress') || valLower.includes('review')) {
        badgeStyle = 'bg-sky-50 text-[#0680A6] border-sky-200/80 shadow-2xs'
        dotColor = 'bg-[#0680A6]'
      } else if (valLower.includes('pend') || valLower.includes('wait')) {
        badgeStyle = 'bg-orange-50 text-orange-700 border-orange-200/80 shadow-2xs'
        dotColor = 'bg-orange-500'
      } else if (valLower.includes('appeal')) {
        badgeStyle = 'bg-indigo-50 text-[#5850EC] border-indigo-200/80 shadow-2xs'
        dotColor = 'bg-[#5850EC]'
      } else if (valLower.includes('reject') || valLower.includes('fail')) {
        badgeStyle = 'bg-red-50 text-red-700 border-red-200/80 shadow-2xs'
        dotColor = 'bg-red-500'
      }

      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {String(val)}
        </span>
      )
    }

    // Order ID styling
    if (fieldLower.includes('order') || fieldLower.includes('code')) {
      return <span className="font-bold text-[#0680A6] text-xs">{String(val)}</span>
    }

    // Date formatting
    if (fieldLower.includes('date') && val.includes('T')) {
      return (
        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-semibold border border-slate-200/60">
          {val.split('T')[0]}
        </span>
      )
    }

    // Email rendering
    if (fieldLower.includes('email') || val.includes('@')) {
      return (
        <span className="text-slate-600 text-xs font-medium underline decoration-slate-300 underline-offset-2">
          {String(val)}
        </span>
      )
    }

    // Default cell
    return <span className="text-slate-800 text-xs font-semibold">{String(val)}</span>
  }

  return (
    <div className="space-y-6 font-securitas antialiased text-slate-800 select-text">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-800/10 bg-gradient-to-r from-[#102c44] via-[#0D4C74] to-[#031f30] text-white p-7 sm:p-8">
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-[#10B981]">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#10B981]">
                {roleDisplayName} Portal
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Contributor Service Requests
            </h1>
            <p className="text-slate-200/85 text-xs sm:text-sm leading-relaxed font-normal">
              Manage and track candidate verification requests for{' '}
              <span className="font-bold text-white">{contributorName || 'your organization'}</span>.
            </p>
          </div>

          {/* Contributor Profile Badge */}
          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-200 font-bold">{contributorName || 'Contributor'}</div>
                <div className="text-[10px] font-extrabold text-[#10B981] uppercase tracking-wider">{roleDisplayName}</div>
              </div>
            </div>

            {contributorName && (
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{contributorName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI / Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-[#0680A6]/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              TOTAL REQUESTS
            </span>
            <span className="text-2xl font-black text-slate-900 group-hover:text-[#0680A6] transition-colors">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-500 block">Loaded batch records</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#031f30]/5 text-[#031f30] flex items-center justify-center group-hover:bg-[#031f30] group-hover:text-white transition-all shadow-2xs">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Completed Requests */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-emerald-400/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 block">
              VERIFIED / COMPLETED
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {activeTab === 'completed' ? requests.length : stats.completedCount}
            </span>
            <span className="text-[11px] text-slate-500 block">Audited & approved</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-orange-400/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600 block">
              PENDING REVIEW
            </span>
            <span className="text-2xl font-black text-orange-600">
              {statusFilter === 'Pending' ? requests.length : stats.pendingCount}
            </span>
            <span className="text-[11px] text-slate-500 block">Awaiting verification</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* In Progress / Active Filter */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-sky-400/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0680A6] block">
              ACTIVE FILTER
            </span>
            <span className="text-lg font-black text-[#0680A6] truncate block max-w-[140px]">
              {statusFilter
                ? DROPDOWN_STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter
                : 'All Status'}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {filteredRequests.length} matching rows
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0680A6] flex items-center justify-center group-hover:bg-[#0680A6] group-hover:text-white transition-all shadow-2xs">
            <Filter className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main Data Card with Two Tabs, One Dropdown, and Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Control Bar: Two Tabs + One Dropdown + Search + Refresh */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/60">
          {/* Left Group: Two Tabs + One Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            {/* --- The Two Tabs --- */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold">
              {/* Tab 1: Completed */}
              <button
                type="button"
                onClick={() => handleTabChange('completed')}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'completed'
                    ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
                title="View completed & downloaded service requests"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'completed'
                      ? 'bg-white/25 text-white'
                      : 'bg-emerald-100/80 text-emerald-800'
                  }`}
                >
                  {activeTab === 'completed' ? requests.length : stats.completedCount}
                </span>
              </button>

              {/* Tab 2: Raised Appeal */}
              <button
                type="button"
                onClick={() => handleTabChange('raised_appeal')}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'raised_appeal'
                    ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
                title="View requests with raised appeals"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Raised Appeal</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'raised_appeal'
                      ? 'bg-white/25 text-white'
                      : 'bg-orange-100/80 text-orange-800'
                  }`}
                >
                  {activeTab === 'raised_appeal' ? requests.length : stats.inProgressCount}
                </span>
              </button>
            </div>

            {/* --- The One Dropdown (Filter by Status) --- */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-2.5 py-2.5 rounded-2xl bg-white border text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                  dropdownOpen
                    ? 'border-[#0680A6] ring-2 ring-[#0680A6]/10 text-slate-900'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
                style={{ minWidth: 170 }}
              >
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate flex-1 text-left">
                  {statusFilter
                    ? DROPDOWN_STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label || statusFilter
                    : 'All Status'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180 text-[#0680A6]' : ''
                  }`}
                />
              </button>

              {/* Dropdown Popover */}
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-60 z-50 bg-white shadow-xl rounded-2xl border border-slate-200/80 p-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Filter by Status
                  </div>
                  <div className="space-y-1">
                    {DROPDOWN_STATUS_OPTIONS.map((opt) => {
                      const isSelected = statusFilter === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleStatusSelect(opt.value)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 text-[#031f30] font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                            <div>
                              <div className="font-bold text-slate-800">{opt.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  {statusFilter && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleStatusSelect('')}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Status Filter</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

         
          </div>

          {/* Right Group: Live Search + Refresh */}
          <div className="flex items-center gap-3">
            {/* Live Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requests..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10 shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

           
          
          </div>
        </div>

        {/* --- The One Data Table --- */}
        <div className="relative">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#0680A6] animate-spin" />
              <div className="text-center">
                <div className="text-sm font-bold text-slate-700">Loading service requests...</div>
                <div className="text-xs text-slate-400 mt-0.5">Connecting to live database</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Failed to Load Requests</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">{error}</p>
              <button
                type="button"
                onClick={fetchRequests}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#031f30] text-white text-xs font-bold hover:bg-[#0680A6] transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : paginatedRequests.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Service Requests Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                {searchQuery
                  ? `No records matching "${searchQuery}".`
                  : statusFilter
                  ? `No requests found under status "${statusFilter}".`
                  : `There are currently no service requests registered for ${contributorName}.`}
              </p>
              {(searchQuery || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    handleStatusSelect('')
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full table-auto text-left border-collapse select-text">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4 w-12 text-center">#</th>
                    {tableColumns.map((col, idx) => (
                      <th key={col.key + idx} className="px-6 py-4 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-6 py-4 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedRequests.map((row, rowIdx) => {
                    const globalIdx = (currentPage - 1) * pageSize + rowIdx + 1
                    return (
                      <tr
                        key={rowIdx}
                        className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                          rowIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                        }`}
                        onClick={() => setSelectedRecord(row)}
                      >
                        {/* Row Index */}
                        <td className="px-6 py-3.5 text-center font-bold text-slate-400 group-hover:text-slate-600">
                          {globalIdx}
                        </td>

                        {/* Standardized Column Values mapped to Table Headers */}
                        {tableColumns.map((headerCol, colIdx) => {
                          const cell = row.find(
                            (c) =>
                              (c.DisplayFieldName && c.DisplayFieldName.toLowerCase() === headerCol.label.toLowerCase()) ||
                              (c.DBFieldName && headerCol.dbField && c.DBFieldName.toLowerCase() === headerCol.dbField.toLowerCase()) ||
                              (c.DisplayFieldName || c.DBFieldName || '').trim().toLowerCase() === headerCol.key.toLowerCase()
                          )

                          return (
                            <td
                              key={headerCol.key + colIdx}
                              className="px-6 py-3.5 whitespace-nowrap"
                              style={{ verticalAlign: 'middle' }}
                            >
                              {cell ? renderCellContent(cell) : <span className="text-slate-300 italic font-normal">—</span>}
                            </td>
                          )
                        })}

                        {/* Row Action (View Details Modal) */}
                        <td className="px-6 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#031f30] text-slate-700 hover:text-white transition-all text-xs font-bold cursor-pointer"
                            title="View request details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Table Footer: Pagination & Page Size */}
        {!loading && filteredRequests.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Info and Page Size Selector */}
            <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
              <div>
                Showing <span className="font-extrabold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-extrabold text-slate-900">
                  {Math.min(currentPage * pageSize, filteredRequests.length)}
                </span>{' '}
                of <span className="font-extrabold text-slate-900">{filteredRequests.length}</span> entries
                {filteredRequests.length !== requests.length && (
                  <span className="text-slate-400 ml-1">(filtered from {requests.length} total)</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0680A6] cursor-pointer shadow-2xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Number Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-[#031f30] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Row Details Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#031f30] text-white flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Request Record Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Service request attributes and data verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedRecord.map((field, idx) => (
                  <div
                    key={field.DBFieldName + idx}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1"
                  >
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      {field.DisplayFieldName || field.DBFieldName}
                    </div>
                    <div className="text-xs font-bold text-slate-800 break-words">
                      {field.DBFieldData ? renderCellContent(field) : <span className="text-slate-300 italic font-normal">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl bg-[#031f30] hover:bg-[#0680A6] text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
      `}</style>
    </div>
  )
}

export default ContributorServicerequest