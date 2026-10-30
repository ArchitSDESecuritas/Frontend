import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  Download,
  CheckCircle2,
  X,
  ShieldCheck,
  Building2,
  Briefcase,
  Layers,
  Clock,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Building,
  Mail,
  Phone,
  Sparkles,
  RotateCcw,
  CheckCheck,
  Ban
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, getAPI_HEADER } from '../endpoint';
import axios from 'axios';

// Presuming there is a user/auth context/hook for getting user info including facilitator id and token
import { useAuth } from '../useAuth'; // You must have a user auth context/provider!

export type EmployeeRecord = {
  Sno: number;
  FirstName: string;
  MiddleName: string | null;
  LastName: string;
  Email: string;
  MobileNo: string;
  Department: string;
  DateOfJoining: string;
  LastPositionHeld: string;
  DateOfLeaving: string;
  LastSalaryAnnual: number;
  EmployeeCode: string;
  ExitFormalities: string | null;
  EmploymentType: string | null;
  AnyBehaviourIssue: string | null;
  EligibilityToRehire: string | null;
  Contributor: string | null;
  OrderID: string;
  Clientemail: string;
  CreatedAt: string;
  CreatedBy: string | null;
  UpdatedDate: string | null;
  UpdatedBy: string | null;
  LOA: string | null;
  SupportingDocs: string | null;
  Status: string;
  Downloadstatus?: string | number | null;
};

type Toast = { text: string; type: 'success' | 'error' | 'info' } | null;

// Define type without "all" for status-only filter use
type RecordStatusFilter = 'pending' | 'in_progress' | 'completed';
type StatusFilter = 'all' | RecordStatusFilter;

const ServiceRequest: React.FC = () => {
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [toast, setToast] = useState<Toast>(null);

  // Added - to store organization name for API call
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const navigate = useNavigate();

  // Use auth context to get facilitatorId, token etc.
  const { user } = useAuth(); // assumes user = { facilitatorId, token, ... }

  // 1. Get organization name as contributor from /api/OrgsByFacilitator
  useEffect(() => {
    const fetchOrganizationName = async () => {
      // Fallback for no user or id
      if (!user || !user.id) {
        // If not logged in or no facilitator ID, skip/fail
        setOrganizationName(null);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.post(
          API_ENDPOINTS.OrgsByFacilitator,
          {
            facilitatorId: user.id
          },
          {
            headers: getAPI_HEADER()
          }
        );
        // API returns: [{OrgMasterId: 11, OrganizationName: 'DemoCompany'}, ...]
        const orgs = response.data;
        if (Array.isArray(orgs) && orgs.length > 0 && orgs[0].OrganizationName) {
          setOrganizationName(orgs[0].OrganizationName);
        } else {
          setOrganizationName(null);
        }
      } catch (e: any) {
        showToast(`Failed to fetch organization: ${e.message || 'Unknown error'}`, 'error');
        setOrganizationName(null);
      }
      setLoading(false);
    };

    fetchOrganizationName();
    // Only on mount or if facilitator changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 2. Fetch service records, now pass contributor (organizationName) as param
  useEffect(() => {
    // Only fetch if org known
    if (organizationName) {
      fetchAllRecords(organizationName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationName]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, orderId, selectedEmpCode, statusFilter, pageSize]);

  // Fetch records from API: overridden for contributor
  const fetchAllRecords = async (orgNameParam?: string) => {
    setLoading(true);
    try {
      // Pass contributor as a search param as per instruction.
      const url = new URL(API_ENDPOINTS.AdminClientData, window.location.origin);
      if (orgNameParam) {
        url.searchParams.append('contributor', orgNameParam);
      }
      const resp = await axios.get(url.toString(), {
        headers: getAPI_HEADER(),
      });
      // Axios resolves with .data (not .json())
      const json = resp.data;
      setRecords(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
    } catch (e: any) {
      showToast(`Failed to load records: ${e.message || 'Unknown error'}`, 'error');
    }
    setLoading(false);
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Unique OrderIDs for dropdown
  const uniqueOrderIds = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.OrderID).filter(Boolean)));
  }, [records]);

  // Employee codes for selected OrderID
  const employeeListForSelectedOrder = useMemo(() => {
    return records.filter((rec) => rec.OrderID === orderId);
  }, [records, orderId]);

  // Identify if employee verification is completed
  function isEmployeeCompleted(emp: EmployeeRecord) {
    const s = (emp.Status || '').toLowerCase();
    return s.includes('completed') || s.includes('verified') || s.includes('approved');
  }

  // Summary Metrics (show only for valid/filtered records!)
  const stats = useMemo(() => {
    // Use the actual filter below as for filteredRecords
    const filterLogic = (rec: EmployeeRecord) => {
      const statusStr = (rec.Status || '').toLowerCase();
      const downloadStatus = rec.Downloadstatus;
      if (
        (statusStr === 'downloaded' && downloadStatus === '0') ||
        (statusStr === 'pending' && (downloadStatus === null || typeof downloadStatus === 'undefined'))
      ) {
        return false;
      }
      return true;
    };
    const statRecords = records.filter(filterLogic);

    const total = statRecords.length;
    let completed = 0;
    let pending = 0;
    let inProgress = 0;

    statRecords.forEach((r) => {
      const s = (r.Status || '').toLowerCase();
      // Rejected: count as its own group (not included in completed/pending/inProgress, but included in total)
      if (s === 'rejected') {
        return;
      }
      if (s.includes('complet') || s.includes('verif') || s.includes('approv')) {
        completed++;
      } else if (s.includes('progress') || s.includes('review')) {
        inProgress++;
      } else {
        pending++;
      }
    });

    const uniqueOrders = new Set(statRecords.map((r) => r.OrderID).filter(Boolean)).size;

    return { total, completed, pending, inProgress, uniqueOrders };
  }, [records]);

  // Filter records for table and search
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const statusStr = (rec.Status || '').toLowerCase();
      const downloadStatusRaw = rec.Downloadstatus;
      const downloadStatus = typeof downloadStatusRaw === 'undefined' ? '' : String(downloadStatusRaw);

      // REMOVE: Downloaded with Downloadstatus === "0"
      if (statusStr === 'downloaded' && downloadStatus === '0') {
        return false;
      }
      // REMOVE: Pending with Downloadstatus === null or undefined
      if (statusStr === 'pending' && (downloadStatusRaw === null || typeof downloadStatusRaw === 'undefined')) {
        return false;
      }

      // Order ID filter
      if (orderId && rec.OrderID !== orderId) return false;

      // Employee Code filter
      if (selectedEmpCode && rec.EmployeeCode !== selectedEmpCode) return false;

      // Status Filter Tab
      if (statusFilter !== 'all') {
        // Show "Rejected" rows only in 'all' mode
        if (statusStr === 'rejected') {
          // This previously compared statusFilter === 'all', which is not valid for RecordStatusFilter - fix by returning false.
          return false;
        }
        if (statusFilter === 'completed') {
          if (!statusStr.includes('complet') && !statusStr.includes('verif') && !statusStr.includes('approv')) return false;
        } else if (statusFilter === 'in_progress') {
          if (!statusStr.includes('progress') && !statusStr.includes('review')) return false;
        } else if (statusFilter === 'pending') {
          if (
            statusStr.includes('complet') ||
            statusStr.includes('verif') ||
            statusStr.includes('approv') ||
            statusStr.includes('progress') ||
            statusStr.includes('review')
          ) {
            return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const fullName = [rec.FirstName, rec.MiddleName, rec.LastName].filter(Boolean).join(' ').toLowerCase();
        return (
          fullName.includes(q) ||
          (rec.EmployeeCode && rec.EmployeeCode.toLowerCase().includes(q)) ||
          (rec.OrderID && rec.OrderID.toLowerCase().includes(q)) ||
          (rec.Email && rec.Email.toLowerCase().includes(q)) ||
          (rec.Department && rec.Department.toLowerCase().includes(q)) ||
          (rec.Contributor && rec.Contributor.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [records, orderId, selectedEmpCode, statusFilter, searchQuery]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Excel Export (only export actually visible/filtered records)
  const handleExportExcel = () => {
    if (!filteredRecords.length) {
      showToast('No records to export.', 'info');
      return;
    }
    const rows = filteredRecords.map((rec, idx) => ({
      'S.No': idx + 1,
      'Order ID': rec.OrderID || '—',
      'Employee Code': rec.EmployeeCode || '—',
      'Employee Name': [rec.FirstName, rec.MiddleName, rec.LastName].filter(Boolean).join(' ') || '—',
      'Email': rec.Email || '—',
      'Mobile': rec.MobileNo || '—',
      'Department': rec.Department || '—',
      'Date of Joining': rec.DateOfJoining?.split('T')[0] || '—',
      'Last Position': rec.LastPositionHeld || '—',
      'Date of Leaving': rec.DateOfLeaving?.split('T')[0] || 'Present',
      'Contributor / Verifier': rec.Contributor || '—',
      'Status': rec.Status || 'Pending',
      'Eligibility to Rehire': rec.EligibilityToRehire || '—',
      'Exit Formalities': rec.ExitFormalities || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Service_Requests');
    XLSX.writeFile(wb, `service_requests_${Date.now()}.xlsx`);
    showToast(`Exported ${rows.length} records to Excel successfully.`, 'success');
  };

  // Handler to navigate and pass data for review
  const handleReviewAndVerify = (
    contributor: string | null,
    clientEmail: string,
    employeeCode: string,
    rec?: EmployeeRecord
  ) => {
    navigate('/ServiceRequestReview', {
      state: {
        contributor,
        employeeCode,
        clientEmail,
        record: rec
      },
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setOrderId('');
    setSelectedEmpCode('');
    setStatusFilter('all');
    showToast('Filters reset.', 'info');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || orderId !== '' || selectedEmpCode !== '' || statusFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 space-y-6   animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all transform animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-500/20'
              : 'bg-slate-900 text-white shadow-slate-900/20'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-200" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-200" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Hero Brand Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#031f30] via-[#04334f] to-[#0680A6] p-6 sm:p-8 text-white shadow-lg">
        {/* Subtle background glow graphics */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-[#0680A6]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold tracking-wider uppercase text-sky-200 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
              <span>Enterprise Verification Service</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Service Verification Requests
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Audit, cross-reference, and verify candidate service histories submitted by client enterprises against official contributor databases.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => organizationName && fetchAllRecords(organizationName)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Reload live records from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-300' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#5850EC]  hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-emerald-500/20"
              title="Download filtered data as Excel spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Metrics / KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-[#0680A6]/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Total Requests
            </span>
            <span className="text-2xl font-black text-slate-900 group-hover:text-[#0680A6] transition-colors">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-500 block">Across all active batches</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#031f30]/5 text-[#031f30] flex items-center justify-center group-hover:bg-[#031f30] group-hover:text-white transition-all shadow-2xs">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Action */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-amber-400/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 block">
              Pending Review
            </span>
            <span className="text-2xl font-black text-amber-600">
              {stats.pending}
            </span>
            <span className="text-[11px] text-slate-500 block">Awaiting verification</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Completed / Verified */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-emerald-400/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 block">
              Verified / Completed
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {stats.completed}
            </span>
            <span className="text-[11px] text-slate-500 block">Audited & approved</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Unique Orders */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-sky-400/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0680A6] block">
              Active Orders
            </span>
            <span className="text-2xl font-black text-[#0680A6]">
              {stats.uniqueOrders}
            </span>
            <span className="text-[11px] text-slate-500 block">Distinct batch orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0680A6] flex items-center justify-center group-hover:bg-[#0680A6] group-hover:text-white transition-all shadow-2xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter, Search & Controls Container */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({stats.pending})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'in_progress'
                  ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Progress ({stats.inProgress})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'completed'
                  ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({stats.completed})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-2 focus:ring-[#0680A6]/10 transition-all font-medium"
              placeholder="Search candidate, code, order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Dropdowns Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            {/* Order ID Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID:</span>
              <select
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800  font-semibold outline-none focus:border-[#0680A6] focus:bg-white cursor-pointer"
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setSelectedEmpCode('');
                }}
              >
                <option value="">All Orders ({uniqueOrderIds.length})</option>
                {uniqueOrderIds.map((oid) => (
                  <option key={oid} value={oid}>
                    {oid}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Code Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee:</span>
              <select
                className={`bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs  font-semibold outline-none focus:border-[#0680A6] focus:bg-white cursor-pointer ${
                  !orderId ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-800'
                }`}
                disabled={!orderId}
                value={selectedEmpCode}
                onChange={(e) => setSelectedEmpCode(e.target.value)}
              >
                <option value="">
                  {orderId ? `All Employees (${employeeListForSelectedOrder.length})` : 'Select Order First'}
                </option>
                {employeeListForSelectedOrder.map((emp) => {
                  const completed = isEmployeeCompleted(emp);
                  return (
                    <option key={emp.EmployeeCode} value={emp.EmployeeCode}>
                      {emp.EmployeeCode} - {emp.FirstName} {emp.LastName} {completed ? '(Verified)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Records Counter */}
          <div className="text-xs font-bold text-slate-500">
            Showing <span className="text-slate-900 font-black">{filteredRecords.length}</span> matching requests
          </div>
        </div>
      </div>

      {/* 4. Main Service Requests Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-5">Candidate Profile</th>
                <th className="py-4 px-4">Employee Code</th>
                <th className="py-4 px-4">Order Batch</th>
                <th className="py-4 px-4">Role & Department</th>
                <th className="py-4 px-4">Service Tenure</th>
                <th className="py-4 px-4">Verifier Enterprise</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-5 text-right">Verification Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Loading State */}
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-16 space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#0680A6] animate-spin mx-auto" />
                    <p className="text-sm font-bold text-slate-800">Loading service request records...</p>
                  </td>
                </tr>
              )}

              {/* Empty State */}
              {!loading && !filteredRecords.length && (
                <tr>
                  <td colSpan={8} className="text-center py-16 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No Service Requests Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                      No records match your active query or filter criteria. Try adjusting the search keywords or filters.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="px-4 py-2 rounded-xl bg-[#031f30] hover:bg-[#0680A6] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Clear Active Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!loading &&
                paginatedRecords.map((rec, idx) => {
                  const completed = isEmployeeCompleted(rec);
                  const fullName = [rec.FirstName, rec.MiddleName, rec.LastName].filter(Boolean).join(' ') || 'Candidate';
                  const initials = fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const statusLower = (rec.Status || '').toLowerCase();
                  const isVerified = statusLower.includes('verif') || statusLower.includes('complet') || statusLower.includes('approv');
                  const isRejected = statusLower === 'rejected';
                  const isInProgress = statusLower.includes('progress') || statusLower.includes('review');
                  // Cast Downloadstatus to string for comparison, in case the backend sometimes returns number
                  const downloadStatusRaw = rec.Downloadstatus;
                  const downloadStatus = typeof downloadStatusRaw === 'undefined' ? '' : String(downloadStatusRaw);

                  // For the "Review & Verify" button: disable and visually mute if Downloadstatus==="1"
                  const reviewBtnDisabled = downloadStatus === '1';
                  const reviewBtnOpacity = reviewBtnDisabled ? 'opacity-50 pointer-events-none grayscale' : '';
                  const reviewBtnTitle = reviewBtnDisabled
                    ? 'Download completed: Action disabled'
                    : completed
                    ? 'View the audit record'
                    : 'Review and verify this request';

                  return (
                    <tr
                      key={`${rec.OrderID}_${rec.EmployeeCode}_${idx}`}
                      className={`hover:bg-sky-50/40 transition-colors group ${
                        completed ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      {/* 1. Candidate Profile */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl  bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs shrink-0">
                            {initials}
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 group-hover:text-[#0680A6] transition-colors block text-xs sm:text-sm">
                              {fullName}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              {rec.Email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  {rec.Email}
                                </span>
                              )}
                              {rec.MobileNo && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {rec.MobileNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Employee Code */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80  font-bold text-xs text-slate-800">
                          <Building2 className="w-3 h-3 text-[#0680A6]" />
                          {rec.EmployeeCode || '—'}
                        </span>
                      </td>

                      {/* 3. Order ID */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 border border-sky-100  text-xs text-[#0680A6] font-semibold">
                          {rec.OrderID || '—'}
                        </span>
                      </td>

                      {/* 4. Role & Department */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            {rec.LastPositionHeld || 'Designation Not Listed'}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {rec.Department || 'General Operations'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Service Tenure */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5  text-[11px]">
                          <span className="text-slate-700 block">
                            DOJ: <strong className="text-slate-900">{rec.DateOfJoining?.split('T')[0] || '—'}</strong>
                          </span>
                          <span className="text-slate-500 block">
                            DOL: {rec.DateOfLeaving?.split('T')[0] || 'Present / Active'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Verifier Enterprise */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {rec.Contributor || 'Securitas Master DB'}
                        </span>
                      </td>

                      {/* 7. Status Badge */}
                      <td className="py-4 px-4 text-center">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            Rejected
                          </span>
                        ) : isVerified ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                      </td>

                      {/* 8. Action Button */}
                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleReviewAndVerify(rec.Contributor, rec.Clientemail, rec.EmployeeCode, rec)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${reviewBtnOpacity} ${
                            completed
                              ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC]  text-slate-700 border border-slate-200'
                              : 'bg-gradient-to-r from-[#10B981] to-[#5850EC]  text-white hover:shadow-md'
                          }`}
                          disabled={reviewBtnDisabled}
                          title={reviewBtnTitle}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{completed ? 'View Audit' : 'Review & Verify'}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination & Records Footer */}
        {filteredRecords.length > 0 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, filteredRecords.length)}</strong> of{' '}
                <strong>{filteredRecords.length}</strong> service requests
              </span>

              <div className="h-3 w-px bg-slate-200" />

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-[#0680A6] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800">
                Page {currentPage} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRequest;