import React, { useState, useMemo } from 'react'
import {
  Building2,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Check,
} from 'lucide-react'
import { OrgLogo } from '../OrgLogo'
import type { DynamicField } from './dynamicFields'
import { getVisibleDynamicFields } from './dynamicFields'

export interface VerifierPickerProps {
  organizations: any[]
  selectedOrgId: number | string
  selectedOrgName: string
  selectedOrg: any
  searchQuery: string
  isDropdownOpen: boolean
  loading: boolean
  orgError: string | null
  dynamicFieldLoading: boolean
  dynamicFieldError: string | null
  dynamicFields: DynamicField[]
  contributorColName: string | null
  onSearchChange: (val: string) => void
  onToggleDropdown: () => void
  onSelectOrg: (org: any) => void
  onClearOrg: () => void
  onRefreshOrgs: () => void
  onProceed: () => void
  dropdownRef: React.RefObject<HTMLDivElement | null>
}

export const VerifierPicker: React.FC<VerifierPickerProps> = ({
  organizations,
  selectedOrgId,
  selectedOrgName,
  selectedOrg,
  searchQuery,
  isDropdownOpen,
  loading,
  orgError,
  dynamicFieldLoading,
  dynamicFieldError,
  dynamicFields,
  contributorColName,
  onSearchChange,
  onToggleDropdown,
  onSelectOrg,
  onClearOrg,
  onRefreshOrgs,
  onProceed,
  dropdownRef,
}) => {
  // Filter organizations by search query
  const filteredOrgs = useMemo(() => {
    let list = organizations
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((o) => {
        const name = String(o.OrganizationName || '').toLowerCase()
        const id = String(o.OrganizationID || '').toLowerCase()
        return name.includes(q) || id.includes(q)
      })
    }
    return list
  }, [organizations, searchQuery])

  // Featured / top organizations for quick 1-click select
  const quickPickOrgs = useMemo(() => {
    return organizations.slice(0, 8)
  }, [organizations])

  const visibleFields = getVisibleDynamicFields(dynamicFields).filter(
    (f) => !contributorColName || f.DBFieldName !== contributorColName
  )
  const activeAttributeCount = visibleFields.length

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-7 lg:p-8 relative transition-all duration-300 animate-fade-in-md">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#0680A6]" />
            Step 1 of 3 • Enterprise Directory
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Select Target Enterprise
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-xl leading-relaxed">
            Choose the candidate's previous employer to automatically bind their verified schema, SLA terms, and compliance requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshOrgs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-900 text-slate-600 text-xs font-semibold transition-all cursor-pointer self-start sm:self-center shrink-0 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0680A6]' : ''}`} />
          <span>Refresh ({organizations.length})</span>
        </button>
      </div>

      <div className="space-y-5 relative z-10" ref={dropdownRef}>
        {loading ? (
          <div className="flex flex-col items-center gap-2.5 py-10 justify-center bg-slate-50 rounded-2xl border border-slate-200/80">
            <RefreshCw className="w-6 h-6 text-[#0680A6] animate-spin" />
            <span className="text-xs font-bold text-slate-700">
              Loading verified enterprise network directory...
            </span>
          </div>
        ) : orgError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold p-3.5 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{orgError}</span>
          </div>
        ) : (
          <>
            {/* Modern Enterprise Combobox */}
            <div className="w-full md:w-[60%]">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Search or Select Organization <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                {/* Combobox Trigger Bar */}
                <div
                  onClick={onToggleDropdown}
                  className={`w-full bg-white rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between px-3.5 py-2.5 sm:py-3 ${
                    isDropdownOpen
                      ? 'border-[#0680A6] ring-3 ring-teal-500/10 shadow-xs'
                      : selectedOrg
                      ? 'border-teal-300 bg-teal-50/15 hover:border-[#0680A6]'
                      : 'border-slate-300 hover:border-teal-400 shadow-2xs'
                  }`}
                >
                  <div className="flex-1 flex items-center min-w-0 pr-2">
                    {selectedOrg ? (
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <OrgLogo
                          name={selectedOrg.OrganizationName}
                          className="w-8 h-8 rounded-lg shrink-0 bg-white p-0.5 shadow-2xs border border-teal-100"
                        />
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base sm:text-lg truncate">
                            {selectedOrg.OrganizationName}
                          </span>
                          <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 shrink-0">
                            ORG-{selectedOrg.OrganizationID}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 w-full">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            e.stopPropagation()
                            onSearchChange(e.target.value)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!isDropdownOpen) onToggleDropdown()
                          }}
                          onFocus={() => {
                            if (!isDropdownOpen) onToggleDropdown()
                          }}
                          placeholder="Type enterprise name or code (e.g. Tata, Infosys, Wipro, Accenture)..."
                          className="w-full bg-transparent text-xs sm:text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none cursor-text"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedOrg ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClearOrg()
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSearchChange('')
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}

                    <div
                      className={`p-1 text-slate-400 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180 text-[#0680A6]' : ''
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Dropdown Floating Panel */}
                {isDropdownOpen && (
                  <div className=" mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-72 flex flex-col animate-fade-in-down">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>{filteredOrgs.length} Registered Enterprise{filteredOrgs.length === 1 ? '' : 's'}</span>
                      {searchQuery && <span>Filtering by "{searchQuery}"</span>}
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-100">
                      {filteredOrgs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No enterprises matched "{searchQuery}"
                        </div>
                      ) : (
                        filteredOrgs.map((org) => {
                          const isSel = String(org.OrganizationID) === String(selectedOrgId)
                          return (
                            <button
                              key={org.OrganizationID}
                              type="button"
                              onClick={() => onSelectOrg(org)}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-teal-50/40 transition-colors cursor-pointer ${
                                isSel ? 'bg-teal-50/70 border-l-4 border-l-[#0680A6]' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <OrgLogo
                                  name={org.OrganizationName}
                                  className="w-7 h-7 rounded-md shrink-0 bg-white p-0.5 border border-slate-100"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">
                                    {org.OrganizationName}
                                  </div>
                                  
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isSel && (
                                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

        
            {/* Selected Organization Summary Details */}
            {selectedOrg && (
              <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <OrgLogo
                      name={selectedOrg.OrganizationName}
                      className="w-10 h-10 rounded-xl bg-white p-1 border border-teal-100 shadow-2xs shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">
                          {selectedOrg.OrganizationName}
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Verified Partner
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[#0680A6] font-bold">
                        ORG-{selectedOrg.OrganizationID}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Estimated Turnaround
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      24 – 48 Business Hours
                    </span>
                  </div>
                </div>

                {/* Configured Verification Fields Preview */}
                {activeAttributeCount > 0 ? (
                  <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Configured Verification Fields
                      </span>
                      <span className="text-[10px] text-[#0680A6] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold">
                        {activeAttributeCount} Attributes
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {visibleFields.map((field) => (
                          <span
                            key={field.DBFieldName}
                            className="px-2 py-0.5 text-[10px] font-medium bg-slate-50 text-slate-600 rounded border border-slate-200"
                          >
                            {field.DisplayFieldName}
                          </span>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {dynamicFieldError && (
              <div className="text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{dynamicFieldError}</span>
              </div>
            )}

            {/* Action Buttons Toolbar */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 select-none ${
                  !selectedOrgId || dynamicFieldLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] active:scale-[0.98] text-white cursor-pointer shadow-md'
                }`}
                disabled={!selectedOrgId || dynamicFieldLoading}
                type="button"
                onClick={onProceed}
              >
                <span>Continue to Verification Method</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifierPicker
