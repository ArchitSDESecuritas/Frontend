import React, { useState, useEffect, useMemo } from 'react'
import {
  Trash2,
  RefreshCw,
  Search,
  FileDown,
  RotateCcw,
  CheckCircle2,
  Clock,
  Eye,
  X,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react'
import { type VerificationRecord } from './CandidateVerificationForm'
import { OrgLogo } from './OrgLogo'
import {
  buildCandidatePdf,
  getLogoImageData,
  getClientLogoData
} from './pdf-utils'
import { useAuth } from '../useAuth'

const Recyclebin: React.FC = () => {
  const { user } = useAuth()
  const [records, setRecords] = useState<VerificationRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(null), 3500)
  }

  // Load all verification records
  const loadRecords = () => {
    setRecords([])
  }

  useEffect(() => {
    loadRecords()
  }, [])

  // Filter only records that are downloaded or in the recycle bin
  const recycledRecords = useMemo(() => {
    return records.filter((r) => r.inRecycleBin === true || r.isDownloaded === true)
  }, [records])

  // Filtered search
  const filteredRecords = useMemo(() => {
    return recycledRecords.filter((r) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const cand = (r.candidateName || '').toLowerCase()
      const empId = (r.employeeId || '').toLowerCase()
      const reqId = (r.requestId || '').toLowerCase()
      const verifier = (r.verifierName || '').toLowerCase()
      const client = (r.submittedBy || '').toLowerCase()
      return (
        cand.includes(q) ||
        empId.includes(q) ||
        reqId.includes(q) ||
        verifier.includes(q) ||
        client.includes(q)
      )
    })
  }, [recycledRecords, searchQuery])

  // Restore a record back to active records list (un-hides for contributors)
  const handleRestore = (rec: VerificationRecord) => {
    const updated = records.map((r) => {
      if (r.id === rec.id || (r.requestId && r.requestId === rec.requestId)) {
        return {
          ...r,
          inRecycleBin: false,
          isDownloaded: false
        }
      }
      return r
    })
    setRecords(updated)
    if (selectedRecord && (selectedRecord.id === rec.id || selectedRecord.requestId === rec.requestId)) {
      setSelectedRecord(null)
    }
    showNotification(`Restored "${rec.candidateName}" (${rec.employeeId || rec.requestId}). Contributor can now view this record again.`)
  }

  // Permanently delete a record
  const handlePermanentDelete = (rec: VerificationRecord) => {
    if (!window.confirm(`Permanently delete verification record for ${rec.candidateName}? This cannot be undone.`)) {
      return
    }
    const updated = records.filter(
      (r) => r.id !== rec.id && (!r.requestId || r.requestId !== rec.requestId)
    )
    setRecords(updated)
    if (selectedRecord && (selectedRecord.id === rec.id || selectedRecord.requestId === rec.requestId)) {
      setSelectedRecord(null)
    }
    showNotification(`Permanently deleted "${rec.candidateName}".`)
  }

  // Empty Recycle Bin completely
  const handleEmptyBin = () => {
    if (recycledRecords.length === 0) return
    if (!window.confirm(`Are you sure you want to permanently purge all ${recycledRecords.length} records in the Recycle Bin? This action cannot be reversed.`)) {
      return
    }
    const updated = records.filter((r) => !r.inRecycleBin && !r.isDownloaded)
    setRecords(updated)
    setSelectedRecord(null)
    showNotification('Recycle Bin emptied successfully.')
  }

  // Download PDF report directly from Recycle Bin
  const handleDownloadPDF = async (rec: VerificationRecord) => {
    try {
      const [logoData, clientLogoData] = await Promise.all([
        getLogoImageData(),
        getClientLogoData(rec.verifierName || 'Enterprise Client'),
      ])
      const pdfBytes = buildCandidatePdf(rec, logoData, clientLogoData)
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeId = (rec.employeeId || rec.requestId || 'Record').replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `Verification_Report_${safeId}.pdf`
      link.setAttribute('download', fileName)
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
        URL.revokeObjectURL(url)
      }, 1500)
      showNotification(`Downloaded PDF report for "${rec.candidateName}".`)
    } catch (err) {
      console.error('Failed to download PDF from Recycle Bin:', err)
      alert('Failed to download PDF. Please try again.')
    }
  }

  return (
    <div className="w-full font-securitas space-y-6 pb-16 animate-fade-in">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block">
              Superadmin Governance
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
              Protected Repository
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <Trash2 className="w-7 h-7 text-rose-600" />
            Recycle Bin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Downloaded reports and archived verification records. These items are strictly hidden from contributors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadRecords}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          {recycledRecords.length > 0 && (
            <button
              type="button"
              onClick={handleEmptyBin}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Permanently purge all records from recycle bin"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Recycle Bin</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Recycled Records</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{recycledRecords.length}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Downloaded / Archived reports</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Trash2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contributor Visibility</p>
            <h3 className="text-xl font-bold text-amber-600 mt-1">Hidden (Secured)</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Cannot be viewed by Contributor</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Superadmin Controls</p>
            <h3 className="text-xl font-bold text-[#0680A6] mt-1">Restore / Purge</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Full restore and export capabilities</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center text-[#0680A6]">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, employee ID, request..."
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/15 rounded-xl outline-none transition-all font-medium text-slate-800"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredRecords.length}</span> of{' '}
          <span className="font-bold text-slate-800">{recycledRecords.length}</span> recycled records
        </div>
      </div>

      {/* Recycled Records Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                <th className="px-6 py-4">Candidate & Request</th>
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Target Organization</th>
                <th className="px-6 py-4">Verification Status</th>
                <th className="px-6 py-4">Downloaded Audit</th>
                <th className="px-6 py-4 text-right">Superadmin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr key={rec.id || rec.requestId} className="hover:bg-slate-50/60 transition-colors">
                    {/* Candidate */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {rec.candidateName ? rec.candidateName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{rec.candidateName}</p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{rec.requestId}</p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {rec.employeeId || 'N/A'}
                    </td>

                    {/* Verifier */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <OrgLogo name={rec.verifierName} className="w-6 h-6" />
                        <div>
                          <p className="font-semibold text-slate-800">{rec.verifierName}</p>
                          <p className="text-[10px] text-slate-400">{rec.verificationType}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Clean
                      </span>
                    </td>

                    {/* Downloaded Audit */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{rec.downloadedAt ? new Date(rec.downloadedAt).toLocaleString('en-GB') : 'Downloaded'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          By: <strong className="text-slate-600">{rec.downloadedBy || rec.submittedBy || 'Client'}</strong>
                        </p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-[#0680A6] hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200/70 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Download Certified PDF Report"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestore(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200/70 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Restore record back to active records (un-hides for contributors)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(rec)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <Trash2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-sm text-slate-600">Recycle Bin is empty</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      When a user downloads a verification report, the record is safely archived here and hidden from contributors.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0680A6]">
                  Recycled Record Detail
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedRecord.candidateName}{' '}
                  <span className="font-mono text-sm text-slate-400">({selectedRecord.requestId})</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedRecord)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
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
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto sidebar-scroll text-xs sm:text-sm">
              {/* Target Verifier Info */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <OrgLogo name={selectedRecord.verifierName} className="w-10 h-10" />
                  <div>
                    <h4 className="font-bold text-slate-900">{selectedRecord.verifierName}</h4>
                    <p className="text-xs text-slate-500">
                      Category: {selectedRecord.verifierCategory} • Code: {selectedRecord.verifierCode}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified
                </span>
              </div>

              {/* Candidate Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidate Name</span>
                  <p className="font-bold text-slate-800">{selectedRecord.candidateName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID</span>
                  <p className="font-mono font-bold text-slate-800">{selectedRecord.employeeId}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation</span>
                  <p className="text-slate-700">{selectedRecord.designation || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</span>
                  <p className="text-slate-700">{selectedRecord.department || 'General'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date of Joining</span>
                  <p className="text-slate-700">{selectedRecord.dateOfJoining || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date of Leaving</span>
                  <p className="text-slate-700">{selectedRecord.dateOfLeaving || 'Present'}</p>
                </div>
              </div>

              {/* Download Audit Card */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Recycle Bin Status & Contributor Hiding
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  This report was downloaded on{' '}
                  <strong className="text-slate-800">
                    {selectedRecord.downloadedAt ? new Date(selectedRecord.downloadedAt).toLocaleString('en-GB') : 'Unknown Date'}
                  </strong>{' '}
                  by <strong className="text-slate-800">{selectedRecord.downloadedBy || 'Client User'}</strong>.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Because this report was downloaded, it is currently hidden from Contributor and ContributorAdmin roles. Clicking "Restore Record" will restore it back to the active list.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(selectedRecord)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Record</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePermanentDelete(selectedRecord)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Recyclebin
