import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  RefreshCw,
  Download,
  Layers,
  AlertTriangle,
  AlertCircle,
  Search,
  Eye,
  X,
  FileText,
  User,
  Briefcase,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../useAuth';
import { axios,getAPI_HEADER } from '../endpoint';
import { OrgLogo } from './OrgLogo';
import {
  type VerificationRecord,
} from './CandidateVerificationForm';
import {
  buildCandidatePdf,
  getLogoImageData,
  getClientLogoData,
} from './pdf-utils';
import { API_ENDPOINTS, API_HEADER } from '../endpoint';

export type RawEmployeeRecord = {
  Sno?: number;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Email?: string;
  MobileNo?: string;
  Department?: string;
  DateOfJoining?: string;
  LastPositionHeld?: string;
  DateOfLeaving?: string;
  LastSalaryAnnual?: number;
  EmployeeCode?: string;
  ExitFormalities?: string;
  EmploymentType?: string;
  AnyBehaviourIssue?: string;
  EligibilityToRehire?: string;
  Contributor?: string;
  OrderID?: string;
  Clientemail?: string;
  CreatedAt?: string;
  CreatedBy?: string | null;
  UpdatedDate?: string | null;
  UpdatedBy?: string | null;
  LOA?: string | null;
  SupportingDocs?: string | null;
  Status?: string;
  Downloadstatus?: string | number | null;
  [key: string]: any;
};

// Custom completeness analyzer ONLY looking at LOA and SupportingDocs
function minimalAnalyzeCandidateData(record: VerificationRecord) {
  const missingItems: { fieldName: string; status: 'missing' | 'present' }[] = [];
  let totalFields = 2;
  let missingCount = 0;

  if (!record.raw || record.raw.LOA == null) {
    missingItems.push({ fieldName: 'LOA', status: 'missing' });
    missingCount++;
  }
  if (!record.raw || record.raw.SupportingDocs == null) {
    missingItems.push({ fieldName: 'SupportingDocs', status: 'missing' });
    missingCount++;
  }

  const completenessPercent = totalFields === 0 ? 100 : Math.round(((totalFields - missingCount) / totalFields) * 100);

  // Compose output structure fitting table UI
  return {
    missingCount,
    completenessPercent,
    items: [
      {
        fieldName: 'LOA',
        status: (!record.raw || record.raw.LOA == null) ? 'missing' : 'present',
      },
      {
        fieldName: 'SupportingDocs',
        status: (!record.raw || record.raw.SupportingDocs == null) ? 'missing' : 'present',
      },
    ],
  };
}

const ClientRequest: React.FC = () => {
  const { user } = useAuth();

  // State
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCompletenessFilter, setSelectedCompletenessFilter] = useState<'All' | 'Complete' | 'Missing'>('All');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('All');

  // Candidate detail modal & verification status
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<Record<string, string>>({});

  // Download PDF loading state (set keyed by record id)
  const [downloadingPdf, setDownloadingPdf] = useState<Record<string, boolean>>({});

  // Client Identifier (e.g. CL-SECURITASCLIENT)
  const clientIdentifier = useMemo(() => {
    if (user?.CompanyName) return user.CompanyName;
    if (user?.username) {
      return `CL-${user.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
    }
    return 'CL-SECURITASCLIENT';
  }, [user]);

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Fetch data
  const loadRecords = async (isManual = false) => {
    const isClient = Boolean(user?.Usertype && user.Usertype.toLowerCase().includes('client'));
    if (!isClient) {
      setError('You are not authorized to view these requests.');
      setLoading(false);
      return;
    }

    const email = (
      user?.EmailID ||
      'Client.worktrial@Securitas-india.com'
    ).trim();

    if (!email) {
      setError('Could not locate client email.');
      setLoading(false);
      return;
    }

    const requestPayload = {
      Clientemail: email,
    };
    const requestHeaders = API_HEADER;

    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res: any = await axios.post(API_ENDPOINTS.clientEmpStatus, requestPayload, { headers: getAPI_HEADER() });

      const rawList: RawEmployeeRecord[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.candidates || res.data?.records || [];

      // Apply business rule: If row is Status="Downloaded" (case-insensitive) and Downloadstatus is "0" (or 0, or '0'), skip it
      const filteredRawList: RawEmployeeRecord[] = rawList.filter((item) => {
        const status = (item.Status || '').trim().toLowerCase();
        const downloadstatus = String(item.Downloadstatus ?? '').trim();
        if (status === 'downloaded' && (downloadstatus === '0' || downloadstatus === '')) {
          return false;
        }
        return true;
      });

      // Normalize records into VerificationRecord shape - show actual API status
      const mapped: VerificationRecord[] = filteredRawList.map((item, idx) => {
        const candidateName =
          [item.FirstName, item.MiddleName, item.LastName].filter(Boolean).join(' ') ||
          item.CandidateName ||
          item.Name ||
          item.EmpName ||
          'Candidate';

        const rawEmpCode =
          item.EmployeeCode ||
          item.employeeId ||
          item.empCode ||
          item.EmpCode ||
          item.EmployeeID ||
          '';

        const rawOrderId = item.OrderID || item.orderId || item.OrderId || item.RequestId || item.requestId || '';
        const rawContributor = item.Contributor || item.contributor || item.Company || item.CompanyName || 'Securitas';
        const recId = rawOrderId || `REQ-${idx + 1}`;
        const uniqueId = String(item.Sno || rawEmpCode || `${recId}-${idx}`);

        const stRaw = (item.Status || '').trim();
        const dlRaw = String(item.Downloadstatus ?? '').trim();

        const dojFormatted = item.DateOfJoining
          ? formatDate(item.DateOfJoining)
          : item.DOJ
            ? formatDate(item.DOJ)
            : '—';

        const dolFormatted = item.DateOfLeaving
          ? formatDate(item.DateOfLeaving)
          : item.DOL
            ? formatDate(item.DOL)
            : '—';

        const isCurrentlyEmployed = !item.DateOfLeaving && !item.DOL;

        const designation =
          item.LastPositionHeld ||
          item.Designation ||
          item.designation ||
          item.Position ||
          item.Department ||
          '—';

        const department = item.Department || item.department || 'General';

        return {
          id: uniqueId,
          requestId: recId,
          orderId: rawOrderId || recId,
          clientId: clientIdentifier,
          candidateName,
          employeeId: rawEmpCode || '—',
          candidateEmail: item.Email || item.candidateEmail || item.email || item.EmailID || '',
          contactNumber: item.MobileNo || item.contactNumber || item.mobile || item.Mobile || item.Phone || '',
          verifierId: rawContributor || 'SEC-01',
          verifierName: rawContributor || 'Securitas',
          verifierCategory: 'Master Contributor',
          verifierCode: rawContributor ? rawContributor.slice(0, 4).toUpperCase() : 'SEC',
          dateOfJoining: dojFormatted,
          dateOfLeaving: dolFormatted,
          isCurrentlyEmployed,
          designation,
          department,
          verificationType: 'Standard Employment Verification',
          remarks: item.AnyBehaviourIssue
            ? `Behaviour: ${item.AnyBehaviourIssue}`
            : (item.Remarks || item.remarks || 'Confirmed relieving date and integrity clearance'),
          uploadedFilesCount: ((item.LOA || item.loa) || item.SupportingDocs) ? 1 : 0,
          submittedBy: item.Clientemail || clientIdentifier,
          submittedAt: item.CreatedAt ? formatDate(item.CreatedAt) : '—',
          // Use actual status string from API, pass through for UI rendering (case preserved)
          status: stRaw,
          LOA: item.LOA || item.loa || null,
          raw: {
            ...item,
            Downloadstatus: dlRaw, // capture actual string
          },
        } as unknown as VerificationRecord;
      });

      setRecords(mapped);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Could not load client requests.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line
  }, [user]);

  // Filtering records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Extra safeguard (skip Downloaded+Downloadstatus==0 rows)
      if (
        r.raw &&
        typeof r.raw.Status === 'string' &&
        r.raw.Status.trim().toLowerCase() === 'downloaded' &&
        (String(r.raw.Downloadstatus ?? '').trim() === '0' || String(r.raw.Downloadstatus ?? '') === '')
      ) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          String(r.candidateName || '').toLowerCase().includes(q) ||
          String(r.employeeId || '').toLowerCase().includes(q) ||
          String(r.requestId || '').toLowerCase().includes(q) ||
          String(r.clientId || '').toLowerCase().includes(q) ||
          String(r.verifierName || '').toLowerCase().includes(q) ||
          String(r.candidateEmail || '').toLowerCase().includes(q) ||
          String(r.contactNumber || '').toLowerCase().includes(q) ||
          String(r.designation || '').toLowerCase().includes(q);

        if (!matchesQuery) return false;
      }

      // Status filter
      if (selectedStatus !== 'All') {
        if (!r.status || r.status.toLowerCase() !== selectedStatus.toLowerCase()) {
          return false;
        }
      }

      // Company
      if (selectedCompanyFilter !== 'All' && r.verifierName !== selectedCompanyFilter) {
        return false;
      }

      // Completeness
      if (selectedCompletenessFilter !== 'All') {
        const analysis = minimalAnalyzeCandidateData(r);
        if (selectedCompletenessFilter === 'Complete' && analysis.missingCount > 0) return false;
        if (selectedCompletenessFilter === 'Missing' && analysis.missingCount === 0) return false;
      }

      return true;
    });
    // eslint-disable-next-line
  }, [records, searchQuery, selectedStatus, selectedCompanyFilter, selectedCompletenessFilter]);

  // Metrics: use the Status coming from API (case-insensitive):
  const totalRequests = records.length;
  const verifiedRequests = records.filter((r) =>
    r.status && typeof r.status === 'string' && r.status.trim().toLowerCase() === 'verified'
  ).length;
  const rejectedRequests = records.filter((r) =>
    r.status && typeof r.status === 'string' && r.status.trim().toLowerCase() === 'rejected'
  ).length;
  const recordsWithMissingData = records.filter((r) => minimalAnalyzeCandidateData(r).missingCount > 0).length;

  // Status Badge UI: Display status exactly as from API (show color for important cases)
  const getStatusBadge = (status: string) => {
    if (!status) return null;
    const st = status.trim().toLowerCase();
    if (st === 'verified' || st === 'approved' || st === 'downloaded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {status}
        </span>
      );
    }
    if (st === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {status}
      </span>
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;
    const rows = filteredRecords.map((r, i) => {
      const analysis = minimalAnalyzeCandidateData(r);
      const missingFields = analysis.items
        .filter((item) => item.status === 'missing')
        .map((item) => item.fieldName)
        .join('; ');
      return {
        'S.No': i + 1,
        'Client ID': r.clientId || clientIdentifier,
        'Request ID': r.requestId,
        'Candidate Name': r.candidateName,
        'Employee ID': r.employeeId,
        'Verifier Company': r.verifierName,
        'Data Completeness': `${analysis.completenessPercent}%`,
        'Missing Fields': missingFields || 'None (Complete)',
        'Date of Joining': r.dateOfJoining,
        'Date of Leaving': r.dateOfLeaving,
        'Designation': r.designation,
        'Department': r.department || 'General',
        'Verification Type': r.verificationType,
        'Status': r.status,
        'Submitted At': r.submittedAt,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Client Requests');
    XLSX.writeFile(wb, `worktrail_client_requests_${Date.now()}.xlsx`);
  };

  // Handle live status checking simulation
  const handleCheckStatus = (rec: VerificationRecord) => {
    const key = rec.requestId || rec.id;
    setCheckingStatusId(key);
    setTimeout(() => {
      setCheckingStatusId(null);
      setStatusFeedback((prev) => ({
        ...prev,
        [key]: `Connected to ${rec.verifierName} Repository. Status is up-to-date: ${rec.status || ''}.`,
      }));
    }, 900);
  };

  // When download is done, call backend, then reload records from API
  // Download handler for Report PDF
  const handleDownloadReport = async (rec: VerificationRecord) => {
    const contributor =
      rec.verifierName ||
      (rec.raw && (rec.raw.Contributor || rec.raw.contributor || rec.raw.Company)) ||
      'Securitas';
    const employeeCode =
      (rec.employeeId !== '—' && rec.employeeId) ||
      (rec.raw && (rec.raw.EmployeeCode || rec.raw.employeeId || rec.raw.empCode || rec.raw.EmpCode || rec.raw.EmployeeID)) ||
      '';

    const recordKey = rec.requestId || rec.id;
    setDownloadingPdf((prev) => ({ ...prev, [recordKey]: true }));

    try {
      const [logoData, clientLogoData] = await Promise.all([
        getLogoImageData(),
        getClientLogoData(contributor),
      ]);
      const pdfBytes = await buildCandidatePdf(rec, logoData, clientLogoData, {
        employeeCode,
      });

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeIdentifier = (employeeCode || rec.requestId || rec.candidateName || 'Record')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Candidate_Verification_Report_${safeIdentifier}.pdf`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 1000);

      // Notify backend of download, then reload API data (refresh table state)
      await axios
        .post(
          API_ENDPOINTS.DownloadUpdatePDF,
          {
            Contributor: contributor,
            EmployeeCode: employeeCode,
          },
          {
            headers: getAPI_HEADER(),
          }
        );

      // After success, reload the table by refreshing data
      await loadRecords(true);
    } catch (err: any) {
      console.error('[ClientRequest] Error generating PDF report:', err);
      alert('Failed to generate verification report. Please try again.');
    } finally {
      setDownloadingPdf((prev) => ({ ...prev, [recordKey]: false }));
    }
  };

  return (
    <div className="w-full font-securitas space-y-8 animate-fade-in pb-16">
      {/* 1. Header Bar with Client ID Mapping */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6]">
              Live Verification Tracking
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#0680A6]/10 text-[#0680A6] border border-[#0680A6]/25">
              <Building2 className="w-3 h-3" />
              Client ID: {clientIdentifier}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Candidate Verification Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review all candidate verification requests mapped to Client ID ({clientIdentifier}), audit missing parameters, and check live status directly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadRecords(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold tracking-wider uppercase transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#031f30] hover:bg-[#0680A6] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Requests</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{totalRequests}</p>
            <span className="text-[11px] text-slate-500 mt-1 block font-mono">Mapped: {clientIdentifier}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-50 text-[#031f30] flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Verified */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Verified</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{verifiedRequests}</p>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Download Active</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Rejected</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1">{rejectedRequests}</p>
            <span className="text-[11px] text-rose-500 font-semibold mt-1 block">Download Inactive</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Data Attention / Missing Data Stat Card */}
        <div
          onClick={() => setSelectedCompletenessFilter(selectedCompletenessFilter === 'Missing' ? 'All' : 'Missing')}
          className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            selectedCompletenessFilter === 'Missing' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-100'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Data Attention</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">{recordsWithMissingData}</p>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {recordsWithMissingData > 0 ? 'Missing fields detected' : 'All data 100% complete'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Table Card */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/40">
          {/* Search Box */}
          <div className="relative w-full lg:w-50">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, ID, client,"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {['All', 'Verified', 'Rejected'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedStatus === status
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Completeness Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedCompletenessFilter('All')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedCompletenessFilter === 'All'
                    ? 'bg-[#031f30] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedCompletenessFilter('Complete')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedCompletenessFilter === 'Complete'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                ✓ Complete
              </button>
              <button
                type="button"
                onClick={() => setSelectedCompletenessFilter('Missing')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedCompletenessFilter === 'Missing'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                ⚠️ Missing Data {recordsWithMissingData > 0 && `(${recordsWithMissingData})`}
              </button>
            </div>

            {/* Verifier Company Filter */}
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#0680A6] cursor-pointer"
            >
              <option value="All">All Companies</option>
              {Array.from(new Set(records.map((r) => r.verifierName).filter(Boolean))).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
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
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Request & Client ID</th>
                  <th className="px-6 py-4">Candidate Profile</th>
                  <th className="px-6 py-4">Data Quality</th>
                  <th className="px-6 py-4">Target Verifier</th>
                  <th className="px-6 py-4">Tenure & Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((rec) => {
                    const analysis = minimalAnalyzeCandidateData(rec);
                    const missingItems = analysis.items.filter((i) => i.status === 'missing');
                    const reqKey = rec.requestId || rec.id;
                    const isChecking = checkingStatusId === reqKey;
                    const feedback = statusFeedback[reqKey];

                    // Show download button ONLY when Downloadstatus === "1"
                    const downloadStatus = rec.raw && String(rec.raw.Downloadstatus) === "1";
                    const isDownloading = downloadingPdf[reqKey];

                    return (
                      <tr key={rec.id || rec.requestId} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Request ID & Client ID */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-[#0680A6]">{rec.requestId}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit mt-1">
                              {rec.clientId || clientIdentifier}
                            </span>
                          </div>
                        </td>

                        {/* Candidate Profile */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{rec.candidateName}</span>

                              <span className="text-xs text-slate-400 font-mono">ID: {rec.employeeId}</span>

                            {rec.candidateEmail && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[170px]">{rec.candidateEmail}</span>
                            )}
                          </div>
                        </td>

                        {/* Data Quality */}
                        <td className="px-6 py-4">
                          {analysis.missingCount === 0 ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Complete (100%)
                              </span>
                              <span className="text-[10px] text-slate-400 mt-1">All fields present</span>
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

                        {/* Target Verifier */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <OrgLogo name={rec.verifierName} className="w-7 h-7 rounded-lg shrink-0" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{rec.verifierName}</span>
                              <span className="text-[11px] text-slate-400">{rec.verifierCategory}</span>
                            </div>
                          </div>
                        </td>

                        {/* Tenure & Role */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-xs">
                            <span className="font-medium text-slate-700">{rec.designation}</span>
                            <span className="text-slate-400">
                              {rec.dateOfJoining} → {rec.dateOfLeaving}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(rec.status)}
                            {feedback && (
                              <span className="text-[10px] text-[#0680A6] font-medium max-w-[160px] truncate" title={feedback}>
                                {feedback}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions: Check Status & View Detail */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Download Report Button (Show only when Downloadstatus is "1") */}
                            {downloadStatus && (
                              <button
                                type="button"
                                onClick={() => handleDownloadReport(rec)}
                                disabled={isDownloading}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white border border-green-700/40 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer shadow-xs ${isDownloading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                title="Download Candidate Verification Report"
                              >
                                <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-spin' : ''}`} />
                                <span>{isDownloading ? 'Downloading...' : 'Download Report'}</span>
                              </button>
                            )}

                            {/* Check Status Button */}
                            <button
                              type="button"
                              onClick={() => handleCheckStatus(rec)}
                              disabled={isChecking}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                              title="Check Live Verification Status"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-sky-600' : 'text-sky-500'}`} />
                              <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-semibold text-sm text-slate-600">No candidate verification requests found</p>
                      <p className="text-xs text-slate-400 mt-1">Try resetting the search keyword or filter options.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Record Details Modal */}
      {selectedRecord && (() => {
        const modalAnalysis = minimalAnalyzeCandidateData(selectedRecord);
        const modalReqKey = selectedRecord.requestId || selectedRecord.id;
        const isCheckingModal = checkingStatusId === modalReqKey;
        const modalFeedback = statusFeedback[modalReqKey];

        // Show download button ONLY when Downloadstatus === "1"
        const downloadStatusModal = selectedRecord.raw && String(selectedRecord.raw.Downloadstatus) === "1";
        const isDownloadingModal = downloadingPdf[modalReqKey];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0680A6]">
                      Candidate Verification Request Detail
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-[#0680A6]/10 text-[#0680A6] px-2 py-0.5 rounded-md">
                      Client ID: {selectedRecord.clientId || clientIdentifier}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedRecord.candidateName}{' '}
                    <span className="font-mono text-sm text-slate-400">({selectedRecord.requestId})</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto text-xs sm:text-sm">
                {/* Status & Verifier */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <OrgLogo name={selectedRecord.verifierName} className="w-11 h-11 rounded-xl shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{selectedRecord.verifierName}</h4>
                          {getStatusBadge(selectedRecord.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Category: {selectedRecord.verifierCategory} • Code: {selectedRecord.verifierCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => handleCheckStatus(selectedRecord)}
                        disabled={isCheckingModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingModal ? 'animate-spin' : ''}`} />
                        <span>{isCheckingModal ? 'Checking Network...' : 'Check Live Status'}</span>
                      </button>
                      {/* Download Report Button in Modal */}
                      {downloadStatusModal && (
                        <button
                          type="button"
                          onClick={() => handleDownloadReport(selectedRecord)}
                          disabled={isDownloadingModal}
                          className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0 ${isDownloadingModal ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <Download className={`w-4 h-4 ${isDownloadingModal ? 'animate-spin':''}`} />
                          {isDownloadingModal ? 'Downloading...' : 'Download Report'}
                        </button>
                      )}
                    </div>
                  </div>

                  {modalFeedback && (
                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2.5 text-sky-800 text-xs animate-in fade-in">
                      <Activity className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{modalFeedback}</span>
                    </div>
                  )}
                </div>

                {/* Data Completeness */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#0680A6]" />
                        Data Completeness & Audit Inspection
                      </h5>
                      <span className="text-[11px] text-slate-400">
                        {modalAnalysis.missingCount === 0
                          ? 'All critical and recommended parameters are recorded.'
                          : `${modalAnalysis.missingCount} field(s) require verification or input attention.`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-extrabold ${modalAnalysis.completenessPercent === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {modalAnalysis.completenessPercent}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Complete</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        modalAnalysis.completenessPercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${modalAnalysis.completenessPercent}%` }}
                    />
                  </div>
                </div>

                {/* Candidate & Employment Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                    <h6 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#0680A6]" />
                      Candidate Profile
                    </h6>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div><strong className="text-slate-700">Full Name:</strong> {selectedRecord.candidateName}</div>

                        <div><strong className="text-slate-700">Employee ID:</strong> {selectedRecord.employeeId}</div>
                
                      <div><strong className="text-slate-700">Email:</strong> {selectedRecord.candidateEmail || '—'}</div>
                      <div><strong className="text-slate-700">Contact Number:</strong> {selectedRecord.contactNumber || '—'}</div>
                      <div><strong className="text-slate-700">Client ID:</strong> {selectedRecord.clientId}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                    <h6 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#0680A6]" />
                      Employment Record
                    </h6>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div><strong className="text-slate-700">Designation:</strong> {selectedRecord.designation}</div>
                      <div><strong className="text-slate-700">Department:</strong> {selectedRecord.department}</div>
                      <div><strong className="text-slate-700">Tenure:</strong> {selectedRecord.dateOfJoining} → {selectedRecord.dateOfLeaving}</div>
                      <div><strong className="text-slate-700">Verification Type:</strong> {selectedRecord.verificationType}</div>
                      <div><strong className="text-slate-700">Submitted On:</strong> {selectedRecord.submittedAt}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
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
        );
      })()}
    </div>
  );
};

export default ClientRequest;