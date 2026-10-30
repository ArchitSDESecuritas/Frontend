import React, { useState } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  CreditCard,
  Lock,
  RefreshCw,
  Search,
} from 'lucide-react'
import { OrgLogo } from '../OrgLogo'
import type { DynamicField } from './dynamicFields'
import { getVisibleDynamicFields } from './dynamicFields'

export interface BulkCandidateUploaderProps {
  selectedOrgName: string
  selectedOrgId: number | string
  orgTotalPrice: number
  dynamicFields: DynamicField[]
  contributorColName: string | null
  bulkFile: File | null
  bulkRows: any[]
  bulkMessage: string | null
  bulkError: string
  bulkUploading: boolean
  showBulkPreview: boolean
  onBulkFileChange: (file: File | null) => Promise<void>
  onDeleteRow: (index: number) => void
  onClearBulk: () => void
  onProceedToPayment: () => void
  onBack: () => void
  onChangeOrg: () => void
  downloadSampleXlsx: (
    fields: DynamicField[],
    contributorCol: string | null,
    orgName: string
  ) => void
  downloadSampleExcel: (fields: DynamicField[], contributorCol: string | null) => void
}

export const BulkCandidateUploader: React.FC<BulkCandidateUploaderProps> = ({
  selectedOrgName,
  selectedOrgId,
  orgTotalPrice,
  dynamicFields,
  contributorColName,
  bulkFile,
  bulkRows,
  bulkMessage,
  bulkError,
  bulkUploading,
  showBulkPreview,
  onBulkFileChange,
  onDeleteRow,
  onClearBulk,
  onProceedToPayment,
  onBack,
  onChangeOrg,
  downloadSampleXlsx,
  downloadSampleExcel,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [tableSearch, setTableSearch] = useState('')

  const visibleFields = getVisibleDynamicFields(dynamicFields).filter(
    (f) => !contributorColName || f.DBFieldName !== contributorColName
  )
  const activeFieldsCount = visibleFields.length
  const batchTotalAmount = (bulkRows.length * orgTotalPrice).toFixed(2)

  // Filter preview rows by search query
  const filteredRows = bulkRows.filter((row) => {
    if (!tableSearch.trim()) return true
    const q = tableSearch.toLowerCase().trim()
    return Object.values(row).some((val) => String(val).toLowerCase().includes(q))
  })

  // Show DisplayFieldName headers; row values are keyed by DBFieldName after parse
  const tableFields: DynamicField[] =
    visibleFields.length > 0
      ? visibleFields
      : bulkRows[0]
        ? Object.keys(bulkRows[0]).map((k) => ({ DBFieldName: k, DisplayFieldName: k }))
        : []

  return (
    <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-10 lg:p-12 border border-teal-200/90 relative overflow-hidden transition-all duration-300 animate-fade-in-md">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-400/15 via-emerald-300/10 to-transparent blur-3xl pointer-events-none -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-teal-400/10 via-cyan-300/10 to-transparent blur-2xl pointer-events-none -ml-20 -mb-20" />

      {/* Selected Verifier Summary Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-gradient-to-r from-teal-50/90 via-cyan-50/70 to-emerald-50/80 border border-teal-200/90 mb-8 relative z-10">
        <div className="flex items-center gap-4 min-w-0">
          <OrgLogo name={selectedOrgName} className="w-14 h-14 rounded-2xl shadow-xs shrink-0 bg-white p-1" />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">
              Target Enterprise Verifier
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
              {selectedOrgName}
            </h3>
            <p className="text-xs text-[#0680A6] font-mono font-bold">Code: ORG-{selectedOrgId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-teal-200 text-left sm:text-right shadow-2xs">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Rate Per Candidate
            </div>
            <div className="text-sm font-black text-teal-800">
              ₹{orgTotalPrice.toFixed(2)}{' '}
              <span className="text-[10px] font-normal text-slate-500">(all taxes incl.)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onChangeOrg}
            className="px-3.5 py-2.5 text-xs font-bold text-teal-900 bg-white hover:bg-teal-50 border border-teal-200 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Change
          </button>
        </div>
      </div>

      {/* Title & Introduction */}
      <div className="mb-8 text-center sm:text-left relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 text-teal-900 text-xs font-black uppercase tracking-wider mb-2.5 shadow-2xs">
          <Upload className="w-3.5 h-3.5 text-[#0680A6]" />
          Step 3 of 3: Batch Spreadsheet Ingestion
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          Batch Candidate Verification
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
          Download the pre-formatted spreadsheet customized for <strong>{selectedOrgName}</strong>, populate candidate rows, and ingest for batch verification processing.
        </p>
      </div>

      {/* 2-Column Ingestion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
        {/* Left Column: Template Download & Required Columns */}
        <div className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between space-y-5 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#5850EC] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  1
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Download Sample Template
                  </h3>
                  <p className="text-[11px] text-slate-400">Pre-formatted schema for {selectedOrgName}</p>
                </div>
              </div>
              <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                {activeFieldsCount} Columns
              </span>
            </div>

            {/* Template Download Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
                onClick={() =>
                  downloadSampleXlsx(dynamicFields, contributorColName, selectedOrgName)
                }
                disabled={!dynamicFields.length}
              >
                <Download className="w-4 h-4" />
                <span>Download Template (.XLSX)</span>
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                onClick={() => downloadSampleExcel(dynamicFields, contributorColName)}
                disabled={!dynamicFields.length}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Download Sample (.CSV)</span>
              </button>
            </div>
          </div>

          {/* Active Schema Attributes Pill Cloud */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Configured Verification Columns
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              {visibleFields.map((field) => (
                <span
                  key={field.DBFieldName}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-700 rounded-md border border-slate-200"
                >
                  {field.DisplayFieldName}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Upload Zone */}
        <div className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0680A6] to-teal-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                2
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Upload Populated Spreadsheet
                </h3>
                <p className="text-[11px] text-slate-400">Excel (.xlsx, .xls) or CSV files supported</p>
              </div>
            </div>
            {bulkFile && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                File Loaded
              </span>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const files = e.dataTransfer?.files
              if (files && files.length > 0) {
                onBulkFileChange(files[0])
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] ${
              isDragging
                ? 'border-[#0680A6] bg-teal-50/50 scale-[1.01]'
                : bulkFile
                ? 'border-emerald-400 bg-emerald-50/20'
                : 'border-slate-300 hover:border-teal-400 bg-white'
            }`}
          >
            <input
              type="file"
              id="bulk_excel_file_input"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files
                if (files && files.length > 0) {
                  onBulkFileChange(files[0])
                }
              }}
            />

            <label
              htmlFor="bulk_excel_file_input"
              className="cursor-pointer flex flex-col items-center w-full"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0680A6] flex items-center justify-center mb-2.5 shadow-xs group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>

              {bulkFile ? (
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xs">
                    {bulkFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(bulkFile.size / 1024).toFixed(1)} KB • Click or drop another to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Click to select file or drag &amp; drop here
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV up to 15MB
                  </p>
                </div>
              )}
            </label>
          </div>

          {bulkFile && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 font-medium">
                Loaded: <strong>{bulkRows.length} candidates</strong>
              </span>
              <button
                type="button"
                onClick={onClearBulk}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Feedback Message / Alert */}
      {bulkMessage && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 mb-6 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bulkMessage}</span>
        </div>
      )}

      {bulkError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 mb-6 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{bulkError}</span>
        </div>
      )}

      {/* Candidates Preview Table (Visible when rows are loaded) */}
      {showBulkPreview && bulkRows.length > 0 && (
        <div className="space-y-4 mb-8 relative z-10 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xs">
                {bulkRows.length}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Candidate Records Ingested</h4>
                <p className="text-xs text-slate-500">Review candidate rows parsed from the spreadsheet</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter candidate rows..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#0680A6]"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] w-12 text-center">
                      #
                    </th>
                    {tableFields.map((field) => (
                      <th
                        key={field.DBFieldName}
                        className="p-3 font-bold text-slate-700 uppercase tracking-wider text-[10px] whitespace-nowrap"
                      >
                        {field.DisplayFieldName}
                      </th>
                    ))}
                    <th className="p-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] w-12 text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 text-slate-400 text-center font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      {tableFields.map((field) => (
                        <td
                          key={field.DBFieldName}
                          className="p-3 text-slate-800 whitespace-nowrap max-w-xs truncate"
                        >
                          {row[field.DBFieldName] || '—'}
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove candidate from batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Batch Payment Trust Card */}
      {bulkRows.length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-50/90 via-teal-50/70 to-emerald-50/90 border-2 border-teal-200/90 shadow-md space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#10B981] to-[#5850EC] text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900">Batch Verification Summary</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                    {bulkRows.length} Candidates
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ₹{orgTotalPrice.toFixed(2)} per candidate (18% GST incl.) across {bulkRows.length} records.
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-teal-200 text-left sm:text-right shrink-0 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Total Batch Payable
              </span>
              <span className="text-2xl font-black text-emerald-700">₹{batchTotalAmount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer text-xs sm:text-sm order-2 sm:order-1"
          onClick={onBack}
        >
          Back
        </button>

        <button
          type="button"
          disabled={bulkUploading || bulkRows.length === 0}
          onClick={onProceedToPayment}
          className={`w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 select-none flex items-center justify-center gap-2 order-1 sm:order-2 ${
            bulkUploading || bulkRows.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] active:scale-[0.98] text-white cursor-pointer shadow-md'
          }`}
        >
          {bulkUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Processing Batch Submission...</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>
                Proceed to Batch Payment ({bulkRows.length} Candidates) • ₹{batchTotalAmount}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default BulkCandidateUploader
