import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { API_ENDPOINTS,getAPI_HEADER } from "../endpoint";
import axios from 'axios'

type OrgType = {
  OrganizationID: number;
  OrganizationName: string;
};

const API_HEADERS = {
  "APIKEY": "Securitas@#!1234",
  "Content-Type": "application/json",
};

const PAGE_SIZE = 8;

// Signature button classes matching AddEmployee / Usermaster / Dashboard
const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs tracking-wider uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none outline-none disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed";

const secondaryBtnClass =
  "inline-flex items-center justify-center gap-2 h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider uppercase rounded-full transition-all duration-200 cursor-pointer select-none";

const dangerBtnClass =
  "inline-flex items-center justify-center gap-2 h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs tracking-wider uppercase rounded-full shadow-md transition-all duration-200 cursor-pointer select-none disabled:opacity-50";

const OrgMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"directory" | "add">("directory");

  // Add state
  const [orgName, setOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Directory / table state
  const [organizations, setOrganizations] = useState<OrgType[] | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Inline editing state
  const [editOrgId, setEditOrgId] = useState<number | null>(null);
  const [editOrgName, setEditOrgName] = useState<string>("");
  const [editLoadingId, setEditLoadingId] = useState<number | null>(null);
  const [tableMessage, setTableMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete modal state
  const [deleteModalOrg, setDeleteModalOrg] = useState<OrgType | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    setOrgsError(null);
    setTableMessage(null);
    try {
      const res = await axios.get(API_ENDPOINTS.OrgmasterData, {
        headers: getAPI_HEADER(),
      });
      const data = res.data;
      setOrganizations(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      setOrgsError(
        err?.message || "Failed to fetch organizations. Please try again."
      );
      setOrganizations([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Add Organization handler
  const handleAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!orgName.trim()) {
      setMessage({ type: "error", text: "Please enter an organization name." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(
        API_ENDPOINTS.Orgmastermanage,
        {
          OrganizationName: orgName.trim(),
          IsDeleted: 0,
        },
        {
          headers: getAPI_HEADER(),
        }
      );

      if (res.status < 200 || res.status >= 300) {
        // Try to get message from response
        const text = res.data && typeof res.data === 'string' ? res.data : '';
        throw new Error(text || "Failed to add organization.");
      }

      setMessage({ type: "success", text: `Organization "${orgName.trim()}" added successfully.` });
      setOrgName("");
      // Refresh directory list
      await fetchOrganizations();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message ? `Failed to add organization: ${err.message}` : "Failed to add organization.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline edit handlers
  const handleEditClick = (org: OrgType) => {
    setEditOrgId(org.OrganizationID);
    setEditOrgName(org.OrganizationName);
    setTableMessage(null);
  };

  const handleEditCancel = () => {
    setEditOrgId(null);
    setEditOrgName("");
    setTableMessage(null);
  };

  const handleEditSave = async (org: OrgType) => {
    if (!editOrgName.trim()) {
      setTableMessage({ type: "error", text: "Organization Name cannot be empty." });
      return;
    }
    setEditLoadingId(org.OrganizationID);
    setTableMessage(null);
    try {
      const res = await axios.post(
        API_ENDPOINTS.OrgmasterNameUpdate,
        {
          OrganizationID: org.OrganizationID.toString(),
          OrganizationName: editOrgName.trim(),
        },
        {
          headers: getAPI_HEADER(),
        }
      );
      if (res.status < 200 || res.status >= 300) {
        // Try to get a message from the response data
        const text = res.data && typeof res.data === 'string' ? res.data : '';
        throw new Error(text || "Failed to update organization name.");
      }
      setTableMessage({ type: "success", text: "Organization updated successfully." });
      setEditOrgId(null);
      setEditOrgName("");
      await fetchOrganizations();
    } catch (err: any) {
      setTableMessage({
        type: "error",
        text: err?.message ? `Failed to update: ${err.message}` : "Failed to update organization.",
      });
    } finally {
      setEditLoadingId(null);
    }
  };

  // Delete handlers
  const handleDeleteConfirmed = async () => {
    if (!deleteModalOrg) return;
    const org = deleteModalOrg;
    setDeleteLoadingId(org.OrganizationID);
    setTableMessage(null);
    setDeleteModalOrg(null);

    try {
      const res = await axios.post(
        API_ENDPOINTS.OrgmasterDelete,
        {
          OrganizationID: org.OrganizationID.toString(),
        },
        {
          headers: getAPI_HEADER(),
        }
      );
      if (res.status < 200 || res.status >= 300) {
        // Try to get a message from the response data
        const text = res.data && typeof res.data === 'string' ? res.data : '';
        throw new Error(text || "Failed to delete organization.");
      }
      setTableMessage({ type: "success", text: `Organization "${org.OrganizationName}" deleted successfully.` });
      await fetchOrganizations();
    } catch (err: any) {
      setTableMessage({
        type: "error",
        text: err?.message ? `Failed to delete: ${err.message}` : "Failed to delete organization.",
      });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // Filtered & Paginated records
  const filteredOrgs = useMemo(() => {
    if (!organizations) return [];
    return organizations.filter(
      (org) =>
        org.OrganizationName.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
        org.OrganizationID.toString().includes(tableSearchQuery)
    );
  }, [organizations, tableSearchQuery]);

  const totalOrgs = filteredOrgs.length;
  const totalPages = Math.max(1, Math.ceil(totalOrgs / PAGE_SIZE));

  const paginatedOrganizations = useMemo(() => {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    return filteredOrgs.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredOrgs, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="w-full font-securitas space-y-8 animate-fade-in pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
            Master Data Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Organization Master
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure partner organizations, corporate verifier links, and enterprise entity records.
          </p>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex items-center p-1.5 bg-slate-100 rounded-full border border-slate-200 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab("directory");
              setMessage(null);
              setTableMessage(null);
            }}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "directory"
                ? "bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            Organization Directory
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("add");
              setMessage(null);
              setTableMessage(null);
            }}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "add"
                ? "bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Organization
          </button>
        </div>
      </div>

      {/* 2. ADD ORGANIZATION TAB */}
      {activeTab === "add" && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 max-w-2xl mx-auto">
          <div className="mb-8 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
                New Entity
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0680A6]" />
                Add New Organization
              </h2>
            </div>
            <span className="text-xs text-slate-400">Step 1 of 1</span>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 ${
                message.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border border-rose-200 text-rose-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleAddOrganization} className="space-y-6">
            <div>
              <label
                htmlFor="orgName"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2"
              >
                Organization Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Securitas India, Tata Consultancy Services"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white focus:ring-4 focus:ring-[#0680A6]/10 transition-all"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter the official legal or business name of the corporate organization.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOrgName("");
                  setMessage(null);
                }}
                className={secondaryBtnClass}
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={primaryBtnClass}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Adding Organization...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Save Organization</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. ORGANIZATION DIRECTORY / MANAGEMENT TAB */}
      {activeTab === "directory" && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
                Active Entities ({totalOrgs})
              </span>
              <h2 className="text-xl font-bold text-slate-900">Organization Directory</h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearchQuery}
                  onChange={(e) => {
                    setTableSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search organization or ID..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10"
                />
              </div>

              <button
                type="button"
                onClick={fetchOrganizations}
                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                title="Refresh Organizations"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {tableMessage && (
            <div
              className={`m-6 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 ${
                tableMessage.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border border-rose-200 text-rose-700"
              }`}
            >
              {tableMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{tableMessage.text}</span>
            </div>
          )}

          {/* Table */}
          {loadingOrgs ? (
            <div className="p-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-[#0680A6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="font-semibold text-sm text-slate-600">Loading organizations...</p>
            </div>
          ) : orgsError ? (
            <div className="p-12 text-center text-rose-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
              <p className="font-semibold text-sm">{orgsError}</p>
              <button
                type="button"
                onClick={fetchOrganizations}
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
                    <th className="px-6 py-4 w-24">Org ID</th>
                    <th className="px-6 py-4">Organization Name</th>
                    <th className="px-6 py-4 text-right w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedOrganizations.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                        <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-sm text-slate-600">No organizations found</p>
                        <p className="text-xs text-slate-400 mt-1">Try another search keyword or add a new organization.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedOrganizations.map((org) => {
                      const isEditing = editOrgId === org.OrganizationID;
                      return (
                        <tr key={org.OrganizationID} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-[#0680A6] text-xs">
                            #{org.OrganizationID}
                          </td>

                          <td className="px-6 py-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2 max-w-md">
                                <input
                                  type="text"
                                  value={editOrgName}
                                  onChange={(e) => setEditOrgName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditSave(org);
                                    if (e.key === "Escape") handleEditCancel();
                                  }}
                                  disabled={!!editLoadingId}
                                  autoFocus
                                  className="w-full px-3 py-1.5 bg-white border border-[#0680A6] rounded-xl text-xs sm:text-sm text-slate-900 outline-none ring-2 ring-[#0680A6]/10"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#0680A6] font-bold text-xs flex items-center justify-center shrink-0">
                                  {org.OrganizationName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {org.OrganizationName}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditSave(org)}
                                  disabled={!!editLoadingId}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Save"
                                >
                                  {editLoadingId === org.OrganizationID ? (
                                    <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block"></span>
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleEditCancel}
                                  disabled={!!editLoadingId}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(org)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#0680A6] hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteModalOrg(org)}
                                  disabled={deleteLoadingId === org.OrganizationID}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  {deleteLoadingId === org.OrganizationID ? (
                                    <span className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin inline-block"></span>
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({totalOrgs} items)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      currentPage === p
                        ? "bg-[#031f30] text-white shadow-xs"
                        : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. DELETE CONFIRMATION MODAL */}
      {deleteModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                Delete Confirmation
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-3">
                Delete Organization?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-slate-800">"{deleteModalOrg.OrganizationName}"</strong> (ID: #{deleteModalOrg.OrganizationID})?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOrg(null)}
                disabled={deleteLoadingId === deleteModalOrg.OrganizationID}
                className={secondaryBtnClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={deleteLoadingId === deleteModalOrg.OrganizationID}
                className={dangerBtnClass}
              >
                {deleteLoadingId === deleteModalOrg.OrganizationID ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgMaster;