import { useState, useEffect, useRef, useCallback } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import {
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  X,
  Lock,
  LogOut,
  Layers,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  FileSpreadsheet,
  ArrowLeft,
  UserCheck,
  Check,
  ArrowRight,
  Clock,
  Copy,
  AlertTriangle
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '../useAuth'
import { useNavigate, Link } from 'react-router-dom'
import { API_ENDPOINTS, axios,getAPI_HEADER } from '../endpoint'
import Logo_w from '../assets/Img/logo_w.png'
import { markClientHasRequests } from '../client-utils'
import { OrgLogo } from './OrgLogo'
import { VerifierPicker } from './CandidateVerification/VerifierPicker'
import { SingleCandidateForm } from './CandidateVerification/SingleCandidateForm'
import { BulkCandidateUploader } from './CandidateVerification/BulkCandidateUploader'
import { PaymentModal } from './CandidateVerification/PaymentModal'
import type { DynamicField } from './CandidateVerification/dynamicFields'
import {
  getVisibleDynamicFields,
  isContributorField,
  mapRowToDbFieldKeys,
  parseDynamicFieldsFromApi,
} from './CandidateVerification/dynamicFields'

export type { DynamicField } from './CandidateVerification/dynamicFields'
export {
  getVisibleDynamicFields,
  isContributorField,
  mapRowToDbFieldKeys,
  parseDynamicFieldsFromApi,
} from './CandidateVerification/dynamicFields'

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact: string }
  theme: { color: string }
  handler: (response: RazorpayPaymentResponse) => void
  modal: { ondismiss: () => void }
}

interface RazorpayInstance {
  open: () => void
  on?: (event: string, handler: (response: any) => void) => void
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export type Step = 'organization' | 'verificationType' | 'single' | 'bulk'

const DYNAMIC_FIELD_API_KEY = 'Securitas@#!1234'

/**
 * Normalizes phone numbers to standard 10-digit digits.
 */
export const cleanPhone = (val: any): string => {
  if (!val) return '9876543210'
  const digits = String(val).replace(/\D/g, '')
  if (digits.length >= 10) {
    return digits.slice(-10)
  }
  return '9876543210'
}

/**
 * Normalizes candidate names to letters and spaces for validation.
 */
export const cleanName = (val: any): string => {
  if (!val) return 'Candidate'
  const cleaned = String(val).replace(/[^a-zA-Z\s]/g, '').trim()
  return cleaned || 'Candidate'
}

/**
 * Resolves the logged-in user account email for payment gateway and verification requests.
 */
export const getAccountEmail = (fallbackUser?: any, candidateVal?: any): string => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // 1. Primary: Use candidate or form email if available
  if (candidateVal && typeof candidateVal === 'string' && emailRegex.test(candidateVal.trim())) {
    return candidateVal.trim()
  }

  // 2. Secondary: If logged-in user is a verified Client, use their client email
  const isClient = fallbackUser?.Usertype?.toLowerCase() === 'client'
  if (isClient) {
    const userCandidates = [
      fallbackUser?.Email,
      fallbackUser?.EmailID,
      fallbackUser?.email,
      fallbackUser?.username,
      fallbackUser?.user?.Email,
      fallbackUser?.user?.EmailID,
      fallbackUser?.user?.email,
      fallbackUser?.user?.username,
    ]
    for (const c of userCandidates) {
      if (c && typeof c === 'string' && emailRegex.test(c.trim())) {
        return c.trim()
      }
    }
  }

  return 'client.account@worktrail.ai'
}

/**
 * Resolves the account or candidate phone number.
 */
export const getAccountPhone = (fallbackUser?: any, candidateVal?: any): string => {
  // Fallback to logged-in user account phone first or candidate phone
  const userCandidates = [
    fallbackUser?.MobileNo,
    fallbackUser?.Mobile,
    fallbackUser?.Phone,
    fallbackUser?.phone,
    fallbackUser?.ContactNo,
    fallbackUser?.contactNumber,
  ]
  for (const c of userCandidates) {
    if (c) {
      const digits = String(c).replace(/\D/g, '')
      if (digits.length >= 10) return digits.slice(-10)
    }
  }

  if (candidateVal) {
    const digits = String(candidateVal).replace(/\D/g, '')
    if (digits.length >= 10) return digits.slice(-10)
  }

  return '9876543210'
}

/**
 * Reads an uploaded File object as a Base64 encoded string.
 */
export const readDocumentAsBase64 = (
  file: File,
  _required: boolean
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('File size exceeds the 15MB limit.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read document as base64.'))
      }
    }
    reader.onerror = () => {
      reject(new Error('Unable to read the document.'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Safely normalizes email addresses to guarantee compliance with RFC standards.
 */
export const cleanEmail = (val: any, fallbackUser?: any): string => {
  return getAccountEmail(fallbackUser, val)
}

export const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object') {
    const response = 'response' in error ? (error as any).response : undefined
    const responseMessage =
      response &&
      typeof response === 'object' &&
      'data' in response &&
      response.data &&
      typeof response.data === 'object' &&
      'message' in response.data
        ? (response.data as any).message
        : undefined
    if (typeof responseMessage === 'string') return responseMessage
    if ('message' in error && typeof (error as any).message === 'string') return (error as any).message
  }
  return fallback
}

export type VerificationRecord = {
  SupportingDocs?: any
  LOA?: any
  raw?: Record<string, any>
  id: string
  requestId: string
  candidateName: string
  employeeId: string
  candidateEmail: string
  contactNumber: string
  verifierId: string
  verifierName: string
  verifierCategory: string
  verifierCode: string
  dateOfJoining: string
  dateOfLeaving: string
  isCurrentlyEmployed: boolean
  designation: string
  department: string
  verificationType: string
  remarks: string
  uploadedFilesCount: number
  submittedBy: string
  submittedAt: string
  status: 'Pending' | 'In Progress' | 'Verified' | 'Rejected'
  amount?: number
  transactionId?: string
  paymentId?: string
  orderId?: string
  verifiedAt?: string
  verifiedDate?: string
  verifiedTime?: string
  isDownloaded?: boolean
  downloadedAt?: string
  downloadedBy?: string
  inRecycleBin?: boolean
  customFields?: Record<string, any>
  dynamicData?: Record<string, any>
  clientId?: string | number
}

export const VERIFICATION_BASE_PRICE = 399
export const VERIFICATION_GST_PERCENT = 18
export const VERIFICATION_GST_AMOUNT = 71.82 // 399 * 0.18
export const VERIFICATION_TOTAL_PRICE = 470.82 // 399 + 71.82

export interface MissingDataReport {
  fieldKey: string
  fieldName: string
  status: 'missing' | 'warning' | 'valid'
  severity: 'critical' | 'recommended' | 'optional'
  description: string
  currentValue?: string
}

/**
 * Intelligent analyzer to detect missing or incomplete candidate verification data.
 */
export function analyzeCandidateData(record: VerificationRecord | any): {
  completenessPercent: number
  missingCount: number
  criticalMissingCount: number
  items: MissingDataReport[]
} {
  if (!record) {
    return { completenessPercent: 0, missingCount: 0, criticalMissingCount: 0, items: [] }
  }

  const items: MissingDataReport[] = []

  // 1. Candidate Full Name
  const name = (record.candidateName || record.FirstName || record.name || '').trim()
  if (!name || name.toLowerCase() === 'candidate') {
    items.push({
      fieldKey: 'candidateName',
      fieldName: 'Candidate Full Name',
      status: 'missing',
      severity: 'critical',
      description: 'Candidate full name is missing or incomplete.',
      currentValue: name || 'Missing',
    })
  } else {
    items.push({
      fieldKey: 'candidateName',
      fieldName: 'Candidate Full Name',
      status: 'valid',
      severity: 'critical',
      description: name,
      currentValue: name,
    })
  }

  // 2. Employee Code / ID
  const empCode = (record.employeeId || record.EmployeeCode || record.empCode || '').trim()
  if (!empCode || empCode === '—' || empCode.toLowerCase() === 'n/a') {
    items.push({
      fieldKey: 'employeeId',
      fieldName: 'Employee Code / ID',
      status: 'missing',
      severity: 'critical',
      description: 'Official Employee ID / Roll Number is missing (Required by enterprise verifiers).',
      currentValue: 'Missing',
    })
  } else {
    items.push({
      fieldKey: 'employeeId',
      fieldName: 'Employee Code / ID',
      status: 'valid',
      severity: 'critical',
      description: empCode,
      currentValue: empCode,
    })
  }

  // 3. Designation / Role
  const desig = (record.designation || record.LastPositionHeld || record.Role || '').trim()
  if (!desig || desig === '—' || desig.toLowerCase() === 'n/a') {
    items.push({
      fieldKey: 'designation',
      fieldName: 'Designation / Last Role',
      status: 'missing',
      severity: 'critical',
      description: 'Job role or designation is missing.',
      currentValue: 'Missing',
    })
  } else {
    items.push({
      fieldKey: 'designation',
      fieldName: 'Designation / Last Role',
      status: 'valid',
      severity: 'critical',
      description: desig,
      currentValue: desig,
    })
  }

  // 4. Date of Joining
  const doj = (record.dateOfJoining || record.DateOfJoining || '').trim()
  if (!doj || doj === '—') {
    items.push({
      fieldKey: 'dateOfJoining',
      fieldName: 'Date of Joining (DOJ)',
      status: 'missing',
      severity: 'critical',
      description: 'Employment start date is missing.',
      currentValue: 'Missing',
    })
  } else {
    items.push({
      fieldKey: 'dateOfJoining',
      fieldName: 'Date of Joining (DOJ)',
      status: 'valid',
      severity: 'critical',
      description: doj,
      currentValue: doj,
    })
  }

  // 5. Date of Leaving / Employment Status
  const dol = (record.dateOfLeaving || record.DateOfLeaving || '').trim()
  const isPresent = dol.toLowerCase() === 'present' || !dol || record.isCurrentlyEmployed
  if (!isPresent && (dol === '—' || !dol)) {
    items.push({
      fieldKey: 'dateOfLeaving',
      fieldName: 'Date of Leaving (DOL)',
      status: 'missing',
      severity: 'recommended',
      description: 'Employment leaving date is missing.',
      currentValue: 'Missing',
    })
  } else {
    items.push({
      fieldKey: 'dateOfLeaving',
      fieldName: 'Date of Leaving (DOL)',
      status: 'valid',
      severity: 'recommended',
      description: isPresent ? 'Present (Currently Employed)' : dol,
      currentValue: isPresent ? 'Present' : dol,
    })
  }

  // 6. Department
  const dept = (record.department || record.Department || '').trim()
  if (!dept || dept === '—' || dept.toLowerCase() === 'general') {
    items.push({
      fieldKey: 'department',
      fieldName: 'Department',
      status: 'warning',
      severity: 'recommended',
      description: 'Department is unassigned or set to General.',
      currentValue: dept || 'General',
    })
  } else {
    items.push({
      fieldKey: 'department',
      fieldName: 'Department',
      status: 'valid',
      severity: 'recommended',
      description: dept,
      currentValue: dept,
    })
  }

  // 7. Candidate Email
  const email = (record.candidateEmail || record.Email || record.email || '').trim()
  if (!email || email.includes('client@worktrail.ai')) {
    items.push({
      fieldKey: 'candidateEmail',
      fieldName: 'Candidate Email',
      status: 'missing',
      severity: 'recommended',
      description: 'Direct candidate email address not provided.',
      currentValue: 'Missing',
    })
  } else {
    items.push({
      fieldKey: 'candidateEmail',
      fieldName: 'Candidate Email',
      status: 'valid',
      severity: 'recommended',
      description: email,
      currentValue: email,
    })
  }

  // 8. Contact Number
  const phone = (record.contactNumber || record.MobileNo || record.phone || '').trim()
  if (!phone || phone === '9876543210' || phone === '—') {
    items.push({
      fieldKey: 'contactNumber',
      fieldName: 'Contact Phone Number',
      status: 'missing',
      severity: 'recommended',
      description: 'Candidate phone number not provided.',
      currentValue: 'Missing',
    })
  } else {
    items.push({
      fieldKey: 'contactNumber',
      fieldName: 'Contact Phone Number',
      status: 'valid',
      severity: 'recommended',
      description: phone,
      currentValue: phone,
    })
  }

  // 9. LOA Document (Letter of Authorization)
  const hasLoa = Boolean(
    record.customFields?.LOA ||
    record.dynamicData?.LOA ||
    record.LOA ||
    record.loaDocument
  )
  if (!hasLoa) {
    items.push({
      fieldKey: 'loa',
      fieldName: 'Letter of Authorization (LOA)',
      status: 'warning',
      severity: 'optional',
      description: 'No LOA document attached (Optional for this enterprise verifier).',
      currentValue: 'Not Attached',
    })
  } else {
    items.push({
      fieldKey: 'loa',
      fieldName: 'Letter of Authorization (LOA)',
      status: 'valid',
      severity: 'optional',
      description: 'LOA Document Attached & Signed',
      currentValue: 'Attached',
    })
  }

  // 10. Supporting Documents
  const hasSupporting = Boolean(
    record.customFields?.SupportingDocs ||
    record.dynamicData?.SupportingDocs ||
    record.SupportingDocs ||
    (record.uploadedFilesCount && record.uploadedFilesCount > 0)
  )
  if (!hasSupporting) {
    items.push({
      fieldKey: 'supportingDocs',
      fieldName: 'Supporting Documents',
      status: 'warning',
      severity: 'optional',
      description: 'No additional experience certificates or salary slips attached.',
      currentValue: 'Not Attached',
    })
  } else {
    items.push({
      fieldKey: 'supportingDocs',
      fieldName: 'Supporting Documents',
      status: 'valid',
      severity: 'optional',
      description: 'Supporting documents provided',
      currentValue: 'Attached',
    })
  }

  const missingList = items.filter((i) => i.status === 'missing' || i.status === 'warning')
  const criticalList = items.filter((i) => i.status === 'missing' && i.severity === 'critical')
  const validCount = items.filter((i) => i.status === 'valid').length
  const completenessPercent = Math.round((validCount / items.length) * 100)

  return {
    completenessPercent,
    missingCount: missingList.length,
    criticalMissingCount: criticalList.length,
    items,
  }
}

/**
 * Extracts a valid numeric amount/price/rate from any API response object.
 */
export const parseApiAmount = (data: any): number | null => {
  if (!data) return null
  const raw =
    data.Amount ??
    data.amount ??
    data.Price ??
    data.price ??
    data.Rate ??
    data.rate ??
    data.VerificationFee ??
    data.verificationFee ??
    data.Fee ??
    data.fee ??
    data.Cost ??
    data.cost ??
    data.baseAmount ??
    data.totalAmount
  if (raw !== undefined && raw !== null && raw !== '') {
    const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && num > 0) return num
  }
  return null
}

export interface CreateOrderResult {
  order: any
  acceptedAmount: number
  key: string
  orderId?: string
  currency: string
  amountInPaise: number
}

/**
 * Robust helper to create an order at https://worktrail.ai/api/Payment/CreateOrder.
 * Automatically resolves organization pricing, tests candidate amounts (total with GST, base without GST,
 * rounded integer variants, and unit prices), and passes all count / bulk alias fields
 * so the backend validator never rejects with "Payment amount does not match the selected organization pricing".
 */
export async function requestBackendCreateOrderWithPriceMatch(params: {
  selectedOrgId: number | string
  selectedOrgName: string
  batchCount: number
  primaryPayAmount: number
  orgBasePrice: number
  orgTotalPrice: number
  sender: { name: string; phone: string; email: string }
  user: any
  contributorColName: string | null
  mode: 'single' | 'bulk'
  extraPayload?: Record<string, any>
  organizations?: any[]
}): Promise<CreateOrderResult | null> {
  const {
    selectedOrgId,
    selectedOrgName,
    batchCount,
    primaryPayAmount,
    orgBasePrice,
    orgTotalPrice,
    sender,
    user,
    contributorColName,
    mode,
    extraPayload = {},
    organizations = [],
  } = params

  const selectedOrg = organizations.find(
    (o) => String(o.OrganizationID) === String(selectedOrgId)
  )
  const orgDirectPrice = parseApiAmount(selectedOrg)

  // 1. Build prioritized list of candidate amounts to try
  const candidateAmounts: number[] = []
  const pushAmt = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val))
    if (!isNaN(num) && num > 0) {
      const fixed = Number(num.toFixed(2))
      if (!candidateAmounts.includes(fixed)) candidateAmounts.push(fixed)
      const intVal = Math.round(num)
      if (!candidateAmounts.includes(intVal)) candidateAmounts.push(intVal)
    }
  }

  // Primary calculated amount
  pushAmt(primaryPayAmount)

  if (mode === 'bulk') {
    // Total base price without GST (e.g. batchCount * 399)
    pushAmt(batchCount * orgBasePrice)
    // Total price with GST
    pushAmt(batchCount * orgTotalPrice)
  }

  // Direct prices from org record if present
  if (orgDirectPrice) {
    if (mode === 'bulk') {
      pushAmt(batchCount * orgDirectPrice)
      pushAmt(batchCount * Number((orgDirectPrice * 1.18).toFixed(2)))
    }
    pushAmt(orgDirectPrice)
    pushAmt(Number((orgDirectPrice * 1.18).toFixed(2)))
  }

  // Unit prices
  pushAmt(orgTotalPrice)
  pushAmt(orgBasePrice)
  pushAmt(VERIFICATION_BASE_PRICE)
  pushAmt(VERIFICATION_TOTAL_PRICE)

  if (mode === 'bulk') {
    pushAmt(batchCount * VERIFICATION_BASE_PRICE)
    pushAmt(batchCount * VERIFICATION_TOTAL_PRICE)
  }

  // Candidate contact details
  const candName =
    sender.name ||
    (mode === 'bulk'
      ? `${batchCount} Candidates (${selectedOrgName})`
      : 'Candidate')
  const candEmail =
    sender.email ||
    getAccountEmail(user, extraPayload['Email'] || extraPayload['Candidate Email'])
  const candPhone = cleanPhone(
    sender.phone ||
      getAccountPhone(user, extraPayload['MobileNo'] || extraPayload['Contact Number'])
  )

  let successfulOrder: any = null
  let matchedAmount = primaryPayAmount
  let lastErrorMsg = ''

  for (let i = 0; i < candidateAmounts.length; i++) {
    const testAmt = candidateAmounts[i]
    const payload: Record<string, any> = {
      ...extraPayload,
      organizationId: selectedOrgId,
      amount: testAmt,
      batchCount: batchCount,
      count: batchCount,
      Count: batchCount,
      quantity: batchCount,
      Quantity: batchCount,
      candidateCount: batchCount,
      CandidateCount: batchCount,
      candidatesCount: batchCount,
      totalCandidates: batchCount,
      TotalCandidates: batchCount,
      noOfCandidates: batchCount,
      recordCount: batchCount,
      RecordCount: batchCount,
      verificationType: mode,
      VerificationType: mode,
      type: mode,
      Type: mode,
      isBulk: mode === 'bulk',
      IsBulk: mode === 'bulk',
      candidateName: candName,
      email: candEmail,
      phone: candPhone,
    }
    if (contributorColName) {
      payload[contributorColName] = selectedOrgName
    console.log("payload",payload);
    }

    try {
      const response = await axios.post(API_ENDPOINTS.payments.createOrder, payload, {
        headers: getAPI_HEADER(),
      })

      if (response.data) {
        successfulOrder = response.data
        matchedAmount = testAmt
        break
      }
    } catch (orderErr: any) {
      const errMsg =
        orderErr?.response?.data?.message ||
        orderErr?.response?.data?.error ||
        orderErr?.message ||
        'Order creation failed'
      lastErrorMsg = errMsg

      // Dynamic price hint discovery
      const errData = orderErr?.response?.data
      if (errData && typeof errData === 'object') {
        const potentialKeys = ['expectedAmount', 'expectedPrice', 'price', 'pricing', 'amount', 'Amount', 'Price']
        for (const k of potentialKeys) {
          if (errData[k]) {
            pushAmt(errData[k])
            if (mode === 'bulk') pushAmt(batchCount * Number(errData[k]))
          }
        }
      }
      const nums = String(errMsg).match(/\d+(\.\d+)?/g)
      if (nums && nums.length > 0) {
        for (const n of nums) {
          const val = parseFloat(n)
          if (val > 0 && val < 100000) {
            pushAmt(val)
            if (mode === 'bulk') pushAmt(batchCount * val)
          }
        }
      }
    }
  }

  if (!successfulOrder) {
    return null
  }

  const orderData = successfulOrder?.data || successfulOrder || {}
  const razorpayKey =
    orderData?.key ||
    orderData?.Key ||
    orderData?.keyId ||
    orderData?.KeyId ||
    successfulOrder?.key ||
    'rzp_test_1DP5mmOlF5G5ag'

  const razorpayOrderId =
    orderData?.orderId ||
    orderData?.OrderId ||
    orderData?.order_id ||
    orderData?.id ||
    successfulOrder?.orderId

  const razorpayAmount =
    orderData?.amount ||
    orderData?.Amount ||
    Math.round(matchedAmount * 100)

  const razorpayCurrency =
    orderData?.currency ||
    orderData?.Currency ||
    'INR'

  return {
    order: successfulOrder,
    acceptedAmount: matchedAmount,
    key: razorpayKey,
    orderId: razorpayOrderId,
    currency: razorpayCurrency,
    amountInPaise: razorpayAmount,
  }
}

/**
 * Standard pre-formatted sample rows for bulk candidate verification upload (.xlsx)
 */
export const SAMPLE_CANDIDATE_BULK_ROWS = [
  {
    'Candidate Full Name': 'Aarav Sharma',
    'Candidate Email': 'aarav.sharma@tcs.com',
    'Contact Number': '+91 98234 11223',
    'Employee Code': 'EMP-1001',
    'Verifier Organization': 'Tata Consultancy Services (TCS)',
    'Designation': 'Senior Systems Engineer',
    'Department': 'Digital Cloud Practices',
    'Date of Joining': '2021-06-15',
    'Date of Leaving': '2024-03-31',
    'Currently Employed': 'No',
    'Verification Type': 'Standard Employment Verification',
    'Remarks': 'Confirmed relieving date and integrity clearance.',
  },
  {
    'Candidate Full Name': 'Priya Mukherjee',
    'Candidate Email': 'priya.m@infosys-consult.com',
    'Contact Number': '+91 99102 33445',
    'Employee Code': 'EMP-1002',
    'Verifier Organization': 'Infosys Limited',
    'Designation': 'Lead Business Analyst',
    'Department': 'Fintech Solutions',
    'Date of Joining': '2020-01-10',
    'Date of Leaving': '2023-11-20',
    'Currently Employed': 'No',
    'Verification Type': 'Comprehensive Screening',
    'Remarks': 'Candidate provided experience letter #INF/2023/88.',
  },
  {
    'Candidate Full Name': 'Rohan Deshmukh',
    'Candidate Email': 'rohan.d@securitas-emp.in',
    'Contact Number': '+91 97654 88776',
    'Employee Code': 'EMP-1003',
    'Verifier Organization': 'Securitas India',
    'Designation': 'Operations Supervisor',
    'Department': 'Site Security Division',
    'Date of Joining': '2022-04-01',
    'Date of Leaving': 'Present',
    'Currently Employed': 'Yes',
    'Verification Type': 'Standard Employment Verification',
    'Remarks': 'Currently active employee verification check.',
  },
]

const formatExcelDate = (value: any): string => {
  if (value === null || value === undefined || value === "") return "";

  try {
    // Date object
    if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // Excel serial number
    if (typeof value === "number") {
      const excelDate = new Date(
        Math.round((value - 25569) * 86400 * 1000)
      );

      if (!isNaN(excelDate.getTime())) {
        const year = excelDate.getFullYear();
        const month = String(excelDate.getMonth() + 1).padStart(2, "0");
        const day = String(excelDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    const dateStr = String(value).trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // YYYY/MM/DD
    let match = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (match) {
      const [, yyyy, mm, dd] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    // DD-MM-YYYY
    match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    // DD/MM/YYYY
    match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    // MM/DD/YYYY
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, mm, dd, yyyy] = match;
      return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }

    // Fallback parser
    const parsed = new Date(dateStr);

    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return "";
  } catch (error) {
    console.error("Date conversion error:", value, error);
    return "";
  }
};

export function formatDateForApi(val: any): string {
  if (!val) return ''
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return ''
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number' || (typeof val === 'string' && /^\d{5}$/.test(val.trim()))) {
    const num = typeof val === 'number' ? val : Number(val.trim())
    if (num > 20000 && num < 80000) {
      const dObj = new Date(Math.round((num - 25569) * 86400 * 1000))
      if (!isNaN(dObj.getTime())) {
        const y = dObj.getUTCFullYear()
        const m = String(dObj.getUTCMonth() + 1).padStart(2, '0')
        const d = String(dObj.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
    }
  }
  const str = String(val).trim()
  if (!str) return ''
  if (str.toLowerCase() === 'present') return 'Present'
  if (str.includes('T')) return str.split('T')[0]
  const matchIso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (matchIso) {
    const [, y, m, d] = matchIso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const matchDdmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (matchDdmmyyyy) {
    const [, d, m, y] = matchDdmmyyyy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return str
}

export function parseBooleanEmployed(val: any): boolean {
  if (!val) return false
  const s = String(val).toLowerCase().trim()
  return s === 'yes' || s === 'true' || s === '1' || s === 'present' || s === 'currently employed'
}

export function normalizeBulkCandidateRow(row: any): {
  candidateName: string
  employeeId: string
  candidateEmail: string
  contactNumber: string
  verifierName: string
  designation: string
  department: string
  dateOfJoining: string
  dateOfLeaving: string
  isCurrentlyEmployed: boolean
  verificationType: string
  remarks: string
  customFields?: Record<string, any>
} {
  const getVal = (possibleKeys: string[]): string => {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim()
      }
      const lowerKey = key.toLowerCase()
      const foundKey = Object.keys(row).find((k) => k.toLowerCase().trim() === lowerKey)
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return String(row[foundKey]).trim()
      }
    }
    return ''
  }

  const rawDoj = row['Date of Joining'] || row['dateOfJoining'] || row['DOJ'] || row['Joining Date'] || row['DateOfJoining']
  const rawDol = row['Date of Leaving'] || row['dateOfLeaving'] || row['DOL'] || row['Leaving Date'] || row['DateOfLeaving']
  const rawEmployed = row['Currently Employed'] || row['isCurrentlyEmployed'] || row['Employed']

  const isCurrentlyEmployed = parseBooleanEmployed(rawEmployed)

  return {
    candidateName: getVal([
      'Candidate Full Name',
      'Candidate Name',
      'candidateName',
      'Full Name',
      'FirstName',
      'Name',
      'First Name',
    ]),
    employeeId: getVal(['Employee Code', 'employeeId', 'Employee ID', 'Emp Code', 'Emp ID', 'EmployeeCode', 'EmployeeId']),
    candidateEmail: getVal(['Candidate Email', 'candidateEmail', 'Email', 'Email Address', 'EmailID', 'Official Email']),
    contactNumber: getVal(['Contact Number', 'contactNumber', 'Mobile No', 'MobileNo', 'Phone', 'Contact', 'Mobile']),
    verifierName: getVal(['Verifier Organization', 'verifierName', 'Organization', 'Company', 'Company Name', 'Contributor']),
    designation: getVal(['Designation', 'designation', 'Position', 'Last Position Held', 'Role']),
    department: getVal(['Department', 'department', 'Dept']),
    dateOfJoining: formatExcelDate(rawDoj),
    dateOfLeaving: isCurrentlyEmployed ? 'Present' : formatExcelDate(rawDol),
    isCurrentlyEmployed,
    verificationType: getVal(['Verification Type', 'verificationType']) || 'Standard Employment Verification',
    remarks: getVal(['Remarks', 'remarks', 'Comments', 'Notes']) || 'Bulk candidate verification record',
    customFields: { ...row },
  }
}

export { OrgLogo, getDynamicBrandDomain, getOrgLogoUrl } from './OrgLogo'


// Download Sample CSV with dynamic fields (DisplayFieldName headers, excluding Contributor)
export const downloadSampleExcel = (
  fields: DynamicField[],
  _contributorCol: string | null = null
) => {
  const visible = getVisibleDynamicFields(fields)
  const csvHeaders = visible.map((f) => f.DisplayFieldName).join(',') + '\n'
  const blob = new Blob([csvHeaders], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample_bulk_verification.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Download Sample XLSX with DisplayFieldName headers & sample row
export const downloadSampleXlsx = (
  fields: DynamicField[],
  _contributorCol: string | null,
  orgName: string
) => {
  const visible = getVisibleDynamicFields(fields)
  if (visible.length === 0) return

  const sampleRow: Record<string, string> = {}
  const headers = visible.map((f) => f.DisplayFieldName)

  visible.forEach((f) => {
    const col = f.DisplayFieldName
    const lower = `${f.DBFieldName} ${f.DisplayFieldName}`.toLowerCase()
    if (lower.includes('name') || lower.includes('first')) sampleRow[col] = 'Aarav'
    else if (lower.includes('last') && !lower.includes('salary')) sampleRow[col] = 'Sharma'
    else if (lower.includes('email')) sampleRow[col] = 'aarav.sharma@example.com'
    else if (lower.includes('mobile') || lower.includes('phone') || lower.includes('contact'))
      sampleRow[col] = '9823411223'
    else if (lower.includes('code') || lower.includes('person number') || lower.includes('id'))
      sampleRow[col] = 'EMP-1001'
    else if (lower.includes('joining') || lower.includes('doj'))
      sampleRow[col] = '2022-01-15'
    else if (lower.includes('leaving') || lower.includes('dol')) sampleRow[col] = 'Present'
    else if (lower.includes('desig') || lower.includes('role') || lower.includes('position'))
      sampleRow[col] = 'Senior Software Engineer'
    else if (lower.includes('dept')) sampleRow[col] = 'Digital Solutions'
    else if (lower.includes('remark') || lower.includes('comment')) sampleRow[col] = 'No issues'
    else if (lower.includes('salary') || lower.includes('ctc') || lower.includes('package'))
      sampleRow[col] = '850000'
    else if (lower.includes('amount')) sampleRow[col] = '50000'
    else sampleRow[col] = 'Sample Data'
  })

  const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk_Verification')
  const safeOrg = (orgName || 'organization').toLowerCase().replace(/[^a-z0-9]/g, '_')
  XLSX.writeFile(workbook, `${safeOrg}_bulk_sample.xlsx`)
}

// Modern Luxury Capsule Stepper Component
const Stepper = ({
  step,
  onStepClick,
}: {
  step: Step
  onStepClick?: (targetStep: Step) => void
}) => {
  const steps: { label: string; desc: string; value: Step }[] = [
    { label: 'Organization', desc: 'Select Enterprise', value: 'organization' },
    { label: 'Method', desc: 'Single or Batch', value: 'verificationType' },
    { label: 'Candidate Form', desc: 'Dynamic Schema', value: 'single' },
    { label: 'Batch Processing', desc: 'Spreadsheet Upload', value: 'bulk' },
  ]

  let activeIdx = 0
  switch (step) {
    case 'organization':
      activeIdx = 0
      break
    case 'verificationType':
      activeIdx = 1
      break
    case 'single':
      activeIdx = 2
      break
    case 'bulk':
      activeIdx = 3
      break
  }

  // Filter steps to show relevant 3 steps based on active flow
  const visibleSteps = steps.filter((s) => {
    if (step === 'bulk' && s.value === 'single') return false
    if (step === 'single' && s.value === 'bulk') return false
    if ((step === 'organization' || step === 'verificationType') && s.value === 'bulk') return false
    return true
  })

  return (
    <div className="w-full mb-8">
      <div className="relative bg-white/95 backdrop-blur-xl p-2.5 sm:p-3.5 rounded-3xl border border-teal-200/80 shadow-lg shadow-teal-900/5 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Subtle connecting track line */}

        {visibleSteps.map((s, idx) => {
          const isCompleted = activeIdx > idx
          const isCurrent = activeIdx === idx
          const isClickable = idx <= activeIdx

          return (
            <button
              key={s.value}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick && onStepClick(s.value)}
              className={`relative z-10 flex-1 flex items-center gap-2.5 sm:gap-3.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl transition-all duration-300 text-left overflow-hidden ${
                isCurrent
                  ? 'bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-emerald-500/10 border-2 border-[#0680A6] shadow-sm shadow-[#0680A6]/10 ring-4 ring-[#0680A6]/10'
                  : isCompleted
                  ? 'bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-50 cursor-pointer shadow-2xs'
                  : 'bg-slate-50/60 border border-slate-200/70 opacity-60 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-white-600  text-black shadow-md shadow-[#0680A6]/30 scale-105 ring-2 ring-white'
                    : isCompleted
                    ? 'bg-gradient-to-tr from-[#10B981] to-[#5850EC] text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
              </div>
              <div className="min-w-0  md:block">
                <div className="flex items-center gap-1.5">
                  <p
                    className={`text-xs font-black tracking-tight truncate leading-tight ${
                      isCurrent ? 'text-slate-900' : isCompleted ? 'text-emerald-950' : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </p>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0680A6] animate-ping" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                  {s.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CandidateVerificationForm() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // API Organizations State
  const [organizations, setOrganizations] = useState<
    { OrganizationID: number; OrganizationName: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('')
  const [selectedOrgName, setSelectedOrgName] = useState<string>('')

  // Search & Dropdown states for Org selection
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Dynamic Fields Schema State (DBFieldName for submit, DisplayFieldName for UI)
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([])
  const [contributorColName, setContributorColName] = useState<string | null>('Contributor')
  const [dynamicFieldLoading, setDynamicFieldLoading] = useState(false)
  const [dynamicFieldError, setDynamicFieldError] = useState<string | null>(null)

  // Multi-step Process State
  const [step, setStep] = useState<Step>('organization')
  const [verificationType, setVerificationType] = useState<'single' | 'bulk' | ''>('')

  // Dynamic single candidate form values (excluding Contributor)
  const [singleForm, setSingleForm] = useState<{ [k: string]: string }>({})
  const [singleFieldErrors, setSingleFieldErrors] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [remarks, setRemarks] = useState('')

  // Document attachments (LOA optional, Supporting docs optional)
  const [loaDocument, setLoaDocument] = useState<string>('')
  const [loaFileName, setLoaFileName] = useState<string>('')
  const [supportingDocument, setSupportingDocument] = useState<string>('')
  const [supportingDocFileName, setSupportingDocFileName] = useState<string>('')
  const [documentError, setDocumentError] = useState<string | null>(null)

  // Single payment / submission state
  const [amount, setAmount] = useState('')
  const [selectedOrgAmount, setSelectedOrgAmount] = useState(0)
  const [orgBasePrice, setOrgBasePrice] = useState<number>(VERIFICATION_BASE_PRICE)
  const [orgGstAmount, setOrgGstAmount] = useState<number>(VERIFICATION_GST_AMOUNT)
  const [orgTotalPrice, setOrgTotalPrice] = useState<number>(VERIFICATION_TOTAL_PRICE)

  const updatePricingFromAmount = (amt?: number | null) => {
    if (amt && amt > 0) {
      const base = Number(amt.toFixed(2))
      const gst = Number((base * 0.18).toFixed(2))
      const total = Number((base + gst).toFixed(2))
      setOrgBasePrice(base)
      setOrgGstAmount(gst)
      setOrgTotalPrice(total)
    } else {
      setOrgBasePrice(VERIFICATION_BASE_PRICE)
      setOrgGstAmount(VERIFICATION_GST_AMOUNT)
      setOrgTotalPrice(VERIFICATION_TOTAL_PRICE)
    }
  }

  const [paymentSender, setPaymentSender] = useState({
    name: '',
    phone: '',
    email: '',
  })
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentTargetMode, setPaymentTargetMode] = useState<'single' | 'bulk'>('single')
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'success'>('idle')
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  const getMissingDynamicFields = (row: Record<string, any>) =>
    getVisibleDynamicFields(dynamicFields).filter(
      (field) => !String(row[field.DBFieldName] ?? '').trim()
    )

  const isJoiningDateField = (field: DynamicField) => {
    const name = `${field.DBFieldName} ${field.DisplayFieldName}`.toLowerCase()
    return name.includes('joining') || name.includes('dateofjoining') || /\bdoj\b/.test(name)
  }

  const isLeavingDateField = (field: DynamicField) => {
    const name = `${field.DBFieldName} ${field.DisplayFieldName}`.toLowerCase()
    return name.includes('leaving') || name.includes('dateofleaving') || /\bdol\b/.test(name)
  }

  const getTodayDate = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`
  }

  const getEmploymentDateErrors = (row: Record<string, any>): Record<string, string> => {
    const today = getTodayDate()
    const fields = getVisibleDynamicFields(dynamicFields)
    const joiningFields = fields.filter(isJoiningDateField)
    const leavingFields = fields.filter(isLeavingDateField)
    const errors: Record<string, string> = {}

    joiningFields.forEach((field) => {
      const value = String(row[field.DBFieldName] ?? '').trim()
      if (value && value > today) {
        errors[field.DBFieldName] = 'Date of joining cannot be after today.'
      }
    })

    leavingFields.forEach((field) => {
      const value = String(row[field.DBFieldName] ?? '').trim()
      if (!value) return
      if (value > today) {
        errors[field.DBFieldName] = 'Date of leaving cannot be after today.'
        return
      }

      const joiningDate = joiningFields
        .map((joiningField) => String(row[joiningField.DBFieldName] ?? '').trim())
        .find(Boolean)
      if (joiningDate && value < joiningDate) {
        errors[field.DBFieldName] = 'Date of leaving cannot be before date of joining.'
      }
    })

    return errors
  }

  const getBulkEmploymentDateError = (rows: Record<string, any>[]) => {
    const invalidRowIndex = rows.findIndex(
      (row) => Object.keys(getEmploymentDateErrors(row)).length > 0
    )
    if (invalidRowIndex < 0) return null

    const invalidFieldNames = Object.entries(getEmploymentDateErrors(rows[invalidRowIndex]))
      .map(([key, message]) => `${fieldsLabel(key)} (${message})`)
      .join(', ')
    return `Correct the employment dates for candidate row ${invalidRowIndex + 1}: ${invalidFieldNames}.`
  }

  const fieldsLabel = (dbFieldName: string) =>
    dynamicFields.find((field) => field.DBFieldName === dbFieldName)?.DisplayFieldName || dbFieldName

  useEffect(() => {
    const today = getTodayDate()
    const fields = getVisibleDynamicFields(dynamicFields)
    const joiningDate = fields
      .filter(isJoiningDateField)
      .map((field) => String(singleForm[field.DBFieldName] ?? '').trim())
      .find(Boolean)

    fields.forEach((field) => {
      if (!isJoiningDateField(field) && !isLeavingDateField(field)) return
      const input = document.getElementById(`dynamic_col_${field.DBFieldName}`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null
      if (!input || input instanceof HTMLTextAreaElement) return
      input.max = today
      if (isLeavingDateField(field)) {
        input.min = joiningDate && joiningDate <= today ? joiningDate : ''
      } else {
        input.removeAttribute('min')
      }
    })
  }, [dynamicFields, singleForm])

  // Bulk upload feature states
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState('')
  const [bulkRows, setBulkRows] = useState<any[]>([])
  const [showBulkPreview, setShowBulkPreview] = useState(false)
  const bulkParsedRows = bulkRows
  const setBulkParsedRows = setBulkRows
  const [bulkUploading, setBulkUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Success modal & Recent Request Inspector
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [generatedRequestId, setGeneratedRequestId] = useState('')
  const [copiedRequestId, setCopiedRequestId] = useState(false)
  const [lastSubmittedInfo, setLastSubmittedInfo] = useState<{
    requestId: string
    candidateName: string
    employeeId: string
    orgName: string
    transactionId?: string
  } | null>(null)
  const [lastSubmittedRecord, setLastSubmittedRecord] = useState<VerificationRecord | null>(null)
  const [lastSubmittedBatch, setLastSubmittedBatch] = useState<VerificationRecord[]>([])

  // Client Recent Requests & Status Management
  const [clientRecentRequests, setClientRecentRequests] = useState<VerificationRecord[]>([])
  const [showRecentRequestsModal, setShowRecentRequestsModal] = useState(false)
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null)
  const [statusCheckFeedback, setStatusCheckFeedback] = useState<{ [id: string]: string }>({})
  const [recentSearchQuery, setRecentSearchQuery] = useState('')
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null)

  const handleCopyRequestId = (id: string) => {
    if (!id) return
    navigator.clipboard.writeText(id)
    setCopiedRequestId(true)
    setTimeout(() => setCopiedRequestId(false), 2000)
  }

  // Derive unified client identification mapped to current logged in user
  const getClientIdentifier = useCallback(() => {
    const idStr = user?.id ? `CL-${user.id}` : ''
    const nameStr =
      user?.CompanyName 
    const emailStr = (user?.username || user?.EmailID || user?.EmailID || 'client@worktrail.ai').trim()
    return {
      clientId: idStr || (user?.username ? `CL-${user.username.split('@')[0]}` : 'CL-2026'),
      clientName: nameStr,
      clientEmail: emailStr,
    }
  }, [user])

  // Load recent candidate verification requests directly from live database API



  // Real-time live status checker
  const handleCheckStatus = async (record: VerificationRecord) => {
    if (!record) return
    const reqId = record.requestId || record.id
    setCheckingStatusId(reqId)
    setStatusCheckFeedback((prev) => ({
      ...prev,
      [reqId]: 'Connecting to verification network API...',
    }))

    try {
      //const checkUrl =  
      let liveStatus = record.status || 'Pending'
      let feedbackMsg = `Status confirmed: ${liveStatus} at ${record.verifierName}. In queue for verification.`

      try {
        const response = await axios.post(
          API_ENDPOINTS.reviewClientData,
          {
            requestId: reqId,
            EmployeeCode: record.employeeId,
            Clientemail: user?.username || user?.EmailID || record.submittedBy || '',
          },
          {
            headers: getAPI_HEADER(),
          }
        )

        const data = response.data
        const list = Array.isArray(data) ? data : data?.data || data?.candidates || []
        const match = Array.isArray(list)
          ? list.find(
              (m: any) =>
                (m.RequestId && m.RequestId === reqId) ||
                (m.EmployeeCode && m.EmployeeCode === record.employeeId)
            )
          : null

        if (match && match.status) {
          liveStatus = match.status
          feedbackMsg = `Latest verified status: ${match.status} (Updated live from verifier database).`
        }
      } catch {
        // network or server error fallback
      }

      // Update status in recent requests state and lastSubmittedRecord
      setClientRecentRequests((prev) =>
        prev.map((r) => (r.requestId === reqId || r.id === reqId ? { ...r, status: liveStatus as any } : r))
      )
      if (lastSubmittedRecord && (lastSubmittedRecord.requestId === reqId || lastSubmittedRecord.id === reqId)) {
        setLastSubmittedRecord({ ...lastSubmittedRecord, status: liveStatus as any })
      }

      setStatusCheckFeedback((prev) => ({
        ...prev,
        [reqId]: feedbackMsg,
      }))
    } catch {
      setStatusCheckFeedback((prev) => ({
        ...prev,
        [reqId]: `Status confirmed: ${record.status || 'Pending Review'}. Verifier record active.`,
      }))
    } finally {
      setCheckingStatusId(null)
    }
  }

  // Load organizations on mount
  useEffect(() => {
    loadRazorpay().catch(() => {})
    const fetchOrgs = async () => {
      setLoading(true)
      setOrgError(null)
      try {
        const response = await axios.get(API_ENDPOINTS.OrgmasterData, {
          headers: getAPI_HEADER(),
        })
        if (response.data && Array.isArray(response.data.data)) {
          setOrganizations(response.data.data)
        } else {
          setOrganizations([])
        }
      } catch (err: unknown) {
        setOrgError(
          getRequestErrorMessage(err, 'Error loading organizations. Please try again later.')
        )
        setOrganizations([])
      } finally {
        setLoading(false)
      }
    }
    fetchOrgs()
  }, [])

  // Load dynamic fields from API whenever selected organization changes
  useEffect(() => {
    const fetchDynamicFields = async () => {
      setDynamicFieldLoading(true)
      setDynamicFieldError(null)
      setDynamicFields([])
      setSingleForm({})
      setSingleFieldErrors({})
      setContributorColName('Contributor')

      if (!selectedOrgId || !selectedOrgName) {
        setDynamicFieldLoading(false)
        return
      }

      try {
        const response = await axios.post(
          API_ENDPOINTS.ContributorAdminFormDynamic,
          {
            Contributor: selectedOrgName,
          },
          {
            headers: getAPI_HEADER(),
          }
        )

        const parsed = parseDynamicFieldsFromApi(response.data)
        if (parsed.length === 0) {
          setDynamicFields([])
          setSingleForm({})
          setDynamicFieldError(
            'No dynamic fields returned for this contributor. Please try another organization or contact support.'
          )
          return
        }

        const contrib = parsed.find((f) => isContributorField(f))
        setContributorColName(contrib?.DBFieldName || 'Contributor')
        setDynamicFields(parsed)
        const initial = getVisibleDynamicFields(parsed).reduce(
          (acc: { [k: string]: string }, f) => {
            acc[f.DBFieldName] = ''
            return acc
          },
          {}
        )
        setSingleForm(initial)

        const orgInList = organizations.find((o) => o.OrganizationID === selectedOrgId)
        const dynamicAmt = parseApiAmount(response.data) || parseApiAmount(orgInList)
        updatePricingFromAmount(dynamicAmt)
      } catch (err: unknown) {
        setDynamicFields([])
        setSingleForm({})
        setDynamicFieldError(
          getRequestErrorMessage(err, 'Failed to load dynamic fields for selected verifier.')
        )
      } finally {
        setDynamicFieldLoading(false)
      }
    }

    if (selectedOrgId && selectedOrgName) {
      fetchDynamicFields()
    }
  }, [selectedOrgId, selectedOrgName])

  /** Re-fetch dynamic fields from API before opening single/bulk forms */
  const loadDynamicFieldsForContributor = useCallback(async (): Promise<boolean> => {
    if (!selectedOrgName) {
      setDynamicFieldError('Please select an organization first.')
      return false
    }
    setDynamicFieldLoading(true)
    setDynamicFieldError(null)
    try {
      const response = await axios.post(
        API_ENDPOINTS.ContributorAdminFormDynamic,
        { Contributor: selectedOrgName },
        {
          headers: getAPI_HEADER(),
        }
      )
      const parsed = parseDynamicFieldsFromApi(response.data)
      if (parsed.length === 0) {
        setDynamicFields([])
        setSingleForm({})
        setDynamicFieldError(
          'No dynamic fields returned for this contributor. Please try again.'
        )
        return false
      }
      const contrib = parsed.find((f) => isContributorField(f))
      setContributorColName(contrib?.DBFieldName || 'Contributor')
      setDynamicFields(parsed)
      setSingleForm((prev) => {
        const next: { [k: string]: string } = {}
        getVisibleDynamicFields(parsed).forEach((f) => {
          next[f.DBFieldName] = prev[f.DBFieldName] ?? ''
        })
        return next
      })
      const orgInList = organizations.find((o) => o.OrganizationID === selectedOrgId)
      const dynamicAmt = parseApiAmount(response.data) || parseApiAmount(orgInList)
      updatePricingFromAmount(dynamicAmt)
      return true
    } catch (err: unknown) {
      setDynamicFields([])
      setDynamicFieldError(
        getRequestErrorMessage(err, 'Failed to load dynamic fields for selected verifier.')
      )
      return false
    } finally {
      setDynamicFieldLoading(false)
    }
  }, [selectedOrgId, selectedOrgName, organizations])

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOrg = organizations.find((o) => o.OrganizationID === selectedOrgId) || null

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.OrganizationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.OrganizationID.toString().includes(searchQuery)
  )

  const handleSelectOrganization = (org: { OrganizationID: number; OrganizationName: string; [k: string]: any }) => {
    setSelectedOrgId(org.OrganizationID)
    setSelectedOrgName(org.OrganizationName)
    setIsDropdownOpen(false)
    setSearchQuery('')
    const amt = parseApiAmount(org)
    if (amt) {
      updatePricingFromAmount(amt)
    }
  }

  // Razorpay loader
  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(Boolean(typeof window !== 'undefined' && window.Razorpay))
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })

  // Persist single candidate verification record to Database API & state
  const saveAndCompleteRecord = async (
    payload: Record<string, any>,
    transactionId: string,
    paymentId?: string,
    orderId?: string,
    customAmount?: number
  ) => {
    let step = ""; // Track step for error context
    try {
      step = "Prepare main IDs, names, and lookup values";
      const newId = `VR-${Math.floor(100000 + Math.random() * 900000)}`
      const todayFormatted = new Date().toISOString().split('T')[0]

      const candName =
        payload.candidateName ||
        payload['FirstName'] ||
        payload['Candidate Full Name'] ||
        payload['Candidate Name'] ||
        payload['Name'] ||
        Object.values(payload)[0] ||
        'Candidate'
      const empCode =
        payload['EmployeeCode'] ||
        payload['Employee Code'] ||
        payload['Employee ID'] ||
        payload['EmployeeId'] ||
        payload['EmpCode'] ||
        `EMP-${Math.floor(1000 + Math.random() * 9000)}`
      const candEmail =
        payload.email ||
        payload['Email'] ||
        payload['Candidate Email'] ||
        cleanEmail('', user)
      const candPhone =
        payload.phone ||
        payload['MobileNo'] ||
        payload['Contact Number'] ||
        payload['Phone'] ||
        '9876543210'

      let doj = todayFormatted
      let dol = 'Present'
      let desig = 'N/A'
      let dept = 'General'

      step = "Dynamic extraction from payload fields";
      Object.entries(payload).forEach(([k, v]) => {
        if (!v) return
        const lower = k.toLowerCase()
        if (lower.includes('join') || lower.includes('doj')) doj = String(v)
        else if (lower.includes('leav') || lower.includes('dol')) dol = String(v)
        else if (lower.includes('desig') || lower.includes('role') || lower.includes('position'))
          desig = String(v)
        else if (lower.includes('dept') || lower.includes('department')) dept = String(v)
      })

      step = "Build client info and newRecord";
      const clientInfo = getClientIdentifier()
      const newRecord: VerificationRecord = {
        id: `vr-${Date.now()}`,
        requestId: newId,
        candidateName: String(candName).trim(),
        employeeId: String(empCode).trim(),
        candidateEmail: String(candEmail).trim(),
        contactNumber: String(candPhone).trim(),
        verifierId: String(selectedOrgId),
        verifierName: selectedOrgName,
        verifierCategory: 'Registered Organization',
        verifierCode: `ORG-${selectedOrgId}`,
        dateOfJoining: doj,
        dateOfLeaving: dol,
        isCurrentlyEmployed: dol.toLowerCase() === 'present' || !dol,
        designation: desig,
        department: dept,
        verificationType: 'Standard Employment Verification',
        remarks: remarks.trim() || 'Dynamic candidate verification submission',
        uploadedFilesCount: uploadedFiles.length,
        submittedBy: user?.username ||  'Client User',
        submittedAt: todayFormatted,
        status: 'Pending',
        amount: customAmount || orgTotalPrice,
        transactionId,
        paymentId,
        orderId,
        clientId: clientInfo.clientId,
        customFields: { ...payload, Contributor: selectedOrgName },
        dynamicData: { ...payload, Contributor: selectedOrgName },
      }

      step = "Prepare API object for candidate";
      const candParts = String(candName).trim().split(/\s+/)
      const fName = payload['FirstName'] || candParts[0] || 'Candidate'
      const mName = payload['MiddleName'] || (candParts.length > 2 ? candParts.slice(1, -1).join(' ') : '')
      const lName = payload['LastName'] || (candParts.length > 1 ? candParts.slice(-1)[0] : '')

      const salaryVal = payload['LastSalaryAnnual'] || payload['Salary'] || payload['CTC'] || '0'
      const salaryNum = typeof salaryVal === 'number' ? salaryVal : (parseFloat(String(salaryVal).replace(/[^\d.]/g, '')) || 0)

      const candidateApiObject = {
        FirstName: String(fName).trim(),
        MiddleName: mName ? String(mName).trim() : null,
        //LastName: String(lName).trim(),
        Email: candEmail ? String(candEmail).trim() : null,
        MobileNo: candPhone ? String(candPhone).trim() : null,
        Department: String(dept).trim(),
        DateOfJoining: String(doj).trim(),
        LastPositionHeld: String(desig).trim(),
        DateOfLeaving: String(dol).trim(),
        LastSalaryAnnual: salaryNum,
        EmployeeCode: String(empCode).trim(),
        ExitFormalities: payload['ExitFormalities'] || 'Completed',
        EmploymentType: payload['EmploymentType'] || 'Full Time',
        AnyBehaviourIssue: payload['AnyBehaviourIssue'] || 'No',
        EligibilityToRehire: payload['EligibilityToRehire'] || 'Yes',
        Contributor: selectedOrgName || 'Securitas',
        LOA: loaDocument || '',
        SupportingDocs: supportingDocument || '',
        RequestId: newId,
        TransactionId: transactionId || '',
        PaymentId: paymentId || '',
        OrderId: orderId || '',
        Amount: customAmount || orgTotalPrice,
        ...payload,
      }

      step = "Build candidates array and clientEmail";
      const candidates = [candidateApiObject]
      const isClient = user?.Usertype?.toLowerCase() === 'client'
      const clientEmail = (paymentSender.email || (isClient ? (user?.EmailID) : '')).trim()
      console.log("[saveAndCompleteRecord] candidates array:", candidates)

      step = "POST to clientEmpData endpoint";
      try {
        await axios.post(
          API_ENDPOINTS.clientEmpData,
          {
            candidates,
            verificationType: 'single',
            orderId: orderId || paymentId || `ORDER-${Date.now()}`,
            Contributor: selectedOrgName,
            Clientemail: clientEmail,
          },
          { headers: getAPI_HEADER() }
        )
        setPaymentState('success')
        setPaymentMessage(
          `Payment successful. ${candidates.length} candidate record${candidates.length === 1 ? '' : 's'} saved.`
        )
      } catch (error: unknown) {
        console.log("[saveAndCompleteRecord] Error in step:", step, error)
        setPaymentState('idle')
        setPaymentMessage(
          getRequestErrorMessage(error, 'Payment verification failed.')
        )
      }

      step = "Mark client has requests";
      markClientHasRequests(user, candEmail)
      step = "Load recent requests";
  

      step = "Update local records UI state";
      setLastSubmittedRecord(newRecord)
      setLastSubmittedBatch([newRecord])
      setClientRecentRequests((prev) => [newRecord, ...prev.filter((r) => r.requestId !== newRecord.requestId)])
      setLastSubmittedInfo({
        requestId: newId,
        candidateName: String(candName).trim(),
        employeeId: String(empCode).trim(),
        orgName: selectedOrgName,
        transactionId,
      })
      setGeneratedRequestId(newId)
      setSubmissionSuccess(true)
    } catch (outerErr: any) {
      console.log("[saveAndCompleteRecord] Outer error at step:", step, outerErr)
      throw outerErr // rethrowing so caller may handle if needed
    }
  }

  // Document handler for LOA and Supporting documents (converts to Base64)
  const handleDocumentChange = async (file: File | undefined, required: boolean) => {
    setDocumentError(null)
    if (!file) {
      if (required) {
        setLoaDocument('')
        setLoaFileName('')
      } else {
        setSupportingDocument('')
        setSupportingDocFileName('')
      }
      return
    }
    try {
      const base64 = await readDocumentAsBase64(file, required)
      if (required) {
        setLoaDocument(base64)
        setLoaFileName(file.name)
      } else {
        setSupportingDocument(base64)
        setSupportingDocFileName(file.name)
      }
    } catch (error) {
      if (required) {
        setLoaDocument('')
        setLoaFileName('')
      } else {
        setSupportingDocument('')
        setSupportingDocFileName('')
      }
      setDocumentError(error instanceof Error ? error.message : 'Unable to read the document.')
    }
  }

  // Start payment flow for single or bulk candidate records
  const startPayment = async (
    recordsToPay: any[],
    mode: 'single' | 'bulk'
  ) => {
    if (mode === 'single') {
      const dateErrors = getEmploymentDateErrors(singleForm)
      if (Object.keys(dateErrors).length > 0) {
        setSingleFieldErrors((current) => ({ ...current, ...dateErrors }))
        setPaymentMessage('Use today or an earlier date, and make sure date of leaving is on or after date of joining.')
        const firstInvalidField = Object.keys(dateErrors)[0]
        document.getElementById(`dynamic_col_${firstInvalidField}`)?.focus()
        return
      }

      const missingFields = getMissingDynamicFields(singleForm)
      if (!dynamicFields.length || missingFields.length > 0) {
        setSingleFieldErrors(
          Object.fromEntries(
            missingFields.map((field) => [field.DBFieldName, `${field.DisplayFieldName} is required.`])
          )
        )
        setPaymentMessage(
          !dynamicFields.length
            ? 'Dynamic verifier fields are not loaded. Please try again.'
            : 'Complete all verifier fields before continuing to payment.'
        )
        return
      }
    } else {
      const dateError = getBulkEmploymentDateError(recordsToPay)
      if (dateError) {
        setBulkError(dateError)
        return
      }

      const incompleteRow = recordsToPay.find((row) => getMissingDynamicFields(row).length > 0)
      if (!dynamicFields.length || incompleteRow) {
        setBulkError(
          !dynamicFields.length
            ? 'Dynamic verifier fields are not loaded. Please try again.'
            : 'Complete every dynamic verifier field for all candidates before continuing to payment.'
        )
        return
      }
    }

    setPaymentMessage(null)
    setDocumentError(null)
    if (mode === 'single') {
      const payAmount = orgTotalPrice
      setSelectedOrgAmount(payAmount)
      const isClient = user?.Usertype?.toLowerCase() === 'client'
      const clientEmail = isClient
        ? (user?.EmailID || user?.EmailID || user?.username || '')
        : (singleForm['Email'] || singleForm['Candidate Email'] || '')
      const clientName = isClient
        ? (user?.username ? `${user.username}`.trim() : (user?.CompanyName || ''))
        : (singleForm['CandidateName'] || singleForm['FirstName'] || '')
      const clientPhone = isClient
        ? (user?.MobileNo || user?.Mobile || '')
        : (singleForm['MobileNo'] || singleForm['Contact Number'] || '')
      setPaymentSender({
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
      })
      setPaymentTargetMode('single')
      setIsPaymentModalOpen(true)
    } else {
      handleOpenBulkPaymentModal()
    }
  }

  // Payment for one candidate; pricing comes from OrganizationMaster.
  const handlePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDocumentError(null)
    const dateErrors = getEmploymentDateErrors(singleForm)
    if (Object.keys(dateErrors).length > 0) {
      setSingleFieldErrors((current) => ({ ...current, ...dateErrors }))
      setPaymentMessage('Use today or an earlier date, and make sure date of leaving is on or after date of joining.')
      const firstInvalidField = Object.keys(dateErrors)[0]
      document.getElementById(`dynamic_col_${firstInvalidField}`)?.focus()
      return
    }

    const missingFields = getMissingDynamicFields(singleForm)
    if (!dynamicFields.length || missingFields.length > 0) {
      setSingleFieldErrors(
        Object.fromEntries(
          missingFields.map((field) => [field.DBFieldName, `${field.DisplayFieldName} is required.`])
        )
      )
      setPaymentMessage(
        !dynamicFields.length
          ? 'Dynamic verifier fields are not loaded. Please try again.'
          : 'Complete all verifier fields before continuing to payment.'
      )
      const firstMissingField = missingFields[0]
      if (firstMissingField) {
        document.getElementById(`dynamic_col_${firstMissingField.DBFieldName}`)?.focus()
      }
      return
    }
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity()
      return
    }
    setSingleFieldErrors({})
    await startPayment(
      [{ ...singleForm, LOA: loaDocument || '', SupportingDocs: supportingDocument || '' }],
      'single'
    )
  }

  // Open Payer Information Pop-up Modal for Single Candidate Submission
  const handleOpenSinglePaymentModal = (event: FormEvent<HTMLFormElement>) => {
    handlePayment(event)
  }

  // Open Payer Information Pop-up Modal for Bulk Candidate Ingestion
  const handleOpenBulkPaymentModal = () => {
    setBulkMessage(null)
    setBulkError('')
    if (!bulkFile || bulkRows.length === 0) {
      setBulkError('Please select a populated Excel/CSV file before proceeding to payment.')
      return
    }
    if (!dynamicFields.length) {
      setBulkError('Dynamic verifier fields are not loaded. Please try again.')
      return
    }
    const incompleteRowIndex = bulkRows.findIndex((row) => getMissingDynamicFields(row).length > 0)
    const dateError = getBulkEmploymentDateError(bulkRows)
    if (dateError) {
      setBulkError(dateError)
      return
    }
    if (incompleteRowIndex >= 0) {
      const missingFields = getMissingDynamicFields(bulkRows[incompleteRowIndex])
      setBulkError(
        `Complete all dynamic fields for candidate row ${incompleteRowIndex + 1}: ${missingFields
          .map((field) => field.DisplayFieldName)
          .join(', ')}.`
      )
      return
    }

    const batchCount = bulkRows.length
    const batchTotal = Number((batchCount * orgTotalPrice).toFixed(2))

    setSelectedOrgAmount(batchTotal)
    const isClient = user?.Usertype?.toLowerCase() === 'client'
    const clientEmail = isClient
      ? (user?.EmailID || user?.EmailID ||  '')
      : (bulkRows[0]?.['Email'] || bulkRows[0]?.['Candidate Email'] || '')
    const clientName = isClient
      ? (user?.username ? `${user.username} ${user.username || ''}`.trim() : (user?.CompanyName || ''))
      : (bulkRows[0]?.['CandidateName'] || bulkRows[0]?.['FirstName'] || '')
    const clientPhone = isClient
      ? (user?.MobileNo || user?.Mobile || '')
      : (bulkRows[0]?.['MobileNo'] || bulkRows[0]?.['Contact Number'] || '')
    setPaymentSender({
      name: clientName,
      phone: clientPhone,
      email: clientEmail,
    })  
    setPaymentTargetMode('bulk')
    setIsPaymentModalOpen(true)
  }

  // Confirm Payer Details in Modal & Trigger Razorpay Gateway
  const handleConfirmPaymentModal = (e: FormEvent) => {
    e.preventDefault()
    if (paymentTargetMode === 'single') {
      const dateErrors = getEmploymentDateErrors(singleForm)
      if (Object.keys(dateErrors).length > 0) {
        setIsPaymentModalOpen(false)
        setSingleFieldErrors((current) => ({ ...current, ...dateErrors }))
        setPaymentMessage('Use today or an earlier date, and make sure date of leaving is on or after date of joining.')
        const firstInvalidField = Object.keys(dateErrors)[0]
        document.getElementById(`dynamic_col_${firstInvalidField}`)?.focus()
        return
      }

      const missingFields = getMissingDynamicFields(singleForm)
      if (!dynamicFields.length || missingFields.length > 0) {
        setIsPaymentModalOpen(false)
        setSingleFieldErrors(
          Object.fromEntries(
            missingFields.map((field) => [field.DBFieldName, `${field.DisplayFieldName} is required.`])
          )
        )
        setPaymentMessage(
          !dynamicFields.length
            ? 'Dynamic verifier fields are not loaded. Please try again.'
            : 'Complete all verifier fields before continuing to payment.'
        )
        return
      }
    } else {
      const dateError = getBulkEmploymentDateError(bulkRows)
      if (dateError) {
        setIsPaymentModalOpen(false)
        setBulkError(dateError)
        return
      }

      const incompleteRowIndex = bulkRows.findIndex((row) => getMissingDynamicFields(row).length > 0)
      if (!dynamicFields.length || incompleteRowIndex >= 0) {
        setIsPaymentModalOpen(false)
        const missingFields =
          incompleteRowIndex >= 0 ? getMissingDynamicFields(bulkRows[incompleteRowIndex]) : []
        setBulkError(
          !dynamicFields.length
            ? 'Dynamic verifier fields are not loaded. Please try again.'
            : `Complete all dynamic fields for candidate row ${incompleteRowIndex + 1}: ${missingFields
                .map((field) => field.DisplayFieldName)
                .join(', ')}.`
        )
        return
      }
    }

    const rawPhone = (paymentSender.phone || '').replace(/\D/g, '')
    if (rawPhone && rawPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.')
      return
    }
    setIsPaymentModalOpen(false)

    if (paymentTargetMode === 'single') {
      executeSinglePayment(paymentSender, selectedOrgAmount)
    } else {
      executeBulkPayment(paymentSender, selectedOrgAmount)
    }
  }

  // Payment & Verification submission for single candidate via Razorpay Gateway
  const executeSinglePayment = async (
    sender: { name: string; phone: string; email: string },
    customPayAmount?: number
  ) => {
    const dateErrors = getEmploymentDateErrors(singleForm)
    if (Object.keys(dateErrors).length > 0) {
      setPaymentState('idle')
      setPaymentMessage('Use today or an earlier date, and make sure date of leaving is on or after date of joining.')
      setSingleFieldErrors((current) => ({ ...current, ...dateErrors }))
      setIsPaymentModalOpen(false)
      return
    }

    const missingFields = getMissingDynamicFields(singleForm)
    if (!dynamicFields.length || missingFields.length > 0) {
      setPaymentState('idle')
      setPaymentMessage(
        !dynamicFields.length
          ? 'Dynamic verifier fields are not loaded. Please try again.'
          : 'Complete all verifier fields before continuing to payment.'
      )
      setSingleFieldErrors(
        Object.fromEntries(
          missingFields.map((field) => [field.DBFieldName, `${field.DisplayFieldName} is required.`])
        )
      )
      setIsPaymentModalOpen(false)
      return
    }

    setPaymentMessage(null)
    setPaymentState('processing')

    try {
      const payAmount = customPayAmount || orgTotalPrice

      // Prepare payload with DBFieldName keys; always inject Contributor
      const payload: { [k: string]: any } = {
        ...singleForm,
        organizationId: selectedOrgId,
        amount: payAmount,
        Contributor: selectedOrgName,
      }
      if (contributorColName && contributorColName !== 'Contributor') {
        payload[contributorColName] = selectedOrgName
      }
      if (loaDocument) {
        payload['LOA'] = loaDocument
      }
      if (supportingDocument) {
        payload['SupportingDocs'] = supportingDocument
      }

      // Map candidateName, email, phone from payer modal state
      const isClient = user?.Usertype?.toLowerCase() === 'client'
      const candName = sender.name || singleForm['CandidateName'] || singleForm['FirstName'] || 'Candidate'
      const candEmail = sender.email || (isClient ? (user?.EmailID || user?.username) : '') || singleForm['Email'] || 'client@worktrail.ai'
      const candPhone = cleanPhone(sender.phone || (isClient ? user?.MobileNo : '') || singleForm['MobileNo'])

      payload.candidateName = candName
      payload.email = candEmail
      payload.phone = candPhone

      // 1. Ensure Razorpay Checkout script is loaded
      const razorpayLoaded = await loadRazorpay()
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error(
          'Razorpay payment gateway could not be loaded. Please verify your internet connection.'
        )
      }

      // 2. Call backend order creation endpoint with smart pricing auto-match
      const orderResult = await requestBackendCreateOrderWithPriceMatch({
        selectedOrgId,
        selectedOrgName,
        batchCount: 1,
        primaryPayAmount: payAmount,
        orgBasePrice,
        orgTotalPrice,
        sender,
        user,
        contributorColName,
        mode: 'single',
        extraPayload: payload,
        organizations,
      })

      if (!orderResult) {
        setPaymentState('idle')
        setPaymentMessage('Unable to create payment order. Please try again.')
        return
      }

      const {
        key: razorpayKey,
        orderId: razorpayOrderId,
        amountInPaise: razorpayAmount,
        currency: razorpayCurrency,
        acceptedAmount,
      } = orderResult

      // 4. Build Razorpay Gateway options
      const options: any = {
        key: razorpayKey,
        amount: razorpayAmount,
        currency: razorpayCurrency,
        name: 'Candidate Verification',
        description: `Verification payment for ${candName} at ${selectedOrgName}`,
        prefill: {
          name: candName,
          email: candEmail,
          contact: candPhone,
        },
        theme: {
          color: '#042133',
        },
        modal: {
          ondismiss: () => {
            setPaymentState('idle')
            setPaymentMessage('Razorpay payment gateway was closed.')
          },
        },
        handler: async (paymentResponse: RazorpayPaymentResponse) => {
          setPaymentState('processing')
          setPaymentMessage('Verifying payment with payment gateway...')
          let paymentConfirmationEmailSent: boolean | null = null
          try {
            const verification = await axios.post(
              API_ENDPOINTS.payments.verify,
              paymentResponse,
              {
                headers: getAPI_HEADER(),
              }
            )
            const result = verification.data
            paymentConfirmationEmailSent = Boolean(result?.emailSent)
            const txn =
              result?.transaction?.TransactionID ||
              result?.TransactionID ||
              paymentResponse.razorpay_payment_id ||
              `TXN-${Date.now()}`
            setPaymentState('success')
            setPaymentMessage(`Payment successful! Transaction ID: ${txn}`)
            await saveAndCompleteRecord(
              payload,
              txn,
              paymentResponse.razorpay_payment_id,
              paymentResponse.razorpay_order_id,
              acceptedAmount || payAmount
            )
            if (paymentConfirmationEmailSent !== null) {
              setPaymentMessage((current) =>
                `${current || 'Payment successful.'} ${paymentConfirmationEmailSent ? 'Confirmation email sent.' : 'Confirmation email could not be sent; please contact support.'}`
              )
            }
          } catch {
            const txn = paymentResponse.razorpay_payment_id || `TXN-${Date.now()}`
            setPaymentState('success')
            setPaymentMessage(`Payment completed! Transaction ID: ${txn}`)
            await saveAndCompleteRecord(
              payload,
              txn,
              paymentResponse.razorpay_payment_id,
              paymentResponse.razorpay_order_id,
              acceptedAmount || payAmount
            )
          }
        },
      }

      if (typeof razorpayOrderId === 'string' && razorpayOrderId.startsWith('order_')) {
        options.order_id = razorpayOrderId
      }

      // 5. Open Razorpay Gateway Modal
      const checkout = new window.Razorpay(options)
      if (checkout.on) {
        checkout.on('payment.failed', async function (resp: any) {
          let emailSent = false
          const failedPaymentId = resp.error?.metadata?.payment_id
          if (failedPaymentId) {
            try {
              const failureResponse = await axios.post(
                API_ENDPOINTS.payments.failure,
                {
                  razorpay_order_id: resp.error?.metadata?.order_id || razorpayOrderId,
                  razorpay_payment_id: failedPaymentId,
                },
                { headers: getAPI_HEADER() }
              )
              emailSent = Boolean(failureResponse.data?.emailSent)
            } catch (error) {
              console.error('[Payment] Could not report failed payment or send email:', error)
            }
          }
          setPaymentState('idle')
          const failureMessage = `Payment failed: ${resp.error?.description || resp.error?.reason || 'Payment was declined'}`
          setPaymentMessage(emailSent ? `${failureMessage} We sent a status email to your registered address.` : failureMessage)
        })
      }
      checkout.open()
    } catch (error: any) {
      setPaymentState('idle')
      setPaymentMessage(error?.message || 'Payment gateway could not be launched. Please try again.')
    }
  }

  const handleBulkFileChange = async (file: File | null) => {
    setBulkMessage(null);
    setBulkFile(file);
    setBulkRows([]);
    if (!file) {
      setBulkMessage("Please select an Excel file before uploading.");
      return;
    }
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils
  .sheet_to_json<{ [key: string]: unknown }>(firstSheet, {
    defval: "",
    raw: false,
  })
  .map((row) => {
    const normalizedRow = Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        const lowerKey = key.toLowerCase();

        const isDateField =
          lowerKey.includes("date") ||
          lowerKey === "doj" ||
          lowerKey === "dol" ||
          lowerKey === "dateofjoining" ||
          lowerKey === "dateofleaving";

        return [
          key,
          isDateField
            ? formatExcelDate(value)
            : String(value ?? "").trim(),
        ];
      })
    );

    return mapRowToDbFieldKeys(normalizedRow, dynamicFields);
  });
      if (!rows.length) throw new Error("The uploaded file has no candidate rows.");
      setBulkRows(rows);
      setShowBulkPreview(true);
      setBulkMessage(`${rows.length} candidate record${rows.length === 1 ? "" : "s"} loaded for review.`);
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "Error reading the uploaded file.");
    }
  };

  const handleBulkFileSelected = handleBulkFileChange;

  // Persist bulk candidate verification records after payment verification
  const saveBulkRecords = async (
    transactionId: string,
    paymentId?: string,
    orderId?: string,
    customAmount?: number
  ) => {
    const now = new Date()
    const todayFormatted = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
    const primaryId = `VR-${Math.floor(100000 + Math.random() * 900000)}`

    try {
      const clientInfo = getClientIdentifier()

      const newRecords: VerificationRecord[] = bulkRows.map((row, idx) => {
        const genId = idx === 0 ? primaryId : `VR-${Math.floor(100000 + Math.random() * 900000)}`
        const candName =
          row['FirstName'] ||
          row['Candidate Full Name'] ||
          row['Candidate Name'] ||
          row['Name'] ||
          Object.values(row)[0] ||
          `Candidate ${idx + 1}`
        const empCode =
          row['EmployeeCode'] ||
          row['Employee Code'] ||
          row['Employee ID'] ||
          row['EmployeeId'] ||
          `EMP-${1000 + idx}`
        const emailVal = row['Email'] || row['Candidate Email'] || ''
        const phoneVal = row['MobileNo'] || row['Contact Number'] || row['Phone'] || ''
        const dojVal =
          row['DateOfJoining'] || row['Date of Joining'] || row['DOJ'] || todayFormatted
        const dolVal = row['DateOfLeaving'] || row['Date of Leaving'] || row['DOL'] || 'Present'
        const desigVal = row['LastPositionHeld'] || row['Designation'] || row['Role'] || row['Position'] || 'OPS'
        const deptVal = row['Department'] || row['Dept'] || 'IT'

        return {
          id: `bulk-${Date.now()}-${idx}`,
          requestId: genId,
          candidateName: String(candName).trim(),
          employeeId: String(empCode).trim(),
          candidateEmail: String(emailVal).trim(),
          contactNumber: String(phoneVal).trim(),
          verifierId: String(selectedOrgId),
          verifierName: selectedOrgName,
          verifierCategory: 'Registered Organization',
          verifierCode: `ORG-${selectedOrgId}`,
          dateOfJoining: formatExcelDate(dojVal),
          dateOfLeaving: formatExcelDate(dolVal),
          isCurrentlyEmployed: String(dolVal).toLowerCase() === 'present' || !dolVal,
          designation: String(desigVal).trim(),
          department: String(deptVal).trim(),
          verificationType: 'Standard Employment Verification',
          remarks: 'Dynamic bulk candidate verification batch request',
          uploadedFilesCount: 0,
          submittedBy: user?.username || user?.username || 'Client User',
          submittedAt: todayFormatted,
          status: 'Pending',
          amount: customAmount || orgTotalPrice,
          transactionId,
          paymentId,
          orderId,
          clientId: clientInfo.clientId,
          customFields: { ...row, Contributor: selectedOrgName },
          dynamicData: { ...row, Contributor: selectedOrgName },
        }
      })

      // 1. Prepare and persist batch records to Database API
      const apiBulkRows = bulkRows.map((row, idx) => {
        const rawName =
          row['CandidateName'] ||
          row['Candidate Name'] ||
          row['Name'] ||
          row['FullName'] ||
          row['FirstName'] ||
          'Candidate'
        const parts = String(rawName).trim().split(/\s+/)
        const fName = row['FirstName'] || parts[0] || 'Candidate'
        const mName = row['MiddleName'] || row['Middle Name'] || (parts.length > 2 ? parts.slice(1, -1).join(' ') : '')
        //const lName = row['LastName'] || row['Last Name'] || (parts.length > 1 ? parts.slice(-1)[0] : '')
        const eCode =
          row['EmployeeCode'] ||
          row['Employee Code'] ||
          row['Employee ID'] ||
          row['EmployeeId'] ||
          row['EmpCode'] ||
          `EMP-${1000 + idx}`
        const email = row['Email'] || row['Candidate Email'] || row['CandidateEmail'] || ''
        const phone = row['MobileNo'] || row['Mobile No'] || row['Contact Number'] || row['Phone'] || ''
        const doj = row['DateOfJoining'] || row['Date of Joining'] || row['DOJ'] || todayFormatted
        const dol = row['DateOfLeaving'] || row['Date of Leaving'] || row['DOL'] || todayFormatted
        const desig = row['LastPositionHeld'] || row['Position'] || row['Designation'] || row['Role'] || 'OPS'
        const dept = row['Department'] || row['Dept'] || 'IT'

        const salVal = row['LastSalaryAnnual'] || row['Last Salary Annual'] || row['Salary'] || row['CTC'] || '0'
        const lastSalaryAnnual = String(salVal).replace(/[^\d.]/g, '').trim() || '0'

        const rawAnyBehaviour =
          row['AnyBehaviourIssue'] ||
          row['Any Behaviour Issue'] ||
          row['AnyBehaviorIssue'] ||
          row['Behavior Issue'] ||
          row['Behaviour Issue'] ||
          ''
        const anyBehaviourIssue =
          String(rawAnyBehaviour).trim().toUpperCase() === 'YES' ? 'YES' : 'NO'

        const rawRehire =
          row['EligibilityToRehire'] ||
          row['Eligibility To Rehire'] ||
          row['Rehire Eligibility'] ||
          ''
        const eligibilityToRehire =
          String(rawRehire).trim().toUpperCase() === 'NO' ? 'NO' : 'YES'

        const rawEmpType = row['EmploymentType'] || row['Employment Type'] || 'Full-time'
        const employmentType =
          String(rawEmpType).toLowerCase().includes('full') ? 'Full-time' : String(rawEmpType).trim()

        const exitFormalities =
          row['ExitFormalities'] || row['Exit Formalities'] || 'Completed'

        return {
          AnyBehaviourIssue: anyBehaviourIssue,
          DateOfJoining: formatExcelDate(doj),
          DateOfLeaving: formatExcelDate(dol),
          Department: String(dept).trim(),
          EligibilityToRehire: eligibilityToRehire,
          Email: String(email).trim(),
          EmployeeCode: String(eCode).trim(),
          EmploymentType: employmentType,
          ExitFormalities: String(exitFormalities).trim(),
          FirstName: String(fName).trim(),
          //LastName: String(lName).trim(),
          LastPositionHeld: String(desig).trim(),
          LastSalaryAnnual: lastSalaryAnnual,
          MiddleName: String(mName).trim(),
          MobileNo: String(phone).replace(/\D/g, '') || cleanPhone(phone),
          // Dynamic fields from template (DBFieldName keys)
          ...row,
          Contributor: selectedOrgName,
        }
      })

      const isClient = user?.Usertype?.toLowerCase() === 'client'
      const clientEmail = (paymentSender.email || (isClient ? (user?.EmailID) : '') || bulkRows[0]?.['Email'] ).trim()

      const postPayload = {
        candidates: apiBulkRows,
        verificationType: 'bulk',
        orderId: orderId || paymentId || `ORDER-${Date.now()}`,
        Contributor: selectedOrgName,
        Clientemail: clientEmail,
      }

      console.log('[Transaction][API] Payload to clientEmpData:', postPayload)

      let apiPostSuccess = false
      try {
        await axios.post(
          API_ENDPOINTS.clientEmpData,
          postPayload,
          {
            headers: getAPI_HEADER(),
          }
        )
        apiPostSuccess = true
        setPaymentState('success')
        setBulkMessage(
          `Payment & submission successful! ${apiBulkRows.length} candidate record${apiBulkRows.length === 1 ? '' : 's'} saved to database.`
        )
      } catch (error: any) {
        setPaymentState('idle')
        setBulkError(
          getRequestErrorMessage(error, 'Bulk submission to database failed. Please try again.')
        )
      }

      markClientHasRequests(user, user?.username)


      setLastSubmittedRecord(newRecords[0] || null)
      setLastSubmittedBatch(newRecords)
      setClientRecentRequests((prev) => [
        ...newRecords,
        ...prev.filter((p) => !newRecords.some((m) => m.requestId === p.requestId)),
      ])
      setLastSubmittedInfo({
        requestId: primaryId,
        candidateName: `${newRecords.length} Candidates (Batch)`,
        employeeId: `${newRecords.length} Records`,
        orgName: selectedOrgName,
        transactionId,
      })
      setGeneratedRequestId(primaryId)
      if (apiPostSuccess) {
        setSubmissionSuccess(true)
      }
    } catch (outerErr: any) {
      setBulkError(outerErr?.message || 'Error saving batch records. Please try again.')
    } finally {
      setBulkUploading(false)
    }
  }

  // Handle Bulk excel payment & submission via Razorpay Gateway
  const executeBulkPayment = async (
    sender: { name: string; phone: string; email: string },
    customPayAmount?: number
  ) => {
    setBulkMessage(null)
    setBulkError('')

    if (!bulkFile || bulkRows.length === 0) {
      setBulkError('Please select a populated Excel/CSV file before proceeding to payment.')
      return
    }
    const dateError = getBulkEmploymentDateError(bulkRows)
    if (dateError) {
      setBulkError(dateError)
      return
    }
    if (!dynamicFields.length) {
      setBulkError('Dynamic verifier fields are not loaded. Please try again.')
      return
    }
    const incompleteRowIndex = bulkRows.findIndex((row) => getMissingDynamicFields(row).length > 0)
    if (incompleteRowIndex >= 0) {
      const missingFields = getMissingDynamicFields(bulkRows[incompleteRowIndex])
      setBulkError(
        `Complete all dynamic fields for candidate row ${incompleteRowIndex + 1}: ${missingFields
          .map((field) => field.DisplayFieldName)
          .join(', ')}.`
      )
      return
    }

    setBulkUploading(true)

    try {
      const batchCount = bulkRows.length
      const payAmount = customPayAmount || Number((batchCount * orgTotalPrice).toFixed(2))

      const isClient = user?.Usertype?.toLowerCase() === 'client'
      const candName = sender.name || (isClient ? (user?.CompanyName || user?.CompanyName) : '') || `${batchCount} Candidates (${selectedOrgName})`
      const candEmail = sender.email || (isClient ? (user?.EmailID || user?.username) : '') || bulkRows[0]?.['Email'] || 'client@worktrail.ai'
      const candPhone = cleanPhone(sender.phone || (isClient ? user?.MobileNo : '') || bulkRows[0]?.['MobileNo'])

      // 1. Ensure Razorpay Checkout script is loaded
      const razorpayLoaded = await loadRazorpay()

      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error(
          'Razorpay payment gateway script was blocked or could not be loaded.'
        )
      }

      // 2. Call backend order creation endpoint with smart pricing auto-matching
      const orderResult = await requestBackendCreateOrderWithPriceMatch({
        selectedOrgId,
        selectedOrgName,
        batchCount,
        primaryPayAmount: payAmount,
        orgBasePrice,
        orgTotalPrice,
        sender,
        user,
        contributorColName,
        mode: 'bulk',
        organizations,
      })

      if (!orderResult) {
        setBulkUploading(false)
        setBulkError('Unable to create payment order with the gateway. Please try again.')
        return
      }

      const {
        key: razorpayKey,
        orderId: razorpayOrderId,
        amountInPaise: razorpayAmount,
        currency: razorpayCurrency,
        acceptedAmount,
      } = orderResult

      // 4. Build Razorpay Gateway options
      const options: any = {
        key: razorpayKey,
        amount: razorpayAmount,
        currency: razorpayCurrency,
        name: 'Batch Candidate Verification',
        description: `Batch payment for ${batchCount} candidates at ${selectedOrgName}`,
        prefill: {
          name: candName,
          email: candEmail,
          contact: candPhone,
        },
        theme: {
          color: '#042133',
        },
        modal: {
          ondismiss: () => {
            setBulkUploading(false)
            setBulkError('Razorpay payment gateway was closed.')
          },
        },
        handler: async (paymentResponse: RazorpayPaymentResponse) => {
          setBulkUploading(true)
          setBulkMessage('Payment verified! Submitting candidate batch to live database...')
          let txn = paymentResponse.razorpay_payment_id || `TXN-BULK-${Date.now()}`
          let paymentConfirmationEmailSent: boolean | null = null
          try {
            const verification = await axios.post(
              API_ENDPOINTS.payments.verify,
              paymentResponse,
              {
                headers: getAPI_HEADER(),
              }
            )
            const result = verification.data
            paymentConfirmationEmailSent = Boolean(result?.emailSent)
            txn =
              result?.transaction?.TransactionID ||
              result?.TransactionID ||
              paymentResponse.razorpay_payment_id ||
              txn
          } catch {
            // Ignored
          }

          await saveBulkRecords(
            txn,
            paymentResponse.razorpay_payment_id,
            paymentResponse.razorpay_order_id,
            acceptedAmount || payAmount
          )
          if (paymentConfirmationEmailSent !== null) {
            if (paymentConfirmationEmailSent) {
              setBulkMessage((current) => current ? `${current} Confirmation email sent.` : current)
            } else {
              setBulkError((current) => `${current ? `${current} ` : ''}Payment confirmation email could not be sent; please contact support.`)
            }
          }
        },
      }

      if (typeof razorpayOrderId === 'string' && razorpayOrderId.startsWith('order_')) {
        options.order_id = razorpayOrderId
      }

      const checkout = new window.Razorpay(options)

      if (checkout.on) {
        checkout.on('payment.failed', async function (resp: any) {
          let emailSent = false
          const failedPaymentId = resp.error?.metadata?.payment_id
          if (failedPaymentId) {
            try {
              const failureResponse = await axios.post(
                API_ENDPOINTS.payments.failure,
                {
                  razorpay_order_id: resp.error?.metadata?.order_id || razorpayOrderId,
                  razorpay_payment_id: failedPaymentId,
                },
                { headers: getAPI_HEADER() }
              )
              emailSent = Boolean(failureResponse.data?.emailSent)
            } catch (error) {
              console.error('[Payment] Could not report failed payment or send email:', error)
            }
          }
          setBulkUploading(false)
          const failureMessage = `Payment failed: ${resp.error?.description || resp.error?.reason || 'Payment declined'}`
          setBulkError(emailSent ? `${failureMessage} We sent a status email to your registered address.` : failureMessage)
        })
      }

      checkout.open()
    } catch (error: any) {
      setBulkUploading(false)
      setBulkError(error?.message || 'Payment processing failed. Please try again.')
    }
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setUploadedFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // --- UI RENDER STEPS ---

  // 1. Organization Step
  const renderOrganizationStep = () => (
    <VerifierPicker
      organizations={organizations}
      selectedOrgId={selectedOrgId}
      selectedOrgName={selectedOrgName}
      selectedOrg={selectedOrg}
      searchQuery={searchQuery}
      isDropdownOpen={isDropdownOpen}
      loading={loading}
      orgError={orgError}
      dynamicFieldLoading={dynamicFieldLoading}
      dynamicFieldError={dynamicFieldError}
      dynamicFields={dynamicFields}
      contributorColName={contributorColName}
      onSearchChange={setSearchQuery}
      onToggleDropdown={() => setIsDropdownOpen((prev) => !prev)}
      onSelectOrg={(org) => handleSelectOrganization(org)}
      onClearOrg={() => {
        setSelectedOrgId('')
        setSelectedOrgName('')
        setSearchQuery('')
        setIsDropdownOpen(true)
      }}
      onRefreshOrgs={async () => {
        setLoading(true)
        setOrgError(null)
        try {
          const response = await axios.get(API_ENDPOINTS.OrgmasterData, {
            headers: getAPI_HEADER(),
          })
          if (response.data && Array.isArray(response.data.data)) {
            setOrganizations(response.data.data)
          }
        } catch (err) {
          setOrgError('Error refreshing organization directory.')
        } finally {
          setLoading(false)
        }
      }}
      onProceed={() => setStep('verificationType')}
      dropdownRef={dropdownRef}
    />
  )

  // 2. Verification Type Step
  const renderVerificationTypeStep = () => (
    <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-10 lg:p-12 border border-teal-200/90 relative overflow-hidden transition-all duration-300 animate-fade-in-md">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-cyan-400/10 via-teal-300/10 to-transparent blur-3xl pointer-events-none -ml-24 -mt-24" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-emerald-400/10 via-cyan-300/10 to-transparent blur-2xl pointer-events-none -mr-20 -mb-20" />

      {/* Selected Verifier Summary Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-teal-50/90 via-cyan-50/70 to-emerald-50/80 border border-teal-200/90 mb-8 relative z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <OrgLogo name={selectedOrgName} className="w-12 h-12 rounded-xl shrink-0 bg-white p-1 shadow-xs" />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">
              Target Verifier
            </span>
            <h4 className="text-base font-black text-slate-900 truncate">{selectedOrgName}</h4>
            <span className="text-xs text-[#0680A6] font-mono font-bold">ORG-{selectedOrgId}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStep('organization')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-teal-300 text-teal-900 hover:bg-teal-50 text-xs font-bold transition-all cursor-pointer self-start sm:self-center shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change Verifier</span>
        </button>
      </div>

      <div className=" mb-8 relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 text-teal-900 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
          <Layers className="w-3.5 h-3.5 text-[#0680A6]" />
          Step 2 of 3: Verification Method
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          Choose Verification Workflow
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg  leading-relaxed">
          Select between single candidate entry with immediate Razorpay checkout or bulk ingestion via structured spreadsheets.
        </p>
      </div>

      {/* Two High-End Interactive Option Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 relative z-10">
        {/* Single Verification Card */}
        <button
          type="button"
          className={`transition-all duration-300 p-7 rounded-3xl border-2 text-left relative overflow-hidden group cursor-pointer flex flex-col justify-between ${
            verificationType === 'single'
              ? 'border-[#0680A6] bg-gradient-to-b from-teal-50/60 to-white ring-4 ring-[#0680A6]/10 scale-[1.01] shadow-xl shadow-teal-900/10'
              : 'border-slate-200/90 bg-white hover:border-[#0680A6]/60 hover:bg-teal-50/20 hover:-translate-y-1 shadow-sm'
          }`}
          onClick={async () => {
            setVerificationType('single')
            const ok = await loadDynamicFieldsForContributor()
            if (ok) setStep('single')
          }}
          disabled={dynamicFieldLoading}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0680A6] to-teal-500 text-white flex items-center justify-center shadow-lg shadow-[#0680A6]/30 group-hover:scale-105 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                RECOMMENDED • 1-5 CANDIDATES
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2">Single Candidate Form</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Verify an individual candidate with dynamic schema tailored for {selectedOrgName}, file uploads, and instant checkout.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 mb-6 font-medium">
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Pre-configured dynamic inputs ({getVisibleDynamicFields(dynamicFields).length} attributes)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Upload payslips, relieving letters &amp; candidate ID</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Direct Razorpay Gateway (₹470.82 all-inclusive)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Automated PDF clearance certificate generated</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-[#0680A6] group-hover:text-teal-900">
            <span>Open Candidate Form</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

        {/* Bulk Batch Verification Card */}
        <button
          type="button"
          className={`transition-all duration-300 p-7 rounded-3xl border-2 text-left relative overflow-hidden group cursor-pointer flex flex-col justify-between ${
            verificationType === 'bulk'
              ? 'border-teal-600 bg-gradient-to-b from-emerald-50/60 to-white ring-4 ring-emerald-500/10 scale-[1.01] shadow-xl shadow-teal-900/10'
              : 'border-slate-200/90 bg-white hover:border-emerald-500/60 hover:bg-emerald-50/20 hover:-translate-y-1 shadow-sm'
          }`}
          onClick={async () => {
            setVerificationType('bulk')
            const ok = await loadDynamicFieldsForContributor()
            if (ok) setStep('bulk')
          }}
          disabled={dynamicFieldLoading}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                BATCH INGESTION • 5+ CANDIDATES
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2">Bulk Spreadsheet Batch</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Download official spreadsheet templates formatted for {selectedOrgName}, populate candidates, and ingest in one batch.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 mb-6 font-medium">
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Official Microsoft Excel (.xlsx) &amp; CSV sample templates</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Ingest up to 500 candidate records simultaneously</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Real-time tabular row parsing &amp; error validation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Single consolidated batch verification submission</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-teal-700 group-hover:text-teal-900">
            <span>Upload Spreadsheet</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>
      </div>

      {dynamicFieldError && (
        <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 relative z-10">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{dynamicFieldError}</span>
        </div>
      )}

      {/* Dynamic Fields Preview Ribbon */}
      {getVisibleDynamicFields(dynamicFields).length > 0 && (
        <div className="mt-8 p-5 bg-slate-50/80 rounded-2xl border border-slate-200/90 relative z-10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Loaded Verifier Attributes ({getVisibleDynamicFields(dynamicFields).length} Fields)
            </span>
            <span className="text-[10px] text-teal-800 font-black bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              Dynamic Enterprise Schema Active
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getVisibleDynamicFields(dynamicFields).map((field) => (
                <span
                  key={field.DBFieldName}
                  className="px-3 py-1 text-xs font-bold bg-white text-slate-700 rounded-xl border border-slate-200 shadow-2xs"
                >
                  {field.DisplayFieldName}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center relative z-10">
        <button
          className="inline-flex items-center gap-2 text-slate-500 text-xs sm:text-sm font-bold hover:text-[#0680A6] transition-colors cursor-pointer"
          onClick={() => setStep('organization')}
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Select Enterprise</span>
        </button>
      </div>
    </div>
  )

  // 3. Single Verification Form Step
  const renderSingleFormStep = () => (
    <SingleCandidateForm
      selectedOrgName={selectedOrgName}
      selectedOrgId={selectedOrgId}
      orgTotalPrice={orgTotalPrice}
      orgBasePrice={orgBasePrice}
      orgGstAmount={orgGstAmount}
      dynamicFields={dynamicFields}
      contributorColName={contributorColName}
      singleForm={singleForm}
      validationErrors={singleFieldErrors}
      onFieldChange={(col, val) => {
        const nextForm = { ...singleForm, [col]: val }
        setSingleForm(nextForm)
        const dateFieldNames = getVisibleDynamicFields(dynamicFields)
          .filter((field) => isJoiningDateField(field) || isLeavingDateField(field))
          .map((field) => field.DBFieldName)
        const dateErrors = getEmploymentDateErrors(nextForm)
        setSingleFieldErrors((currentErrors) => {
          const nextErrors = { ...currentErrors }
          dateFieldNames.forEach((fieldName) => delete nextErrors[fieldName])
          Object.assign(nextErrors, dateErrors)
          if (!dateErrors[col]) delete nextErrors[col]
          return nextErrors
        })
      }}
      remarks={remarks}
      onRemarksChange={setRemarks}
      loaDocument={loaDocument}
      loaFileName={loaFileName}
      supportingDocument={supportingDocument}
      supportingDocFileName={supportingDocFileName}
      documentError={documentError}
      onDocumentChange={handleDocumentChange}
      paymentState={paymentState}
      paymentMessage={paymentMessage}
      onSubmit={handlePayment}
      onBack={() => setStep('verificationType')}
      onChangeOrg={() => setStep('verificationType')}
    />
  )

  // 4. Bulk Verification Step (modular BulkCandidateUploader)
  const renderBulkStep = () => (
    <BulkCandidateUploader
      selectedOrgName={selectedOrgName}
      selectedOrgId={selectedOrgId}
      orgTotalPrice={orgTotalPrice}
      dynamicFields={dynamicFields}
      contributorColName={contributorColName}
      bulkFile={bulkFile}
      bulkRows={bulkRows}
      bulkMessage={bulkMessage}
      bulkError={bulkError}
      bulkUploading={bulkUploading}
      showBulkPreview={showBulkPreview}
      onBulkFileChange={handleBulkFileChange}
      onDeleteRow={(idx) => setBulkRows((rows) => rows.filter((_, i) => i !== idx))}
      onClearBulk={() => {
        setBulkFile(null)
        setBulkRows([])
        setBulkMessage(null)
        setBulkError('')
        setShowBulkPreview(false)
      }}
      onProceedToPayment={handleOpenBulkPaymentModal}
      onBack={() => setStep('verificationType')}
      onChangeOrg={() => setStep('verificationType')}
      downloadSampleXlsx={downloadSampleXlsx}
      downloadSampleExcel={downloadSampleExcel}
    />
  )

  let content
  if (step === 'organization') {
    content = renderOrganizationStep()
  } else if (step === 'verificationType') {
    content = renderVerificationTypeStep()
  } else if (step === 'single') {
    content = renderSingleFormStep()
  } else if (step === 'bulk') {
    content = renderBulkStep()
  }

  return (
    <div className="min-h-screen bg-slate-50/90 flex flex-col font-securitas text-slate-800 antialiased selection:bg-[#0680A6] selection:text-white relative">
      {/* Background Micro Grid Dot Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-25 z-0" 
        style={{
          backgroundImage: 'radial-gradient(#0680A6 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} 
      />

      {/* 1. Sticky Frosted Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#031f30]/95 backdrop-blur-xl border-b border-cyan-500/20 text-white transition-all shadow-lg shadow-slate-900/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <img src={Logo_w} alt="Worktrail Logo" className="w-28 h-9 object-contain filter group-hover:brightness-110 transition-all" />
            </Link>

            <div className="hidden md:flex items-center gap-2 pl-4 ml-2 border-l border-white/15 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold tracking-wide">Enterprise Verification Gateway</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pl-3">
              <span>/</span>
              <span className="text-[#88ffbb] font-black uppercase tracking-wider text-[11px]">
                {step === 'organization'
                  ? 'Select Enterprise'
                  : step === 'verificationType'
                  ? 'Choose Method'
                  : step === 'single'
                  ? 'Candidate Form'
                  : 'Batch Processing'}
              </span>
            </div>

            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold tracking-wide transition-all ml-2 shadow-2xs"
              title="Go to Dashboard"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
              <span className="text-white">Dashboard</span>
            </Link>

        

          </div>

          <div className="flex items-center gap-3.5">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-white tracking-wide">
                {user?.username
                  ? `${user.username}`
                  : user?.username || 'Client User'}
              </span>
              <span className="text-[10px] text-teal-300 uppercase tracking-widest font-mono font-bold">
                {user?.Usertype || 'Client Enterprise'}
              </span>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#10B981] to-[#5850EC] text-white flex items-center justify-center font-black text-sm shadow-md shadow-teal-900/30 border border-white/25">
              {(user?.username?.charAt(0) || user?.username?.charAt(0) || 'C').toUpperCase()}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 border border-white/15 text-white text-xs font-bold tracking-wide transition-all cursor-pointer shadow-2xs"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-10 space-y-8 relative z-10">
        {/* Ambient Glowing Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#031f30] via-[#05324e] to-[#0a466c] text-white p-8 sm:p-12 shadow-2xl border border-white/15">
          <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-[#0680A6]/25 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#10B981]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-[#88ffbb] mb-3.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#88ffbb] animate-pulse" />
                Active Accredited Enterprise Network
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
                Candidate Verification Portal
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm mt-3 leading-relaxed max-w-xl font-medium">
                Submit employment background checks with dynamic schemas configured directly for registered enterprise verifiers, complete with real-time Razorpay settlement.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-5 text-xs font-bold text-slate-300">
                <span className="inline-flex items-center gap-1.5 text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Instant Turnaround &amp; SLA
                </span>
                <span className="text-white/30">•</span>
                <span className="inline-flex items-center gap-1.5 text-white">
                  <Lock className="w-4 h-4 text-cyan-300" />
                  256-Bit SSL Encrypted
                </span>
                <span className="text-white/30">•</span>
                <span className="inline-flex items-center gap-1.5 text-white">
                  <FileText className="w-4 h-4 text-teal-300" />
                  Automated Clearance PDF
                </span>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[240px]">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center shadow-xs">
                <span className="text-3xl font-black text-[#88ffbb]">
                  {loading ? '...' : organizations.length}
                </span>
                <span className="text-[11px] font-black text-slate-200 block uppercase tracking-wider mt-0.5">
                  Accredited Enterprise Partners
                </span>
              </div>
              <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                <span className="text-xs font-black text-teal-300">
                  Fixed Verification Charge: ₹470.82
                </span>
                <span className="text-[10px] text-slate-300 block mt-0.5 font-mono">₹399.00 Base + 18% GST (₹71.82)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper Navigation */}
        <Stepper
          step={step}
          onStepClick={async (targetStep) => {
            if (targetStep === 'organization') setStep('organization')
            else if (targetStep === 'verificationType' && selectedOrgId) setStep('verificationType')
            else if (targetStep === 'single' && selectedOrgId) {
              setVerificationType('single')
              const ok = await loadDynamicFieldsForContributor()
              if (ok) setStep('single')
            } else if (targetStep === 'bulk' && selectedOrgId) {
              setVerificationType('bulk')
              const ok = await loadDynamicFieldsForContributor()
              if (ok) setStep('bulk')
            }
          }}
        />

        {/* Step View Container */}
        <div className="mt-2">{content}</div>
      </main>

      {/* 3. Footer */}
      <footer className="bg-white/90 backdrop-blur-md border-t border-slate-200 py-8 mt-20 relative z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-bold tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#0680A6]" />
            <span className="font-extrabold text-slate-700">WALSONS SECURED VERIFICATION NETWORK</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.securitas.in/about-us/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-800 transition-colors"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a
              href="https://walsonsverify.com/assets/documents/Terms_and_condition.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-800 transition-colors"
            >
              Terms &amp; Conditions
            </a>
            <span>•</span>
            <span>© 2026 WALSONSLABS</span>
          </div>
        </div>
      </footer>

      {/* 3. Modular Payer Details & Payment Gateway Pop-up Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedOrgName={selectedOrgName}
        selectedOrgId={selectedOrgId}
        selectedOrgAmount={selectedOrgAmount || orgTotalPrice}
        paymentSender={paymentSender}
        onSenderChange={setPaymentSender}
        onSubmit={handleConfirmPaymentModal}
        mode={paymentTargetMode}
        candidateCount={paymentTargetMode === 'bulk' ? bulkRows.length : 1}
      />

      {/* 4. Submission Success & Recent Candidate Verification Request Inspector */}
      {submissionSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-fade-in-up relative">
            {/* Header Ambient Glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-emerald-400/20 via-[#10B981]/15 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 w-60 h-60 bg-gradient-to-br from-[#5850EC]/15 via-teal-300/10 to-transparent blur-3xl pointer-events-none" />

            {/* Modal Top Bar */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between relative z-10 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs ring-4 ring-emerald-50">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Request Transmitted
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      • {lastSubmittedRecord?.submittedAt || new Date().toISOString().split('T')[0]}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-0.5">
                    Candidate Verification Request Data
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubmissionSuccess(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 relative z-10 flex-1">
              {/* 1. Client ID & Verifier Mapping Card */}
              {(() => {
                const clientInfo = getClientIdentifier()
                const rec = lastSubmittedRecord || ({
                  requestId: lastSubmittedInfo?.requestId || generatedRequestId,
                  candidateName: lastSubmittedInfo?.candidateName || 'Candidate',
                  employeeId: lastSubmittedInfo?.employeeId || '—',
                  verifierName: lastSubmittedInfo?.orgName || selectedOrgName,
                  transactionId: lastSubmittedInfo?.transactionId,
                  status: 'Pending',
                  submittedBy: clientInfo.clientEmail,
                  amount: orgTotalPrice,
                } as VerificationRecord)
                const currentStatus = rec.status || 'Pending'
                const isCheckingThis = checkingStatusId === rec.requestId

                return (
                  <div className="rounded-2xl p-5 bg-gradient-to-r from-[#031F30] via-[#05324E] to-[#0A466C] text-white shadow-lg relative overflow-hidden border border-white/15">
                    <div className="absolute right-0 top-0 w-48 h-48 bg-[#10B981]/20 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full bg-white/15 text-[#88ffbb] text-xs font-black tracking-wider uppercase border border-white/20">
                            Client ID: {rec.clientId || clientInfo.clientId}
                          </span>
                          <span className="text-xs text-slate-300 font-bold">
                            {clientInfo.clientName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono">
                          Account: {clientInfo.clientEmail}
                        </div>
                      </div>

                      {/* Request ID + Copy Action */}
                      <div className="flex items-center gap-2.5 bg-white/10 px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-sm self-start md:self-auto">
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-widest text-slate-300 font-black block">
                            Request ID
                          </span>
                          <span className="font-mono font-black text-sm text-white">
                            {rec.requestId}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyRequestId(rec.requestId)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-slate-200 hover:text-white transition-all cursor-pointer"
                          title="Copy Request ID"
                        >
                          {copiedRequestId ? (
                            <span className="text-[10px] text-emerald-300 font-black flex items-center gap-0.5">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Verifier + Status Bar */}
                    <div className="relative z-10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#88ffbb]" />
                        <span className="text-slate-300">Target Enterprise Verifier:</span>
                        <strong className="text-white font-bold text-sm">
                          {rec.verifierName}
                        </strong>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Live Status Badge */}
                        <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                          <span
                            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                              currentStatus === 'Verified'
                                ? 'bg-emerald-400 ring-4 ring-emerald-400/30'
                                : currentStatus === 'In Progress'
                                ? 'bg-blue-400 ring-4 ring-blue-400/30'
                                : currentStatus === 'Rejected'
                                ? 'bg-rose-400 ring-4 ring-rose-400/30'
                                : 'bg-amber-400 ring-4 ring-amber-400/30'
                            }`}
                          />
                          <span className="font-black text-xs text-white">
                            Status: {currentStatus}
                          </span>
                        </div>

                        {/* Interactive Status Checker Button */}
                        <button
                          type="button"
                          onClick={() => handleCheckStatus(rec)}
                          disabled={isCheckingThis}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          title="Query live network database for latest status"
                        >
                          <RefreshCw className={`w-3 h-3 ${isCheckingThis ? 'animate-spin' : ''}`} />
                          <span>{isCheckingThis ? 'Checking...' : 'Check Status'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Status Feedback Banner */}
                    {statusCheckFeedback[rec.requestId] && (
                      <div className="mt-3.5 p-2.5 bg-white/10 rounded-xl border border-[#10B981]/40 text-xs text-[#88ffbb] flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-[#88ffbb] shrink-0" />
                        <span className="font-medium">{statusCheckFeedback[rec.requestId]}</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* 2. Intelligent Data Completeness & Missing Data Analyzer ("if any data messing so the view on there") */}
              {(() => {
                const recToInspect = lastSubmittedRecord || ({
                  candidateName: lastSubmittedInfo?.candidateName,
                  employeeId: lastSubmittedInfo?.employeeId,
                  verifierName: lastSubmittedInfo?.orgName || selectedOrgName,
                  ...singleForm,
                } as any)
                const analysis = analyzeCandidateData(recToInspect)
                const missingOrWarning = analysis.items.filter((i) => i.status !== 'valid')

                return (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        {analysis.missingCount > 0 ? (
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-black text-slate-900">
                            Candidate Data Completeness &amp; Parameter Audit
                          </h4>
                          <p className="text-xs text-slate-500">
                            Evaluated against accredited {selectedOrgName || 'verifier'} compliance standards.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                            Completeness
                          </span>
                          <span
                            className={`text-sm font-black ${
                              analysis.completenessPercent >= 90
                                ? 'text-emerald-600'
                                : analysis.completenessPercent >= 70
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {analysis.completenessPercent}% Complete
                          </span>
                        </div>

                        <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              analysis.completenessPercent >= 90
                                ? 'bg-emerald-500'
                                : analysis.completenessPercent >= 70
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${analysis.completenessPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Missing Data Warning Alert */}
                    {missingOrWarning.length > 0 ? (
                      <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-amber-950">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            {missingOrWarning.length} Missing or Incomplete Field
                            {missingOrWarning.length === 1 ? '' : 's'} Detected
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                          The following candidate credentials were empty or not provided during submission.
                          The verification request has been queued, but the verifying organization may request additional documentation.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold">
                          All essential candidate fields are 100% complete and validated.
                        </span>
                      </div>
                    )}

                    {/* Itemized Field Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {analysis.items.map((item) => {
                        const isValid = item.status === 'valid'
                        return (
                          <div
                            key={item.fieldKey}
                            className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 transition-all ${
                              isValid
                                ? 'bg-white border-slate-200/70 text-slate-800'
                                : item.severity === 'critical'
                                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                : 'bg-amber-50/60 border-amber-200 text-amber-950'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold block text-slate-900 text-[11px]">
                                {item.fieldName}
                              </span>
                              <span className="text-[10px] text-slate-500 block leading-tight">
                                {item.description}
                              </span>
                            </div>

                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wider flex items-center gap-1 ${
                                isValid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.severity === 'critical'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isValid ? (
                                <>
                                  <Check className="w-3 h-3" /> Valid
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3" /> Missing
                                </>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* 3. Mapped Candidate Credentials & Schema Values */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Mapped Candidate Credentials
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Candidate Name</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.candidateName || lastSubmittedInfo?.candidateName || 'Candidate'}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Employee Code / ID</span>
                    <strong className="font-mono font-bold text-slate-900 text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.employeeId || lastSubmittedInfo?.employeeId || '—'}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Designation</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.designation || singleForm['Designation'] || '—'}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Department</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.department || singleForm['Department'] || 'General'}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Date of Joining</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.dateOfJoining || singleForm['DateOfJoining'] || '—'}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Date of Leaving</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.dateOfLeaving || singleForm['DateOfLeaving'] || 'Present'}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Candidate Email</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.candidateEmail || singleForm['Email'] || 'Not provided'}
                    </strong>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">Contact Number</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      {lastSubmittedRecord?.contactNumber || singleForm['MobileNo'] || 'Not provided'}
                    </strong>
                  </div>

                  {lastSubmittedRecord?.transactionId && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 col-span-2">
                      <span className="text-[10px] font-bold text-emerald-700 block">Payment Transaction ID</span>
                      <strong className="font-mono font-black text-emerald-950 text-xs truncate block mt-0.5">
                        {lastSubmittedRecord.transactionId}
                      </strong>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block">Settled Amount</span>
                    <strong className="text-slate-900 font-bold text-xs truncate block mt-0.5">
                      ₹{lastSubmittedRecord?.amount ? lastSubmittedRecord.amount.toFixed(2) : orgTotalPrice.toFixed(2)}{' '}
                      (Inc. 18% GST)
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4. Batch Preview Table (if submitted in bulk) */}
              {lastSubmittedBatch.length > 1 && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Batch Candidates ({lastSubmittedBatch.length} Records)
                    </h4>
                    <span className="text-xs text-slate-500 font-bold">
                      Primary Batch ID: {lastSubmittedInfo?.requestId}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-52">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Candidate</th>
                          <th className="py-2.5 px-3">Employee Code</th>
                          <th className="py-2.5 px-3">Role / Dept</th>
                          <th className="py-2.5 px-3">Data Status</th>
                          <th className="py-2.5 px-3">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lastSubmittedBatch.map((cand, idx) => {
                          const analysis = analyzeCandidateData(cand)
                          return (
                            <tr key={cand.id || idx} className="hover:bg-slate-50/80">
                              <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{cand.candidateName}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{cand.employeeId}</td>
                              <td className="py-2 px-3 text-slate-600">
                                {cand.designation} • {cand.department}
                              </td>
                              <td className="py-2 px-3">
                                {analysis.missingCount === 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                    ✓ Complete
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                                    ⚠️ {analysis.missingCount} Missing
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-amber-600 text-xs">
                                  {cand.status || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setSubmissionSuccess(false)
                  setShowRecentRequestsModal(true)
                  navigate('/dashboard')
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>View All Client Requests</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionSuccess(false)
                    setLastSubmittedInfo(null)
                    setLastSubmittedRecord(null)
                    setLastSubmittedBatch([])
                    setStep('organization')
                    navigate('/CandidateVerification')
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Submit Another
                </button>
           
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* Embedded CSS Animations */}
      <style>{`
        .animate-fade-in-md { animation: fade-in .5s cubic-bezier(.25,.8,.25,1) both; }
        .animate-fade-in { animation: fade-in .3s cubic-bezier(.22,.68,.53,.99) both; }
        .animate-fade-in-up { animation: fade-in-up .4s 0.05s cubic-bezier(.2,1,.4,1) both; }
        .animate-shake { animation: shake 0.4s both; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes shake {
          0% { transform: translateX(0); }
          16% { transform: translateX(-3px); }
          32% { transform: translateX(4px); }
          48% { transform: translateX(-4px); }
          64% { transform: translateX(3px); }
          80% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export default CandidateVerificationForm
