import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  User,
  Briefcase,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Send,
  X,
  Check,
  Layers,
  FileCheck,
  MessageSquare,
  CheckCheck,
  Scale,
  Building,
  FileText,
  Download,
  ExternalLink,
  Code,
  File,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../useAuth';
import { API_ENDPOINTS, getAPI_HEADER } from '../endpoint';
import { type VerificationRecord } from './CandidateVerificationForm';
import {
  getLogoImageData,
  getClientLogoData,
  buildCandidatePdf
} from './pdf-utils';
import axios from 'axios';

// Helper to detect if a value is a media, image, data URI, or document URL
export const isDocumentOrMediaUrl = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  const v = val.trim();
  if (v.startsWith('data:image/') || v.startsWith('data:application/pdf')) return true;
  if (/^https?:\/\//i.test(v)) {
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|doc|docx|csv|xlsx)($|\?)/i.test(v)) return true;
    if (
      v.includes('/uploads/') ||
      v.includes('/documents/') ||
      v.includes('/files/') ||
      v.includes('/loa/') ||
      v.includes('drive.google.com')
    ) {
      return true;
    }
  }
  return false;
};

// Single API endpoint containing both client requests and contributor records
const REVIEW_CLIENT_DATA_API_URL =
  (API_ENDPOINTS as any).reviewClientData;

// Facilitator Comments Update API endpoint

export interface FieldVerificationState {
  verified: boolean | null; // true = Yes, false = No, null = unselected
  remarks?: string;
  showRemarksInput?: boolean;
}

export type FieldMatchStatus = 'match' | 'mismatch' | 'missing';

export const calculateFieldMatch = (clientVal: any, contributorVal: any): FieldMatchStatus => {
  const c = String(clientVal ?? '').trim().toLowerCase();
  const r = String(contributorVal ?? '').trim().toLowerCase();

  const isEmpty = (s: string) =>
    !s ||
    s === '—' ||
    s === 'not recorded' ||
    s === 'not provided' ||
    s === 'record not found' ||
    s === 'data not found' ||
    s === 'null' ||
    s === 'undefined' ||
    s === 'none' ||
    s === 'none reported';

  if (isEmpty(c) || isEmpty(r)) {
    return 'missing';
  }
  if (c === r) {
    return 'match';
  }
  // Normalization for dates: 2024-05-10 vs 2024/05/10 etc.
  if (c.replace(/[-/\s]/g, '') === r.replace(/[-/\s]/g, '')) {
    return 'match';
  }
  if (c.includes(r) || r.includes(c)) {
    return 'match';
  }
  return 'mismatch';
};

// Format camelCase / snake_case / PascalCase into Title Case
export const formatFieldLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

export const getFieldIcon = (key: string) => {
  const k = key.toLowerCase();
  if (k.includes('date') || k.includes('year') || k.includes('time') || k.includes('doj') || k.includes('dol'))
    return Calendar;
  if (k.includes('email') || k.includes('mail')) return Mail;
  if (k.includes('phone') || k.includes('mobile') || k.includes('contact')) return Phone;
  if (k.includes('emp') || k.includes('code') || k.includes('id') || k.includes('uan') || k.includes('pan') || k.includes('aadhar'))
    return Building2;
  if (k.includes('role') || k.includes('desig') || k.includes('job') || k.includes('position') || k.includes('title'))
    return Briefcase;
  if (k.includes('dept') || k.includes('department') || k.includes('division') || k.includes('team')) return Layers;
  if (k.includes('company') || k.includes('org') || k.includes('contributor') || k.includes('verifier'))
    return Building;
  if (k.includes('loa') || k.includes('doc') || k.includes('file') || k.includes('certificate') || k.includes('attachment'))
    return FileText;
  if (k.includes('salary') || k.includes('ctc') || k.includes('amount') || k.includes('price') || k.includes('fee'))
    return Scale;
  if (k.includes('status') || k.includes('rehire') || k.includes('eligible') || k.includes('verified'))
    return CheckCircle2;
  if (k.includes('behaviour') || k.includes('conduct') || k.includes('police') || k.includes('criminal'))
    return ShieldCheck;
  if (k.includes('name') || k.includes('father') || k.includes('gender') || k.includes('candidate')) return User;
  return FileCheck;
};

// Helper to check for missing/null/empty contributor data
export const cleanContrDisplayVal = (val: any): string => {
  if (val === undefined || val === null) return 'Data Not Found';
  const s = String(val).trim();
  if (
    !s ||
    s === 'NULL' ||
    s === 'null' ||
    s === '—' ||
    s === '-' ||
    s === 'Record Not Found' ||
    s === 'Data Not Found' ||
    s === 'Record Not Found in Contributor DB'
  ) {
    return 'Data Not Found';
  }
  return s;
};

// Build the comparison fields list dynamically from API data - REMOVE STANDARD FIELDS, only use keys from API
export const getComparisonFields = (clientRec: VerificationRecord | null | undefined, contr: any | null) => {
  const cRec = clientRec || ({} as VerificationRecord);

  // Fields to ignore, so only relevant API fields are compared (all API fields except these)
  const IGNORED_KEYS = new Set([
    'id',
    'customfields',
    'dynamicdata',
    'fieldchecks',
    'created_at',
    'updated_at',
    'deleted_at',
    'inrecyclebin',
    'isdownloaded',
    'downloadedat',
    'downloadedby',
    'verifiedat',
    'verifieddate',
    'verifiedtime',
    'status',
    'amount',
    'transactionid',
    'paymentid',
    'orderid',
    'verifierid',
    'verifiercode',
    'verifiercategory',
    'uploadedfilescount',
    'remarks',
    'clientemail',
    'submittedby',
    'submittedat',
    'requestid',
    'contributor',
    'verifiername',
    'verificationtype'
    // no field aliases here, so ALL data keys from API included except internal bookkeeping ones
  ]);

  // Gather dynamic fields from all keys in customFields, dynamicData, and root
  const clientRaw: Record<string, any> = {
    ...(cRec.customFields || {}),
    ...(cRec.dynamicData || {}),
    ...cRec
  };

  const contrRaw: Record<string, any> = {
    ...(contr?.customFields || {}),
    ...(contr?.dynamicData || {}),
    ...(contr || {})
  };

  // Identify the union set of all keys present in either client or contributor records,
  // but only those not in IGNORED_KEYS
  const allDynamicKeys = new Set<string>();
  Object.keys(clientRaw).forEach((k) => {
    if (!IGNORED_KEYS.has(k.toLowerCase()) && typeof clientRaw[k] !== 'object' && clientRaw[k] !== undefined) {
      allDynamicKeys.add(k);
    }
  });
  Object.keys(contrRaw).forEach((k) => {
    if (!IGNORED_KEYS.has(k.toLowerCase()) && typeof contrRaw[k] !== 'object' && contrRaw[k] !== undefined) {
      allDynamicKeys.add(k);
    }
  });

  const dynamicFields = Array.from(allDynamicKeys).map((key) => {
    const cVal = clientRaw[key] != null && clientRaw[key] !== '' ? String(clientRaw[key]) : '—';
    const rVal = cleanContrDisplayVal(contrRaw[key]);
    return {
      id: key,
      label: formatFieldLabel(key),
      contributorVal: rVal,
      clientVal: cVal,
      icon: getFieldIcon(key),
      isDynamic: true
    };
  });

  return dynamicFields;
};

// Flexible JSON parser to extract Client Claim and Contributor Official Data
function parseIncomingJson(raw: any): { clientRec: VerificationRecord | null; contrRec: any | null; rawJson: any } {
  if (!raw || typeof raw !== 'object') {
    return { clientRec: null, contrRec: null, rawJson: raw };
  }

  let clientObj: any = null;
  let contrObj: any = null;

  // Check if raw is an array of 4-column SQL rows: [{ ContributorColumn, ContributorData, ClientColumn, ClientData }, ...]
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : null;
  if (list && list.length > 0 && (list[0].ClientColumn !== undefined || list[0].ContributorColumn !== undefined)) {
    const cMap: Record<string, any> = {};
    const rMap: Record<string, any> = {};

    list.forEach((row: any) => {
      if (row.ClientColumn) {
        cMap[row.ClientColumn] = row.ClientData;
      }
      if (row.ContributorColumn) {
        rMap[row.ContributorColumn] = row.ContributorData;
      }
    });

    clientObj = cMap;
    contrObj = rMap;
  } else {
    let target = Array.isArray(raw) ? raw[0] : raw;
    if (!target || typeof target !== 'object') {
      return { clientRec: null, contrRec: null, rawJson: raw };
    }

    // Check if target has explicit split keys
    clientObj = target.client || target.clientData || target.clientRecord || target.claim || null;
    contrObj =
      target.contributor ||
      target.contributorData ||
      target.contributorRecord ||
      target.masterRecord ||
      target.officialData ||
      null;

    if (!clientObj && !contrObj) {
      clientObj = target;
      contrObj = null;
    } else if (!clientObj && contrObj) {
      clientObj = contrObj;
    }
  }

  if (!clientObj) {
    return { clientRec: null, contrRec: contrObj, rawJson: raw };
  }

  // Don't do data transformation here, just use the API record structure so all fields are preserved and dynamic.
  const clientRec: VerificationRecord = {
    ...clientObj,
    id: clientObj.id || clientObj.Sno || clientObj.RequestId || clientObj.EmployeeCode || 'REC-1',
    requestId: clientObj.RequestId || clientObj.requestId || clientObj.OrderID || clientObj.orderId || 'VR-2026',
    employeeId: clientObj.employeeId || clientObj.EmployeeId || clientObj.EmployeeCode || clientObj.employeeCode || '',
    customFields: clientObj,
    dynamicData: clientObj,
    status: clientObj.Status || clientObj.status || 'Pending'
    // Additional fields for controlled fields in rest of code (if needed for completeness),
    // but we don't map static fields anymore.
  };

  return { clientRec, contrRec: contrObj, rawJson: raw };
}

/**
 * ServiceRequestReview Component
 * Shows only dynamic fields from the API, no standard fields
 */
const ServiceRequestReview: React.FC<any> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Restrict contributor role from accessing review
  const roleLower = (user?.Usertype || '').toLowerCase().trim().replace(/[\s_-]+/g, '');
  const isContributorRole =
    roleLower === 'contributor' ||
    roleLower === 'contributoradmin' ||
    roleLower === 'contributoruser' ||
    roleLower === 'admincontributor' ||
    roleLower.includes('contributor');

  useEffect(() => {
    if (isContributorRole) {
      navigate('/ServiceRequest', { replace: true });
    }
  }, [isContributorRole, navigate]);

  // Extract contributor & employeeCode from props or location state
  const contributorFromProps =
    props.contributor ||
    (props.record && (props.record.Contributor || props.record.contributor)) ||
    (location.state &&
      ((location.state as any).contributor ||
        (location.state as any).record?.Contributor ||
        (location.state as any).record?.contributor)) ||
    '';

  const employeeCodeFromProps =
    props.employeeCode ||
    (props.record && (props.record.EmployeeCode || props.record.employeeCode)) ||
    (location.state &&
      ((location.state as any).employeeCode ||
        (location.state as any).record?.EmployeeCode ||
        (location.state as any).record?.employeeCode)) ||
    '';

  const initialId =
    searchParams.get('id') ||
    searchParams.get('requestId') ||
    searchParams.get('employeeCode') ||
    (location.state as any)?.recordId ||
    (location.state as any)?.record?.id ||
    (location.state as any)?.record?.requestId ||
    employeeCodeFromProps ||
    '';

  const [selectedRecordId, setSelectedRecordId] = useState<string>(initialId);
  const [inputRecordId, setInputRecordId] = useState<string>(initialId);

  // Core Data States
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [contributorData, setContributorData] = useState<any | null>(null);
  const [rawApiResponse, setRawApiResponse] = useState<any | null>(null);

  const [loadingRecord, setLoadingRecord] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchTimestamp, setFetchTimestamp] = useState<string | null>(null);
  const [fetchHttpStatus, setFetchHttpStatus] = useState<number | null>(null);

  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'sideBySide' | 'jsonView' | 'documentPreview'>('sideBySide');
  const [filterMode, setFilterMode] = useState<'all' | 'matches' | 'mismatches' | 'missing' | 'unreviewed'>('all');
  const [searchFieldQuery, setSearchFieldQuery] = useState<string>('');

  // Field Verification States
  const [fieldChecks, setFieldChecks] = useState<Record<string, FieldVerificationState>>({});
  const [actionStatus, setActionStatus] = useState<VerificationRecord['status'] | 'Found Discrepancy' | string>('Pending');
  const [overallRemarks, setOverallRemarks] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUpdatingComments, setIsUpdatingComments] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // UI Preview & Feedback
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('Document Preview');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Appeal Modal & Email State
  const [isAppealModalOpen, setIsAppealModalOpen] = useState<boolean>(false);
  const [appealRecipient, setAppealRecipient] = useState<string>('');
  const [appealSubject, setAppealSubject] = useState<string>('');
  const [appealBody, setAppealBody] = useState<string>('');
  const [appealSending, setAppealSending] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleDownloadJson = (data: any, name: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name || 'record'}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('JSON file downloaded successfully!', 'success');
    } catch {
      showToast('Failed to download JSON', 'error');
    }
  };

  // Main API Fetch function
  const fetchReviewClientData = useCallback(
    async (contributorVal: string, employeeCodeVal: string) => {
      setLoadingRecord(true);
      setFetchError(null);

      const payload: any = {};
      if (contributorVal) payload.contributor = contributorVal;
      if (employeeCodeVal) payload.employeeCode = employeeCodeVal;

      // If neither is present, try fallback from state or prompt
      if (!payload.contributor && !payload.employeeCode) {
        setLoadingRecord(false);
        setFetchError('Missing contributor and employeeCode. Please provide an Employee ID.');
        return;
      }

      try {
        // AXIOS IMPLEMENTATION
        const res = await axios.post(
          REVIEW_CLIENT_DATA_API_URL,
          JSON.stringify(payload),
          {
            headers: getAPI_HEADER()
          }
        );

        // Note: axios throws for non-2xx responses
        setFetchHttpStatus(res.status);

        const data = res.data;
        setRawApiResponse(data);
        setFetchTimestamp(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );

        const parsed = parseIncomingJson(data);
        if (parsed.clientRec) {
          setRecord(parsed.clientRec);
          setContributorData(parsed.contrRec);
          setActionStatus(parsed.clientRec.status || 'Pending');
          setOverallRemarks(
            parsed.clientRec.remarks ||
            (parsed.clientRec as any).FacilitatorComments ||
            (parsed.clientRec as any).facilitatorComments ||
            ''
          );
        } else {
          setFetchError('No candidate verification record found in API response.');
        }
      } catch (err: any) {
        setFetchHttpStatus(err?.response?.status ?? null);
        setFetchError(
          (
            err.response?.data?.message ||
            err?.message ||
            'Failed to fetch review data from API.'
          )
        );
      } finally {
        setLoadingRecord(false);
      }
    },
    []
  );

  // Initialize from directly passed JSON if available (props.data / location.state.record / props.record)
  useEffect(() => {
    const directJson =
      props.data ||
      props.jsonData ||
      (location.state as any)?.data ||
      (location.state as any)?.jsonData ||
      (location.state as any)?.record ||
      props.record ||
      null;

    if (directJson) {
      setRawApiResponse(directJson);
      const parsed = parseIncomingJson(directJson);
      if (parsed.clientRec) {
        setRecord(parsed.clientRec);
        setContributorData(parsed.contrRec);
        setActionStatus(parsed.clientRec.status || 'Pending');
        setOverallRemarks(
          parsed.clientRec.remarks ||
          (parsed.clientRec as any).FacilitatorComments ||
          (parsed.clientRec as any).facilitatorComments ||
          ''
        );
        setLoadingRecord(false);

        // If directJson did not include contributor master records, query live API
        if (!parsed.contrRec) {
          const contr = contributorFromProps || (location.state as any)?.contributor || parsed.clientRec.verifierName || 'Securitas';
          const empCode = employeeCodeFromProps || selectedRecordId || parsed.clientRec.employeeId;
          if (contr && empCode && empCode !== '—') {
            fetchReviewClientData(contr, empCode);
          }
        }
        return;
      }
    }

    const contr = contributorFromProps || (location.state as any)?.contributor;
    const empCode = employeeCodeFromProps || selectedRecordId ;
    fetchReviewClientData(contr, empCode);
  }, [contributorFromProps, employeeCodeFromProps, selectedRecordId, props.data, props.record, location.state, fetchReviewClientData]);

  // Only DYNAMIC FIELDS from API are shown; no standard static fields
  const comparisonFields = useMemo(() => {
    if (!record) return [];
    return getComparisonFields(record, contributorData);
  }, [record, contributorData]);

  // Filtered fields based on search & filter tabs
  const displayedFields = useMemo(() => {
    return comparisonFields.filter((f) => {
      const matchStatus = calculateFieldMatch(f.clientVal, f.contributorVal);
      const isVerified = fieldChecks[f.id]?.verified;

      // Filter Mode
      if (filterMode === 'matches' && matchStatus !== 'match') return false;
      if (filterMode === 'mismatches' && matchStatus !== 'mismatch') return false;
      if (filterMode === 'missing' && matchStatus !== 'missing') return false;
      if (filterMode === 'unreviewed' && isVerified != null) return false;

      // Search Query
      if (searchFieldQuery.trim()) {
        const q = searchFieldQuery.toLowerCase();
        const matchLabel = f.label.toLowerCase().includes(q);
        const matchClient = String(f.clientVal || '').toLowerCase().includes(q);
        const matchContr = String(f.contributorVal || '').toLowerCase().includes(q);
        if (!matchLabel && !matchClient && !matchContr) return false;
      }

      return true;
    });
  }, [comparisonFields, filterMode, searchFieldQuery, fieldChecks]);

  // Statistics
  const stats = useMemo(() => {
    const total = comparisonFields.length || 1;
    let exactMatches = 0;
    let mismatches = 0;
    let missing = 0;

    comparisonFields.forEach((f) => {
      const s = calculateFieldMatch(f.clientVal, f.contributorVal);
      if (s === 'match') exactMatches++;
      else if (s === 'mismatch') mismatches++;
      else missing++;
    });

    const reviewedCount = Object.values(fieldChecks).filter((c) => c.verified !== null).length;
    const verifiedYes = Object.values(fieldChecks).filter((c) => c.verified === true).length;
    const verifiedNo = Object.values(fieldChecks).filter((c) => c.verified === false).length;

    const matchPercent = Math.round((exactMatches / total) * 100);
    const auditCompletionPercent = Math.round((reviewedCount / total) * 100);

    return {
      total: comparisonFields.length,
      exactMatches,
      mismatches,
      missing,
      reviewedCount,
      verifiedYes,
      verifiedNo,
      matchPercent,
      auditCompletionPercent
    };
  }, [comparisonFields, fieldChecks]);

  // Field Verification Toggles
  const handleToggleField = (fieldId: string, verifiedVal: boolean) => {
    setFieldChecks((prev) => {
      const current = prev[fieldId]?.verified;
      const isSame = current === verifiedVal;
      return {
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          verified: isSame ? null : verifiedVal,
          showRemarksInput: !isSame && verifiedVal === false ? true : prev[fieldId]?.showRemarksInput
        }
      };
    });
  };

  const handleFieldRemarksChange = (fieldId: string, remarks: string) => {
    setFieldChecks((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        remarks
      }
    }));
  };

  const toggleRemarksInput = (fieldId: string) => {
    setFieldChecks((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        showRemarksInput: !prev[fieldId]?.showRemarksInput
      }
    }));
  };

  const handleMarkAll = (verifiedVal: boolean) => {
    const updated: Record<string, FieldVerificationState> = {};
    comparisonFields.forEach((f) => {
      updated[f.id] = {
        verified: verifiedVal,
        remarks: fieldChecks[f.id]?.remarks || '',
        showRemarksInput: !verifiedVal
      };
    });
    setFieldChecks(updated);
    showToast(
      verifiedVal ? 'All fields marked as Verified / Matched!' : 'All fields flagged as Mismatched!',
      verifiedVal ? 'success' : 'info'
    );
  };

  const handleResetChecks = () => {
    setFieldChecks({});
    showToast('All field verifications reset.', 'info');
  };

  // --- Begin: UpdateFinalReport Helper ---
  // Helper to call UpdateFinalReport endpoint
  const updateFinalReport = async ({
    contributor,
    employeeCode,
    status,
    downloadStatus,
  }: {
    contributor: string;
    employeeCode: string;
    status: string;
    downloadStatus: string | number;
  }) => {
    try {
      const payload = {
        Contributor: contributor,
        EmployeeCode: employeeCode,
        Status: status,
        DownloadStatus: downloadStatus,
      };
      console.log(payload);
      // axios implementation
      const res = await axios.post(
        API_ENDPOINTS.UpdateFinalReport,
        JSON.stringify(payload),
        {
          headers: getAPI_HEADER()
        }
      );
      // axios throws for bad responses
      return res.data;
    } catch (err: any) {
      throw err;
    }
  };
  // --- End: UpdateFinalReport Helper ---

  // Helper to extract resolved employeeCode from record, contributor data, props, or state
  const getResolvedEmployeeCode = useCallback((): string => {
    return (
      (record as any)?.EmployeeCode ||
      (record as any)?.employeeCode ||
      (record?.employeeId && record.employeeId !== '—' ? record.employeeId : '') ||
      (contributorData && (contributorData.EmployeeCode || contributorData.employeeId || contributorData.empCode)) ||
      employeeCodeFromProps ||
      selectedRecordId ||
      ''
    );
  }, [record, contributorData, employeeCodeFromProps, selectedRecordId]);

  // Helper to call FacilitatorCommentsUpdate endpoint
  const updateFacilitatorCommentsApi = async (empCode: string, comments: string) => {
    if (!empCode) return false;
    try {
      const payload = {
        employeeCode: empCode,
        facilitatorComments: comments ?? ''
      };
      await axios.post(
        API_ENDPOINTS.FacilitatorCommentsUpdate,
        JSON.stringify(payload),
        {
          headers: getAPI_HEADER()
        }
      );
      return true;
    } catch (err: any) {
      console.error('[ServiceRequestReview] FacilitatorCommentsUpdate failed:', err);
      return false;
    }
  };

  // Direct handler to update comments on the basis of employeeCode
  const handleUpdateCommentsOnly = async () => {
    const employeeCode = getResolvedEmployeeCode();
    if (!employeeCode) {
      showToast('Employee Code is missing. Cannot update facilitator comments.', 'error');
      return;
    }

    setIsUpdatingComments(true);
    try {
      const payload = {
        employeeCode,
        facilitatorComments: overallRemarks || ''
      };
      await axios.post(
        API_ENDPOINTS.FacilitatorCommentsUpdate,
        JSON.stringify(payload),
        {
          headers: getAPI_HEADER()
        }
      );
      showToast(`Facilitator comments updated for Employee ${employeeCode}!`, 'success');
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              remarks: overallRemarks,
              FacilitatorComments: overallRemarks
            }
          : null
      );
    } catch (err: any) {
      showToast(
        `Failed to update comments: ${err?.response?.data?.message || err?.message || 'Network error'}`,
        'error'
      );
    } finally {
      setIsUpdatingComments(false);
    }
  };

  // Submit Final Review Decision (general/local update + FacilitatorCommentsUpdate)
  const handleSaveVerification = async () => {
    if (!record) return;
    const employeeCode = getResolvedEmployeeCode();
    if (!employeeCode) {
      showToast('Employee Code is missing. Cannot submit the verification decision.', 'error');
      return;
    }

    setIsUpdating(true);

    try {
      const contributor = contributorFromProps || record.verifierName || '';
      if (!contributor) {
        showToast('Contributor is missing. Cannot submit the verification decision.', 'error');
        return;
      }

      const apiStatus = actionStatus === 'Verified' ? 'Approved' : actionStatus;
      const downloadStatus = actionStatus === 'Appeal' ? 0 : 1;
      await updateFinalReport({
        contributor,
        employeeCode,
        status: apiStatus,
        downloadStatus,
      });

      const commentsUpdated = await updateFacilitatorCommentsApi(employeeCode, overallRemarks || '');
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              status: actionStatus as VerificationRecord['status'],
              remarks: overallRemarks,
              FacilitatorComments: overallRemarks
            }
          : null
      );
      showToast(
        commentsUpdated
          ? `Verification decision recorded as "${actionStatus}"!`
          : `Decision "${actionStatus}" recorded, but facilitator comments could not be updated.`,
        commentsUpdated ? 'success' : 'info'
      );
      navigate('/ServiceRequest');
    } catch (err: any) {
      showToast(
        `Failed to submit verification decision: ${err?.response?.data?.message || err?.message || 'Network error'}`,
        'error'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Verdict buttons stage a decision locally; the submit action persists it.
  const handleApproveAndVerify = () => {
    if (!record) return;
    setActionStatus('Verified');
    showToast('Approve & Verify selected. Click Submit Verification Decision to save it.', 'info');
  };

  const handleRejectRequest = () => {
    if (!record) return;
    setActionStatus('Rejected');
    showToast('Reject Request selected. Click Submit Verification Decision to save it.', 'info');
  };

  const handleMarkDiscrepancy = () => {
    if (!record) return;
    setActionStatus('Found Discrepancy');
    showToast('Found Discrepancy selected. Click Submit Verification Decision to save it.', 'info');
  };

  // Download Dynamic Verification Report PDF Handler
  const handleDownloadPdfReport = async () => {
    if (!record) return;
    setDownloadingPdf(true);

    try {
      const contributor =
        contributorFromProps ||
        record.verifierName ||
        (contributorData && (contributorData.Company || contributorData.Contributor || contributorData.contributor)) ||
        '';
      const employeeCode =
        (record.employeeId !== '—' && record.employeeId) ||
        (contributorData && (contributorData.EmployeeCode || contributorData.employeeId || contributorData.empCode)) ||
        '';

      const [logoData, clientLogoData] = await Promise.all([
        getLogoImageData(),
        getClientLogoData(contributor || record.candidateName || 'Enterprise Client'),
      ]);

      const pdfBytes = buildCandidatePdf(record, logoData, clientLogoData, {
        contributorData,
        status: actionStatus,
        overallRemarks: overallRemarks || record.remarks || '',
        fieldChecks,
        comparisonFields,
        reviewerName: user?.username || user?.EmailID || 'Worktrail Auditor',
        hasDiscrepancy: actionStatus === 'Found Discrepancy' || stats.mismatches > 0
      });

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeIdentifier = (employeeCode || record.requestId || record.candidateName || 'Record')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Candidate_Verification_Report_${safeIdentifier}.pdf`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 1000);

      showToast('Candidate verification report PDF downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('[ServiceRequestReview] Error generating PDF report:', err);
      showToast('Failed to generate verification report PDF. Please try again.', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Open Appeal Email Composer
  const handleOpenAppealModal = () => {
    if (!record) return;
    const contributorName = contributorFromProps || record.verifierName;
    // Note: fallback fields for below are left for completeness though most will be absent if you only use dynamic API fields
    const candidateName = record.candidateName ;
    const employeeCode = record.employeeId  ;
    const reqId = record.requestId || record.id ;
    const reviewerName = user?.username || user?.EmailID ;
    const reviewerEmail = user?.EmailID ;

    // Find contributor contact email if available
    const contrEmail =
      contributorData?.Email ||
      contributorData?.email ||
      contributorData?.Clientemail ||
      '';

    const defaultRecipient = contrEmail && contrEmail !== 'NULL' && contrEmail !== 'null' ? contrEmail : '';
    const subj = `[Urgent Appeal] Missing Employment Data Request - Candidate: ${candidateName} (${employeeCode})`;

    const bodyText = `Dear ${contributorName} HR / Verification Department,

Re: Official Employment Verification Records Request
Candidate Name: ${candidateName}
Employee Code / ID: ${employeeCode}
Reference Request ID: ${reqId}

During our background verification review on Worktrail, official contributor records were not found for this candidate ("Data Not Found").

As the registered Contributor / Employer, we kindly request that you provide the official employment records, tenure confirmation, and clearance details for this candidate so the verification can proceed.

Please reply directly to this email with the verified details or update the candidate record via the Worktrail Contributor portal.

Requested by: ${reviewerName} (${reviewerEmail})
Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
Platform: Worktrail Background Verification System`;

    setAppealRecipient(defaultRecipient);
    setAppealSubject(subj);
    setAppealBody(bodyText);
    setIsAppealModalOpen(true);
  };

  // Send Appeal Email & Record Appeal Status
  const handleSendAppealEmail = async () => {
    if (!record) return;
    setAppealSending(true);

    try {
      const recipient = appealRecipient.trim();
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
        appealSubject
      )}&body=${encodeURIComponent(appealBody)}`;

      // Launch default email client
      window.location.href = mailtoUrl;
      setActionStatus('Appeal');
      showToast('Email client launched. Appeal selected; click Submit Verification Decision to save the status.', 'info');
      setIsAppealModalOpen(false);
    } catch (err: any) {
      showToast(`Error launching email client: ${err?.message || 'Failed to open mail client'}`, 'error');
    } finally {
      setAppealSending(false);
    }
  };

  // Detected Document / LOA: just include any doc-related keys that might exist in dynamic fields
  const detectedDoc = useMemo(() => {
    if (!record) return null;
    const raw: any = {
      ...(record.customFields || {}),
      ...(record.dynamicData || {}),
      ...record,
      ...(contributorData?.customFields || {}),
      ...(contributorData?.dynamicData || {}),
      ...(contributorData || {})
    };
    const val =
      raw.LOA ||
      raw.loa ||
      raw.document ||
      raw.Document ||
      raw.attachment ||
      raw.Attachment ||
      raw.file ||
      raw.fileUrl ||
      raw.LOA_URL;

    if (val && typeof val === 'string' && val.trim().length > 0) {
      return {
        url: val.trim(),
        title: 'Letter of Authorization / Verification Document'
      };
    }
    return null;
  }, [record, contributorData]);

  // Formatted JSON line-by-line viewer
  const renderFormattedJson = (jsonObj: any): React.ReactNode => {
    if (jsonObj === undefined || jsonObj === null) {
      return <span className="text-rose-400  italic">null</span>;
    }
    const jsonStr = typeof jsonObj === 'string' ? jsonObj : JSON.stringify(jsonObj, null, 2);
    const lines = jsonStr.split('\n');

    return (
      <div className=" text-xs leading-relaxed select-text">
        {lines.map((line, idx) => {
          const keyMatch = line.match(/^(\s*)(".*?")(\s*:\s*)(.*)$/);
          if (keyMatch) {
            const [, indent, key, colon, rest] = keyMatch;
            let valElement: React.ReactNode = rest;
            const trimmedVal = rest.trim();
            if (trimmedVal.startsWith('"')) {
              valElement = <span className="text-emerald-300">{rest}</span>;
            } else if (trimmedVal === 'true' || trimmedVal === 'false') {
              valElement = <span className="text-amber-400 font-bold">{rest}</span>;
            } else if (trimmedVal === 'null') {
              valElement = <span className="text-rose-400 italic">{rest}</span>;
            } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?,?$/.test(trimmedVal)) {
              valElement = <span className="text-indigo-300 font-bold">{rest}</span>;
            } else {
              valElement = <span className="text-slate-200">{rest}</span>;
            }
            return (
              <div key={idx} className="flex hover:bg-slate-900/70 px-2 py-0.5 rounded transition-colors group">
                <span className="w-10 shrink-0 text-slate-600 select-none text-right pr-4  text-[11px] group-hover:text-slate-400">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre">
                  {indent}
                  <span className="text-sky-300 font-semibold">{key}</span>
                  <span className="text-slate-400">{colon}</span>
                  {valElement}
                </span>
              </div>
            );
          }
          return (
            <div key={idx} className="flex hover:bg-slate-900/70 px-2 py-0.5 rounded transition-colors group">
              <span className="w-10 shrink-0 text-slate-600 select-none text-right pr-4  text-[11px] group-hover:text-slate-400">
                {idx + 1}
              </span>
              <span className="flex-1 whitespace-pre text-slate-400">{line}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900  pb-24 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-500/20'
              : 'bg-slate-900 text-white shadow-slate-900/20'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-200" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-200" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-200" />}
          <span>{toast.text}</span>
        </div>
      )}

   

      {/* Main Review Canvas */}
      <main className="  space-y-6">
        {/* Loading State */}
        {loadingRecord ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center space-y-4 shadow-sm">
            <RefreshCw className="w-10 h-10 text-[#0680A6] animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Retrieving Candidate Verification Data...</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Connecting to ReviewClientData API for contributor records and matching claims.
            </p>
          </div>
        ) : fetchError && !record ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-10 text-center space-y-4 shadow-sm">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Unable to Load Review Record</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto font-medium">{fetchError}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fetchReviewClientData(contributorFromProps || 'Securitas', selectedRecordId || 'C007645')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Retry Fetch
              </button>
              <button
                type="button"
                onClick={() => navigate('/ServiceRequest')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Back to List
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 2. Hero Candidate Identity & Audit Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left Profile Identity */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white flex items-center justify-center font-extrabold text-lg shadow-md shrink-0">
                    {record?.candidateName
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'CD'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {record?.candidateName || 'Candidate Profile'}
                      </h1>

                      {/* Status Badge - Verified = Green, Rejected = Red, Found Discrepancy = Orange */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                          actionStatus === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : actionStatus === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : actionStatus === 'Found Discrepancy'
                            ? 'bg-orange-50 text-orange-700 border border-orange-300'
                            : actionStatus === 'In Progress'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            actionStatus === 'Verified'
                              ? 'bg-emerald-500'
                              : actionStatus === 'Rejected'
                              ? 'bg-rose-500'
                              : actionStatus === 'Found Discrepancy'
                              ? 'bg-orange-500 animate-pulse'
                              : actionStatus === 'In Progress'
                              ? 'bg-sky-500 animate-pulse'
                              : 'bg-amber-500'
                          }`}
                        />
                        {actionStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1  font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Building2 className="w-3 h-3 text-[#0680A6]" />
                        ID: {record?.employeeId || '—'}
                      </span>

                      <span className="inline-flex items-center gap-1  text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Order: {record?.requestId || '—'}
                      </span>

                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Building className="w-3 h-3 text-slate-400" />
                        Verifier: <strong className="text-slate-800">{record?.verifierName || 'Securitas'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Audit Metrics Bar & Download Button */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70 self-start lg:self-auto">
                  <div className="px-3 py-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Data Health</span>
                    <span className="text-xl font-black text-slate-900">{stats.matchPercent}%</span>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {stats.exactMatches} Matches
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100/70 text-rose-800 border border-rose-200/60">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      {stats.mismatches} Mismatches
                    </span>

                    {stats.missing > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100/70 text-amber-800 border border-amber-200/60">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        {stats.missing} Missing
                      </span>
                    )}
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                  <button
                    type="button"
                    onClick={handleDownloadPdfReport}
                    disabled={downloadingPdf || !record}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0680A6] hover:bg-[#056a8a] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    title="Download candidate verification report PDF with dynamic data"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingPdf ? 'animate-bounce' : ''}`} />
                    <span>{downloadingPdf ? 'Generating...' : 'Download Report'}</span>
                  </button>
                </div>
              </div>

              {/* Progress Completion Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-600">
                  <CheckCheck className="w-4 h-4 text-[#0680A6]" />
                  <span>
                    Audit Completion: <strong>{stats.reviewedCount}</strong> of <strong>{stats.total}</strong> fields verified (
                    {stats.auditCompletionPercent}%)
                  </span>
                </div>

                <div className="w-36 sm:w-64 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#10B981] to-[#5850EC] transition-all duration-300 rounded-full"
                    style={{ width: `${stats.auditCompletionPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* TAB 1: SIDE-BY-SIDE REVIEW VIEW */}
            {activeTab === 'sideBySide' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 3. Toolbar & Filters */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    <span className="text-slate-400 font-extrabold uppercase text-[10px] tracking-wider mr-1">Filter:</span>
                    {[
                      { id: 'all', label: `All Fields (${stats.total})` },
                      { id: 'matches', label: `Matches (${stats.exactMatches})` },
                      { id: 'mismatches', label: `Mismatches (${stats.mismatches})` },
                      { id: 'unreviewed', label: `Pending Review (${stats.total - stats.reviewedCount})` }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterMode(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          filterMode === f.id
                            ? 'bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleMarkAll(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Mark all parameters as verified match"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verify All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkAll(false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Flag all parameters as mismatch"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Flag All</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetChecks}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                      title="Reset all checks"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* 4. Side-by-Side Comparison Container */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                  {/* Column Headers */}
                  <div className="grid grid-cols-1 md:grid-cols-12 bg-gradient-to-r from-[#10B981] to-[#5850EC] border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-white">
                    <div className="md:col-span-4 p-4 flex items-center gap-2 border-r border-white">
                      <User className="w-4 h-4 text-white" />
                      <span>Client Submitted Claim</span>
                      <span className="text-[10px]  px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200 ml-auto">
                        Client Declared
                      </span>
                    </div>

                    <div className="md:col-span-4 p-4 flex items-center justify-center gap-2 border-r border-white text-center">
                      <Scale className="w-4 h-4 text-white" />
                      <span>Audit & Comparison Verdict</span>
                    </div>

                    <div className="md:col-span-4 p-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-white" />
                      <span>Contributor Master Record</span>
                      <span className="text-[10px]  px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 ml-auto">
                        Official DB
                      </span>
                    </div>
                  </div>

                  {/* Comparative Field Rows */}
                  <div className="divide-y divide-slate-100">
                    {displayedFields.length > 0 ? (
                      displayedFields.map((field) => {
                        const IconComponent = field.icon || FileCheck;
                        const matchStatus = calculateFieldMatch(field.clientVal, field.contributorVal);
                        const fieldCheck = fieldChecks[field.id] || { verified: null };
                        const isVerifiedYes = fieldCheck.verified === true;
                        const isVerifiedNo = fieldCheck.verified === false;

                        return (
                          <div
                            key={field.id}
                            className={`grid grid-cols-1 md:grid-cols-12 p-4 sm:p-5 gap-4 transition-colors hover:bg-slate-50/70 ${
                              isVerifiedYes ? 'bg-emerald-50/20' : isVerifiedNo ? 'bg-rose-50/20' : ''
                            }`}
                          >
                            {/* Left Column: Client Claim */}
                            <div className="md:col-span-4 space-y-1.5 md:border-r md:border-slate-100 md:pr-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <IconComponent className="w-3.5 h-3.5 text-slate-400" />
                                <span>{field.label}</span>
                              </div>

                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-900 font-medium break-words flex items-center justify-between gap-2 group">
                                {isDocumentOrMediaUrl(field.clientVal) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewDocUrl(field.clientVal);
                                      setPreviewDocTitle(`${field.label} Preview`);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-[#0680A6] hover:underline font-bold"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>View Attached File</span>
                                  </button>
                                ) : (
                                  <span className="font-semibold">{String(field.clientVal)}</span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleCopyText(String(field.clientVal), `c-${field.id}`)}
                                  className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Copy value"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Center Column: Match Indicator & Verifier Decision Controls */}
                            <div className="md:col-span-4 flex flex-col justify-center items-center gap-2.5 md:border-r md:border-slate-100 md:px-3 text-center">
                              {/* Match Status Badge */}
                              <div className="flex items-center justify-center">
                                {matchStatus === 'match' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Exact Match
                                  </span>
                                ) : matchStatus === 'mismatch' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    Discrepancy Found
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    Missing in One Source
                                  </span>
                                )}
                              </div>

                              {/* Interactive Yes / No Verifier Buttons */}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleField(field.id, true)}
                                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                    isVerifiedYes
                                      ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-600/30'
                                      : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
                                  }`}
                                  title="Verify as correct match"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleField(field.id, false)}
                                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                    isVerifiedNo
                                      ? 'bg-rose-600 text-white shadow-rose-500/25 ring-2 ring-rose-600/30'
                                      : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200'
                                  }`}
                                  title="Flag discrepancy / mismatch"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Flag</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleRemarksInput(field.id)}
                                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                    fieldCheck.remarks
                                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                  }`}
                                  title={fieldCheck.remarks ? `Note: ${fieldCheck.remarks}` : 'Add verifier remark'}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Inline Field Note Input */}
                              {fieldCheck.showRemarksInput && (
                                <div className="w-full max-w-xs mt-1 animate-in fade-in">
                                  <input
                                    type="text"
                                    value={fieldCheck.remarks || ''}
                                    onChange={(e) => handleFieldRemarksChange(field.id, e.target.value)}
                                    placeholder="Enter discrepancy remark..."
                                    className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Right Column: Contributor Master DB */}
                            <div className="md:col-span-4 space-y-1.5 md:pl-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Official DB: {field.label}</span>
                              </div>

                              <div
                                className={`p-3 rounded-xl border text-xs font-medium break-words flex items-center justify-between gap-2 group transition-all ${
                                  field.contributorVal === 'Data Not Found'
                                    ? 'bg-amber-50/40 border-amber-200 text-amber-900 shadow-2xs'
                                    : matchStatus === 'mismatch'
                                    ? 'bg-rose-50/40 border-rose-200/80 text-rose-950 font-semibold'
                                    : 'bg-emerald-50/30 border-emerald-200/70 text-emerald-950 font-semibold'
                                }`}
                              >
                                {field.contributorVal === 'Data Not Found' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Data Not Found</span>
                                  </span>
                                ) : isDocumentOrMediaUrl(field.contributorVal) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewDocUrl(field.contributorVal);
                                      setPreviewDocTitle(`Official ${field.label} Preview`);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline font-bold"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>View Official Doc</span>
                                  </button>
                                ) : (
                                  <span>{String(field.contributorVal)}</span>
                                )}

                                {field.contributorVal !== 'Data Not Found' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(String(field.contributorVal), `r-${field.id}`)}
                                    className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Copy value"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-16 text-center text-slate-400 space-y-2">
                        <FileText className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">No comparison fields match your current filter.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterMode('all');
                            setSearchFieldQuery('');
                          }}
                          className="text-xs text-[#0680A6] font-bold hover:underline cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Final Review Decision & Verdict Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-md space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#0680A6]" />
                        Final Review Verdict & Action
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submit overall verification outcome based on the side-by-side audit findings.
                      </p>
                    </div>

                    {/* Verdict Options: Verified = Green, Found Discrepancy = Orange, Rejected = Red */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApproveAndVerify}
                        disabled={isUpdating || actionStatus === "Verified"}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                          actionStatus === 'Verified'
                            ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-600/30'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                        title="Mark candidate verification as Verified (Approved)"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Verify</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleMarkDiscrepancy}
                        disabled={isUpdating || actionStatus === "Found Discrepancy"}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                          actionStatus === 'Found Discrepancy'
                            ? 'bg-orange-500 text-white shadow-orange-500/25 ring-2 ring-orange-500/30'
                            : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300'
                        }`}
                        title="Flag record with Found Discrepancy"
                      >
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span>Found Discrepancy</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRejectRequest}
                        disabled={isUpdating || actionStatus === "Rejected"}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                          actionStatus === 'Rejected'
                            ? 'bg-rose-600 text-white shadow-rose-500/25 ring-2 ring-rose-600/30'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                        title="Mark candidate verification as Rejected"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Request</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenAppealModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
                        title="Send appeal email to contributor requesting missing records"
                      >
                        <Send className="w-4 h-4 text-amber-600" />
                        <span>Appeal (Email Contributor)</span>
                      </button>
                    </div>
                  </div>

                  {/* Verifier Remarks Textarea with dynamic PDF preview badge */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>Reviewer Assessment Remarks</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Included in PDF Report
                        </span>
                      </span>
                      <span className="text-slate-400 font-normal lowercase">(recorded on audit trail & printed on PDF docket)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={overallRemarks}
                      onChange={(e) => {
                        setOverallRemarks(e.target.value);
                        if (record) {
                          setRecord((prev) => (prev ? { ...prev, remarks: e.target.value } : null));
                        }
                      }}
                      placeholder="e.g. Verified against official contributor records. Tenure and designation match. No integrity concerns noted."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0680A6] focus:bg-white transition-all"
                    />

                    {/* Quick Remark Preset Pills & Update Comments Button */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-400 font-medium mr-1">Quick remark presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const r = 'All employment credentials verified and match official records with no flags.';
                            setOverallRemarks(r);
                            if (record) setRecord((prev) => (prev ? { ...prev, remarks: r } : null));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                        >
                          Verified Clean Match
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const r = 'Discrepancy identified between claimed attributes and official contributor records.';
                            setOverallRemarks(r);
                            if (record) setRecord((prev) => (prev ? { ...prev, remarks: r } : null));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 transition-colors cursor-pointer"
                        >
                          Discrepancy Found
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const r = 'Candidate verification rejected due to unverified employment claims.';
                            setOverallRemarks(r);
                            if (record) setRecord((prev) => (prev ? { ...prev, remarks: r } : null));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
                        >
                          Rejected Claims
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleUpdateCommentsOnly}
                        disabled={isUpdatingComments}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0680A6] border border-sky-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        title="Update facilitator comments for this employee code"
                      >
                        <MessageSquare className={`w-3.5 h-3.5 ${isUpdatingComments ? 'animate-spin' : ''}`} />
                        <span>{isUpdatingComments ? 'Updating Comments...' : 'Update Comments'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Submission Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Status to be saved:</span>
                      <span className={`font-bold underline ${
                        actionStatus === 'Verified'
                          ? 'text-emerald-700'
                          : actionStatus === 'Rejected'
                          ? 'text-rose-700'
                          : actionStatus === 'Found Discrepancy'
                          ? 'text-orange-700'
                          : 'text-slate-800'
                      }`}>
                        {actionStatus}
                      </span>
                      <span>•</span>
                      <span>{stats.reviewedCount} fields verified</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDownloadPdfReport}
                        disabled={downloadingPdf || !record}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
                        title="Download candidate verification audit report as PDF"
                      >
                        <Download className={`w-4 h-4 ${downloadingPdf ? 'animate-bounce' : ''}`} />
                        <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenAppealModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer"
                        title="Draft and send an appeal email to the contributor requesting missing candidate data"
                      >
                        <Send className="w-4 h-4" />
                        <span>Appeal Mail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSaveVerification()}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:bg-[#0680A6] text-white text-xs font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                        <span>{isUpdating ? 'Recording Verdict...' : 'Submit Verification Decision'}</span>
                      </button>
                 
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: JSON PAYLOAD EXPLORER */}
            {activeTab === 'jsonView' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-5 sm:p-7 text-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Code className="w-5 h-5 text-sky-400" />
                        JSON Payload & Structured Data Inspector
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Raw formatted JSON data received for candidate {record?.candidateName} ({record?.employeeId}).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(JSON.stringify(rawApiResponse || { record, contributorData }, null, 2), 'raw-json')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>{copiedId === 'raw-json' ? 'Copied!' : 'Copy JSON'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadJson(rawApiResponse || { record, contributorData }, record?.employeeId || 'payload')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Side-by-side JSON panels if split data exists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    {/* Left: Client JSON */}
                    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 pb-2 border-b border-slate-800">
                        <span className="flex items-center gap-1.5 text-sky-400 uppercase">
                          <User className="w-3.5 h-3.5" />
                          Client Claim Object
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(JSON.stringify(record, null, 2), 'client-json')}
                          className="text-slate-400 hover:text-white"
                          title="Copy client claim JSON"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="max-h-[500px] overflow-y-auto pr-2">
                        {renderFormattedJson(record)}
                      </div>
                    </div>

                    {/* Right: Contributor DB JSON */}
                    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 pb-2 border-b border-slate-800">
                        <span className="flex items-center gap-1.5 text-emerald-400 uppercase">
                          <Building2 className="w-3.5 h-3.5" />
                          Contributor Master Object
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(JSON.stringify(contributorData, null, 2), 'contr-json')}
                          className="text-slate-400 hover:text-white"
                          title="Copy contributor master JSON"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="max-h-[500px] overflow-y-auto pr-2">
                        {renderFormattedJson(contributorData)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 6. Document Preview Modal */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0680A6]" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">{previewDocTitle}</h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold inline-flex items-center gap-1"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewDocUrl(null)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-100 flex items-center justify-center min-h-[400px]">
              {previewDocUrl.endsWith('.pdf') || previewDocUrl.includes('application/pdf') ? (
                <iframe src={previewDocUrl} title="PDF Viewer" className="w-full h-[600px] rounded-2xl border-0" />
              ) : previewDocUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i) || previewDocUrl.startsWith('data:image/') ? (
                <img src={previewDocUrl} alt="Document" className="max-w-full max-h-[600px] object-contain rounded-2xl shadow-sm" />
              ) : (
                <div className="text-center space-y-3 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
                  <File className="w-12 h-12 text-[#0680A6] mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">Preview for this document format is not supported</h4>
                  <p className="text-xs text-slate-500 break-all">{previewDocUrl}</p>
                  <a
                    href={previewDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#031f30] text-white text-xs font-bold hover:bg-[#0680A6] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download / Open File</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Appeal Email Modal */}
      {isAppealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-50 to-white border-b border-amber-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Appeal: Request Contributor Records</h3>
                  <p className="text-xs text-slate-500">Send an official email to the contributor asking for missing candidate records</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAppealModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Info banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-amber-900">
                  <span className="font-bold">Contributor Data Not Found:</span>
                  <p>
                    Official records for candidate <span className="font-semibold">{record?.candidateName}</span> ({record?.employeeId}) were not found in the contributor database. Send this appeal to request that the contributor HR supply the verification data.
                  </p>
                </div>
              </div>

              {/* Recipient Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Contributor Email / Recipient
                </label>
                <input
                  type="email"
                  value={appealRecipient}
                  onChange={(e) => setAppealRecipient(e.target.value)}
                  placeholder="e.g. hr@contributor-company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={appealSubject}
                  onChange={(e) => setAppealSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Email Message Body
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyText(appealBody, 'appeal-body')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedId === 'appeal-body' ? 'Copied!' : 'Copy Body'}</span>
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={appealBody}
                  onChange={(e) => setAppealBody(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono leading-relaxed text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white resize-y"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500">
                Clicking "Send Mail to Contributor" launches your email client with pre-filled details.
              </span>

              <div className="flex items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSendAppealEmail}
                  disabled={appealSending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{appealSending ? 'Launching Mail...' : 'Send Mail to Contributor'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequestReview;
