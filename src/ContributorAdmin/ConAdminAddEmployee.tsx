import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../useAuth";
import axios from "axios";
import {
    Search,
    Users,
    Upload,
    Plus,
    Pencil,
    CheckCircle2,
    XCircle,
    Calendar,
    ArrowLeft,
    Download,
    ShieldAlert,
    Filter,
    FileSpreadsheet,
    Info,
    Sparkles,
    Check,
    AlertCircle
} from "lucide-react";
import { API_ENDPOINTS,getAPI_HEADER } from "../endpoint";

const logApiEndpoint = (endpoint: string) => {
    console.log("[ConAdminAddEmployee] API request:", endpoint);
};

const logApiPayload = (endpoint: string, payload: unknown) => {
    console.log("[ConAdminAddEmployee] API request payload:", endpoint, payload);
};

const logApiResponse = (endpoint: string, response: { status?: number; data?: unknown }) => {
    console.log("[ConAdminAddEmployee] API response:", endpoint, {
        status: response.status,
        data: response.data
    });
};

// Custom button style
const btnClass = "inline-flex items-center justify-center h-9 px-5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:brightness-110 active:scale-[0.98] text-white font-bold text-[11px] tracking-wider uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none outline-none disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed";


// EMPTY SAMPLE DATA - Will be generated dynamically
export const SAMPLE_BULK_ROWS: Record<string, any>[] = [];

function formatDateValue(val: any): string {
    if (val === undefined || val === null || val === "") return "";

    // XLSX with cellDates:true returns actual Date objects
    if (val instanceof Date && !isNaN(val.getTime())) {
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, "0");
        const day = String(val.getDate()).padStart(2, "0");
    
        return `${year}-${month}-${day}`;
    }

    // Excel serial number
    if (typeof val === "number") {
        const excelDate = XLSX.SSF.parse_date_code(val);
    
        if (excelDate) {
            const year = excelDate.y;
            const month = String(excelDate.m).padStart(2, "0");
            const day = String(excelDate.d).padStart(2, "0");
    
            return `${year}-${month}-${day}`;
        }
    }
    const str = String(val).trim();

    if (str.includes("T")) {
        return str.split("T")[0];
    }

    return str;
}

/** Yesterday (local) as YYYY-MM-DD — today and future are not selectable. */
function getMaxPastDate(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isJoiningFieldName(name: string): boolean {
    return /dateofjoining/i.test(name) || (/joining/i.test(name) && !/leaving/i.test(name));
}

function isLeavingFieldName(name: string): boolean {
    return /dateofleaving/i.test(name) || (/leaving/i.test(name) && !/joining/i.test(name));
}

function findJoiningFieldKey(formOrKeys: Record<string, any> | string[]): string | undefined {
    const keys = Array.isArray(formOrKeys) ? formOrKeys : Object.keys(formOrKeys);
    return keys.find((k) => isJoiningFieldName(k));
}

function findLeavingFieldKey(formOrKeys: Record<string, any> | string[]): string | undefined {
    const keys = Array.isArray(formOrKeys) ? formOrKeys : Object.keys(formOrKeys);
    return keys.find((k) => isLeavingFieldName(k));
}

function validateJoiningLeavingDate(
    name: string,
    value: string,
    currentForm: Record<string, any>,
    displayLabel: string
): string {
    const val = typeof value === "string" ? value.trim() : value ? String(value).trim() : "";
    const maxPast = getMaxPastDate();

    if (isJoiningFieldName(name)) {
        if (!val) return `${displayLabel} is required`;
        if (isNaN(new Date(val).getTime())) return "Please select a valid date";
        if (val > maxPast) return `${displayLabel} must be before today`;
        return "";
    }

    if (isLeavingFieldName(name)) {
        if (!val) return "";
        if (isNaN(new Date(val).getTime())) return "Please select a valid date";
        if (val > maxPast) return `${displayLabel} must be before today`;
        const joiningKey = findJoiningFieldKey(currentForm);
        const joiningVal = joiningKey
            ? String(currentForm[joiningKey] || "").trim()
            : "";
        if (joiningVal && val < joiningVal) {
            return `${displayLabel} cannot be before date of joining`;
        }
        return "";
    }

    return "";
}

const sanitizeInput = (name: string, value: string): string => {
    if (/mobile/i.test(name)) {
        return value.replace(/\D/g, "").slice(0, 10);
    }
    if (/salary|amount|annual/i.test(name)) {
        return value.replace(/\D/g, "").slice(0, 12);
    }
    if (/code|no/i.test(name)) {
        return value.toUpperCase().replace(/[^A-Z0-9\-_/]/g, "").slice(0, 25);
    }
    if (/name/i.test(name)) {
        return value.replace(/[^a-zA-Z\s]/g, "");
    }
    return value;
};


function UpdateEmployeeFormV2({
    employeeCode,
    contributor,
    dynamicFields,
    showContributorField,
    showCompanyDropdown,
    initialCompany,
    btnClass,
    onCancel,
    onSuccess,
    toastHandler
}: any) {
    const [fieldConfigs, setFieldConfigs] = useState<any[]>([]);
    const [form, setForm] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useEffect(() => {
        async function fetchEditData() {
            setLoading(true);
            try {
                // Build request body for API: EmployeeCode and Contributor
                const reqBody: Record<string, string> = {};
                reqBody["EmployeeCode"] = employeeCode;
                reqBody["Contributor"] = contributor;
                logApiEndpoint(API_ENDPOINTS.ContributorEditData);
                logApiPayload(API_ENDPOINTS.ContributorEditData, reqBody);
                const { data } = await axios.post(
                    API_ENDPOINTS.ContributorEditData,
                    reqBody,
                    { headers: getAPI_HEADER() }
                );
                console.log("[ConAdminAddEmployee] API response:", API_ENDPOINTS.ContributorEditData, data);
                if (!data || !Array.isArray(data.data)) {
                    throw new Error(data?.message || data?.error || "Edit data could not be loaded!");
                }
                setFieldConfigs(data.data);
                // Initial form values (also keep EmployeeCode field, even though not shown)
                const initialForm: Record<string, any> = {};
                data.data.forEach((item: any) => {
                    initialForm[item.DBFieldName] = item.DBFieldData;
                });
                initialForm["Contributor"] = contributor;
                setForm(initialForm);
                setTouched({});
                setErrors({});
            } catch (err: any) {
                if (err?.response) logApiResponse(API_ENDPOINTS.ContributorEditData, err.response);
                toastHandler(err?.message || "Failed to load employee data.", "error");
                setFieldConfigs([]);
                setForm({});
            } finally {
                setLoading(false);
            }
        }

        if (employeeCode && contributor) {
            fetchEditData();
        }
        // eslint-disable-next-line
    }, [employeeCode, contributor]);

    const validateField = (name: string, value: any, allForm: any): string => {
        // Try to reuse validation logic for key fields (basic: required except EmployeeCode)
        if (name === "EmployeeCode") return ""; // code always present, not editable
        const cfg = fieldConfigs.find(f => f.DBFieldName === name);
        const displayLabel = cfg?.DisplayFieldName || name;
        const val = typeof value === "string" ? value.trim() : value ? String(value).trim() : "";

        if (isJoiningFieldName(name) || isLeavingFieldName(name)) {
            if (!val) {
                return `${displayLabel} is required`;
            }
            return validateJoiningLeavingDate(name, val, allForm, displayLabel);
        }

        if (!val && !/remarks|comments|optional|issue/i.test(name)) {
            return `${displayLabel} is required`;
        }
        if (/email/i.test(name)) {
            if (val && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
                return "Enter a valid email address";
            }
        }
        if (/mobile/i.test(name)) {
            if (val && !/^[6-9]\d{9}$/.test(val)) {
                return "Enter valid 10-digit mobile";
            }
        }
        if (/date/i.test(name)) {
            if (val) {
                const d = new Date(val);
                if (isNaN(d.getTime())) return `Please select a valid date`;
            }
        }
        return "";
    };

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const sanitized = sanitizeInput(name, value);
        const nxtForm: Record<string, any> = { ...form, [name]: sanitized };

        // If joining changes and leaving is before joining, clear leaving
        if (isJoiningFieldName(name)) {
            const leavingKey = findLeavingFieldKey(nxtForm);
            if (leavingKey && nxtForm[leavingKey] && sanitized && String(nxtForm[leavingKey]) < sanitized) {
                nxtForm[leavingKey] = "";
            }
        }

        setForm(nxtForm);
        if (touched[name]) {
            setErrors(prev => ({ ...prev, [name]: validateField(name, sanitized, nxtForm) }));
        }
        if (isJoiningFieldName(name)) {
            const leavingKey = findLeavingFieldKey(nxtForm);
            if (leavingKey && touched[leavingKey]) {
                setErrors(prev => ({
                    ...prev,
                    [leavingKey]: validateField(leavingKey, nxtForm[leavingKey], nxtForm)
                }));
            }
        }
    };

    const handleBlur = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        setErrors(prev => ({ ...prev, [name]: validateField(name, form[name], form) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validate only fields except EmployeeCode
        const newErrors: Record<string, string> = {};
        const touchedAll: Record<string, boolean> = {};
        fieldConfigs.forEach(field => {
            if (field.DBFieldName === "EmployeeCode") return;
            touchedAll[field.DBFieldName] = true;
            const err = validateField(field.DBFieldName, form[field.DBFieldName], form);
            if (err) newErrors[field.DBFieldName] = err;
        });
        setTouched(touchedAll);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            const firstKey = Object.keys(newErrors)[0];
            toastHandler(`Please correct highlighted: ${newErrors[firstKey]}`, "error");
            setTimeout(() => {
                const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
                if (el) {
                    el.focus();
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 50);
            return;
        }
        setSubmitting(true);
        try {
            // Build payload from fieldConfigs using DBFieldName as key, value from form
            // Always include EmployeeCode field!
            const payload: Record<string, any> = {};
            fieldConfigs.forEach((field: any) => {
                payload[field.DBFieldName] = form[field.DBFieldName];
            });
            payload.EmployeeCode = String(form.EmployeeCode || employeeCode).trim();
            payload["Contributor"] = form.Contributor || contributor;

            // API: send as array (like add), to ContributorData API
            const axiosConfig = {
                headers: getAPI_HEADER(),
                validateStatus: (status: number) => status >= 200 && status < 400
            };

            logApiEndpoint(API_ENDPOINTS.ContributorData);
            logApiPayload(API_ENDPOINTS.ContributorData, [payload]);
            const response = await axios.post(API_ENDPOINTS.ContributorData, [payload], axiosConfig);
            logApiResponse(API_ENDPOINTS.ContributorData, response);

            const results = Array.isArray(response.data?.results) ? response.data.results : [];
            const failedResult = results.find((result: any) => result?.status === "fail");
            if (response.status >= 300 || failedResult) {
                const responseMessage =
                    typeof response.data === "string"
                        ? response.data
                        : response.data?.message || response.data?.error;
                throw new Error(
                    failedResult?.message ||
                    failedResult?.error ||
                    responseMessage ||
                    "The server could not update this employee."
                );
            }

            toastHandler("Record updated successfully!", "success");
            setTimeout(() => onSuccess && onSuccess(), 1000);
        } catch (err: any) {
            toastHandler(err?.message || "Failed to update employee.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="py-10 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-indigo-800 mb-2 animate-pulse">Loading Employee Data...</span>
                <span className="text-slate-400 font-mono text-xs">Please wait</span>
            </div>
        );
    }

    if (!fieldConfigs || fieldConfigs.length === 0) {
        return (
            <div className="py-10 flex flex-col items-center justify-center text-center">
                <span className="text-rose-600 font-bold text-lg mb-2">Could not load employee data!</span>
                <button onClick={onCancel} className="text-indigo-600 font-semibold underline">Back</button>
            </div>
        );
    }

    // Prepare field list for rendering (hide EmployeeCode)
    const visibleFields = fieldConfigs.filter((f: any) => f.DBFieldName !== "EmployeeCode");

    return (
        <form
            className="w-full flex flex-col items-stretch bg-transparent box-border"
            autoComplete="off"
            onSubmit={handleSubmit}
            noValidate
        >
            <h3 className="m-0 text-[1.35rem] font-bold text-slate-800 text-left mb-1">
                Update Employee Details
            </h3>
            <p className="m-0 text-[13px] text-slate-500 text-left mb-6">
                Edit candidate record for registry compliance.
            </p>
            <div className="w-full py-2.5">
                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-600 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                        <span className="inline-block w-[7px] h-[7px] rounded-full mr-2 bg-emerald-500"></span>
                        Employee Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleFields.map((field: any) => {
                            const isTouched = touched[field.DBFieldName];
                            const errMsg = errors[field.DBFieldName];
                            const hasError = Boolean(isTouched && errMsg);
                            const isValid = Boolean(isTouched && !errMsg && form[field.DBFieldName]);
                            const isDate = /date/i.test(field.DBFieldName);
                            const isJoining = isJoiningFieldName(field.DBFieldName);
                            const isLeaving = isLeavingFieldName(field.DBFieldName);
                            const maxPast = getMaxPastDate();
                            const joiningKey = findJoiningFieldKey(form);
                            const joiningVal = joiningKey ? String(form[joiningKey] || "").trim() : "";
                            return (
                                <div
                                    key={field.DBFieldName}
                                    className="flex flex-col gap-1.5 text-left relative"
                                >
                                    <div className="flex items-center justify-between">
                                        <label
                                            htmlFor={`field-${field.DBFieldName}`}
                                            className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                                hasError ? "text-rose-600 font-extrabold" : "text-slate-500"
                                            }`}
                                        >
                                            {field.DisplayFieldName} <span className="text-rose-500">*</span>
                                        </label>
                                        {isValid && (
                                            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 animate-fade-in">
                                                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Valid
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative flex items-center">
                                        <input
                                            id={`field-${field.DBFieldName}`}
                                            name={field.DBFieldName}
                                            type={isDate ? "date" : "text"}
                                            placeholder={field.DisplayFieldName}
                                            value={form[field.DBFieldName] || ""}
                                            onChange={handleFieldChange}
                                            onBlur={() => handleBlur(field.DBFieldName)}
                                            required
                                            min={isLeaving && joiningVal ? joiningVal : undefined}
                                            max={isJoining || isLeaving ? maxPast : undefined}
                                            className={`w-full h-10 rounded-lg px-3 text-sm transition-all ${
                                                hasError
                                                    ? "border-2 border-rose-500 bg-rose-50/20 text-rose-900 placeholder:text-rose-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                                                    : isValid
                                                        ? "border border-emerald-400 bg-emerald-50/10 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                                                        : "border border-slate-200 text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                                            } focus:outline-none ${hasError && !isDate ? "pr-9" : ""}`}
                                        />
                                        {hasError && !isDate && (
                                            <div className="absolute right-3 pointer-events-none text-rose-500">
                                                <AlertCircle className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    {hasError && (
                                        <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-0.5 animate-fade-in">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{errMsg}</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                        {/* {showContributorField && (
                            <div className="flex flex-col gap-[6px] text-left">
                                <label className="text-[11px] font-[750] text-slate-500 uppercase tracking-wider">
                                    Company (Client) <span className="text-rose-500">*</span>
                                </label>
                                {showCompanyDropdown ? (
                                    <select
                                        name="Contributor"
                                        value={form.Contributor || initialCompany}
                                        onChange={handleFieldChange}
                                        className="w-full h-[38px] border-[1.5px] border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white focus:border-[#5850EC] focus:ring-[3px] focus:ring-[#5850EC]/10 outline-none transition-all box-border"
                                        required
                                    >
                                        <option value={initialCompany}>{initialCompany}</option>
                                        <option value="TCS">TCS</option>
                                        <option value="Securitas">Securitas</option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        name="Contributor"
                                        value={form.Contributor || initialCompany}
                                        readOnly
                                        className="w-full h-[38px] border-[1.5px] border-slate-300 rounded-lg px-3 text-sm text-slate-500 bg-slate-100 cursor-not-allowed box-border"
                                        tabIndex={-1}
                                    />
                                )}
                            </div>
                        )} */}
                    </div>
                </div>
            </div>
            <button
                type="submit"
                className={`${btnClass} self-center mx-auto mt-3`}
                disabled={submitting}
            >
                {submitting ? "Updating..." : "Update Employee"}
            </button>
        </form>
    );
}


export default function ConAdminAddEmployee() {
    const { user } = useAuth();
    const [activePanel, setActivePanel] = useState<"bulk" | "new" | "edit" | null>(null);

    // Permission check: Edit option allowed ONLY for Superadmin, Fascilator, and ContributorAdmin
    const userType = (user?.Usertype || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
    const canEdit =
        userType === "superadmin" ||
        userType === "fascilator" ||
        userType === "contributoradmin" ||
        userType === "admincontributor";

    const isSuperAdmin = userType === "superadmin" || userType === "admin";
    const showCompanyDropdown = isSuperAdmin;
    const showContributorField = true;

    const initialCompany = useMemo(() => {
        if (
            user &&
            (user.Usertype === "Contributor" ||
                user.Usertype === "Client" ||
                user.Usertype === "ContributorAdmin" ||
                user.Usertype === "ContributorUser")
        ) {
            return user.CompanyName || "Securitas India";
        }
        return "Securitas India";
    }, [user]);
    const [company, setCompany] = useState(initialCompany);
    useEffect(() => {
        setCompany(initialCompany);
    }, [initialCompany]);

    // Dynamic field config state
    const [dynamicFields, setDynamicFields] = useState<{ DBFieldName: string; DisplayFieldName: string }[]>([]);
    const [dynamicFieldOptions, setDynamicFieldOptions] = useState<{ [k: string]: { label: string; value: string }[] }>({});

    useEffect(() => {
        if (activePanel === "bulk" || activePanel === "new" || activePanel === "edit") {
            (async () => {
                try {
                    const contrib = user?.CompanyName || company || initialCompany;
                    logApiEndpoint(API_ENDPOINTS.ContributorAdminFormDynamic);
                    logApiPayload(API_ENDPOINTS.ContributorAdminFormDynamic, { Contributor: contrib });
                    const resp = await axios.post(
                        API_ENDPOINTS.ContributorAdminFormDynamic,
                        { Contributor: contrib },
                        { headers: getAPI_HEADER() }
                    );
                    logApiResponse(API_ENDPOINTS.ContributorAdminFormDynamic, resp);
                    const data = resp.data;
                    if (Array.isArray(data.data)) {
                        setDynamicFields(data.data);
                    } else {
                        setDynamicFields([]);
                    }
                } catch (e: any) {
                    if (e?.response) logApiResponse(API_ENDPOINTS.ContributorAdminFormDynamic, e.response);
                    else console.error("[ConAdminAddEmployee] API request failed:", API_ENDPOINTS.ContributorAdminFormDynamic, e?.message);
                    setDynamicFields([]);
                }
            })();
        }
        // eslint-disable-next-line
    }, [company, activePanel]);

    // Dynamic form state
    const defaultForm = () => {
        const obj: Record<string, any> = {};
        dynamicFields.forEach(f => {
            obj[f.DBFieldName] = "";
        });
        obj["Contributor"] = initialCompany;
        return obj;
    };

    const [form, setForm] = useState<Record<string, any>>(defaultForm());
    const [editEmployee, setEditEmployee] = useState<any | null>(null);
    const [editEmployeeCode, setEditEmployeeCode] = useState<any | null>(null); // employee code for edit API
    const [submittingNew, setSubmittingNew] = useState(false);
    const [submittingUpdate, setSubmittingUpdate] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    // Bulk upload states
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Table/search states
    const [searchEmployeeCode, setSearchEmployeeCode] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [allEmployeesResults, setAllEmployeesResults] = useState<any[] | null>(null);
    const [allEmployeesLoading, setAllEmployeesLoading] = useState(false);
    const [activeTable, setActiveTable] = useState<"search" | "all" | null>(null);
    const [tableSearchFilter, setTableSearchFilter] = useState("");
    const [tablePage, setTablePage] = useState(1);
    const PAGE_SIZE = 10;

    // Toast notification state
    const [toastState, setToastState] = useState<{ message: string; type: "success" | "error" | "info" | null }>({
        message: "",
        type: null
    });
    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToastState({ message, type });
        setTimeout(() => setToastState({ message: "", type: null }), 3500);
    };

    // Always clear dynamic fields on field config change (panel change)
    useEffect(() => {
        setForm(defaultForm());
        setErrors({});
        setTouched({});
    }, [dynamicFields, activePanel]); // important to reset if fields or panel change

    // Utils: get DisplayFieldName by DBFieldName
    const getDisplayField = (dbField: string) => {
        const f = dynamicFields.find(f => f.DBFieldName === dbField);
        return f ? f.DisplayFieldName : dbField;
    };

    /** Hide list/search results until View/Search is clicked again */
    const clearEmployeeTableView = () => {
        setActiveTable(null);
        setSearchResults(null);
        setAllEmployeesResults(null);
        setTableSearchFilter("");
        setTablePage(1);
        setSearchEmployeeCode("");
    };

    // Handle returning to dashboard — only toolbar, no leftover list data
    const handleBack = () => {
        setActivePanel(null);
        setSelectedFile(null);
        setCompany(initialCompany);
        setDynamicFields([]);
        setErrors({});
        setTouched({});
        setForm(defaultForm());
        setEditEmployee(null);
        setEditEmployeeCode(null);
        setSubmittingNew(false);
        setSubmittingUpdate(false);
        clearEmployeeTableView();
    };

    const openPanel = (panel: "bulk" | "new" | "edit") => {
        clearEmployeeTableView();
        setErrors({});
        setTouched({});
        setActivePanel(panel);
    };

    // Table columns
    const tableColumns = [
        { key: "Sno", label: "S. No.", align: "center" },
        ...(canEdit ? [{ key: "edit", label: "Action", align: "center" }] : []),
        ...dynamicFields.map(f => ({
            key: f.DBFieldName,
            label: f.DisplayFieldName,
            align: "left"
        })),
    ];

    // Form validation
    const validateSingleField = (name: string, value: any, currentForm: any): string => {
        const val = typeof value === "string" ? value.trim() : value ? String(value).trim() : "";
        if (/email/i.test(name)) {
            if (!val) return `${getDisplayField(name)} is required`;
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
                return `Enter a valid email address`;
            }
            return "";
        }
        if (/mobile/i.test(name)) {
            if (!val) return `${getDisplayField(name)} is required`;
            if (!/^[6-9]\d{9}$/.test(val)) {
                return "Enter valid 10-digit mobile";
            }
            return "";
        }
        if (/dateofjoining/i.test(name) || isJoiningFieldName(name)) {
            return validateJoiningLeavingDate(name, val, currentForm, getDisplayField(name));
        }
        if (/dateofleaving/i.test(name) || isLeavingFieldName(name)) {
            if (!val) return "";
            return validateJoiningLeavingDate(name, val, currentForm, getDisplayField(name));
        }
        if (/code|number/i.test(name)) {
            if (!val) return `${getDisplayField(name)} is required`;
            if (val.length < 2) return `${getDisplayField(name)} must be at least 2 chars`;
            if (val.length > 30) return `${getDisplayField(name)} too long`;
            return "";
        }
        if (!val && !/optional|remarks|comments|issue/i.test(name)) {
            return `${getDisplayField(name)} is required`;
        }
        return "";
    };

    const normalizeBulkRow = (row: Record<string, any>, company: string): Record<string, any> => {
        const normalized: Record<string, any> = {};
        dynamicFields.forEach(f => {
            let val = row[f.DisplayFieldName] ?? row[f.DBFieldName] ?? "";
            if (/date/i.test(f.DBFieldName)) val = formatDateValue(val);
            normalized[f.DBFieldName] = val;
        });
        normalized["Contributor"] = company;
        return normalized;
    };

    const readUploadedFile = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array", cellDates: true });
                    const firstSheetName = workbook.SheetNames[0];
                    if (!firstSheetName) return resolve([]);
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
                        defval: "",
                        raw: false,
                        dateNF: "yyyy-mm-dd"
                        });
                    resolve(jsonRows);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    };

    const handleSearch = async () => {
        if (!searchEmployeeCode.trim()) {
            handleAllEmployees();
            return;
        }
        setSearchLoading(true);
        try {
            const codeField = dynamicFields.find(f =>
                /personnumber|employeecode|code/i.test(f.DBFieldName + f.DisplayFieldName)
            );
            const codeKey = codeField ? codeField.DBFieldName : "EmployeeCode";
            const bodyPayload: any = { [codeKey]: searchEmployeeCode.trim() };
            const contributorVal = user?.CompanyName || initialCompany || company;
            if (contributorVal) {
                bodyPayload.Contributor = contributorVal;
            }
            let response;
            try {
                logApiEndpoint(API_ENDPOINTS.ContributorEmpSearch);
                logApiPayload(API_ENDPOINTS.ContributorEmpSearch, bodyPayload);
                response = await axios.post(API_ENDPOINTS.ContributorEmpSearch, bodyPayload, { headers: getAPI_HEADER() });
                logApiResponse(API_ENDPOINTS.ContributorEmpSearch, response);
            } catch (axiosError: any) {
                // If axios throws for HTTP non-2xx, catch and parse response
                if (axiosError.response) {
                    response = axiosError.response;
                    logApiResponse(API_ENDPOINTS.ContributorEmpSearch, response);
                } else {
                    throw axiosError;
                }
            }

            let data: any = response?.data || null;
            const ok = response?.status >= 200 && response?.status < 300;

            if (ok && data) {
                const results = Array.isArray(data.data)
                    ? data.data
                    : data.data && typeof data.data === "object"
                        ? [data.data]
                        : [];
                setSearchResults(results);
                setAllEmployeesResults(null);
                setActiveTable("search");
                setTablePage(1);
                if (results.length === 0) showToast("No employee records found for this code.", "error");
            } else {
                setSearchResults([]);
                setAllEmployeesResults(null);
                setActiveTable("search");
                setTablePage(1);
                const errorMsg = (data && typeof data === "object" && (data.message || data.error))
                    ? (data.message || data.error)
                    : `Employee not found (${response?.status || 404}).`;
                showToast(errorMsg, "error");
            }
        } catch (err: any) {
            if (err?.response) logApiResponse(API_ENDPOINTS.ContributorEmpSearch, err.response);
            else console.error("[ConAdminAddEmployee] API request failed:", API_ENDPOINTS.ContributorEmpSearch, err?.message);
            showToast(err?.message || "Failed to search employee.", "error");
            setSearchResults([]);
            setAllEmployeesResults(null);
            setActiveTable("search");
            setTablePage(1);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAllEmployees = async () => {
        setAllEmployeesLoading(true);
        setTableSearchFilter("");
        setTablePage(1);
        try {
            const contributorVal = (user?.CompanyName || initialCompany || company || "Securitas India").trim();

            let dynResponse;
            try {
                logApiEndpoint(API_ENDPOINTS.ContributorAdminFormDynamic);
                const payload = { Contributor: contributorVal };
                logApiPayload(API_ENDPOINTS.ContributorAdminFormDynamic, payload);
                dynResponse = await axios.post(API_ENDPOINTS.ContributorAdminFormDynamic, payload, { headers: getAPI_HEADER() });
                logApiResponse(API_ENDPOINTS.ContributorAdminFormDynamic, dynResponse);
            } catch (axiosError: any) {
                if (axiosError.response) {
                    dynResponse = axiosError.response;
                    logApiResponse(API_ENDPOINTS.ContributorAdminFormDynamic, dynResponse);
                } else {
                    throw axiosError;
                }
            }
            let dynData: any = dynResponse?.data || null;
            let fetchedDynamicFields: { DBFieldName: string; DisplayFieldName: string }[] = [];
            if (dynResponse?.status >= 200 && dynResponse?.status < 300 && Array.isArray(dynData?.data)) {
                fetchedDynamicFields = dynData.data;
            }
            setDynamicFields(fetchedDynamicFields);

            let empResponse;
            try {
                logApiEndpoint(API_ENDPOINTS.ContributorEmpSearch);
                const payload = { Contributor: contributorVal };
                logApiPayload(API_ENDPOINTS.ContributorEmpSearch, payload);
                empResponse = await axios.post(API_ENDPOINTS.ContributorEmpSearch, payload, { headers: getAPI_HEADER() });
                logApiResponse(API_ENDPOINTS.ContributorEmpSearch, empResponse);
            } catch (axiosError: any) {
                if (axiosError.response) {
                    empResponse = axiosError.response;
                    logApiResponse(API_ENDPOINTS.ContributorEmpSearch, empResponse);
                } else {
                    throw axiosError;
                }
            }
            let empData: any = empResponse?.data || null;
            let results = Array.isArray(empData?.data)
                ? empData.data
                : empData?.data && typeof empData.data === "object"
                    ? [empData.data]
                    : [];
            setAllEmployeesResults(results);
            setSearchResults(null);
            setActiveTable("all");
            setTablePage(1);
            if (results.length > 0) {
                showToast(`Retrieved ${results.length} employee record${results.length === 1 ? "" : "s"}.`, "success");
            } else {
                showToast(`No employee records found for ${contributorVal}.`, "info");
            }
        } catch (err: any) {
            showToast(err?.message || "Failed to load employees. Please check your network connection.", "error");
            setAllEmployeesResults([]);
            setSearchResults(null);
            setActiveTable("all");
            setTablePage(1);
            setActiveTable("all");
        } finally {
            setAllEmployeesLoading(false);
        }
    };

    const handleDownloadExcelSample = () => {
        try {
            const sampleObj1: Record<string, any> = {};
            const sampleObj2: Record<string, any> = {};
            dynamicFields.forEach(f => {
                if (/personnumber|code/i.test(f.DisplayFieldName)) {
                    sampleObj1[f.DisplayFieldName] = "EMP-1001";
                    sampleObj2[f.DisplayFieldName] = "EMP-1002";
                } else if (/name/i.test(f.DisplayFieldName)) {
                    sampleObj1[f.DisplayFieldName] = "Rahul";
                    sampleObj2[f.DisplayFieldName] = "Priya";
                } else if (/joining/i.test(f.DisplayFieldName)) {
                    sampleObj1[f.DisplayFieldName] = "2021-01-15";
                    sampleObj2[f.DisplayFieldName] = "2022-03-10";
                } else if (/leaving/i.test(f.DisplayFieldName)) {
                    sampleObj1[f.DisplayFieldName] = "2023-12-31";
                    sampleObj2[f.DisplayFieldName] = "";
                } else if (/designation|position/i.test(f.DisplayFieldName)) {
                    sampleObj1[f.DisplayFieldName] = "Software Engineer";
                    sampleObj2[f.DisplayFieldName] = "HR";
                } else if (/remark|comments|issue/i.test(f.DisplayFieldName)) {
                    sampleObj1[f.DisplayFieldName] = "No issues";
                    sampleObj2[f.DisplayFieldName] = "";
                } else {
                    sampleObj1[f.DisplayFieldName] = "";
                    sampleObj2[f.DisplayFieldName] = "";
                }
            });
            const dynRows = [sampleObj1, sampleObj2];
            const worksheet = XLSX.utils.json_to_sheet(dynRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sample_Employees");
            XLSX.writeFile(workbook, "employee_bulk_upload_sample_dynamic.xlsx");
            showToast(`Downloaded sample template with dynamic fields!`, "success");
        } catch (err: any) {
            showToast(`Download failed: ${err?.message || "Unknown error"}`, "error");
        }
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("[handleBulkSubmit] Submission started");

        if (!selectedFile) {
            showToast("Please select an Excel file.", "error");
            console.log("[handleBulkSubmit] Client-side error: No file selected, aborting.");
            return;
        }
        setUploading(true);

        try {
            console.log("[handleBulkSubmit] Reading uploaded file...");
            const rawRows = await readUploadedFile(selectedFile);
            console.log("[handleBulkSubmit] Raw rows from file:", rawRows);

            if (!Array.isArray(rawRows) || rawRows.length === 0) {
                const msg = "Excel file is empty. Please use the sample template.";
                console.error("[handleBulkSubmit] Client-side error:", msg);
                throw new Error(msg);
            }

            console.log("[handleBulkSubmit] Normalizing rows with company:", company);
            const normalizedRows = rawRows.map(row => normalizeBulkRow(row, company));
            console.log("Raw Excel Data:", rawRows);
            console.log("Normalized Data:", normalizedRows);
            console.log("[handleBulkSubmit] Normalized rows:", normalizedRows);

            // Find missing required fields except for "middlename"
            const missingRequired = dynamicFields.find(f =>
                normalizedRows.some(r =>
                    !r[f.DBFieldName] &&
                    !/remarks|comments|issue/i.test(f.DBFieldName) &&
                    !/middlename/i.test(f.DBFieldName) // allow null/empty middlename
                )
            );
            if (missingRequired) {
                const msg = `A row is missing required field: "${missingRequired.DisplayFieldName}"`;
                console.log("Current Row:", normalizedRows[0]);
                console.log("Keys:", Object.keys(normalizedRows[0]));
                console.error("[handleBulkSubmit] Client-side error:", msg);
                throw new Error(msg);
            }

            // Check for duplicate code fields as before
            const codeField = dynamicFields.find(f =>
                /personnumber|employeecode|code/i.test(f.DBFieldName + f.DisplayFieldName)
            );
            if (codeField) {
                const codes = normalizedRows.map(r => String(r[codeField.DBFieldName]).trim().toUpperCase());
                const dups = codes.filter((item, idx) => codes.indexOf(item) !== idx);
                if (dups.length > 0) {
                    const msg = `Duplicate ${codeField.DisplayFieldName}(s): ${Array.from(new Set(dups)).join(", ")}`;
                    console.error("[handleBulkSubmit] Client-side error:", msg);
                    throw new Error(msg);
                }
            }



            // Axios POST request
            let response, parsedBody;
            try {
                logApiEndpoint(API_ENDPOINTS.ContributorData);
                logApiPayload(API_ENDPOINTS.ContributorData, normalizedRows);
                response = await axios.post(API_ENDPOINTS.ContributorData, normalizedRows, {
                    headers: getAPI_HEADER(),
                    validateStatus: () => true
                });
                parsedBody = response.data;
                logApiResponse(API_ENDPOINTS.ContributorData, response);
                console.log("[handleBulkSubmit] API response status:", response.status);
                console.log("[handleBulkSubmit] API response body:", parsedBody);
            } catch (err: any) {
                // Log server-side error
                console.error("[handleBulkSubmit] Server-side error: Caught during axios POST:", err);
                if (err?.response) {
                    console.error("[handleBulkSubmit] Server-side error: Response status:", err.response.status);
                    console.error("[handleBulkSubmit] Server-side error: Response data:", err.response.data);
                    logApiResponse(API_ENDPOINTS.ContributorData, err.response);
                }

                let msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Bulk upload failed";
                showToast(msg, "error");
                throw new Error(msg);
            }

            if (response.status < 200 || response.status >= 300) {
                let detail = "";
                if (parsedBody && typeof parsedBody === "object") {
                    detail = parsedBody.message || parsedBody.error || parsedBody.msg || parsedBody.detail;
                } else if (typeof parsedBody === "string" && parsedBody.trim() !== "") {
                    detail = parsedBody;
                }
                // Log full error response for debugging
                console.error("[handleBulkSubmit] Server-side error: Bulk upload failed with status:", response.status);
                console.error("[handleBulkSubmit] Server-side error: Server response (parsedBody):", parsedBody);

                if (response.status === 409) {
                    const conflictMsg = (
                        detail && detail.length < 200 && !detail.startsWith("{")
                            ? `Conflict (409): ${detail}`
                            : "Conflict (409): Duplicate code/number"
                    );
                    showToast(conflictMsg, "error");
                    throw new Error(conflictMsg);
                }
                const failMsg = detail ? `Upload failed (${response.status}): ${detail}` : `Bulk upload failed (${response.status})`;
                showToast(failMsg, "error");
                throw new Error(failMsg);
            }

            console.log(`[handleBulkSubmit] Success: Successfully uploaded ${normalizedRows.length} records!`);
            showToast(`Successfully uploaded ${normalizedRows.length} records!`, "success");
            setSelectedFile(null);
            setTimeout(() => handleBack(), 1200);
        } catch (err: any) {
            // Log the caught error, clarify source if possible
            if (
                err?.message &&
                (
                    err.message.includes("required field") ||
                    err.message.includes("Duplicate") ||
                    err.message.includes("empty") ||
                    err.message.includes("No file selected")
                )
            ) {
                console.error("[handleBulkSubmit] Client-side error:", err);
            } else {
                console.error("[handleBulkSubmit] Server-side error:", err);
            }
            showToast(err?.message || "Bulk upload failed", "error");
        } finally {
            setUploading(false);
            console.log("[handleBulkSubmit] Done.");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const sanitized = sanitizeInput(name, value);
        const updatedForm: Record<string, any> = { ...form, [name]: sanitized };

        if (isJoiningFieldName(name)) {
            const leavingKey = findLeavingFieldKey(updatedForm);
            if (leavingKey && updatedForm[leavingKey] && sanitized && String(updatedForm[leavingKey]) < sanitized) {
                updatedForm[leavingKey] = "";
            }
        }

        setForm(updatedForm);

        if (touched[name]) {
            const fieldError = validateSingleField(name, sanitized, updatedForm);
            setErrors((prev) => ({ ...prev, [name]: fieldError }));
        }
        if (isJoiningFieldName(name)) {
            const leavingKey = findLeavingFieldKey(updatedForm);
            if (leavingKey && touched[leavingKey]) {
                setErrors((prev) => ({
                    ...prev,
                    [leavingKey]: validateSingleField(leavingKey, updatedForm[leavingKey], updatedForm)
                }));
            }
        }
    };

    const handleBlur = (name: string) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const fieldError = validateSingleField(name, form[name], form);
        setErrors((prev) => ({ ...prev, [name]: fieldError }));
    };

    const handleNewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        const allTouched: Record<string, boolean> = {};
        dynamicFields.forEach((f) => {
            allTouched[f.DBFieldName] = true;
            const err = validateSingleField(f.DBFieldName, form[f.DBFieldName], form);
            if (err) {
                newErrors[f.DBFieldName] = err;
            }
        });
        setTouched(allTouched);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            const firstKey = Object.keys(newErrors)[0];
            showToast(`Please correct highlighted: ${newErrors[firstKey]}`, "error");
            setTimeout(() => {
                const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
                if (el) {
                    el.focus();
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 50);
            return;
        }
        setSubmittingNew(true);
        try {
            const normalized = normalizeBulkRow(form, form.Contributor);
            console.log(normalized);
            logApiEndpoint(API_ENDPOINTS.ContributorData);
            logApiPayload(API_ENDPOINTS.ContributorData, [normalized]);
            const response = await axios.post(API_ENDPOINTS.ContributorData, [normalized], {
                headers: getAPI_HEADER(),
                validateStatus: () => true // We'll handle error cases manually
            });
            logApiResponse(API_ENDPOINTS.ContributorData, response);
            let parsedBody: any = response.data;
            const status = response.status;
            if (status < 200 || status >= 300) {
                let detail = "";
                if (parsedBody && typeof parsedBody === "object") {
                    detail = parsedBody.message || parsedBody.error || parsedBody.msg || parsedBody.detail;
                } else if (typeof parsedBody === "string" && parsedBody.trim() !== "") {
                    detail = parsedBody;
                }
                if (status === 409) {
                    throw new Error(
                        detail && detail.length < 200
                            ? `Conflict (409): ${detail}`
                            : `Conflict. Record may already exist.`
                    );
                }
                throw new Error(detail || `Failed to create employee (${status})`);
            }
            showToast("Record created successfully!", "success");
            setErrors({});
            setTouched({});
            setTimeout(() => handleBack(), 1000);
        } catch (err: any) {
            showToast(err?.message || "Submission failed", "error");
        } finally {
            setSubmittingNew(false);
        }
    };

    // Start edit
    const handleEditRow = (row: any) => {
        if (!canEdit) {
            showToast("You do not have permission to edit employee records.", "error");
            return;
        }
        // Try to deduce EmployeeCode from row using dynamicFields
        let codeField = dynamicFields.find(f =>
            /personnumber|employeecode|code/i.test(f.DBFieldName + f.DisplayFieldName)
        );
        let empCode = codeField ? row[codeField.DBFieldName] : row["EmployeeCode"] || row["PersonNumber"];
        if (!empCode) {
            showToast("Cannot obtain EmployeeCode for edit.", "error");
            return;
        }
        setEditEmployee(row);
        setEditEmployeeCode(empCode);
        openPanel("edit");
    };

    function formatDate(val: string | null | undefined) {
        if (!val) return "";
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    const renderTableCell = (colKey: string, val: any) => {
        if (val === null || val === undefined || String(val).trim() === "") {
            return <span className="text-slate-400 font-normal text-xs">-</span>;
        }
        if (/date/i.test(colKey)) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {formatDate(val)}
                </span>
            );
        }
        if (/code|number/i.test(colKey)) {
            return (
                <span className="font-mono text-xs font-semibold text-indigo-900 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200/60">
                    {String(val)}
                </span>
            );
        }
        if (/eligibility|eligible|rehire/i.test(colKey)) {
            const v = String(val).trim().toLowerCase();
            return v === "yes" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Yes
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> No
                </span>
            );
        }
        return <span className="text-xs text-slate-600 font-normal">{String(val)}</span>;
    };

    // Table Render
    const renderTable = (data: any[], title: string) => {
        // search across all dynamic fields
        function rowMatches(row: any, q: string) {
            for (let f of dynamicFields) {
                const v = row[f.DBFieldName];
                if (String(v || "").toLowerCase().includes(q)) return true;
            }
            return false;
        }
        const filteredData = data.filter((row) => {
            if (!tableSearchFilter.trim()) return true;
            const q = tableSearchFilter.toLowerCase();
            return rowMatches(row, q);
        });
        const totalRecords = filteredData.length;
        const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
        const currentPage = Math.min(Math.max(1, tablePage), totalPages);
        const startIdx = (currentPage - 1) * PAGE_SIZE;
        const paginatedData = filteredData.slice(startIdx, startIdx + PAGE_SIZE);
        const showingFrom = totalRecords === 0 ? 0 : startIdx + 1;
        const showingTo = Math.min(startIdx + PAGE_SIZE, totalRecords);

        return (
            <div className="w-full mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden box-border">
                <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800 m-0">{title}</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100/70 text-indigo-700">
                                    {data.length} {data.length === 1 ? "Record" : "Records"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 m-0 mt-0.5">
                                Showing registered employee records in your organization
                            </p>
                        </div>
                    </div>

                    <div className="relative min-w-[220px]">
                        <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter table rows..."
                            value={tableSearchFilter}
                            onChange={(e) => {
                                setTableSearchFilter(e.target.value);
                                setTablePage(1);
                            }}
                            className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left min-w-[1100px]">
                        <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200/80">
                                {tableColumns.map((col) => {
                                    const alignClass = col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left";
                                    return (
                                        <th
                                            key={col.key}
                                            className={`whitespace-nowrap px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider ${alignClass}`}
                                        >
                                            {col.label}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={tableColumns.length} className="px-4 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Users className="w-8 h-8 text-slate-300" />
                                            <p className="text-sm font-medium text-slate-500 m-0">No matching employees found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((row, rowIx) => (
                                    <tr key={rowIx} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                                        {tableColumns.map((col) => {
                                            if (col.key === "Sno") {
                                                return (
                                                    <td key="Sno" className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 text-center font-medium">
                                                        {startIdx + rowIx + 1}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "edit") {
                                                return (
                                                    <td key="edit" className="whitespace-nowrap px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditRow(row)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-semibold text-xs transition-all duration-150 active:scale-95 cursor-pointer border border-indigo-200/60"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                                                            <span>Edit</span>
                                                        </button>
                                                    </td>
                                                );
                                            }
                                            const alignClass = col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left";
                                            return (
                                                <td key={col.key} className={`whitespace-nowrap px-4 py-3 ${alignClass}`}>
                                                    {renderTableCell(col.key, row[col.key])}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalRecords > 0 && (
                    <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-slate-500 m-0">
                            Showing <span className="font-semibold text-slate-700">{showingFrom}</span>
                            {"–"}
                            <span className="font-semibold text-slate-700">{showingTo}</span>
                            {" of "}
                            <span className="font-semibold text-slate-700">{totalRecords}</span>
                            {" · Page "}
                            <span className="font-semibold text-slate-700">{currentPage}</span>
                            {" of "}
                            <span className="font-semibold text-slate-700">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                            >
                                Next
                                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Dynamic Field Rendering (for Add Only - edit is now via UpdateEmployeeFormV2)
    const renderFormField = (
        name: string,
        label: string,
        type: string = "text",
        required: boolean = false,
        options?: { label: string; value: string }[]
    ) => {
        const isTouched = touched[name];
        const errorMsg = errors[name];
        const hasError = Boolean(isTouched && errorMsg);
        const isValid = Boolean(isTouched && !errorMsg && form[name]);
        const isJoining = isJoiningFieldName(name);
        const isLeaving = isLeavingFieldName(name);
        const maxPast = getMaxPastDate();
        const joiningKey = findJoiningFieldKey(form);
        const joiningVal = joiningKey ? String(form[joiningKey] || "").trim() : "";
        return (
            <div className="flex flex-col gap-1.5 text-left relative">
                <div className="flex items-center justify-between">
                    <label
                        htmlFor={`field-${name}`}
                        className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            hasError ? "text-rose-600 font-extrabold" : "text-slate-500"
                        }`}
                    >
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    {isValid && (
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 animate-fade-in">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Valid
                        </span>
                    )}
                </div>
                <div className="relative">
                    {options?.length ? (
                        <select
                            id={`field-${name}`}
                            name={name}
                            value={form[name] || ""}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur(name)}
                            className={`w-full h-10 rounded-lg px-3 text-sm transition-all cursor-pointer ${
                                hasError
                                    ? "border-2 border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                                    : isValid
                                        ? "border border-emerald-400 bg-emerald-50/10 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                                        : "border border-slate-200 text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                            } focus:outline-none`}
                        >
                            <option value="" disabled hidden>
                                Select {label}
                            </option>
                            {options.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="relative flex items-center">
                            <input
                                id={`field-${name}`}
                                name={name}
                                type={type}
                                placeholder={label}
                                value={form[name] || ""}
                                onChange={handleInputChange}
                                onBlur={() => handleBlur(name)}
                                min={isLeaving && joiningVal ? joiningVal : undefined}
                                max={isJoining || isLeaving ? maxPast : undefined}
                                className={`w-full h-10 rounded-lg px-3 text-sm transition-all ${
                                    hasError
                                        ? "border-2 border-rose-500 bg-rose-50/20 text-rose-900 placeholder:text-rose-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                                        : isValid
                                            ? "border border-emerald-400 bg-emerald-50/10 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                                            : "border border-slate-200 text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                                } focus:outline-none ${hasError && type !== "date" ? "pr-9" : ""}`}
                            />
                            {hasError && type !== "date" && (
                                <div className="absolute right-3 pointer-events-none text-rose-500">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {hasError && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-0.5 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                    </p>
                )}
            </div>
        );
    };

    return (
        <section className="relative bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            {toastState.type && (
                <div
                    className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg font-bold text-sm text-white shadow-lg transition-all duration-300 ${
                        toastState.type === "success"
                            ? "bg-emerald-500 border border-emerald-400/20"
                            : toastState.type === "info"
                                ? "bg-sky-500 border border-sky-400/20"
                                : "bg-rose-500 border border-rose-400/20"
                    }`}
                >
                    {toastState.message}
                </div>
            )}

            {activePanel === null && (
                <>
                    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 mt-2 box-border relative">
                        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[280px] lg:max-w-[320px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by Employee Code..."
                                value={searchEmployeeCode}
                                onChange={(e) => setSearchEmployeeCode(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="w-full h-11 sm:h-10 border border-slate-200 rounded-full sm:rounded-xl pl-10 pr-4 text-xs sm:text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all box-border font-mono"
                                autoComplete="off"
                            />
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                            <button
                                type="button"
                                className="flex items-center justify-center gap-1.5 sm:gap-2.5 h-10 sm:h-11 px-3 sm:px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_4px_15px_rgba(8,33,54,0.25)] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase rounded-full transition-all shadow-md cursor-pointer select-none text-center"
                                onClick={handleSearch}
                                disabled={searchLoading}
                            >
                                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate">{searchLoading ? "Searching..." : "Search"}</span>
                            </button>

                            <button
                                type="button"
                                className="flex items-center justify-center gap-1.5 sm:gap-2.5 h-10 sm:h-11 px-3 sm:px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_4px_15px_rgba(8,33,54,0.25)] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase rounded-full transition-all shadow-md cursor-pointer select-none text-center"
                                onClick={handleAllEmployees}
                                disabled={allEmployeesLoading}
                            >
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate">{allEmployeesLoading ? "Loading..." : "View All Employee Data"}</span>
                            </button>

                            <button
                                type="button"
                                className="flex items-center justify-center gap-1.5 sm:gap-2.5 h-10 sm:h-11 px-3 sm:px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_4px_15px_rgba(8,33,54,0.25)] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase rounded-full transition-all shadow-md cursor-pointer select-none text-center"
                                onClick={() => openPanel("bulk")}
                            >
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate">Bulk Upload</span>
                            </button>

                            <button
                                type="button"
                                className="flex items-center justify-center gap-1.5 sm:gap-2.5 h-10 sm:h-11 px-3 sm:px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_4px_15px_rgba(8,33,54,0.25)] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase rounded-full transition-all shadow-md cursor-pointer select-none text-center"
                                onClick={() => openPanel("new")}
                            >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate">Create New</span>
                            </button>
                        </div>
                    </div>

                    {activeTable === "search" && searchResults && searchResults.length > 0 && renderTable(searchResults, "Search Results")}
                    {activeTable === "search" && searchResults && searchResults.length === 0 && (
                        <div className="w-full bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center flex flex-col items-center justify-center gap-3 animate-fade-in">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <Search className="w-7 h-7" />
                            </div>
                            <h4 className="text-base font-bold text-slate-800">No Matching Employee Records</h4>
                            <p className="text-xs text-slate-500 max-w-sm">
                                No employee was found matching code "{searchEmployeeCode}". Please verify the employee code and try again.
                            </p>
                        </div>
                    )}

                    {activeTable === "all" && allEmployeesResults && allEmployeesResults.length > 0 && renderTable(allEmployeesResults, "All Employee Records")}
                    {activeTable === "all" && allEmployeesResults && allEmployeesResults.length === 0 && (
                        <div className="w-full bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center flex flex-col items-center justify-center gap-3 animate-fade-in">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <Users className="w-7 h-7" />
                            </div>
                            <h4 className="text-base font-bold text-slate-800">No Employee Records Found</h4>
                            <p className="text-xs text-slate-500 max-w-sm">
                                No employee records were found registered under "{user?.CompanyName || initialCompany || "Securitas India"}". You can onboard candidates using "Create New" or "Bulk Upload".
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Back Button */}
            {activePanel !== null && (
                <button
                    type="button"
                    className="min-h-[38px] min-w-[92px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border-0 rounded-lg cursor-pointer z-10 active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5"
                    onClick={handleBack}
                >
                    &larr; Back
                </button>
            )}

            

            {activePanel !== null && (
                <div className="w-full mx-auto mt-4 p-0 box-border relative">
                    {/* Bulk Upload Panel */}
                    {activePanel === "bulk" && (
                    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#031f30] via-[#063352] to-[#0680A6] text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                                <div className="relative z-10">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase text-emerald-300 mb-3 border border-white/10">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Batch Ingestion Engine
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                        Bulk Employee Onboarding
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                                        Download the pre-formatted Excel template, populate your company employee records, and submit for automated batch upload.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="self-start sm:self-center inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-xs backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Step 1: Download Template */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
                                                <FileSpreadsheet className="w-6 h-6" />
                                            </div>
                                            <span className="px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase bg-emerald-100/70 text-emerald-800 rounded-full">
                                                Step 1
                                            </span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                                            Download Excel Template
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                                            Get the official Excel spreadsheet (<code>.xlsx</code>) pre-configured with headers and sample records matching your company's master fields.
                                        </p>
                                        {/* Dynamic: show column chips */}
                                        <div className="mb-6">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                                                Required Columns ({dynamicFields.length} Fields):
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {dynamicFields.map(f => (
                                                    <span
                                                        key={f.DBFieldName}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/60"
                                                    >
                                                        {f.DisplayFieldName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDownloadExcelSample}
                                        className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer"
                                    >
                                        <Download className="w-5 h-5 shrink-0" />
                                        <span>Download Sample Template (.xlsx)</span>
                                    </button>
                                </div>
                                {/* Step 2: Upload Completed Sheet */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <form onSubmit={handleBulkSubmit} className="flex flex-col h-full justify-between">
                                        <div>
                                            <div className="flex items-center justify-between gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
                                                    <Upload className="w-6 h-6" />
                                                </div>
                                                <span className="px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase bg-indigo-100/70 text-indigo-800 rounded-full">
                                                    Step 2
                                                </span>
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                                                Upload Completed Sheet
                                            </h3>
                                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                                                Select or drop your populated Excel spreadsheet (<code>.xlsx</code> / <code>.xls</code>) for automated upload.
                                            </p>
                                            <div
                                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setIsDragging(false);
                                                    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                                                }}
                                                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                                                    isDragging ? "border-indigo-500 bg-indigo-50/50" : selectedFile ? "border-emerald-300 bg-emerald-50/30" : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                                                }`}
                                            >
                                                <input
                                                    type="file"
                                                    accept=".xlsx, .xls"
                                                    onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                                />
                                                {selectedFile ? (
                                                    <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-emerald-200">
                                                        <div className="flex items-center gap-3 min-w-0 text-left">
                                                            <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                                <FileSpreadsheet className="w-5 h-5" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                                                                <p className="text-[11px] text-slate-500 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB • Ready</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                                                        <FileSpreadsheet className="w-10 h-10 text-slate-400 mb-1" />
                                                        <p className="text-xs sm:text-sm font-semibold text-slate-700">Drop your completed <code>.xlsx</code> file here, or <span className="text-[#0680A6] underline font-bold">browse</span></p>
                                                        <p className="text-[11px] text-slate-400">Supports Excel files (.xlsx, .xls)</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pt-6">
                                            <button
                                                type="submit"
                                                disabled={uploading || !selectedFile}
                                                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:brightness-110 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {uploading ? "Ingesting Employee Records..." : "Process & Upload Records"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            {/* Help Card */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 mt-5">
                                <div className="flex items-center gap-2 mb-4 text-slate-900">
                                    <Info className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm sm:text-base font-bold">
                                        Data Guidelines
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-bold text-slate-900 block mb-1">
                                            📅 Dates (YYYY-MM-DD)
                                        </span>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Use <code>YYYY-MM-DD</code> for any date fields (e.g. <code>2024-01-31</code>)
                                        </p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-bold text-slate-900 block mb-1">
                                            ℹ️ Required Fields
                                        </span>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Fill all columns marked as <span className="text-rose-600">*</span> in the Create New form for accurate upload.
                                        </p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-bold text-slate-900 block mb-1">
                                            🔒 Data Usage
                                        </span>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Only the displayed fields will be stored in record registry for your Contributor.
                                        </p>
                                    </div>
                                </div>
                            </div>
</div>

                    
                    
                       
                    )}
                    {/* Create New Employee Panel */}
                    {activePanel === "new" && (
                        // Same as before (add new)
                        <form
                            className="w-full flex flex-col items-stretch bg-transparent box-border"
                            autoComplete="off"
                            onSubmit={handleNewSubmit}
                            noValidate
                        >
                            <h3 className="m-0 text-xl font-bold text-slate-800 text-left mb-1">
                                Create New Employee
                            </h3>
                            <p className="m-0 text-[13px] text-slate-500 text-left mb-6">
                                Input candidate records for verification and registry compliance.
                            </p>
                            <div className="w-full py-2.5">
                                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-500 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-emerald-500"></span>
                                        Employee Details
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {dynamicFields.map(field =>
                                            renderFormField(
                                                field.DBFieldName,
                                                field.DisplayFieldName,
                                                /date/i.test(field.DBFieldName) ? "date" : "text",
                                                true // required
                                            )
                                        )}
                                        {/* Contributor/Company Field */}
                                        {/* {showContributorField && (
                                            <div className="flex flex-col gap-1.5 text-left">
                                                <label className="text-[11px] font-[750] text-slate-500 uppercase tracking-wider">
                                                    Company (Client) <span className="text-rose-500">*</span>
                                                </label>
                                                {showCompanyDropdown ? (
                                                    <select
                                                        name="Contributor"
                                                        value={form.Contributor}
                                                        onChange={handleInputChange}
                                                        className="w-full h-[38px] border-[1.5px] border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white focus:border-[#5850EC] focus:ring-[3px] focus:ring-[#5850EC]/10 outline-none transition-all box-border"
                                                        required
                                                    >
                                                        <option value={initialCompany}>{initialCompany}</option>
                                                        <option value="TCS">TCS</option>
                                                        <option value="Securitas">Securitas</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        name="Contributor"
                                                        value={form.Contributor}
                                                        readOnly
                                                        className="w-full h-[38px] border-[1.5px] border-slate-300 rounded-lg px-3 text-sm text-slate-500 bg-slate-100 cursor-not-allowed box-border"
                                                        tabIndex={-1}
                                                    />
                                                )}
                                            </div>
                                        )} */}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className={`${btnClass} self-center mx-auto mt-3`}
                                disabled={submittingNew}
                            >
                                {submittingNew ? "Submitting..." : "Submit"}
                            </button>
                        </form>
                    )}

                    {/* Edit Panel using refactored API-backed edit component */}
                    {activePanel === "edit" && canEdit && editEmployeeCode && (
                        <UpdateEmployeeFormV2
                            employeeCode={editEmployeeCode}
                            contributor={editEmployee?.Contributor || editEmployee?.contributor || user?.CompanyName || initialCompany}
                            dynamicFields={dynamicFields}
                            showContributorField={showContributorField}
                            showCompanyDropdown={showCompanyDropdown}
                            initialCompany={initialCompany}
                            btnClass={btnClass}
                            onCancel={handleBack}
                            onSuccess={handleBack}
                            toastHandler={showToast}
                        />
                    )}
                </div>
            )}
        </section>
    );
}