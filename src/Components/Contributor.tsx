import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  XCircle,
  Briefcase,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  X,
  AlertCircle,
  UserCheck,
  Building
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../useAuth';
import { OrgLogo } from './OrgLogo';
import { API_ENDPOINTS, getAPI_HEADER } from '../endpoint';
import axios from 'axios';

// Types
export interface EmployeeRecord {
  id?: string | number;
  FirstName?: string;
  MiddleName?: string | null;
  LastName?: string;
  EmployeeCode?: string;
  Email?: string | null;
  MobileNo?: string | null;
  Department?: string;
  LastPositionHeld?: string;
  DateOfJoining?: string;
  DateOfLeaving?: string;
  LastSalaryAnnual?: number | string | null;
  EmploymentType?: string | null;
  ExitFormalities?: string | null;
  AnyBehaviourIssue?: string | null;
  EligibilityToRehire?: string | null;
  Contributor?: string;
  [key: string]: any;
}

export interface ContributorOrg {
  OrganizationID?: number;
  OrganizationName: string;
  recordCount?: number;
}

export interface ContributorUserRow {
  id: number;
  username: string;
  activestatus: string;
  Usertype: string;
  EmailID: string;
  UserMasterID?: number | string;
}

const Contributor: React.FC = () => {
  const { user } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'records' | 'contributors' | 'accounts'>('records');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [allRecords, setAllRecords] = useState<EmployeeRecord[]>([]);
  const [organizations, setOrganizations] = useState<ContributorOrg[]>([]);
  const [contributorAccounts, setContributorAccounts] = useState<ContributorUserRow[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContributor, setSelectedContributor] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedRehire, setSelectedRehire] = useState<string>('All');

  // Detail Modal
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all contributor data
  const loadAllContributorData = async () => {
    setLoading(true);
    setError(null);

    try {
      let orgList: ContributorOrg[] = [];
      try {
        const orgRes = await axios.get(API_ENDPOINTS.OrgmasterData, {
          headers: getAPI_HEADER()
        });
        if (orgRes && Array.isArray(orgRes.data?.data)) {
          orgList = orgRes.data.data.map((item: any) => ({
            OrganizationID: item.OrganizationID,
            OrganizationName: item.OrganizationName
          }));
        }
      } catch (orgErr) {
        // If organization api call fails, show no orgs at all
        orgList = [];
        console.warn('Could not fetch organizations:', orgErr);
      }
      setOrganizations(orgList);

      try {
        const adminRes = await axios.get(API_ENDPOINTS.OrgmasterData, {
          headers: getAPI_HEADER()
        });
        if (adminRes && Array.isArray(adminRes.data?.data)) {
          setContributorAccounts(adminRes.data.data);
        }
      } catch (adminErr) {
        console.warn('Could not fetch contributor accounts:', adminErr);
      }


      const uniqueContributorNames = Array.from(
        new Set(orgList.map((o) => o.OrganizationName.trim()).filter(Boolean))
      );

      const recordPromises = uniqueContributorNames.map(async (companyName) => {
        try {
          const result = await axios.post(
            API_ENDPOINTS.ContributorEmpSearch,
            { Contributor: companyName },
            { headers: getAPI_HEADER() }
          );
          // Expecting data as result.data.data
          const data = result.data?.data;
          if (data && Array.isArray(data)) {
            return data.map((r: any) => ({
              ...r,
              Contributor: r.Contributor || companyName
            }));
          } else if (data && typeof data === 'object') {
            return [{ ...data, Contributor: data.Contributor || companyName }];
          }
          return [];
        } catch {
          return [];
        }
      });

      const resultsArray = await Promise.all(recordPromises);
      const combined = resultsArray.flat();

      // Deduplicate by EmployeeCode + Contributor
      const seen = new Set<string>();
      const dedupedRecords: EmployeeRecord[] = [];
      for (const row of combined) {
        const key = `${String(row.Contributor || '').trim().toLowerCase()}_${String(
          row.EmployeeCode || ''
        ).trim().toUpperCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedupedRecords.push(row);
        }
      }

      setAllRecords(dedupedRecords);

      // Calculate record counts for each organization (works with only API orgs)
      const updatedOrgs = orgList.map((org) => {
        const count = dedupedRecords.filter(
          (r) => r.Contributor?.toLowerCase().trim() === org.OrganizationName.toLowerCase().trim()
        ).length;
        return { ...org, recordCount: count };
      });
      setOrganizations(updatedOrgs);

      showToast(`Loaded ${dedupedRecords.length} records across ${orgList.length} contributors.`, 'success');
    } catch (err: any) {
      setError(err?.message || 'Failed to load contributor data. Please try again.');
      showToast('Error loading contributor data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllContributorData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllContributorData();
  };

  // Get distinct departments from records
  const departments = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (r.Department && r.Department.trim() !== '') {
        set.add(r.Department.trim());
      }
    });
    return Array.from(set).sort();
  }, [allRecords]);

  // Distinct contributors present in records (limit to orgList + contributors in current records)
  const presentContributors = useMemo(() => {
    const set = new Set<string>();
    // Only allow contributors that are present in organizations API
    organizations.forEach((o) => set.add(o.OrganizationName));
    allRecords.forEach((r) => {
      if (r.Contributor && r.Contributor.trim() !== '' && set.has(r.Contributor.trim())) {
        // They must belong to orgs API list to be selectable
        set.add(r.Contributor.trim());
      }
    });
    return Array.from(set).sort();
  }, [allRecords, organizations]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      // Contributor filter
      if (selectedContributor !== 'All') {
        const recContr = (rec.Contributor || '').toLowerCase().trim();
        const selContr = selectedContributor.toLowerCase().trim();
        // Only EXACT match since only showing org master entries.
        if (recContr !== selContr) {
          return false;
        }
      }
      // Department filter
      if (selectedDepartment !== 'All') {
        if ((rec.Department || '').trim().toLowerCase() !== selectedDepartment.toLowerCase()) {
          return false;
        }
      }
      // Rehire Eligibility filter
      if (selectedRehire !== 'All') {
        const rehireVal = String(rec.EligibilityToRehire || '').trim().toLowerCase();
        if (selectedRehire === 'Yes' && !rehireVal.startsWith('y')) return false;
        if (selectedRehire === 'No' && !rehireVal.startsWith('n')) return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${rec.FirstName || ''} ${rec.MiddleName || ''} ${rec.LastName || ''}`.toLowerCase();
        const code = String(rec.EmployeeCode || '').toLowerCase();
        const email = String(rec.Email || '').toLowerCase();
        const dept = String(rec.Department || '').toLowerCase();
        const pos = String(rec.LastPositionHeld || '').toLowerCase();
        const contr = String(rec.Contributor || '').toLowerCase();

        return (
          fullName.includes(q) ||
          code.includes(q) ||
          email.includes(q) ||
          dept.includes(q) ||
          pos.includes(q) ||
          contr.includes(q)
        );
      }
      return true;
    });
  }, [allRecords, selectedContributor, selectedDepartment, selectedRehire, searchQuery]);

  // Export filtered data to Excel
  const handleExportExcel = () => {
    try {
      if (filteredRecords.length === 0) {
        showToast('No records available to export.', 'info');
        return;
      }
      const rows = filteredRecords.map((r, idx) => ({
        'S.No': idx + 1,
        'Contributor / Company': r.Contributor || '',
        'Employee Code': r.EmployeeCode || '',
        'First Name': r.FirstName || '',
        'Middle Name': r.MiddleName || '',
        'Last Name': r.LastName || '',
        'Department': r.Department || '',
        'Position': r.LastPositionHeld || '',
        'Email': r.Email || '',
        'Mobile': r.MobileNo || '',
        'Date of Joining': r.DateOfJoining || '',
        'Date of Leaving': r.DateOfLeaving || '',
        'Annual Salary (INR)': r.LastSalaryAnnual || '',
        'Employment Type': r.EmploymentType || '',
        'Exit Formalities': r.ExitFormalities || '',
        'Behaviour Issues': r.AnyBehaviourIssue || '',
        'Rehire Eligible': r.EligibilityToRehire || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contributor_Data');
      const filename = `worktrail_contributor_data_${selectedContributor === 'All' ? 'all' : selectedContributor.toLowerCase()}_${Date.now()}.xlsx`;
      XLSX.writeFile(workbook, filename);
      showToast(`Exported ${filteredRecords.length} records to ${filename}!`, 'success');
    } catch (err: any) {
      showToast(`Export failed: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  // Format currency
  const formatSalary = (val: any) => {
    if (!val || isNaN(Number(val))) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  // Color generator for Contributor badge
  const getContributorBadgeStyle = (name?: string) => {
    // Only care about the api orgs
    const lower = (name || '').toLowerCase();
    if (lower.includes('securitas')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (lower.includes('nagarro')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    }
    return 'bg-purple-50 text-purple-700 border-purple-200/80';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 ">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all transform animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-500/20'
              : 'bg-slate-900 text-white shadow-slate-900/20'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          {/* Subtle background glow decorative elements */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-8 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Facilitator Workspace
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Contributor Central
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <Building2 className="w-8 h-8 text-emerald-400" />
                Contributors & Employee Directory
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl">
                Comprehensive Facilitator view of all contributor accounts, their uploaded employee master databases,
                and background verification datasets.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-600/60 text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                title="Reload contributor data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full  hover:brightness-110 active:scale-95 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer select-none"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Metric Badges Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-white">{organizations.length}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contributors</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-white">{allRecords.length}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Records</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-white">
                  {allRecords.filter((r) => String(r.EligibilityToRehire || '').toLowerCase().startsWith('y')).length}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rehire Eligible</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-white">{contributorAccounts.length}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Admin Accounts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-2 pb-3.5 px-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all cursor-pointer border-b-2 ${
                activeTab === 'records'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>All Contributor Records ({filteredRecords.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('contributors')}
              className={`flex items-center gap-2 pb-3.5 px-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all cursor-pointer border-b-2 ${
                activeTab === 'contributors'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Organizations ({organizations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 pb-3.5 px-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all cursor-pointer border-b-2 ${
                activeTab === 'accounts'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Contributor Logins ({contributorAccounts.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: ALL CONTRIBUTOR RECORDS */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Employee Code, Name, Department, Position, or Contributor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Contributor Filter */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Contributor:</span>
                  <select
                    value={selectedContributor}
                    onChange={(e) => setSelectedContributor(e.target.value)}
                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="All">All Contributors</option>
                    {presentContributors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Filter */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span>Dept:</span>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="All">All Depts</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rehire Eligible Filter */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span>Rehire:</span>
                  <select
                    value={selectedRehire}
                    onChange={(e) => setSelectedRehire(e.target.value)}
                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="Yes">Eligible (Yes)</option>
                    <option value="No">Not Eligible (No)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Records Table Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-600">Fetching contributor datasets...</p>
                  <p className="text-xs text-slate-400">Querying live Contributor repositories across partners.</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-700">No Employee Records Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery || selectedContributor !== 'All' || selectedDepartment !== 'All'
                      ? 'No records match your active search or filters. Try adjusting your criteria.'
                      : 'No employee records are currently recorded for contributors.'}
                  </p>
                  {(searchQuery || selectedContributor !== 'All' || selectedDepartment !== 'All') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedContributor('All');
                        setSelectedDepartment('All');
                        setSelectedRehire('All');
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">S.No</th>
                        <th className="py-3.5 px-4">Contributor</th>
                        <th className="py-3.5 px-4">Employee Code</th>
                        <th className="py-3.5 px-4">Candidate / Employee</th>
                        <th className="py-3.5 px-4">Department & Role</th>
                        <th className="py-3.5 px-4">Timeline</th>
                        <th className="py-3.5 px-4">Annual Salary</th>
                        <th className="py-3.5 px-4 text-center">Rehire</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredRecords.map((record, index) => {
                        const fullName = [record.FirstName, record.MiddleName, record.LastName]
                          .filter(Boolean)
                          .join(' ');
                        const isRehire = String(record.EligibilityToRehire || '')
                          .toLowerCase()
                          .startsWith('y');

                        return (
                          <tr key={index} className="hover:bg-slate-50/60 transition-colors group">
                            <td className="py-3.5 px-4 font-mono text-slate-400 font-medium">{index + 1}</td>
                            {/* Contributor Pill */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <OrgLogo name={record.Contributor} className="w-6 h-6 rounded-md shrink-0" />
                                <span className="font-semibold text-slate-800 text-xs">
                                  {record.Contributor || 'Unknown Contributor'}
                                </span>
                              </div>
                            </td>
                            {/* Employee Code */}
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                {record.EmployeeCode || '—'}
                              </span>
                            </td>
                            {/* Candidate Name & Contact */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{fullName || 'Unnamed Employee'}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                {record.Email && (
                                  <span className="truncate max-w-[140px]" title={record.Email}>
                                    {record.Email}
                                  </span>
                                )}
                                {record.MobileNo && <span>• {record.MobileNo}</span>}
                              </div>
                            </td>
                            {/* Department & Position */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800">{record.Department || '—'}</div>
                              <div className="text-[11px] text-slate-500">{record.LastPositionHeld || '—'}</div>
                            </td>
                            {/* Timeline */}
                            <td className="py-3.5 px-4 text-[11px] text-slate-600">
                              <div>Join: {record.DateOfJoining || '—'}</div>
                              <div>Exit: {record.DateOfLeaving || '—'}</div>
                            </td>
                            {/* Salary */}
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {formatSalary(record.LastSalaryAnnual)}
                            </td>
                            {/* Rehire Status */}
                            <td className="py-3.5 px-4 text-center">
                              {isRehire ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                                  <XCircle className="w-3 h-3" /> No
                                </span>
                              )}
                            </td>
                            {/* Action Button */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setSelectedEmployee(record)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                                title="View detailed profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONTRIBUTOR ORGANIZATIONS */}
        {activeTab === 'contributors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {organizations.map((org, idx) => {
              const count = org.recordCount || 0;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <OrgLogo name={org.OrganizationName} className="w-12 h-12 rounded-2xl shadow-xs shrink-0" />
                      <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                        {count} Records
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{org.OrganizationName}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Registered Contributor Entity ID: {org.OrganizationID ? `#${org.OrganizationID}` : 'Standard'}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedContributor(org.OrganizationName);
                        setActiveTab('records');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      <span>View Uploaded Data</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] text-slate-400 font-medium">Worktrail Verified</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: CONTRIBUTOR USER ACCOUNTS */}
        {activeTab === 'accounts' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registered Contributor Logins</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contributor Admins & Users who have access to submit employee data
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-extrabold bg-indigo-50 text-indigo-700 rounded-full">
                {contributorAccounts.length} Active Logins
              </span>
            </div>
            {contributorAccounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No contributor login records returned from ContributorAdminData.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">#</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4">Role / Usertype</th>
                      <th className="py-3.5 px-4">Email ID</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contributorAccounts.map((acc, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400">{index + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {acc.username}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-600">{acc.Usertype}</td>
                        <td className="py-3.5 px-4 text-slate-600">{acc.EmailID || '—'}</td>
                        <td className="py-3.5 px-4 text-center">
                          {acc.activestatus === '1' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILED EMPLOYEE RECORD MODAL */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedEmployee.FirstName ? selectedEmployee.FirstName[0].toUpperCase() : 'E'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {[selectedEmployee.FirstName, selectedEmployee.MiddleName, selectedEmployee.LastName]
                      .filter(Boolean)
                      .join(' ')}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {selectedEmployee.EmployeeCode || 'No Code'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                      <OrgLogo name={selectedEmployee.Contributor} className="w-4 h-4 rounded shrink-0" />
                      {selectedEmployee.Contributor || 'Contributor'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="py-6 space-y-6 text-xs sm:text-sm">
              {/* Job & Org Information */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                  Employment Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Department</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.Department || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Position Held</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.LastPositionHeld || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Employment Type</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.EmploymentType || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Date of Joining</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.DateOfJoining || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Date of Leaving</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.DateOfLeaving || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Annual Salary</div>
                    <div className="font-bold text-emerald-600 mt-0.5">{formatSalary(selectedEmployee.LastSalaryAnnual)}</div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  Contact Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Email Address</div>
                      <div className="font-semibold text-slate-800">{selectedEmployee.Email || 'Not Provided'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</div>
                      <div className="font-semibold text-slate-800">{selectedEmployee.MobileNo || 'Not Provided'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification & Compliance Status */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                  Compliance & Verification Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Exit Formalities</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.ExitFormalities || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Behavior Issues</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.AnyBehaviourIssue || 'None'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Eligibility to Rehire</div>
                    <div className="mt-0.5">
                      {String(selectedEmployee.EligibilityToRehire || '').toLowerCase().startsWith('y') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Rehire Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> Not Eligible
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contributor;
