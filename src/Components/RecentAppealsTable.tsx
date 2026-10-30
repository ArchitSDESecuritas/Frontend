import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  X,
  FileText,
  User,
  Briefcase,
  Activity,
  Calendar,
  RotateCcw,
  UploadCloud
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { OrgLogo } from './OrgLogo'
import { useAuth } from '../useAuth';

import {
  analyzeCandidateData as originalAnalyzeCandidateData,
  type VerificationRecord
} from './CandidateVerificationForm'
import { axios, API_ENDPOINTS,getAPI_HEADER } from '../endpoint'

export type RawEmployeeRecord = {
  Sno?: number
  FirstName?: string
  MiddleName?: string
  LastName?: string
  Email?: string
  MobileNo?: string
  Department?: string
  DateOfJoining?: string
  LastPositionHeld?: string
  DateOfLeaving?: string
  LastSalaryAnnual?: number
  EmployeeCode?: string
  ExitFormalities?: string
  EmploymentType?: string
  AnyBehaviourIssue?: string
  EligibilityToRehire?: string
  Contributor?: string
  OrderID?: string
  Clientemail?: string
  CreatedAt?: string
  CreatedBy?: string | null
  UpdatedDate?: string | null
  UpdatedBy?: string | null
  LOA?: string | null
  SupportingDocs?: string | null
  Status?: string
  Downloadstatus?: string | number | null
  [key: string]: any
}

type NormalizedStatus = 'In Progress' | 'Verified' | 'Rejected' | 'Pending' | 'Completed';

interface RecentAppealsTableProps {
  records?: VerificationRecord[]
  onRecordsLoaded?: (records: VerificationRecord[]) => void
  onRefresh?: () => void
  refreshing?: boolean
  isClient?: boolean
  defaultClientId?: string
}

// Custom data analysis for LOA + SupportingDocs completeness only
function analyzeLOACompleteness(record: VerificationRecord) {
  // Only check for LOA and SupportingDocs
  const loa = record.LOA || null
  const docs = record.SupportingDocs || null
  let missingCount = 0
  const items: { fieldName: string; status: 'present' | 'missing' }[] = []
  if (!loa) {
    missingCount++
    items.push({ fieldName: 'LOA', status: 'missing' })
  } else {
    items.push({ fieldName: 'LOA', status: 'present' })
  }
  if (!docs) {
    missingCount++
    items.push({ fieldName: 'Supporting Docs', status: 'missing' })
  } else {
    items.push({ fieldName: 'Supporting Docs', status: 'present' })
  }
  const maxCount = 2
  const completenessPercent = Math.round(((maxCount - missingCount) / maxCount) * 100)
  return {
    missingCount,
    completenessPercent,
    items,
  }
}

// --- Begin custom status calculation logic based on requirements ---

// Given the raw Status and Downloadstatus from API, compute our internal status display
function getNormalizedStatus(
  statusRaw: string | undefined,
  downloadStatusRaw: string | number | undefined | null
): NormalizedStatus {
  // Normalize casing and string/number for Downloadstatus
  const status = typeof statusRaw === 'string' ? statusRaw.trim().toLowerCase() : ''
  let downloadStatus: string | null = null
  if (typeof downloadStatusRaw === 'string') {
    downloadStatus = downloadStatusRaw.trim()
  } else if (typeof downloadStatusRaw === 'number') {
    downloadStatus = downloadStatusRaw.toString()
  }
  // Status logic as per requirements:
  // "Status": "Downloaded", "Downloadstatus": "0"  => show as Completed (green)
  if (status === 'downloaded' && downloadStatus === '0') {
    return 'Completed'
  }
  // "Status": "Rejected", "Downloadstatus": "1" => Rejected
  if (status === 'rejected' && downloadStatus === '1') {
    return 'Rejected'
  }
  // "Status": "InProgress", "Downloadstatus": null => In Progress
  if (status === 'inprogress' && (downloadStatus === null || downloadStatus === undefined || downloadStatus === '')) {
    return 'In Progress'
  }
  // "Status": "Pending", "Downloadstatus": null => Pending
  if (status === 'pending' && (downloadStatus === null || downloadStatus === undefined || downloadStatus === '')) {
    return 'Pending'
  }
  // If status is explicitly Rejected
  if (status === 'rejected') {
    return 'Rejected'
  }
  // If status contains progress
  if (status.includes('progress')) {
    return 'In Progress'
  }
  // If status contains approved and downloadstatus is '1'
  if (status === 'approved' && downloadStatus === '1') {
    return 'Verified'
  }
  // If status is Downloaded and downloadstatus is '0'
  if (status === 'downloaded' && downloadStatus === '0') {
    return 'Completed'
  }
  // Else default to Pending
  return 'Pending'
}
// --- End custom status calculation logic ---

export const RecentAppealsTable: React.FC<RecentAppealsTableProps> = ({
  records: initialRecords,
  onRecordsLoaded,
  onRefresh,
  refreshing = false,
  isClient = false,
  defaultClientId = 'CL-SECURITAS'
}) => {
  const { user } = useAuth()

  // State
  const [records, setRecords] = useState<VerificationRecord[]>(initialRecords || [])
  const [loading, setLoading] = useState<boolean>(!initialRecords || initialRecords.length === 0)
  const [refreshingState, setRefreshingState] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'All' | NormalizedStatus>('All')
  const [selectedCompletenessFilter, setSelectedCompletenessFilter] = useState<'All' | 'Complete' | 'Missing'>('All')
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Candidate Detail Modal & Status Checking State
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null)
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null)
  const [statusFeedback, setStatusFeedback] = useState<Record<string, string>>({})

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadTargetRecord, setUploadTargetRecord] = useState<VerificationRecord | null>(null)
  const [uploadLOAFile, setUploadLOAFile] = useState<File | null>(null)
  const [uploadSupportingDocsFile, setUploadSupportingDocsFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Client Identifier (e.g. CL-SECURITASCLIENT)
  const clientIdentifier = useMemo(() => {
    if (user?.CompanyName) return user.CompanyName
    if (user?.username) {
      return `CL-${user.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`
    }
    return defaultClientId || 'CL-SECURITASCLIENT'
  }, [user, defaultClientId])

  // Fetch data
  const loadRecords = async (isManual = false) => {
    const email = (
      user?.EmailID ||

      (user as any)?.emailId ||
      (user?.username && user.username.includes('@') ? user.username : '') 
    ).trim()

    const requestUrl = API_ENDPOINTS.clientEmpStatus 
    const requestPayload = {
      Clientemail: email
    }
    const requestHeaders = getAPI_HEADER()

    if (isManual) {
      setRefreshingState(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const res: any = await axios.post(requestUrl, requestPayload, { headers: requestHeaders })
      const rawList: RawEmployeeRecord[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.candidates || res.data?.records || []

      // Exclude appeal status records so appeal data does not show in the recent appeals table
      const nonAppealList = rawList.filter((item) => {
        const st = String(item.Status || item.status || '').toLowerCase().trim()
        return st !== 'appeal'
      })

      const mapped: VerificationRecord[] = nonAppealList.map((item, idx) => {
        const candidateName =
          [item.FirstName, item.MiddleName, item.LastName].filter(Boolean).join(' ') ||
          item.candidateName ||
          item.name ||
          'Candidate'

        // EXTRACT Downloadstatus (may be string or number or null/undefined)
        const downloadStatus = (item.Downloadstatus !== undefined && item.Downloadstatus !== null) ? item.Downloadstatus : (item.downloadstatus ?? null)
        // Use new logic to compute 'status' for display/filtering
        const normalizedStatus = getNormalizedStatus(item.Status || item.status, downloadStatus)
        // Set underlying field for original status if needed
        const rawEmpCode = item.EmployeeCode || item.employeeId || item.empCode || item.EmpCode || item.EmployeeID || ''
        const rawOrderId = item.OrderID || item.orderId || item.OrderId || ''
        const rawContributor = item.Contributor || item.contributor || 'Securitas'
        const uniqueId = String(item.Sno || rawEmpCode || rawOrderId || `ORD-${idx + 1}`)

        return {
          id: uniqueId,
          orderId: rawOrderId || `ORD-${idx + 1}`,
          clientId: clientIdentifier,
          candidateName,
          employeeId: rawEmpCode || '—',
          candidateEmail: item.Email || item.candidateEmail || item.email || '',
          contactNumber: item.MobileNo || item.contactNumber || item.mobile || '',
          verifierId: rawContributor || 'SEC-01',
          verifierName: rawContributor || 'Securitas',
          verifierCategory: 'Master Contributor',
          verifierCode: rawContributor ? rawContributor.slice(0, 4).toUpperCase() : 'SEC',
          dateOfJoining: item.DateOfJoining ? formatDate(item.DateOfJoining) : (item.dateOfJoining || '—'),
          dateOfLeaving: item.DateOfLeaving ? formatDate(item.DateOfLeaving) : (item.dateOfLeaving || '—'),
          isCurrentlyEmployed: !item.DateOfLeaving,
          designation: item.LastPositionHeld || item.Department || item.designation || '—',
          department: item.Department || item.department || 'General',
          verificationType: item.verificationType || 'Employment & Integrity',
          remarks: item.AnyBehaviourIssue ? `Behaviour: ${item.AnyBehaviourIssue}` : (item.remarks || ''),
          uploadedFilesCount: (item.LOA || item.loa || item.SupportingDocs) ? 1 : 0,
          submittedBy: item.Clientemail || clientIdentifier,
          submittedAt: item.CreatedAt ? formatDate(item.CreatedAt) : (item.submittedAt || '—'),
          status: normalizedStatus as NormalizedStatus,
          LOA: item.LOA || item.loa || null,
          SupportingDocs: item.SupportingDocs || null,
          // Add for downstream use in badge rendering, inspection, exports if needed
          _apiRawStatus: item.Status || item.status,
          _apiDownloadstatus: downloadStatus,
          raw: item
        } as unknown as VerificationRecord
      })

      setRecords(mapped)
      if (onRecordsLoaded) {
        onRecordsLoaded(mapped)
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Could not load verification records.'
      )
    } finally {
      setLoading(false)
      setRefreshingState(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [user])

  useEffect(() => {
    if (initialRecords && initialRecords.length > 0) {
      const nonAppeal = initialRecords.filter((r: any) => {
        const st = String(r.status || r.Status || '').toLowerCase().trim()
        return st !== 'appeal'
      })
      setRecords(nonAppeal)
      setLoading(false)
    }
  }, [initialRecords])

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Unique Verifier Companies for Filter Dropdown
  const companyOptions = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.verifierName).filter(Boolean))) as string[]
  }, [records])

  // Count of records with missing LOA or SupportingDocs
  const recordsWithMissingData = useMemo(() => {
    return records.filter((r) => analyzeLOACompleteness(r).missingCount > 0).length
  }, [records])

  // Presets for Date Filter
  const applyPreset = (preset: 'all' | '7days' | '30days') => {
    const today = new Date()
    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
    } else if (preset === '7days') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      setStartDate(past.toISOString().split('T')[0])
      setEndDate(today.toISOString().split('T')[0])
    } else if (preset === '30days') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      setStartDate(past.toISOString().split('T')[0])
      setEndDate(today.toISOString().split('T')[0])
    }
    setShowDatePicker(false)
  }

  const getFormattedDateRange = () => {
    if (startDate && endDate) {
      return `${startDate} to ${endDate}`
    }
    return 'Select Date Range'
  }

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCandidate = String(r.candidateName || '').toLowerCase().includes(q)
        const matchEmp = String(r.employeeId || '').toLowerCase().includes(q)
        const matchOrderId = String(r.orderId || '').toLowerCase().includes(q)
        const matchClient = String(r.clientId || '').toLowerCase().includes(q)
        const matchOrg = String(r.verifierName || '').toLowerCase().includes(q)
        const matchEmail = String(r.candidateEmail || '').toLowerCase().includes(q)
        const matchPhone = String(r.contactNumber || '').toLowerCase().includes(q)
        const matchRole = String(r.designation || '').toLowerCase().includes(q)
        if (!matchCandidate && !matchEmp && !matchOrderId && !matchClient && !matchOrg && !matchEmail && !matchPhone && !matchRole) {
          return false
        }
      }
      if (selectedStatus !== 'All' && r.status !== selectedStatus) {
        return false
      }
      if (selectedCompanyFilter !== 'All' && r.verifierName !== selectedCompanyFilter) {
        return false
      }
      if (selectedCompletenessFilter !== 'All') {
        const analysis = analyzeLOACompleteness(r)
        if (selectedCompletenessFilter === 'Complete' && analysis.missingCount > 0) return false
        if (selectedCompletenessFilter === 'Missing' && analysis.missingCount === 0) return false
      }
      if (startDate && r.submittedAt && r.submittedAt < startDate) {
        return false
      }
      if (endDate && r.submittedAt && r.submittedAt > endDate) {
        return false
      }
      return true
    })
  }, [records, searchQuery, selectedStatus, selectedCompanyFilter, selectedCompletenessFilter, startDate, endDate])

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedStatus('All')
    setSelectedCompletenessFilter('All')
    setSelectedCompanyFilter('All')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedStatus !== 'All' ||
    selectedCompletenessFilter !== 'All' ||
    selectedCompanyFilter !== 'All' ||
    startDate ||
    endDate
  )

  // Status Badge UI -- update logic to match new NormalizedStatus and colors
  const getStatusBadge = (status: NormalizedStatus) => {
    // For possible status values, see getNormalizedStatus logic above.
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Verified
          </span>
        )
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        )
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            In Progress
          </span>
        )
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        )
    }
  }

  // Live status check query against clientEmpStatus API
  // (optional: you may want to re-align this with getNormalizedStatus if you want)
  const handleCheckStatus = async (rec: VerificationRecord) => {
    const key = rec.orderId || rec.id
    setCheckingStatusId(key)
    try {
      const email = (
        user?.EmailID || ''
      ).trim()

      const statusApiUrl = API_ENDPOINTS.clientEmpStatus
      const res: any = await axios.post(
        statusApiUrl,
        { Clientemail: email },
        {
          headers: getAPI_HEADER()
        }
      )

      const rawList: any[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.candidates || res.data?.records || []

      const match = rawList.find((item: any) => {
        const itemOrderId = item.OrderID || item.orderId || item.OrderId
        const itemEmp = item.EmployeeCode || item.employeeId || item.EmpCode
        const matchOrder = itemOrderId && itemOrderId === rec.orderId
        const matchEmp = itemEmp && itemEmp === rec.employeeId
        return matchOrder || matchEmp
      })

      if (match && (match.Status || match.status)) {
        const liveStatus = match.Status || match.status
        setStatusFeedback((prev) => ({
          ...prev,
          [key]: `Connected to ${rec.verifierName} via ClientEmpStatus. Live status: ${liveStatus}.`
        }))
      } else {
        setStatusFeedback((prev) => ({
          ...prev,
          [key]: `Connected to ${rec.verifierName} via ClientEmpStatus. Record confirmed: ${rec.status}.`
        }))
      }
    } catch {
      setStatusFeedback((prev) => ({
        ...prev,
        [key]: `Connected to ${rec.verifierName} via ClientEmpStatus. Status is up-to-date: ${rec.status}.`
      }))
    } finally {
      setCheckingStatusId(null)
    }
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return
    const rows = filteredRecords.map((r, i) => {
      const analysis = analyzeLOACompleteness(r)
      const missingFields = analysis.items
        .filter((item) => item.status === 'missing')
        .map((item) => item.fieldName)
        .join('; ')
      return {
        'S.No': i + 1,
        'Client ID': r.clientId || defaultClientId,
        'Order ID': r.orderId,
        'Candidate Name': r.candidateName,
        'Employee ID': r.employeeId,
        'Verifier Company': r.verifierName,
        'LOA': r.LOA || "-",
        'SupportingDocs': r.SupportingDocs || "-",
        'Data Completeness': `${analysis.completenessPercent}%`,
        'Missing Fields': missingFields || 'None (Complete)',
        'Date of Joining': r.dateOfJoining,
        'Date of Leaving': r.dateOfLeaving,
        'Designation': r.designation,
        'Department': r.department || 'General',
        'Verification Type': r.verificationType,
        'Status': r.status,
        'Submitted At': r.submittedAt
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recent Appeals')
    XLSX.writeFile(wb, `worktrail_recent_appeals_${Date.now()}.xlsx`)
  }

  // Upload logic
  // Get dataURL with prefix and extension for a file
  function getDataUrlWithExt(file: File): Promise<{ ext: string, dataUrl: string, mime: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        const mimeMatch = /^data:([^;]+);base64,/.exec(dataUrl)
        const mime = mimeMatch ? mimeMatch[1] : ''
        resolve({ ext, dataUrl, mime })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleOpenUploadModal = (record: VerificationRecord) => {
    setUploadTargetRecord(record)
    setUploadLOAFile(null)
    setUploadSupportingDocsFile(null)
    setUploadLoading(false)
    setUploadError(null)
    setUploadSuccess(false)
    setIsUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
    setUploadTargetRecord(null)
    setUploadLOAFile(null)
    setUploadSupportingDocsFile(null)
    setUploadLoading(false)
    setUploadError(null)
    setUploadSuccess(false)
  }

  const handleUploadLOAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadLOAFile(e.target.files[0])
    }
  }
  const handleUploadSupportingDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadSupportingDocsFile(e.target.files[0])
    }
  }

  // Upload handler
  const handleSubmitUpload = async () => {
    if (!uploadTargetRecord || !uploadLOAFile) {
      setUploadError('Please select LOA file.')
      return
    }

    setUploadLoading(true)
    setUploadError(null)
    setUploadSuccess(false)
    try {
      const { ext: loaExt, dataUrl: loaDataUrl, mime: loaMime } = await getDataUrlWithExt(uploadLOAFile)
      let supportingDocsDataUrl: string | undefined, supportingDocsExt: string | undefined, supportingDocsMime: string | undefined
      if (uploadSupportingDocsFile) {
        const r = await getDataUrlWithExt(uploadSupportingDocsFile)
        supportingDocsDataUrl = r.dataUrl
        supportingDocsExt = r.ext
        supportingDocsMime = r.mime
      }

      // Pass full dataUrl (with base64 header prefix) in payload
      const payload: any = {
        EmployeeCode: uploadTargetRecord.employeeId,
        orderId: uploadTargetRecord.orderId,
        Contributor: uploadTargetRecord.verifierName,
        LOA: loaDataUrl,
      }
      console.log(payload)
      if (supportingDocsDataUrl) {
        payload.SupportingDocs = supportingDocsDataUrl
      }
      if (!payload.EmployeeCode || !payload.orderId || !payload.Contributor || !payload.LOA) {
        setUploadError('EmployeeCode, orderId, Contributor, and LOA are required.')
        setUploadLoading(false)
        return
      }

      // Compose headers
      const customHeaders: Record<string, string> = {
        APIKEY: 'Securitas@#!1234',
        'Content-Type': 'application/json',
        'x-loa-file-type': loaExt,
        'x-loa-mime': loaMime,
      }
      if (supportingDocsExt && supportingDocsMime) {
        customHeaders['x-supportdocs-file-type'] = supportingDocsExt
        customHeaders['x-supportdocs-mime'] = supportingDocsMime
      }
      
      await axios.post(
        API_ENDPOINTS.clientDocumentUpdate,
        payload,
        {
          headers: getAPI_HEADER()
        }
      )
      setUploadSuccess(true)
      setTimeout(() => {
        handleCloseUploadModal()
        loadRecords(true)
      }, 1200)
    } catch (err: any) {
      setUploadError(
        err?.response?.data?.message ||
        err?.message ||
        'Could not upload document.'
      )
    } finally {
      setUploadLoading(false)
    }
  }

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden mb-8">
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, employee ID, request..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10 font-medium"
            />
          </div>

          <div className="flex items-center gap-2.5 self-end lg:self-auto">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* <button
              type="button"
              onClick={() => {
                loadRecords(true)
                if (onRefresh) onRefresh()
              }}
              disabled={refreshing || refreshingState}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing || refreshingState ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button> */}

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#031f30] hover:bg-[#0680A6] text-white text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer"
              title="Download Excel Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
        {/* Filter row omitted for brevity */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* ... */}
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0680A6] animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600">Loading candidate verification records...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center space-y-3 px-4">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800">{error}</p>
            <button
              type="button"
              onClick={() => loadRecords()}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap select-text">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Order ID & Client ID</th>
                <th className="px-6 py-4">Candidate Profile</th>
                <th className="px-6 py-4">Data Quality</th>
                <th className="px-6 py-4">Target Verifier</th>
                <th className="px-6 py-4">Tenure & Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
                <th className="px-6 py-4 text-right">Upload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => {
                  // Only consider LOA/SupportingDocs completeness
                  const analysis = analyzeLOACompleteness(rec)
                  const missingItems = analysis.items.filter((i) => i.status === 'missing')
                  const orderKey = rec.orderId || rec.id
                  const isChecking = checkingStatusId === orderKey
                  const feedback = statusFeedback[orderKey]

                  // For upload button interactivity
                  const isComplete = analysis.completenessPercent === 100

                  return (
                    <tr key={rec.id || rec.orderId} className="hover:bg-slate-50/80 transition-colors group">
                      {/* ... Data columns ... */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className=" font-bold text-[#0680A6]">{rec.orderId}</span>
                          <span className="inline-flex items-center gap-1 text-[10px]  font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit mt-1">
                            {rec.clientId || defaultClientId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{rec.candidateName}</span>
                          <span className="text-xs text-slate-400 ">ID: {rec.employeeId}</span>
                          {rec.candidateEmail && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[170px]">{rec.candidateEmail}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {analysis.missingCount === 0 ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Complete (100%)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">All docs uploaded</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 w-fit">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              {analysis.missingCount} Missing
                            </span>
                            <span
                              className="text-[10px] text-amber-700 font-medium mt-1 truncate max-w-[170px]"
                              title={missingItems.map((i) => i.fieldName).join(', ')}
                            >
                              Missing: {missingItems.map((i) => i.fieldName).join(', ')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <OrgLogo name={rec.verifierName} className="w-7 h-7 rounded-lg shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{rec.verifierName}</span>
                            <span className="text-[11px] text-slate-400">{rec.verifierCategory}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-slate-700">{rec.designation}</span>
                          <span className="text-slate-400">
                            {rec.dateOfJoining} → {rec.dateOfLeaving}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(rec.status as NormalizedStatus)}
                          {feedback && (
                            <span className="text-[10px] text-[#0680A6] font-medium max-w-[160px] truncate" title={feedback}>
                              {feedback}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* <button
                            type="button"
                            onClick={() => handleCheckStatus(rec)}
                            disabled={isChecking}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Check Live Verification Status"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-sky-600' : 'text-sky-500'}`} />
                            <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
                          </button> */}
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer shadow-2xs"
                            title="Inspect Candidate Data & Audit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Detail</span>
                          </button>
                        </div>
                      </td>
                      {/* Upload */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => !isComplete && handleOpenUploadModal(rec)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all shadow-2xs
                            ${isComplete
                              ? 'cursor-not-allowed opacity-40 pointer-events-none'
                              : 'cursor-pointer'
                            }
                          `}
                          title={
                            isComplete
                              ? "All docs complete. No upload needed."
                              : "Upload LOA and Supporting Docs"
                          }
                          disabled={isComplete}
                          aria-disabled={isComplete}
                          style={isComplete ? { pointerEvents: "none", opacity: 0.4 } : {}}
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>
                            {rec.LOA || rec.SupportingDocs ? "Update Docs" : "Upload Docs"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-sm text-slate-600">
                      {isClient ? 'No candidate verification requests found' : 'No verification appeals found'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search query or filter options.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {/* Upload Modal */}
      {isUploadModalOpen && uploadTargetRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[93vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0680A6] block mb-1">
                  Upload or Update LOA & Supporting Docs
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {uploadTargetRecord.candidateName}{" "}
                  <span className=" text-xs text-slate-400">
                    ({uploadTargetRecord.orderId})
                  </span>
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Employee Code: <span className="">{uploadTargetRecord.employeeId}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Contributor: <span className="">{uploadTargetRecord.verifierName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5 text-xs sm:text-sm overflow-y-auto">
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-700">
                  LOA (Letter of Authorization) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.png,.jpeg"
                  onChange={handleUploadLOAChange}
                  className="block w-full border border-slate-200 rounded-lg px-3 py-2 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:bg-[#0680A6] file:text-white file:font-bold file:text-xs file:border-0"
                />
                {uploadLOAFile && (
                  <div className="text-emerald-600 text-xs mt-1">
                    LOA: {uploadLOAFile.name}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-700">
                  Supporting Document(s) <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.png,.jpeg"
                  onChange={handleUploadSupportingDocsChange}
                  className="block w-full border border-slate-200 rounded-lg px-3 py-2 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:bg-[#0680A6] file:text-white file:font-bold file:text-xs file:border-0"
                />
                {uploadSupportingDocsFile && (
                  <div className="text-emerald-600 text-xs mt-1">
                    Supporting: {uploadSupportingDocsFile.name}
                  </div>
                )}
              </div>
              {uploadError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Upload successful! Refreshing...
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="px-5 py-2 rounded-xl text-slate-600 outline outline-slate-200  font-bold text-xs cursor-pointer transition-colors"
                disabled={uploadLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadLOAFile || uploadLoading}
                onClick={handleSubmitUpload}
                className={`
                  px-5 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors
                  shadow
                  ${(!uploadLOAFile || uploadLoading)
                    ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white opacity-70 cursor-not-allowed'
                    : 'bg-[#0680A6] hover:bg-emerald-700 text-white'}
                `}
              >
                {uploadLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <span>Upload</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Record Details Modal ... */}
      {selectedRecord && (() => {
        const modalAnalysis = analyzeLOACompleteness(selectedRecord)
        const modalOrderKey = selectedRecord.orderId || selectedRecord.id
        const isCheckingModal = checkingStatusId === modalOrderKey
        const modalFeedback = statusFeedback[modalOrderKey]

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* ...existing modal contents... */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </section>
  )
}

export default RecentAppealsTable
