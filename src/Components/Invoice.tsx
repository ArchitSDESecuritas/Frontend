import React, { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../useAuth'
import { API_ENDPOINTS,getAPI_HEADER } from '../endpoint'
import {
  Receipt,
  Search,
  Filter,
  Download,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  Printer,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  FileSpreadsheet,
  DollarSign,
  TrendingUp,
  Wallet
} from 'lucide-react'
import { type VerificationRecord } from './CandidateVerificationForm'
import { OrgLogo } from './OrgLogo'
import axios from 'axios';

export interface TransactionRecord {
  id: string
  invoiceNumber: string
  transactionId: string
  date: string
  time: string
  clientName: string
  clientEmail: string
  clientGstin?: string
  candidateName: string
  employeeCode: string
  servicePackage: string
  baseAmount: number
  gstAmount: number
  totalAmount: number
  paymentMethod: 'Razorpay UPI' | 'Credit / Debit Card' | 'Corporate NetBanking' | 'Direct Gateway'
  gatewayReference: string
  status: 'Paid' | 'Pending' | 'Refunded'
}

export default function Invoice() {
  const { user } = useAuth()
  const isSuperadmin = user?.Usertype?.toLowerCase() === 'superadmin'
  const isClient = user?.Usertype?.toLowerCase() === 'client'

  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Refunded'>('All')
  const [methodFilter, setMethodFilter] = useState<string>('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<TransactionRecord | null>(null)

  useEffect(() => {
    let isCancelled = false

    const loadInvoices = async () => {
      setLoading(true)
      const clientEmail = (user?.EmailID || user?.EmailID || user?.username || '').trim()
      const targetUrl = API_ENDPOINTS.clientEmpData 
      let clientEmpList: any[] = []

      try {
        // Use axios for POST
        const res = await axios.post(
          targetUrl,
          {
            Clientemail: clientEmail,
            email: clientEmail,
          },
          {
            headers: getAPI_HEADER()
          }
        )
        const data = res.data
        clientEmpList = Array.isArray(data) ? data : data?.data || data?.candidates || []
      } catch (err) {
        console.warn('ClientEmpData POST axios error in Invoice:', err)
      }

      if (!clientEmpList || clientEmpList.length === 0) {
        try {
          // Use axios for GET
          const getRes = await axios.get(targetUrl, {
            headers: {
              APIKEY: 'Securitas@#!1234',
            }
          })
          const getData = getRes.data
          clientEmpList = Array.isArray(getData) ? getData : getData?.data || getData?.candidates || []
        } catch (getErr) {
          console.warn('ClientEmpData GET axios error in Invoice:', getErr)
        }
      }

      if (Array.isArray(clientEmpList) && clientEmpList.length > 0 && !isCancelled) {
        const parsedTxns: TransactionRecord[] = clientEmpList.map((rec: any, idx: number) => {
          const candName =
            [rec.FirstName, rec.MiddleName, rec.LastName].filter(Boolean).join(' ') ||
            rec.candidateName ||
            rec.CandidateName ||
            'Candidate'
          const baseAmount = Number(rec.Amount || rec.amount || 1499)
          const gstAmount = Number((baseAmount * 0.18).toFixed(2))
          const totalAmount = Number((baseAmount + gstAmount).toFixed(2))
          const reqId = rec.RequestId || rec.requestId || `VR-${1000 + idx}`
          return {
            id: rec.id ? String(rec.id) : `tx-${idx}`,
            invoiceNumber: `WT-INV-${reqId ? String(reqId).replace('VR-', '2026-') : `2026-${1000 + idx}`}`,
            transactionId: rec.TransactionId || rec.transactionId || `TXN-${reqId ? String(reqId).replace('VR-', '948') : `94820${idx}`}`,
            date: rec.created_at ? rec.created_at.split('T')[0] : (rec.submittedAt ? rec.submittedAt.split('T')[0] : '2026-09-09'),
            time: '12:30:00',
            clientName: rec.Contributor || rec.verifierName || 'Enterprise Verifier',
            clientEmail: rec.Clientemail || rec.Email || rec.candidateEmail || 'billing@worktrail.ai',
            candidateName: candName,
            employeeCode: rec.EmployeeCode || rec.employeeId || '—',
            servicePackage: rec.verificationType || 'Standard Employment Verification',
            baseAmount,
            gstAmount,
            totalAmount,
            paymentMethod: 'Direct Gateway',
            gatewayReference: rec.OrderId || rec.orderId || rec.PaymentId || `ref_${idx}`,
            status: rec.status === 'Rejected' ? 'Refunded' : 'Paid',
          }
        })
        setTransactions(parsedTxns)
      } else if (!isCancelled) {
        setTransactions([])
      }

      if (!isCancelled) setLoading(false)
    }

    loadInvoices()

    return () => {
      isCancelled = true
    }
  }, [user])

  // Guard: Superadmin & Client access permitted
  if (!isSuperadmin && !isClient) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-12 p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          The Invoice and Transaction Ledger is restricted to authorized accounts.
        </p>
      </div>
    )
  }

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchInv = tx.invoiceNumber.toLowerCase().includes(q)
        const matchTxn = tx.transactionId.toLowerCase().includes(q)
        const matchClient = tx.clientName.toLowerCase().includes(q)
        const matchCandidate = tx.candidateName.toLowerCase().includes(q)
        const matchGateway = tx.gatewayReference.toLowerCase().includes(q)
        if (!matchInv && !matchTxn && !matchClient && !matchCandidate && !matchGateway) {
          return false
        }
      }

      if (statusFilter !== 'All' && tx.status !== statusFilter) {
        return false
      }

      if (methodFilter !== 'All' && tx.paymentMethod !== methodFilter) {
        return false
      }

      if (startDate && tx.date < startDate) return false
      if (endDate && tx.date > endDate) return false

      return true
    })
  }, [transactions, searchQuery, statusFilter, methodFilter, startDate, endDate])

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalVolume = filteredTransactions.reduce((sum, tx) => sum + (tx.status === 'Paid' ? tx.totalAmount : 0), 0)
    const paidCount = filteredTransactions.filter(tx => tx.status === 'Paid').length
    const pendingCount = filteredTransactions.filter(tx => tx.status === 'Pending').length
    const pendingVolume = filteredTransactions.reduce((sum, tx) => sum + (tx.status === 'Pending' ? tx.totalAmount : 0), 0)
    const successRate = filteredTransactions.length > 0 ? ((paidCount / filteredTransactions.length) * 100).toFixed(1) : '100'

    return {
      totalVolume,
      paidCount,
      pendingCount,
      pendingVolume,
      successRate
    }
  }, [filteredTransactions])

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportRows = filteredTransactions.map(tx => ({
      'Invoice Number': tx.invoiceNumber,
      'Transaction ID': tx.transactionId,
      'Date': tx.date,
      'Time': tx.time,
      'Client Name': tx.clientName,
      'Client Email': tx.clientEmail,
      'Client GSTIN': tx.clientGstin || 'N/A',
      'Candidate Name': tx.candidateName,
      'Employee Code': tx.employeeCode,
      'Service Package': tx.servicePackage,
      'Base Amount (INR)': tx.baseAmount,
      'GST 18% (INR)': tx.gstAmount,
      'Total Amount (INR)': tx.totalAmount,
      'Payment Gateway': tx.paymentMethod,
      'Gateway Reference': tx.gatewayReference,
      'Status': tx.status
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 35 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 14 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaction_Report')
    XLSX.writeFile(workbook, `Worktrail_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="w-full flex flex-col gap-8 select-text">
      {/* Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#031f30] via-[#063352] to-[#0680A6] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase text-emerald-300 mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            {isClient ? 'Candidate Verification Ledger' : 'Superadmin Financial Ledger'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isClient ? 'Candidate Verification Invoices & Transactions' : 'Invoices & Transaction Reports'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {isClient
              ? 'Real-time billing receipts, gateway transactions, and candidate verification fee records.'
              : 'Real-time corporate billing audit, gateway transaction settlements, and GST-compliant invoice telemetry.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="self-start sm:self-center inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>Export to Excel (.xlsx)</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Settled Volume</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{metrics.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold block mt-1">
              ✓ {metrics.paidCount} Cleared Transactions
            </span>
          </div>
        </div>

        {/* Card 2: Pending Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Authorizations</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{metrics.pendingVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-amber-600 font-bold block mt-1">
              ⏳ {metrics.pendingCount} Invoices Pending Clearance
            </span>
          </div>
        </div>

        {/* Card 3: Gateway Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gateway Success Rate</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {metrics.successRate}%
            </span>
            <span className="text-[11px] text-indigo-600 font-bold block mt-1">
              Razorpay & Net Banking SLA
            </span>
          </div>
        </div>

        {/* Card 4: Total Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoices Generated</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {filteredTransactions.length}
            </span>
            <span className="text-[11px] text-slate-500 font-bold block mt-1">
              Tax Invoices (SAC 998311)
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, client, candidate, or gateway ref..."
            className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid Only</option>
            <option value="Pending">Pending Only</option>
            <option value="Refunded">Refunded Only</option>
          </select>

          {/* Payment Method filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="All">All Gateways</option>
            <option value="Razorpay UPI">Razorpay UPI</option>
            <option value="Credit / Debit Card">Credit / Debit Card</option>
            <option value="Corporate NetBanking">Corporate NetBanking</option>
            <option value="Direct Gateway">Direct Gateway</option>
          </select>

          {/* Date inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-indigo-500 outline-none"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-indigo-500 outline-none"
              title="End Date"
            />
          </div>

          {(searchQuery || statusFilter !== 'All' || methodFilter !== 'All' || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('All')
                setMethodFilter('All')
                setStartDate('')
                setEndDate('')
              }}
              className="h-11 px-3.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Transaction Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">Invoice #</th>
                <th className="px-5 py-4">Date & Time</th>
                <th className="px-5 py-4">Client Organization</th>
                <th className="px-5 py-4">Candidate & Service</th>
                <th className="px-5 py-4">Payment Method</th>
                <th className="px-5 py-4 text-right">Amount (INR)</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 font-mono">{tx.invoiceNumber}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{tx.transactionId}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col text-slate-600 font-mono">
                        <span>{tx.date}</span>
                        <span className="text-[10px] text-slate-400">{tx.time}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <OrgLogo organizationName={tx.clientName} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 truncate">{tx.clientName}</span>
                          <span className="text-[11px] text-slate-400 truncate">{tx.clientEmail}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {tx.candidateName} <span className="text-[11px] text-slate-400 font-mono">({tx.employeeCode})</span>
                        </span>
                        <span className="text-[11px] text-indigo-600 font-medium truncate max-w-[200px]">
                          {tx.servicePackage}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                          {tx.paymentMethod}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                          {tx.gatewayReference}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-extrabold text-slate-900 font-mono">
                          ₹{tx.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          (Base: ₹{tx.baseAmount} + 18% GST)
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tx.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {tx.status === 'Paid' && <CheckCircle2 className="w-3 h-3" />}
                        {tx.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {tx.status === 'Refunded' && <AlertCircle className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(tx)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Tax Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-xs text-slate-600">No matching transactions found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try broadening your search or date filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Official Tax Invoice Summary</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Sheet */}
            <div className="p-6 sm:p-8 flex flex-col gap-6 font-sans">
              {/* Top Company & Invoice Branding */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-extrabold text-[#031f30] tracking-tight">WALSONS WORKTRAIL</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Walsons Facility & Compliance Services Pvt Ltd<br />
                    GSTIN: <strong>07AAACW5432B1Z8</strong> • SAC: <strong>998311</strong><br />
                    Email: support@worktrail.ai • Helpdesk: +91 11 4982 9000
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase tracking-wider block sm:inline-block mb-1">
                    {selectedInvoice.status} TAX INVOICE
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-1">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-xs text-slate-500 font-mono">Date: {selectedInvoice.date} {selectedInvoice.time}</p>
                </div>
              </div>

              {/* Billed To & Candidate Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">BILLED TO (CLIENT)</span>
                  <p className="font-bold text-slate-900">{selectedInvoice.clientName}</p>
                  <p className="text-slate-500 mt-0.5">{selectedInvoice.clientEmail}</p>
                  <p className="text-slate-500 font-mono mt-0.5">GSTIN: {selectedInvoice.clientGstin || 'Unregistered'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">VERIFICATION TARGET</span>
                  <p className="font-bold text-slate-900">{selectedInvoice.candidateName}</p>
                  <p className="text-slate-500 font-mono">EMP Code: {selectedInvoice.employeeCode}</p>
                  <p className="text-slate-500 font-mono">Txn ID: {selectedInvoice.transactionId}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-center">SAC Code</th>
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{selectedInvoice.servicePackage}</p>
                        <p className="text-[11px] text-slate-500">Includes Registry Cross-Check, Experience Audit & Digital ID Verification.</p>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">998311</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{selectedInvoice.baseAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculations Breakdown */}
              <div className="flex flex-col items-end gap-1.5 text-xs text-slate-600 pr-2">
                <div className="flex justify-between w-64">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">₹{selectedInvoice.baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64">
                  <span>CGST (9%):</span>
                  <span className="font-mono text-slate-700">₹{(selectedInvoice.gstAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64">
                  <span>SGST (9%):</span>
                  <span className="font-mono text-slate-700">₹{(selectedInvoice.gstAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64 pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                  <span>Total Amount:</span>
                  <span className="font-mono text-emerald-600">₹{selectedInvoice.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Receipt Seal */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Settled via <strong>{selectedInvoice.paymentMethod}</strong> (Ref: <code>{selectedInvoice.gatewayReference}</code>)</span>
                </div>
                <span className="font-mono text-slate-400">Digitally Verified Document</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
