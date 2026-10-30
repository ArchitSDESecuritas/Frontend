import React, { useState, useEffect, useRef } from "react";
import {
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  Mail,
  User,
  MapPin,
  FileText,
  ShieldCheck,
  RefreshCw,
  X,
  ChevronDown,
  Check,
  Briefcase
} from "lucide-react";
import { API_ENDPOINTS,getAPI_HEADER } from "../endpoint";
import axios from 'axios';

type OrgType = {
  OrganizationID: number;
  OrganizationName: string;
};

type AdminDataRow = {
  id: number;
  username: string;
  password: string;
  activestatus: string;
  Usertype: "ContributorUser" | "ContributorAdmin";
  EmailID: string;
  UserMasterID: number | string;
};

// Signature button class matching AddEmployee / Dashboard buttons
const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs tracking-wider uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none outline-none disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed";

const secondaryBtnClass =
  "inline-flex items-center justify-center gap-2 h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider uppercase rounded-full transition-all duration-200 cursor-pointer select-none";

const UserMaster: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"add" | "manage">("add");

  // Form state
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    activestatus: "1",
    Usertype: "",
    organizationName: "",
    firstName: "",
    lastName: "",
    companyName: "",
    companyCode: "",
    gstNumber: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [organizations, setOrganizations] = useState<OrgType[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [orgSearch, setOrgSearch] = useState("");
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const orgInputRef = useRef<HTMLInputElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  // States for Contributor Management table
  const [adminData, setAdminData] = useState<AdminDataRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState("");

  // Modal confirmation states
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<null | {
    id: number;
    username: string;
    from: "ContributorUser" | "ContributorAdmin";
    to: "ContributorUser" | "ContributorAdmin";
    usermasterid: number | string;
  }>(null);
  const [pendingRowIndex, setPendingRowIndex] = useState<number | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const filteredOrganizations = organizations.filter((org) =>
    org.OrganizationName?.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const fetchOrgs = async () => {
    setOrgLoading(true);
    setOrgError(null);
    try {
      const response = await axios.get(API_ENDPOINTS.OrgmasterData, {
        headers: getAPI_HEADER(),
      });
      const data = response.data;
      if (data && Array.isArray(data.data)) {
        setOrganizations(data.data);
      } else {
        setOrganizations([]);
      }
    } catch (err: any) {
      setOrgError(
        err?.message || "Error loading organizations. Please try again later."
      );
      setOrganizations([]);
    } finally {
      setOrgLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchContributorAdmins = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await axios.get(API_ENDPOINTS.ContributorAdminData, {
        headers: getAPI_HEADER(),
      });
      const data = response.data;
      if (data && Array.isArray(data.data)) {
        const rows: AdminDataRow[] = data.data.map((item: any) => ({
          id: item.id,
          username: item.username,
          password: item.password,
          activestatus: item.activestatus,
          Usertype: item.Usertype,
          EmailID: item.EmailID,
          UserMasterID: item.UserMasterID,
        }));
        setAdminData(rows);
      } else {
        setAdminData([]);
      }
    } catch (err: any) {
      setAdminError(err?.message || "Failed to load contributor admins");
      setAdminData([]);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "manage") {
      fetchContributorAdmins();
    }
  }, [activeSection]);

  // Autocomplete handlers
  const handleOrgInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrgSearch(e.target.value);
    setForm((prev) => ({
      ...prev,
      organizationName: e.target.value,
    }));
    setOrgDropdownOpen(true);
    setHighlightedIdx(-1);
  };

  const handleOrgSelect = (name: string) => {
    setForm((prev) => ({
      ...prev,
      organizationName: name,
    }));
    setOrgSearch(name);
    setOrgDropdownOpen(false);
    setHighlightedIdx(-1);
  };

  const handleOrgInputFocus = () => setOrgDropdownOpen(true);

  const handleOrgInputBlur = () => {
    setTimeout(() => setOrgDropdownOpen(false), 200);
  };

  const handleOrgInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!orgDropdownOpen || filteredOrganizations.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        prev < filteredOrganizations.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        prev > 0 ? prev - 1 : filteredOrganizations.length - 1
      );
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      handleOrgSelect(filteredOrganizations[highlightedIdx].OrganizationName);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "organizationName") {
      setOrgSearch(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForm((prev) => ({ ...prev, activestatus: "1" }));
    setIsSubmitted(true);
  };

  const handleTabSwitch = (section: "add" | "manage") => {
    setActiveSection(section);
    setIsSubmitted(false);
    setForm({
      username: "",
      email: "",
      password: "",
      activestatus: "1",
      Usertype: "",
      organizationName: "",
      firstName: "",
      lastName: "",
      companyName: "",
      companyCode: "",
      gstNumber: "",
      address: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
    });
    setOrgSearch("");
    setUpdateError(null);
    setUpdateSuccess(null);
  };

  const getAltUsertype = (val: "ContributorUser" | "ContributorAdmin") =>
    val === "ContributorUser" ? "ContributorAdmin" : "ContributorUser";

  const handleUsertypeTableSelect = (
    row: AdminDataRow,
    rowIndex: number,
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newUserType = e.target.value as "ContributorUser" | "ContributorAdmin";
    if (newUserType === row.Usertype) return;
    setPendingChange({
      id: row.id,
      username: row.username,
      from: row.Usertype,
      to: newUserType,
      usermasterid: newUserType === "ContributorUser" ? 3 : 2,
    });
    setPendingRowIndex(rowIndex);
    setModalOpen(true);
    setUpdateError(null);
    setUpdateSuccess(null);
  };

  const handleModalConfirm = async () => {
    if (!pendingChange || typeof pendingChange.id !== "number") return;
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      const payload = {
        id: String(pendingChange.id),
        usertype: pendingChange.to,
        usermasterid: pendingChange.to === "ContributorUser" ? "3" : "2",
      };

      // Assuming axios has already been imported: import axios from "axios";
      const res = await axios.post(
        API_ENDPOINTS.ContributorUpdate,
        payload,
        { headers: getAPI_HEADER() }
      );

      // The request succeeded if no error was thrown, handle error case from the response if needed
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Update failed: ${res.status}`);
      }

      setAdminData((prev) =>
        prev.map((row, idx) =>
          idx === pendingRowIndex
            ? {
                ...row,
                Usertype: payload.usertype as "ContributorUser" | "ContributorAdmin",
                UserMasterID: payload.usermasterid,
              }
            : row
        )
      );
      setUpdateSuccess(
        `${pendingChange.username}'s user type was updated to ${payload.usertype.replace("Contributor", "Contributor ")} successfully.`
      );
      setModalOpen(false);
      setPendingChange(null);
      setPendingRowIndex(null);
    } catch (err: any) {
      setUpdateError(
        err?.message || "Error updating user type, please try again."
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setPendingChange(null);
    setPendingRowIndex(null);
  };

  const filteredAdminData = adminData.filter(
    (row) =>
      row.username.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
      row.EmailID.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
      row.Usertype.toLowerCase().includes(tableSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full font-securitas space-y-8 animate-fade-in pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
            Access Control & Master Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Master
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register new contributor accounts or manage roles and permissions across organizations.
          </p>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex items-center p-1.5 bg-slate-100 rounded-full border border-slate-200 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => handleTabSwitch("add")}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeSection === "add"
                ? "bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Add Contributor
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("manage")}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeSection === "manage"
                ? "bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Users className="w-4 h-4" />
            Contributor Management
          </button>
        </div>
      </div>

      {/* 2. ADD CONTRIBUTOR FORM */}
      {activeSection === "add" && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80">
          <div className="mb-8 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
                New User Onboarding
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0680A6]" />
                Contributor Registration Form
              </h2>
            </div>
            <p className="text-xs text-slate-400">All fields marked with * are required.</p>
          </div>

          {isSubmitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">User Registered Successfully!</h3>
              <p className="text-xs text-slate-600">
                The contributor account for <strong className="text-slate-900">{form.username}</strong> has been registered with active credentials.
              </p>
              <button
                type="button"
                onClick={() => handleTabSwitch("add")}
                className={primaryBtnClass}
              >
                Register Another User
              </button>
            </div>
          ) : (
            <form autoComplete="off" onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Details Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <User className="w-4 h-4 text-[#0680A6]" />
                  1. Personal & Authentication Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* First Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="firstName">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="lastName">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="username">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="email">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter email"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="password">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter password (min 6 chars)"
                      minLength={6}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* User Type */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="Usertype">
                      User Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="Usertype"
                      name="Usertype"
                      value={form.Usertype}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all cursor-pointer"
                      required
                    >
                      <option value="">— Select User Type —</option>
                      <option value="ContributorAdmin">Contributor Admin</option>
                      <option value="ContributorUser">Contributor User</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Company Information Section */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Briefcase className="w-4 h-4 text-[#0680A6]" />
                  2. Organization & Company Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="companyName">
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={form.companyName}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* Company Code */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="companyCode">
                      Company Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="companyCode"
                      name="companyCode"
                      value={form.companyCode}
                      onChange={handleChange}
                      placeholder="Enter company code"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* GST Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="gstNumber">
                      GST Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="gstNumber"
                      name="gstNumber"
                      value={form.gstNumber}
                      onChange={handleChange}
                      placeholder="Enter GST number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* Organization Autocomplete */}
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="organizationName">
                      Organization Master Link <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="organizationName"
                        name="organizationName"
                        value={orgSearch}
                        autoComplete="off"
                        ref={orgInputRef}
                        placeholder={
                          orgLoading
                            ? "Loading organizations..."
                            : orgError
                            ? "Failed to load organizations"
                            : "Search or select Organization..."
                        }
                        onChange={handleOrgInputChange}
                        onFocus={handleOrgInputFocus}
                        onBlur={handleOrgInputBlur}
                        onKeyDown={handleOrgInputKeyDown}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                        required
                        disabled={orgLoading || orgError !== null}
                      />

                      {orgDropdownOpen && !orgLoading && !orgError && filteredOrganizations.length > 0 && (
                        <div
                          ref={orgDropdownRef}
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto sidebar-scroll p-1 divide-y divide-slate-50 animate-in fade-in slide-in-from-top-2 duration-150"
                        >
                          {filteredOrganizations.map((org, idx) => (
                            <button
                              key={org.OrganizationID}
                              type="button"
                              onClick={() => handleOrgSelect(org.OrganizationName)}
                              onMouseEnter={() => setHighlightedIdx(idx)}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                                highlightedIdx === idx
                                  ? "bg-slate-100 text-[#0680A6] font-bold"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span>{org.OrganizationName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {org.OrganizationID}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Details Section */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-[#0680A6]" />
                  3. Address & Location
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Address */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="address">
                      Street Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Enter street address"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="city">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="state">
                      State / Province <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="Enter state"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="country">
                      Country <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="Enter country"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                      required
                    />
                  </div>

                  {/* ZIP Code */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2" htmlFor="zipCode">
                      ZIP / Postal Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={form.zipCode}
                      onChange={handleChange}
                      placeholder="Enter ZIP code"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("add")}
                  className={secondaryBtnClass}
                >
                  Reset Form
                </button>

                <button
                  type="submit"
                  className={primaryBtnClass}
                >
                  <Check className="w-4 h-4" />
                  <span>Register Contributor</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 3. CONTRIBUTOR MANAGEMENT TABLE */}
      {activeSection === "manage" && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Header & Feedback */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
                Directory
              </span>
              <h2 className="text-xl font-bold text-slate-900">Contributor Management</h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  placeholder="Search user, email, or role..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10"
                />
              </div>

              <button
                type="button"
                onClick={fetchContributorAdmins}
                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                title="Refresh Table"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {updateError && (
            <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

          {updateSuccess && (
            <div className="m-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{updateSuccess}</span>
            </div>
          )}

          {/* Table */}
          {adminLoading ? (
            <div className="p-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-[#0680A6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="font-semibold text-sm text-slate-600">Loading contributor directory...</p>
            </div>
          ) : adminError ? (
            <div className="p-12 text-center text-rose-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
              <p className="font-semibold text-sm">{adminError}</p>
              <button
                type="button"
                onClick={fetchContributorAdmins}
                className="mt-3 text-xs text-[#0680A6] font-bold hover:underline cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">User Type / Role</th>
                    <th className="px-6 py-4 text-right">Active Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredAdminData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-sm text-slate-600">No contributors found</p>
                        <p className="text-xs text-slate-400 mt-1">Try another search query.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAdminData.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{row.username}</td>
                        <td className="px-6 py-4 text-slate-600">{row.EmailID}</td>
                        <td className="px-6 py-4">
                          <select
                            value={row.Usertype}
                            onChange={(e) => handleUsertypeTableSelect(row, idx, e)}
                            disabled={updateLoading && idx === pendingRowIndex}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0680A6] cursor-pointer"
                          >
                            <option value={row.Usertype}>{row.Usertype.replace("Contributor", "Contributor ")}</option>
                            <option value={getAltUsertype(row.Usertype)}>
                              {getAltUsertype(row.Usertype).replace("Contributor", "Contributor ")}
                            </option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {row.activestatus === "1" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. MODAL CONFIRMATION */}
          {modalOpen && pendingChange && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-indigo-50 text-[#0680A6] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0680A6] bg-indigo-50 px-3 py-1 rounded-full">
                    Role Permission Change
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-3">
                    Update User Type for <span className="text-[#0680A6]">{pendingChange.username}</span>?
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Are you sure you want to change the user role from{" "}
                    <strong className="text-slate-800">{pendingChange.from.replace("Contributor", "Contributor ")}</strong> to{" "}
                    <strong className="text-slate-800">{pendingChange.to.replace("Contributor", "Contributor ")}</strong>?
                    This action will modify their system permissions.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleModalCancel}
                    disabled={updateLoading}
                    className={secondaryBtnClass}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleModalConfirm}
                    disabled={updateLoading}
                    className={primaryBtnClass}
                  >
                    {updateLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm Change</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default UserMaster;