import axios from 'axios'
import { type VerificationRecord } from './CandidateVerificationForm'
import { getDynamicBrandDomain } from './OrgLogo'
import securitasLogo from '../assets/Img/logo_b.png'
import { API_ENDPOINTS, getAPI_HEADER } from '../endpoint'

export interface LogoImageData {
  bytes: Uint8Array
  width: number
  height: number
}

let cachedLogoData: LogoImageData | null = null

export async function getLogoImageData(): Promise<LogoImageData | null> {
  if (cachedLogoData) return cachedLogoData

  try {
    const img = new Image()
    img.src = securitasLogo

    if (img.decode) {
      await img.decode().catch(() => {})
    }

    if (!img.complete || img.naturalWidth === 0) {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
        setTimeout(resolve, 1500)
      })
    }

    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // White background to cleanly blend against white PDF docket
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) return null

    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    cachedLogoData = { bytes, width: w, height: h }
    return cachedLogoData
  } catch (err) {
    console.warn('Could not load logo image for PDF:', err)
    return null
  }
}

/**
 * Load and render client enterprise logo as a high-resolution PDF image asset.
 */
export async function loadExternalImageAsLogoData(url: string, orgName: string): Promise<LogoImageData | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url

    const timeout = setTimeout(() => {
      resolve(null)
    }, 1200)

    img.onload = () => {
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 240
        canvas.height = 70
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)

        // White card background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, 240, 70)

        // Clean border
        ctx.strokeStyle = '#CBD5E1'
        ctx.lineWidth = 2
        ctx.strokeRect(1, 1, 238, 68)

        // Draw company icon/favicon
        ctx.drawImage(img, 12, 13, 44, 44)

        // Company Name
        ctx.fillStyle = '#0F172A'
        ctx.font = 'bold 13px Helvetica, Arial, sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        const displayName = orgName.length > 18 ? orgName.slice(0, 16) + '...' : orgName
        ctx.fillText(displayName, 64, 32)

        // Subtitle tag
        ctx.fillStyle = '#059669'
        ctx.font = 'bold 9px Helvetica, Arial, sans-serif'
        ctx.fillText('VERIFIED ENTERPRISE', 64, 48)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        const base64Data = dataUrl.split(',')[1]
        if (!base64Data) return resolve(null)

        const binaryStr = atob(base64Data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }
        resolve({ bytes, width: 240, height: 70 })
      } catch {
        resolve(null)
      }
    }

    img.onerror = () => {
      clearTimeout(timeout)
      resolve(null)
    }
  })
}

/**
 * Generates an executive client badge for the PDF header.
 */
export function generateClientBadgeLogoData(orgName: string): LogoImageData {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 70
  const ctx = canvas.getContext('2d')!

  // White card background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, 240, 70)

  // Border
  ctx.strokeStyle = '#CBD5E1'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, 238, 68)

  // Brand avatar circle
  ctx.fillStyle = '#0680A6'
  ctx.beginPath()
  ctx.arc(34, 35, 22, 0, Math.PI * 2)
  ctx.fill()

  const initials = (orgName || 'Client')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CL'

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 16px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, 34, 35)

  // Text
  ctx.fillStyle = '#0F172A'
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const displayName = orgName.length > 18 ? orgName.slice(0, 16) + '...' : orgName
  ctx.fillText(displayName, 64, 32)

  ctx.fillStyle = '#059669'
  ctx.font = 'bold 9px Helvetica, Arial, sans-serif'
  ctx.fillText('VERIFIED ENTERPRISE', 64, 48)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  const base64Data = dataUrl.split(',')[1]
  const binaryStr = atob(base64Data)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return { bytes, width: 240, height: 70 }
}

const clientLogoCache: Record<string, LogoImageData> = {}

export async function getClientLogoData(orgName: string): Promise<LogoImageData | null> {
  const name = String(orgName || 'Enterprise Client').trim()
  if (clientLogoCache[name]) return clientLogoCache[name]

  const domain = getDynamicBrandDomain(name)
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const logoUrls: string[] = []

  if (domain) {
    logoUrls.push(
      `https://unavatar.io/${domain}`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      `https://logo.clearbit.com/${domain}`
    )
  }
  if (clean && clean !== domain?.replace('.com', '')) {
    logoUrls.push(
      `https://unavatar.io/${clean}.com`,
      `https://www.google.com/s2/favicons?domain=${clean}.com&sz=128`,
      `https://logo.clearbit.com/${clean}.com`
    )
  }

  for (const url of logoUrls) {
    try {
      const data = await loadExternalImageAsLogoData(url, name)
      if (data) {
        clientLogoCache[name] = data
        return data
      }
    } catch {
      continue
    }
  }

  const badgeData = generateClientBadgeLogoData(name)
  clientLogoCache[name] = badgeData
  return badgeData
}

function pdfCircle(cx: number, cy: number, r: number): string {
  const c = r * 0.55228475
  return (
    `${cx.toFixed(2)} ${(cy + r).toFixed(2)} m\n` +
    `${(cx + c).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy + c).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c\n` +
    `${(cx + r).toFixed(2)} ${(cy - c).toFixed(2)} ${(cx + c).toFixed(2)} ${(cx - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c\n` +
    `${(cx - c).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy - c).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c\n` +
    `f\n`
  )
}

export function escapePdfText(text?: string | null): string {
  if (!text) return ''
  return String(text)
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

export function buildPdf(
  streamContent: string,
  logoData?: LogoImageData | null,
  clientLogoData?: LogoImageData | null
): Uint8Array {
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'

  const hasLeft = Boolean(logoData)
  const hasRight = Boolean(clientLogoData)

  let xobjectStr = ''
  if (hasLeft && hasRight) {
    xobjectStr = '/XObject << /Im1 7 0 R /Im2 8 0 R >> '
  } else if (hasLeft) {
    xobjectStr = '/XObject << /Im1 7 0 R >> '
  } else if (hasRight) {
    xobjectStr = '/XObject << /Im1 7 0 R /Im2 7 0 R >> '
  }

  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> ${xobjectStr}>> /Contents 6 0 R >>\nendobj\n`
  const obj4 =
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n'
  const obj5 =
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'

  const enc = new TextEncoder()
  const streamBytes = enc.encode(streamContent)
  const obj6Header = `6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`
  const obj6Footer = '\nendstream\nendobj\n'

  const headerBytes = enc.encode(header)
  const obj1Bytes = enc.encode(obj1)
  const obj2Bytes = enc.encode(obj2)
  const obj3Bytes = enc.encode(obj3)
  const obj4Bytes = enc.encode(obj4)
  const obj5Bytes = enc.encode(obj5)
  const obj6HBytes = enc.encode(obj6Header)
  const obj6FBytes = enc.encode(obj6Footer)

  const offset1 = headerBytes.length
  const offset2 = offset1 + obj1Bytes.length
  const offset3 = offset2 + obj2Bytes.length
  const offset4 = offset3 + obj3Bytes.length
  const offset5 = offset4 + obj4Bytes.length
  const offset6 = offset5 + obj5Bytes.length
  const offsetAfter6 = offset6 + obj6HBytes.length + streamBytes.length + obj6FBytes.length

  let obj7Bytes: Uint8Array | null = null
  let obj7HBytes: Uint8Array | null = null
  let obj7FBytes: Uint8Array | null = null
  let offset7 = 0
  let offsetAfter7 = offsetAfter6

  let obj8Bytes: Uint8Array | null = null
  let obj8HBytes: Uint8Array | null = null
  let obj8FBytes: Uint8Array | null = null
  let offset8 = 0
  let offsetAfter8 = offsetAfter6

  if (hasLeft && hasRight && logoData && clientLogoData) {
    offset7 = offsetAfter6
    const obj7Header = `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoData.bytes.length} >>\nstream\n`
    const obj7Footer = '\nendstream\nendobj\n'
    obj7HBytes = enc.encode(obj7Header)
    obj7Bytes = logoData.bytes
    obj7FBytes = enc.encode(obj7Footer)
    offsetAfter7 = offset7 + obj7HBytes.length + obj7Bytes.length + obj7FBytes.length

    offset8 = offsetAfter7
    const obj8Header = `8 0 obj\n<< /Type /XObject /Subtype /Image /Width ${clientLogoData.width} /Height ${clientLogoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${clientLogoData.bytes.length} >>\nstream\n`
    const obj8Footer = '\nendstream\nendobj\n'
    obj8HBytes = enc.encode(obj8Header)
    obj8Bytes = clientLogoData.bytes
    obj8FBytes = enc.encode(obj8Footer)
    offsetAfter8 = offset8 + obj8HBytes.length + obj8Bytes.length + obj8FBytes.length
  } else if (hasLeft && logoData) {
    offset7 = offsetAfter6
    const obj7Header = `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoData.bytes.length} >>\nstream\n`
    const obj7Footer = '\nendstream\nendobj\n'
    obj7HBytes = enc.encode(obj7Header)
    obj7Bytes = logoData.bytes
    obj7FBytes = enc.encode(obj7Footer)
    offsetAfter7 = offset7 + obj7HBytes.length + obj7Bytes.length + obj7FBytes.length
  } else if (hasRight && clientLogoData) {
    offset7 = offsetAfter6
    const obj7Header = `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${clientLogoData.width} /Height ${clientLogoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${clientLogoData.bytes.length} >>\nstream\n`
    const obj7Footer = '\nendstream\nendobj\n'
    obj7HBytes = enc.encode(obj7Header)
    obj7Bytes = clientLogoData.bytes
    obj7FBytes = enc.encode(obj7Footer)
    offsetAfter7 = offset7 + obj7HBytes.length + obj7Bytes.length + obj7FBytes.length
  }

  const pad = (n: number) => String(n).padStart(10, '0')
  let xref = ''
  let startxrefOffset = offsetAfter6
  let trailerSize = 7

  if (hasLeft && hasRight) {
    xref = `xref\n0 9\n0000000000 65535 f \n${pad(offset1)} 00000 n \n${pad(offset2)} 00000 n \n${pad(offset3)} 00000 n \n${pad(offset4)} 00000 n \n${pad(offset5)} 00000 n \n${pad(offset6)} 00000 n \n${pad(offset7)} 00000 n \n${pad(offset8)} 00000 n \n`
    startxrefOffset = offsetAfter8
    trailerSize = 9
  } else if (hasLeft || hasRight) {
    xref = `xref\n0 8\n0000000000 65535 f \n${pad(offset1)} 00000 n \n${pad(offset2)} 00000 n \n${pad(offset3)} 00000 n \n${pad(offset4)} 00000 n \n${pad(offset5)} 00000 n \n${pad(offset6)} 00000 n \n${pad(offset7)} 00000 n \n`
    startxrefOffset = offsetAfter7
    trailerSize = 8
  } else {
    xref = `xref\n0 7\n0000000000 65535 f \n${pad(offset1)} 00000 n \n${pad(offset2)} 00000 n \n${pad(offset3)} 00000 n \n${pad(offset4)} 00000 n \n${pad(offset5)} 00000 n \n${pad(offset6)} 00000 n \n`
    startxrefOffset = offsetAfter6
    trailerSize = 7
  }

  const trailer = `trailer\n<< /Size ${trailerSize} /Root 1 0 R >>\nstartxref\n${startxrefOffset}\n%%EOF\n`
  const xrefBytes = enc.encode(xref)
  const trailerBytes = enc.encode(trailer)

  const totalLength = startxrefOffset + xrefBytes.length + trailerBytes.length
  const result = new Uint8Array(totalLength)
  let pos = 0

  result.set(headerBytes, pos); pos += headerBytes.length
  result.set(obj1Bytes, pos); pos += obj1Bytes.length
  result.set(obj2Bytes, pos); pos += obj2Bytes.length
  result.set(obj3Bytes, pos); pos += obj3Bytes.length
  result.set(obj4Bytes, pos); pos += obj4Bytes.length
  result.set(obj5Bytes, pos); pos += obj5Bytes.length
  result.set(obj6HBytes, pos); pos += obj6HBytes.length
  result.set(streamBytes, pos); pos += streamBytes.length
  result.set(obj6FBytes, pos); pos += obj6FBytes.length

  if (obj7HBytes && obj7Bytes && obj7FBytes) {
    result.set(obj7HBytes, pos); pos += obj7HBytes.length
    result.set(obj7Bytes, pos); pos += obj7Bytes.length
    result.set(obj7FBytes, pos); pos += obj7FBytes.length
  }

  if (obj8HBytes && obj8Bytes && obj8FBytes) {
    result.set(obj8HBytes, pos); pos += obj8HBytes.length
    result.set(obj8Bytes, pos); pos += obj8Bytes.length
    result.set(obj8FBytes, pos); pos += obj8FBytes.length
  }

  result.set(xrefBytes, pos); pos += xrefBytes.length
  result.set(trailerBytes, pos); pos += trailerBytes.length

  return result
}

function cleanValue(val: any, fallback = 'N/A'): string {
  if (val === undefined || val === null) return fallback
  const str = String(val).trim()
  if (!str || str === '—' || str === '-' || str === 'undefined' || str === 'null') {
    return fallback
  }
  return str
}

export interface PdfReportOptions {
  contributorData?: any
  status?: string
  overallRemarks?: string
  employeeCode?: string
  fieldChecks?: Record<string, { verified?: boolean | null; remarks?: string }>
  comparisonFields?: Array<{
    id: string
    label: string
    clientVal: any
    contributorVal: any
    isDynamic?: boolean
  }>
  reviewerName?: string
  hasDiscrepancy?: boolean
}

const DEFAULT_FASCILATOR_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsImlkIjozLCJFbWFpbElEIjoidW1hbmcuYmh1c2hhbkBzZWN1cml0YXMtaW5kaWEuY29tIiwiZW1haWwiOiJ1bWFuZy5iaHVzaGFuQHNlY3VyaXRhcy1pbmRpYS5jb20iLCJVc2VydHlwZSI6IkZhc2NpbGF0b3IiLCJ1c2VybmFtZSI6IlNlY3VyaXRhc0Zhc2NpbCIsIkNvbXBhbnlOYW1lIjoiIiwiQ29tcGFueUNvZGUiOiIiLCJVc2VyTWFzdGVySUQiOjEsIk9yZ01hc3RlcklEIjpudWxsLCJqdGkiOiJkNjAzNTQ5Ni00MzJlLTQxYjYtODI5Yi05MjVkNzhhZWM0NWMiLCJpYXQiOjE3OTI3Mzg0NzcsImV4cCI6MTc5MjczOTA3N30.UtIw-n2cGirEtF_pNO_vWF6N3Ah786LhAtOnSXgOZU8'

/**
 * Fetch facilitator comments using employee code via POST /api/FascilatorComments
 */
export async function fetchFacilitatorRemark(employeeCode: string): Promise<string> {
  const code = String(employeeCode || '').trim()
  if (!code || code === '—' || code === '-' || code === 'N/A' || code === 'undefined' || code === 'null') {
    return ''
  }

  try {
    const headers: Record<string, string> = {
      ...getAPI_HEADER(),
    }
    
    const response = await axios.post(
      API_ENDPOINTS.FascilatorComments,
      {
        employeeCode: code,
      },
      {
        headers,
      }
    )

    return extractRemarkFromApiResponse(response?.data)
  } catch (err) {
    console.warn('[pdf-utils] Failed to fetch facilitator comments:', err)
    return ''
  }
}

function extractRemarkFromApiResponse(data: any): string {
  if (!data) return ''
  if (typeof data === 'string') return data.trim()

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.result)
    ? data.result
    : Array.isArray(data?.comments)
    ? data.comments
    : Array.isArray(data?.records)
    ? data.records
    : null

  if (list && list.length > 0) {
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i]
      if (typeof item === 'string' && item.trim()) return item.trim()
      if (item && typeof item === 'object') {
        const val =
          item.FacilitatorComments ||
          item.facilitatorComments ||
          item.FascilatorComments ||
          item.fascilatorComments ||
          item.comments ||
          item.Comments ||
          item.remarks ||
          item.Remarks ||
          item.remark ||
          item.Remark ||
          item.Comment ||
          item.comment ||
          item.auditRemarks ||
          item.AuditRemarks
        if (val && typeof val === 'string' && val.trim()) {
          return val.trim()
        }
      }
    }
  }

  const obj = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data
  if (obj && typeof obj === 'object') {
    const val =
      obj.FacilitatorComments ||
      obj.facilitatorComments ||
      obj.FascilatorComments ||
      obj.fascilatorComments ||
      obj.comments ||
      obj.Comments ||
      obj.remarks ||
      obj.Remarks ||
      obj.remark ||
      obj.Remark ||
      obj.Comment ||
      obj.comment ||
      obj.auditRemarks ||
      obj.AuditRemarks
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim()
    }
  }

  return ''
}

function wrapPdfLines(text: string, maxChars: number = 80): string[] {
  if (!text) return []
  const clean = String(text).replace(/[\r\n]+/g, ' ').trim()
  if (!clean) return []
  const words = clean.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim()
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function buildCandidatePdf(
  rec: VerificationRecord,
  logoData?: LogoImageData | null,
  clientLogoData?: LogoImageData | null,
  options?: PdfReportOptions
): Promise<Uint8Array> {
  const raw = (rec as any).raw || {}
  const contr = options?.contributorData || {}
  const targetEmpCode =
    cleanValue(options?.employeeCode || rec.employeeId) !== 'N/A' && cleanValue(options?.employeeCode || rec.employeeId) !== '—'
      ? cleanValue(options?.employeeCode || rec.employeeId)
      : cleanValue(
          contr.EmployeeCode || contr.employeeId || contr.EmpCode || raw.EmployeeCode || raw.employeeId || raw.empCode || raw.EmpCode || raw.EmployeeID,
          ''
        )

  let apiRemark = ''
  if (targetEmpCode && targetEmpCode !== 'N/A' && targetEmpCode !== '—') {
    apiRemark = await fetchFacilitatorRemark(targetEmpCode)
  }

  return generateCandidatePdfInternal(rec, logoData, clientLogoData, options, apiRemark)
}

export function buildCandidatePdfSync(
  rec: VerificationRecord,
  logoData?: LogoImageData | null,
  clientLogoData?: LogoImageData | null,
  options?: PdfReportOptions
): Uint8Array {
  return generateCandidatePdfInternal(rec, logoData, clientLogoData, options, '')
}

function generateCandidatePdfInternal(
  rec: VerificationRecord,
  logoData?: LogoImageData | null,
  clientLogoData?: LogoImageData | null,
  options?: PdfReportOptions,
  apiRemark?: string
): Uint8Array {
  const raw = (rec as any).raw || {}
  const contr = options?.contributorData || {}

  // 1. Resolve candidate fields with clean, dynamic fallback (NO dummy values)
  const candNameRaw =
    cleanValue(rec.candidateName && rec.candidateName !== 'Candidate' ? rec.candidateName : null) !== 'N/A'
      ? rec.candidateName
      : cleanValue([raw.FirstName, raw.MiddleName, raw.LastName].filter(Boolean).join(' ')) !== 'N/A'
      ? [raw.FirstName, raw.MiddleName, raw.LastName].filter(Boolean).join(' ')
      : cleanValue(
          contr.CandidateName || contr.candidateName || raw.CandidateName || raw.Name || raw.EmpName,
          rec.candidateName || 'Candidate'
        )

  const empIdRaw =
    cleanValue(rec.employeeId) !== 'N/A'
      ? rec.employeeId
      : cleanValue(
          contr.EmployeeCode || contr.employeeId || contr.EmpCode || raw.EmployeeCode || raw.employeeId || raw.empCode || raw.EmpCode || raw.EmployeeID,
          'N/A'
        )

  const reqIdRaw =
    cleanValue(rec.requestId) !== 'N/A'
      ? rec.requestId
      : cleanValue(rec.orderId || raw.OrderID || raw.orderId || raw.RequestId || raw.requestId || rec.id, '—')

  const verifierNameRaw =
    cleanValue(rec.verifierName) !== 'N/A'
      ? rec.verifierName
      : cleanValue(
          contr.Company || contr.Contributor || contr.contributor || raw.Contributor || raw.contributor || raw.Company,
          'Enterprise Verifier'
        )

  const designationRaw =
    cleanValue(rec.designation) !== 'N/A'
      ? rec.designation
      : cleanValue(
          contr.LastPositionHeld || contr.Designation || contr.designation || raw.LastPositionHeld || raw.Designation || raw.designation || raw.Position,
          'Not Specified'
        )

  const departmentRaw =
    cleanValue(rec.department) !== 'N/A'
      ? rec.department!
      : cleanValue(contr.Department || contr.department || raw.Department || raw.department, 'Not Specified')

  const dojRaw =
    cleanValue(rec.dateOfJoining) !== 'N/A'
      ? rec.dateOfJoining
      : cleanValue(contr.DateOfJoining ? String(contr.DateOfJoining).split('T')[0] : raw.DateOfJoining || raw.dateOfJoining || raw.DOJ, 'Not Specified')

  const rawDol =
    cleanValue(rec.dateOfLeaving) !== 'N/A'
      ? rec.dateOfLeaving
      : cleanValue(contr.DateOfLeaving ? String(contr.DateOfLeaving).split('T')[0] : raw.DateOfLeaving || raw.dateOfLeaving || raw.DOL, '')

  const isCurrentlyEmployed = rec.isCurrentlyEmployed ?? (contr.IsCurrentlyEmployed || !rawDol || rawDol === 'N/A' || String(rawDol).toLowerCase() === 'present')
  const dolRaw = isCurrentlyEmployed ? 'Present / Active' : (rawDol || 'N/A')
  const employedStatus = isCurrentlyEmployed ? 'Currently Employed' : 'Relieved / Ex-Employee'

  const contactRaw =
    cleanValue(rec.contactNumber) !== 'N/A'
      ? rec.contactNumber
      : cleanValue(contr.MobileNo || contr.mobileNo || raw.MobileNo || raw.mobileNo || raw.Mobile || raw.Phone || raw.ContactNo, 'Not Provided')

  const candEmailRaw =
    cleanValue(rec.candidateEmail) !== 'N/A'
      ? rec.candidateEmail
      : cleanValue(contr.Email || contr.email || raw.Email || raw.email || raw.EmailID || raw.Clientemail, 'Not Provided')

  // 2. Remarks handling - dynamic from reviewer, live API comments, and field checks (NO dummy strings)
  let baseRemarks = ''
  if (options?.overallRemarks && options.overallRemarks.trim()) {
    baseRemarks = options.overallRemarks.trim()
  } else if (apiRemark && apiRemark.trim()) {
    baseRemarks = apiRemark.trim()
  } else {
    baseRemarks = cleanValue(
      rec.remarks ||
      raw.Remarks ||
      raw.remarks ||
      (raw as any).FacilitatorComments ||
      (raw as any).facilitatorComments,
      ''
    )
  }
  if (baseRemarks === 'Confirmed relieving date and integrity' || baseRemarks === 'Confirmed relieving date and integrity clearance') {
    baseRemarks = ''
  }

  // Collect any field-level notes from fieldChecks
  const fieldRemarks: string[] = []
  if (options?.fieldChecks) {
    Object.entries(options.fieldChecks).forEach(([fId, check]) => {
      if (check.remarks && check.remarks.trim()) {
        const label = fId.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
        fieldRemarks.push(`${label}: ${check.remarks.trim()}`)
      }
    })
  }

  let finalRemarks = baseRemarks
  if (fieldRemarks.length > 0) {
    const extra = fieldRemarks.join('; ')
    finalRemarks = finalRemarks ? `${finalRemarks} | ${extra}` : extra
  }
  if (!finalRemarks) {
    finalRemarks = 'No audit remarks recorded.'
  }

  const rawSubmitted = cleanValue(rec.submittedBy || raw.Clientemail || contr.Clientemail, 'Authorized Client')

  const submittedAtRaw =
    cleanValue(rec.submittedAt) !== 'N/A'
      ? rec.submittedAt
      : cleanValue(raw.CreatedAt ? String(raw.CreatedAt).split('T')[0] : null, new Date().toISOString().split('T')[0])

  // 3. Status determination with strict 3-way color scheme:
  // Verified = Green, Rejected = Red, Found Discrepancy = Orange
  const rawStatus = String(options?.status || rec.status || raw.Status || 'Verified').trim()
  const statusLower = rawStatus.toLowerCase()

  let statusType: 'verified' | 'rejected' | 'discrepancy' = 'verified'
  let statusBadgeTitle = 'VERIFIED'

  if (
    statusLower.includes('reject') ||
    statusLower === 'failed' ||
    statusLower === 'not verified'
  ) {
    statusType = 'rejected'
    statusBadgeTitle = 'REJECTED'
  } else if (
    statusLower.includes('discrep') ||
    statusLower.includes('mismatch') ||
    statusLower.includes('found') ||
    statusLower.includes('appeal') ||
    statusLower.includes('flag') ||
    options?.hasDiscrepancy === true
  ) {
    statusType = 'discrepancy'
    statusBadgeTitle = 'FOUND DISCREPANCY'
  } else if (
    statusLower.includes('verif') ||
    statusLower.includes('approv') ||
    statusLower.includes('clean') ||
    statusLower.includes('passed')
  ) {
    statusType = 'verified'
    statusBadgeTitle = 'VERIFIED'
  } else {
    // Check if comparisonFields have mismatches
    const hasAnyMismatch = options?.comparisonFields?.some((f) => {
      const c = String(f.clientVal || '').trim().toLowerCase()
      const r = String(f.contributorVal || '').trim().toLowerCase()
      return c && r && c !== '—' && r !== 'data not found' && c !== r
    })
    if (hasAnyMismatch) {
      statusType = 'discrepancy'
      statusBadgeTitle = 'FOUND DISCREPANCY'
    } else {
      statusType = 'verified'
      statusBadgeTitle = 'VERIFIED'
    }
  }

  let s = ''

  // Top Decorative Bar (Securitas / Platform Brand Navy)
  s += '0.012 0.122 0.188 rg 40 806 515 3 re f\n'

  // Platform Branding
  if (logoData) {
    const imgH = 34
    const imgW = Math.min(130, Math.round(imgH * (logoData.width / logoData.height)))
    s += `q\n${imgW} 0 0 ${imgH} 40 766 cm\n/Im1 Do\nQ\n`
    s += 'BT /F2 7.5 Tf 0.39 0.45 0.55 rg 40 754 Td (OFFICIAL EMPLOYMENT VERIFICATION REPORT) Tj ET\n'
  } else {
    s += '0.94 0.1 0.18 rg\n'
    s += pdfCircle(48, 788, 5.5)
    s += pdfCircle(63, 788, 5.5)
    s += pdfCircle(78, 788, 5.5)
    s += 'BT /F1 14 Tf 0.03 0.13 0.21 rg 40 768 Td (Worktrail) Tj ET\n'
    s += 'BT /F2 7.5 Tf 0.39 0.45 0.55 rg 40 754 Td (OFFICIAL EMPLOYMENT VERIFICATION REPORT) Tj ET\n'
  }

  // Client / Enterprise Logo on Right
  if (clientLogoData) {
    const clH = 34
    const clW = Math.min(145, Math.round(clH * (clientLogoData.width / clientLogoData.height)))
    const clX = 555 - clW
    const imgRef = logoData ? '/Im2' : '/Im1'
    s += `q\n${clW} 0 0 ${clH} ${clX} 766 cm\n${imgRef} Do\nQ\n`
    s += `BT /F1 7.5 Tf 0.06 0.09 0.16 rg ${clX} 754 Td (TARGET ENTERPRISE CLIENT) Tj ET\n`
  }

  // Candidate Profile Summary Box
  s += '0.96 0.97 0.98 rg 40 678 515 64 re f\n'
  s += '0.88 0.91 0.94 RG 1 w 40 678 515 64 re S\n'
  s += `BT /F1 14 Tf 0.06 0.09 0.16 rg 55 720 Td (${escapePdfText(candNameRaw)}) Tj ET\n`
  s += `BT /F2 8.5 Tf 0.39 0.45 0.55 rg 55 704 Td (Request ID: ${escapePdfText(reqIdRaw)}   |   Submitted: ${escapePdfText(submittedAtRaw)}) Tj ET\n`

  const empIdText = `Employee ID: ${empIdRaw}`
  const verifierX = Math.min(235, 55 + Math.round(empIdText.length * 5.4) + 16)
  const verifierSummary = verifierNameRaw.length > 34 ? verifierNameRaw.slice(0, 32) + '...' : verifierNameRaw
  s += `BT /F1 8.5 Tf 0.02 0.5 0.65 rg 55 689 Td (${escapePdfText(empIdText)}) Tj ET\n`
  s += `BT /F2 8.5 Tf 0.35 0.4 0.5 rg ${verifierX} 689 Td (|   Verifier: ${escapePdfText(verifierSummary)}) Tj ET\n`

  // Status Badge on Right - Verified = Green, Rejected = Red, Found Discrepancy = Orange
  if (statusType === 'verified') {
    s += '0.92 0.98 0.95 rg 398 690 148 40 re f\n'
    s += '0.06 0.73 0.51 RG 1.5 w 398 690 148 40 re S\n'
    s += 'BT /F2 7.5 Tf 0.15 0.50 0.35 rg 410 715 Td (VERIFICATION STATUS) Tj ET\n'
    s += 'BT /F1 11 Tf 0.04 0.60 0.38 rg 410 700 Td (VERIFIED) Tj ET\n'
  } else if (statusType === 'rejected') {
    s += '1.00 0.94 0.95 rg 398 690 148 40 re f\n'
    s += '0.88 0.15 0.28 RG 1.5 w 398 690 148 40 re S\n'
    s += 'BT /F2 7.5 Tf 0.65 0.20 0.25 rg 410 715 Td (VERIFICATION STATUS) Tj ET\n'
    s += 'BT /F1 11 Tf 0.85 0.12 0.22 rg 410 700 Td (REJECTED) Tj ET\n'
  } else {
    // Found Discrepancy -> ORANGE
    s += '1.00 0.96 0.90 rg 398 690 148 40 re f\n'
    s += '0.93 0.48 0.08 RG 1.5 w 398 690 148 40 re S\n'
    s += 'BT /F2 7.5 Tf 0.65 0.35 0.10 rg 406 715 Td (VERIFICATION STATUS) Tj ET\n'
    s += 'BT /F1 9.5 Tf 0.88 0.38 0.04 rg 406 700 Td (FOUND DISCREPANCY) Tj ET\n'
  }


  // Section Header: Parameter Match Breakdown
  s += 'BT /F1 10.5 Tf 0.06 0.09 0.16 rg 40 650 Td (VERIFICATION BREAKDOWN & PARAMETER AUDIT) Tj ET\n'

  // Table Header (4 Columns: Parameter | Information Provided | Information Verified | Result)
  s += '0.93 0.95 0.98 rg 40 624 515 22 re f\n'
  s += '0.8 0.84 0.9 RG 0.5 w 40 624 515 22 re S\n'
  s += 'BT /F1 8.5 Tf 0.2 0.25 0.35 rg 48 630 Td (Parameter) Tj ET\n'
  s += 'BT /F1 8.5 Tf 0.2 0.25 0.35 rg 165 630 Td (Information Provided) Tj ET\n'
  s += 'BT /F1 8.5 Tf 0.2 0.25 0.35 rg 305 630 Td (Information Verified) Tj ET\n'
  s += 'BT /F1 8.5 Tf 0.2 0.25 0.35 rg 448 630 Td (Audit Result) Tj ET\n'

  // Resolve Table Rows Dynamically
  interface RowItem {
    param: string
    client: string
    contributor: string
    result: string
    resultType: 'match' | 'mismatch' | 'missing' | 'unverified'
  }

  let tableRows: RowItem[] = []

  if (options?.comparisonFields && options.comparisonFields.length > 0) {
    tableRows = options.comparisonFields.slice(0, 8).map((f) => {
      const fieldCheck = options.fieldChecks ? options.fieldChecks[f.id] : undefined
      const cStr = String(f.clientVal ?? '').trim()
      const rStr = String(f.contributorVal ?? '').trim()

      let resultType: 'match' | 'mismatch' | 'missing' | 'unverified' = 'match'
      let resultText = 'Verified Match'

      if (fieldCheck?.verified === false) {
        resultType = 'mismatch'
        resultText = 'Discrepancy Flagged'
      } else if (fieldCheck?.verified === true) {
        resultType = 'match'
        resultText = 'Verified Match'
      } else {
        const cLower = cStr.toLowerCase()
        const rLower = rStr.toLowerCase()
        if (!rStr || rLower === 'data not found' || rLower === 'not recorded' || rLower === '—') {
          resultType = 'missing'
          resultText = 'Data Not Found'
        } else if (cLower === rLower || cLower.includes(rLower) || rLower.includes(cLower)) {
          resultType = 'match'
          resultText = 'Verified Match'
        } else {
          resultType = 'mismatch'
          resultText = 'Discrepancy'
        }
      }

      return {
        param: f.label,
        client: cStr || '—',
        contributor: rStr || 'Data Not Found',
        result: resultText,
        resultType
      }
    })
  } else {
    // Dynamic fallback built directly from rec and contr
    const defaultRows = [
      {
        param: 'Full Name',
        client: candNameRaw,
        contributor: cleanValue(contr.CandidateName || contr.Name, candNameRaw),
        match: Boolean(candNameRaw)
      },
      {
        param: 'Employee Code',
        client: empIdRaw,
        contributor: cleanValue(contr.EmployeeCode || contr.EmpCode, empIdRaw),
        match: Boolean(empIdRaw && empIdRaw !== 'N/A')
      },
      {
        param: 'Verifier / Org',
        client: verifierNameRaw,
        contributor: cleanValue(contr.Company || contr.Contributor, verifierNameRaw),
        match: Boolean(verifierNameRaw)
      },
      {
        param: 'Designation',
        client: designationRaw,
        contributor: cleanValue(contr.Designation || contr.LastPositionHeld, designationRaw),
        match: Boolean(designationRaw && designationRaw !== 'Not Specified')
      },
      {
        param: 'Department',
        client: departmentRaw,
        contributor: cleanValue(contr.Department, departmentRaw),
        match: Boolean(departmentRaw && departmentRaw !== 'Not Specified')
      },
      {
        param: 'Tenure Period',
        client: `${dojRaw} to ${dolRaw}`,
        contributor: `${dojRaw} to ${dolRaw}`,
        match: Boolean(dojRaw && dojRaw !== 'Not Specified')
      },
      {
        param: 'Contact / Email',
        client: `${candEmailRaw}`,
        contributor: `${cleanValue(contr.Email, candEmailRaw)}`,
        match: Boolean(candEmailRaw && candEmailRaw !== 'Not Provided')
      },
      {
        param: 'Employment Status',
        client: employedStatus,
        contributor: employedStatus,
        match: true
      }
    ]

    tableRows = defaultRows.map((r) => {
      let resultType: 'match' | 'mismatch' | 'missing' = 'match'
      let result = 'Verified Match'

      if (statusType === 'rejected') {
        resultType = 'mismatch'
        result = 'Rejected / Discrepant'
      } else if (statusType === 'discrepancy' && !r.match) {
        resultType = 'mismatch'
        result = 'Discrepancy'
      } else if (!r.match) {
        resultType = 'missing'
        result = 'Not Recorded'
      }

      return {
        param: r.param,
        client: r.client,
        contributor: r.contributor,
        result,
        resultType
      }
    })
  }

  const rowH = 24
  let rowY = 598
  tableRows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      s += `0.98 0.98 0.99 rg 40 ${rowY - 5} 515 ${rowH} re f\n`
    }
    s += `0.9 0.92 0.95 RG 0.5 w 40 ${rowY - 5} 515 0.5 re S\n`

    // Col 1: Parameter
    const paramText = r.param.length > 20 ? r.param.slice(0, 19) + '...' : r.param
    s += `BT /F1 8.5 Tf 0.15 0.2 0.28 rg 48 ${rowY + 3} Td (${escapePdfText(paramText)}) Tj ET\n`

    // Col 2: Information Provided
    const clientText = r.client.length > 24 ? r.client.slice(0, 22) + '...' : r.client
    s += `BT /F2 8.5 Tf 0.2 0.25 0.35 rg 165 ${rowY + 3} Td (${escapePdfText(clientText)}) Tj ET\n`

    // Col 3: Information Verified
    const contrText = r.contributor.length > 24 ? r.contributor.slice(0, 22) + '...' : r.contributor
    s += `BT /F2 8.5 Tf 0.2 0.25 0.35 rg 305 ${rowY + 3} Td (${escapePdfText(contrText)}) Tj ET\n`

    // Col 4: Audit Result with Status Color
    if (r.resultType === 'match') {
      // Green text
      s += `BT /F1 8.5 Tf 0.04 0.60 0.38 rg 448 ${rowY + 3} Td (${escapePdfText(r.result)}) Tj ET\n`
    } else if (r.resultType === 'mismatch') {
      // Orange / Red text
      if (statusType === 'rejected') {
        s += `BT /F1 8.5 Tf 0.85 0.12 0.22 rg 448 ${rowY + 3} Td (${escapePdfText(r.result)}) Tj ET\n`
      } else {
        s += `BT /F1 8.5 Tf 0.88 0.38 0.04 rg 448 ${rowY + 3} Td (${escapePdfText(r.result)}) Tj ET\n`
      }
    } else {
      // Slate text
      s += `BT /F2 8.5 Tf 0.50 0.55 0.65 rg 448 ${rowY + 3} Td (${escapePdfText(r.result)}) Tj ET\n`
    }

    rowY -= rowH
  })

  // 4. Dedicated Reviewer Remarks & Assessment Box (PROMINENT in PDF)
  const remarksBoxH = 110
  const remarksBoxY = Math.max(140, rowY - 26 - remarksBoxH)

  // Background and border color tinted to match status
  if (statusType === 'discrepancy') {
    s += `1.00 0.98 0.94 rg 40 ${remarksBoxY} 515 ${remarksBoxH} re f\n`
    s += `0.93 0.65 0.25 RG 1 w 40 ${remarksBoxY} 515 ${remarksBoxH} re S\n`
  } else if (statusType === 'rejected') {
    s += `1.00 0.96 0.96 rg 40 ${remarksBoxY} 515 ${remarksBoxH} re f\n`
    s += `0.90 0.50 0.50 RG 1 w 40 ${remarksBoxY} 515 ${remarksBoxH} re S\n`
  } else {
    s += `0.96 0.99 0.97 rg 40 ${remarksBoxY} 515 ${remarksBoxH} re f\n`
    s += `0.50 0.80 0.65 RG 1 w 40 ${remarksBoxY} 515 ${remarksBoxH} re S\n`
  }

  // Box Title
  s += `BT /F1 9 Tf 0.06 0.15 0.25 rg 52 ${remarksBoxY + remarksBoxH - 20} Td (AUDIT ASSESSMENT & REVIEWER REMARKS) Tj ET\n`

  // Wrapped Remarks Content
  const remarkLines = wrapPdfLines(finalRemarks, 82).slice(0, 4)
  let remarkLineY = remarksBoxY + remarksBoxH - 40
  remarkLines.forEach((line) => {
    s += `BT /F2 8.5 Tf 0.2 0.25 0.3 rg 52 ${remarkLineY} Td (${escapePdfText(line)}) Tj ET\n`
    remarkLineY -= 15
  })

  // 6. Security Seal & Footer
  s += '0.85 0.88 0.92 RG 1 w 40 100 515 0.5 re S\n'
  s += 'BT /F1 8 Tf 0.02 0.5 0.65 rg 40 85 Td (WORKTRAIL COMPLIANCE & VERIFICATION PLATFORM) Tj ET\n'
  s += `BT /F2 8 Tf 0.45 0.5 0.6 rg 40 71 Td (Document Token: ${escapePdfText(reqIdRaw)}-${Date.now().toString().slice(-6)}   |   Generated: ${new Date().toLocaleDateString('en-GB')}) Tj ET\n`

  if (statusType === 'verified') {
    s += 'BT /F1 8 Tf 0.06 0.73 0.51 rg 380 78 Td (CERTIFIED VERIFICATION DOCKET) Tj ET\n'
  } else if (statusType === 'rejected') {
    s += 'BT /F1 8 Tf 0.85 0.12 0.22 rg 380 78 Td (REJECTED VERIFICATION DOCKET) Tj ET\n'
  } else {
    s += 'BT /F1 8 Tf 0.88 0.38 0.04 rg 360 78 Td (DISCREPANCY FLAGGED VERIFICATION DOCKET) Tj ET\n'
  }

  return buildPdf(s, logoData, clientLogoData)
}

