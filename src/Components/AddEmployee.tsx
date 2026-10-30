
import React from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { useAuth } from '../useAuth'
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
    Building2,
    ShieldAlert,
    Filter,
    UserCheck,
    FileSpreadsheet,
    FileText,
    Info,
    Sparkles,
    ArrowRight,
    X,
    FileCheck,
    HelpCircle
} from 'lucide-react'

// Custom button style
const btnClass = "inline-flex items-center justify-center h-9 px-5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:brightness-110 active:scale-[0.98] text-white font-bold text-[11px] tracking-wider uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none outline-none disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed";

const API_URL = "https://worktrail.ai/api/ContributorData";
const API_HEADERS = {
    "APIKEY": "Securitas@#!1234",
    "Content-Type": "application/json"
};

// For Employee Search
const SEARCH_API_URL = "https://worktrail.ai/api/ContributorEmpSearch";
const SEARCH_API_HEADERS = {
    "APIKEY": "Securitas@#!1234",
    "Content-Type": "application/json"
};

// AllEmployeeData API endpoint (assume similar API style)
const ALL_EMPLOYEE_API_URL = "https://worktrail.ai/api/ContributorEmpSearch";
const ALL_EMPLOYEE_API_HEADERS = {
    "APIKEY": "Securitas@#!1234",
    "Content-Type": "application/json"
};

/**
 * Map keys with spaces (as they appear in Excel) to actual API field names.
 * For example: "Last Name" => "LastName"
 */
const excelKeyToApiKey: Record<string, string> = {
    "First Name":     "FirstName",
    "Middle Name":    "MiddleName",
    "Last Name":      "LastName",
    "Email":          "Email",
    "Mobile No":      "MobileNo",
    "Department":     "Department",
    "Date of Joining":"DateOfJoining",
    "Last Position Held":"LastPositionHeld",
    "Date of Leaving":"DateOfLeaving",
    "Last Salary Annual":"LastSalaryAnnual",
    "Employee Code":  "EmployeeCode",
    "Exit Formalities":"ExitFormalities",
    "Employment Type":"EmploymentType",
    "Any Behaviour Issue":"AnyBehaviourIssue",
    "Eligibility to Rehire":"EligibilityToRehire",
    "Contributor":    "Contributor"
};
// All API fields with their expected default/nullable values
const ALL_API_FIELDS: Record<string, any> = {
    FirstName: "",
    MiddleName: null,
    LastName: "",
    Email: null,
    MobileNo: null,
    Department: "",
    DateOfJoining: "",
    LastPositionHeld: "",
    DateOfLeaving: "",
    LastSalaryAnnual: null,
    EmployeeCode: "",
    ExitFormalities: null,
    EmploymentType: null,
    AnyBehaviourIssue: null,
    EligibilityToRehire: null,
    Contributor: null, // Will be filled later
};

/**
 * Standard sample rows formatted identically to the Create New Employee Form
 */
export const SAMPLE_BULK_ROWS = [
    {
        "First Name": "Rahul",
        "Middle Name": "Kumar",
        "Last Name": "Sharma",
        "Employee Code": "EMP-1001",
        "Email": "rahul.sharma@example.com",
        "Mobile No": "9876543210",
        "Department": "Engineering",
        "Last Position Held": "Senior Software Engineer",
        "Date of Joining": "2021-04-15",
        "Date of Leaving": "2024-01-31",
        "Last Salary Annual": 1200000,
        "Employment Type": "Full-Time",
        "Exit Formalities": "Completed",
        "Any Behaviour Issue": "None",
        "Eligibility to Rehire": "Yes"
    },
    {
        "First Name": "Priya",
        "Middle Name": "",
        "Last Name": "Verma",
        "Employee Code": "EMP-1002",
        "Email": "priya.verma@example.com",
        "Mobile No": "9812345678",
        "Department": "Human Resources",
        "Last Position Held": "HR Manager",
        "Date of Joining": "2020-08-01",
        "Date of Leaving": "2023-11-30",
        "Last Salary Annual": 950000,
        "Employment Type": "Full-Time",
        "Exit Formalities": "Completed",
        "Any Behaviour Issue": "None",
        "Eligibility to Rehire": "Yes"
    }
];
function formatDateValue(val: any): string {
    if (val === undefined || val === null || val === "") return "";
    if (val instanceof Date && !isNaN(val.getTime())) {
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, "0");
        const day = String(val.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    if (typeof val === "number") {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, "0");
            const day = String(date.getUTCDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
    }
    const str = String(val).trim();
    if (str.includes("T")) {
        return str.split("T")[0];
    }
    const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
        const day = ddmmyyyy[1].padStart(2, "0");
        const month = ddmmyyyy[2].padStart(2, "0");
        const year = ddmmyyyy[3];
        return `${year}-${month}-${day}`;
    }
    return str;
}

/**
 * For a row from excel (with keys potentially like "Last Name"), produce the correct API JSON shape,
 * preserving field names/values as expected for the API.
 */
function normalizeBulkRow(row: any, company: string): any {
    const normalized: Record<string, any> = {};
    for (const apiField in ALL_API_FIELDS) {
        let value = undefined;
        if (Object.prototype.hasOwnProperty.call(row, apiField)) {
            value = row[apiField];
        } else {
            const excelKey = Object.keys(excelKeyToApiKey).find(
                (k) => excelKeyToApiKey[k] === apiField
            );
            if (excelKey && Object.prototype.hasOwnProperty.call(row, excelKey)) {
                value = row[excelKey];
            }
        }
        switch (apiField) {
            case "FirstName":
            case "LastName":
            case "Department":
            case "LastPositionHeld":
            case "EmployeeCode":
                normalized[apiField] = (value !== undefined && value !== null) ? String(value) : ALL_API_FIELDS[apiField];
                break;
            case "DateOfJoining":
            case "DateOfLeaving":
                normalized[apiField] = formatDateValue(value);
                break;
            case "MiddleName":
                normalized[apiField] =
                    value !== undefined && value !== null && String(value).trim() !== ""
                        ? String(value)
                        : null;
                break;
            case "Email":
                normalized[apiField] =
                    value !== undefined && value !== null && String(value).trim() !== ""
                        ? String(value).trim()
                        : null;
                break;
            case "MobileNo":
                normalized[apiField] =
                    value !== undefined && value !== null && String(value).trim() !== ""
                        ? String(value).trim()
                        : null;
                break;
            case "LastSalaryAnnual":
                if (
                    value === undefined ||
                    value === null ||
                    (typeof value === "string" && value.trim() === "")
                ) {
                    normalized[apiField] = null;
                } else {
                    const num = Number(value);
                    normalized[apiField] = isNaN(num) ? null : num;
                }
                break;
            case "ExitFormalities":
            case "EmploymentType":
            case "AnyBehaviourIssue":
            case "EligibilityToRehire":
                normalized[apiField] =
                    value !== undefined && value !== null && String(value).trim() !== ""
                        ? String(value).trim()
                        : null;
                break;
            case "Contributor":
                normalized[apiField] =
                    company ||
                    (value !== undefined && value !== null && String(value).trim() !== ""
                        ? String(value).trim()
                        : "Contributor");
                break;
            default:
                normalized[apiField] = value;
        }
    }
    return normalized;
}

// Main component
function AddEmployee() {
    const [hoverBtn, setHoverBtn] = React.useState<"bulk" | "new" | "download" | "submit" | null>(null);
    // Add a new panel state for edit
    const [activePanel, setActivePanel] = React.useState<"bulk" | "new" | "edit" | null>(null);
    const { user } = useAuth();

    const [toastState, setToastState] = React.useState<{ message: string; type: "success" | "error" | "warn" | null }>({
        message: "",
        type: null
    });

    const toast = React.useMemo(() => ({
        success: (msg: string) => {
            setToastState({ message: msg, type: "success" });
            setTimeout(() => setToastState({ message: "", type: null }), 3000);
        },
        error: (msg: string) => {
            setToastState({ message: msg, type: "error" });
            setTimeout(() => setToastState({ message: "", type: null }), 3000);
        },
        warn: (msg: string) => {
            setToastState({ message: msg, type: "warn" });
            setTimeout(() => setToastState({ message: "", type: null }), 3000);
        }
    }), []);

    // For editing, which record is being edited
    const [editEmployee, setEditEmployee] = React.useState<any | null>(null);

    // Helper - which Usertype options should see company dropdown
    const showCompanyDropdown = React.useMemo(() => {
        // Only for Superadmin, Admin, Fascilator
        return user &&
            (user.Usertype === "Superadmin" ||
                user.Usertype === "Admin" ||
                user.Usertype === "Fascilator");
    }, [user]);

    // Helper - should contribute field be *shown at all*?
    const showContributorField = React.useMemo(() => {
        return user && (
            user.Usertype === "Superadmin" ||
            user.Usertype === "Admin" ||
            user.Usertype === "Fascilator"
        );
    }, [user]);

    // Get initial company name from user if Contributor/Client, else fallback
    const initialCompany = React.useMemo(() => {
        if (
            user &&
            (user.Usertype === "Contributor" || user.Usertype === "Client" || user.Usertype === "ContributorAdmin" || user.Usertype === "ContributorUser" || user.CompanyName)
        ) {
            return user.CompanyName || "";
        } else {
            return user?.CompanyName || "Contributor";
        }
    }, [user]);

    // Bulk upload fields
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [company, setCompany] = React.useState(initialCompany);

    React.useEffect(() => {
        setCompany(initialCompany);
    }, [initialCompany]);

    const [organizationsList, setOrganizationsList] = React.useState<string[]>([
        "Securitas",
        "Securitas India",
        "TCS"
    ]);

    React.useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const res = await axios.get("https://worktrail.ai/api/OrgmasterData", {
                    headers: { "APIKEY": "Securitas@#!1234" }
                });
                if (res.status === 200) {
                    const data = res.data;
                    if (data && Array.isArray(data.data)) {
                        const names = data.data.map((o: any) => o.OrganizationName).filter(Boolean);
                        const merged = Array.from(new Set(["Securitas", "Securitas India", "TCS", ...names]));
                        setOrganizationsList(merged);
                    }
                }
            } catch {
                // Keep default fallback list
            }
        };
        fetchOrgs();
    }, []);

    const [uploading, setUploading] = React.useState(false);

    // Search: EmployeeCode and result(s)
    const [searchEmployeeCode, setSearchEmployeeCode] = React.useState("");
    const [searchLoading, setSearchLoading] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState<any[] | null>(null);

    // AllEmployeeData: result(s)
    const [allEmployeesLoading, setAllEmployeesLoading] = React.useState(false);
    const [allEmployeesResults, setAllEmployeesResults] = React.useState<any[] | null>(null);

    // ---- New state to control which table is shown ----
    // either 'search', 'all', or null (none)
    const [activeTable, setActiveTable] = React.useState<'search' | 'all' | null>(null);

    // Create New Employee/New/Edit Employee form state (API keys, not Excel keys)
    const [form, setForm] = React.useState({
        FirstName: "",
        MiddleName: "",
        LastName: "",
        Email: "",
        MobileNo: "",
        Department: "",
        DateOfJoining: "",
        LastPositionHeld: "",
        DateOfLeaving: "",
        LastSalaryAnnual: "",
        EmployeeCode: "",
        ExitFormalities: "",
        EmploymentType: "",
        AnyBehaviourIssue: "",
        EligibilityToRehire: "",
        Contributor: initialCompany
    });

    // Store primary key/id for editing, to send in the API if needed
    const [editingRowIndex, setEditingRowIndex] = React.useState<number | null>(null);
    const [submittingNew, setSubmittingNew] = React.useState(false);
    const [submittingUpdate, setSubmittingUpdate] = React.useState(false);
    const [tableSearchFilter, setTableSearchFilter] = React.useState("");

    // Keep the form's Contributor in sync if user/role changes and not showCompanyDropdown
    React.useEffect(() => {
        if (!showCompanyDropdown) {
            setForm(f => ({
                ...f,
                Contributor: initialCompany
            }));
        }
    }, [showCompanyDropdown, initialCompany]);

    const handleClick = (panel: "bulk" | "new") => {
        setActivePanel(panel);
        setEditEmployee(null);
        setEditingRowIndex(null);
    };

    const handleBack = () => {
        setActivePanel(null);
        setSelectedFile(null);
        setCompany(initialCompany);
        setForm({
            FirstName: "",
            MiddleName: "",
            LastName: "",
            Email: "",
            MobileNo: "",
            Department: "",
            DateOfJoining: "",
            LastPositionHeld: "",
            DateOfLeaving: "",
            LastSalaryAnnual: "",
            EmployeeCode: "",
            ExitFormalities: "",
            EmploymentType: "",
            AnyBehaviourIssue: "",
            EligibilityToRehire: "",
            Contributor: initialCompany
        });
        setSearchEmployeeCode("");
        setSearchResults(null);
        setAllEmployeesResults(null);
        setEditEmployee(null);
        setEditingRowIndex(null);
        setSubmittingNew(false);
        setSubmittingUpdate(false);
        setActiveTable(null);
    };

    const [isDragging, setIsDragging] = React.useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
            } else {
                toast.error("Please select a valid Excel file (.xlsx or .xls)");
            }
        }
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCompany(e.target.value);
        setForm(prev => ({ ...prev, Contributor: e.target.value }));
    };

    const handleDownloadExcelSample = () => {
        try {
            const randSuffix = Math.floor(1000 + Math.random() * 9000);
            const dynamicSampleRows = [
                {
                    ...SAMPLE_BULK_ROWS[0],
                    "Employee Code": `EMP-${randSuffix}`,
                    "Email": `emp.${randSuffix}@example.com`
                },
                {
                    ...SAMPLE_BULK_ROWS[1],
                    "Employee Code": `EMP-${randSuffix + 1}`,
                    "Email": `emp.${randSuffix + 1}@example.com`
                }
            ];
            const worksheet = XLSX.utils.json_to_sheet(dynamicSampleRows);
            // Pre-configure column widths for pleasant viewing in Excel
            worksheet['!cols'] = [
                { wch: 15 }, // First Name
                { wch: 15 }, // Middle Name
                { wch: 15 }, // Last Name
                { wch: 18 }, // Employee Code
                { wch: 28 }, // Email
                { wch: 16 }, // Mobile No
                { wch: 20 }, // Department
                { wch: 28 }, // Last Position Held
                { wch: 18 }, // Date of Joining
                { wch: 18 }, // Date of Leaving
                { wch: 20 }, // Last Salary Annual
                { wch: 18 }, // Employment Type
                { wch: 18 }, // Exit Formalities
                { wch: 22 }, // Any Behaviour Issue
                { wch: 22 }  // Eligibility to Rehire
            ];
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample_Employees');
            XLSX.writeFile(workbook, 'employee_bulk_upload_sample.xlsx');
            toast.success(`Downloaded sample template with unique codes (EMP-${randSuffix})!`);
        } catch (err: any) {
            toast.error(`Failed to download template: ${err?.message || 'Unknown error'}`);
        }
    };

    const readUploadedFile = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const firstSheetName = workbook.SheetNames[0];
                    if (!firstSheetName) {
                        return resolve([]);
                    }
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    resolve(jsonRows);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error("Please select an Excel file (.xlsx or .xls).");
            return;
        }
        setUploading(true);

        try {
            const rawRows = await readUploadedFile(selectedFile);
            if (!Array.isArray(rawRows) || rawRows.length === 0) {
                throw new Error("Excel file is empty or format is invalid. Please use the sample template.");
            }
            // Map and normalize each row using the correct company
            const normalizedRows = rawRows.map(row => normalizeBulkRow(row, company));

            // Validate internal duplicates within the uploaded spreadsheet
            const codes = normalizedRows.map(r => String(r.EmployeeCode).trim().toUpperCase());
            const duplicates = codes.filter((item, index) => codes.indexOf(item) !== index);
            if (duplicates.length > 0) {
                const uniqueDups = Array.from(new Set(duplicates));
                throw new Error(`Duplicate Employee Code(s) found in file: ${uniqueDups.join(", ")}. Each record must have a unique Employee Code.`);
            }

            const rowsToSend = normalizedRows;
            console.log("Sending bulk JSON to API:", rowsToSend);

            try {
                await axios.post(API_URL, rowsToSend, { headers: API_HEADERS });
                setUploading(false);
                setSelectedFile(null);
                setCompany(initialCompany);
                toast.success(`Successfully uploaded ${rowsToSend.length} employee records!`);
                // --- Go back to main screen after success ---
                setTimeout(() => {
                    handleBack();
                }, 1200);
            } catch (err: any) {
                setUploading(false);
                if (err.response) {
                    const apiRespJson = err.response.data;
                    if (err.response.status === 409) {
                        const detail = typeof apiRespJson === "object"
                            ? (apiRespJson?.message || apiRespJson?.error || apiRespJson?.msg)
                            : apiRespJson;
                        toast.error(
                            detail && detail.length < 200
                                ? `Conflict (409): ${detail}`
                                : "Conflict (409): One or more Employee Codes already exist in the database. Please ensure all Employee Codes are unique."
                        );
                    } else {
                        toast.error(`Bulk upload failed (${err.response.status}): ${typeof apiRespJson === "string" ? apiRespJson : JSON.stringify(apiRespJson)}`);
                    }
                } else {
                    toast.error(`Bulk upload failed: ${err?.message || "Unknown error"}`);
                }
                if (selectedFile) {
                    console.log("Bulk upload error file:", selectedFile.name);
                }
            }
        } catch (err: any) {
            setUploading(false);
            toast.error(`Bulk upload failed: ${err?.message || "Unknown error"}`);
            if (selectedFile) {
                console.log("Bulk upload error file:", selectedFile.name);
            }
        }
    };

    // Handler for create new employee form
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // Handle Edit: open the form for editing row at index, with that data
    const handleEditRow = (row: any, rowIx: number) => {
        setEditEmployee(row);
        setActivePanel("edit");
        setEditingRowIndex(rowIx);
        // All keys from ALL_API_FIELDS - auto copy all if present
        const fieldKeys = Object.keys(ALL_API_FIELDS);
        // If missing, fallback to ""
        const fields: {
            FirstName: string;
            MiddleName: string;
            LastName: string;
            Email: string;
            MobileNo: string;
            Department: string;
            DateOfJoining: string;
            LastPositionHeld: string;
            DateOfLeaving: string;
            LastSalaryAnnual: string;
            EmployeeCode: string;
            ExitFormalities: string;
            EmploymentType: string;
            AnyBehaviourIssue: string;
            EligibilityToRehire: string;
            Contributor: string;
        } = {
            FirstName: "",
            MiddleName: "",
            LastName: "",
            Email: "",
            MobileNo: "",
            Department: "",
            DateOfJoining: "",
            LastPositionHeld: "",
            DateOfLeaving: "",
            LastSalaryAnnual: "",
            EmployeeCode: "",
            ExitFormalities: "",
            EmploymentType: "",
            AnyBehaviourIssue: "",
            EligibilityToRehire: "",
            Contributor: ""
        };
        for(const k of fieldKeys) {
            fields[k as keyof typeof fields] = row[k] !== undefined && row[k] !== null ? String(row[k]) : "";
        }
        setForm(fields);
    };

    const handleNewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingNew(true);

        // Always send form.Contributor, which is initialized and maintained per Usertype
        const normalized = normalizeBulkRow(form, form.Contributor);
        const payload = [normalized];
        console.log("Sending single record JSON to API:", payload);

        try {
            await axios.post(API_URL, payload, { headers: API_HEADERS });
            setSubmittingNew(false);
            setForm({
                FirstName: "",
                MiddleName: "",
                LastName: "",
                Email: "",
                MobileNo: "",
                Department: "",
                DateOfJoining: "",
                LastPositionHeld: "",
                DateOfLeaving: "",
                LastSalaryAnnual: "",
                EmployeeCode: "",
                ExitFormalities: "",
                EmploymentType: "",
                AnyBehaviourIssue: "",
                EligibilityToRehire: "",
                Contributor: initialCompany
            });

            toast.success("New employee submitted!");
            // --- Go back to main screen after success ---
            setTimeout(() => {
                handleBack();
            }, 1200); // Give user time to see toast
        } catch (err: any) {
            setSubmittingNew(false);
            if (err.response) {
                const apiRespJson = err.response.data;
                toast.error(`Failed to add employee. ${err.response.statusText} - ${JSON.stringify(apiRespJson)}`);
            } else {
                toast.error(`New employee submission failed: ${err?.message || "Unknown error"}`);
            }
            console.log("Create new employee error JSON:", [normalizeBulkRow(form, form.Contributor)]);
        }
    };

    // Handle Update (Edit form submit)
    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingUpdate(true);

        // Send as 1-element array (same as adding new)
        const normalized = normalizeBulkRow(form, form.Contributor);
        const payload = [normalized];
        console.log("Sending UPDATE employee JSON to API:", payload);

        try {
            await axios.post(API_URL, payload, { headers: API_HEADERS });
            setSubmittingUpdate(false);
            setForm({
                FirstName: "",
                MiddleName: "",
                LastName: "",
                Email: "",
                MobileNo: "",
                Department: "",
                DateOfJoining: "",
                LastPositionHeld: "",
                DateOfLeaving: "",
                LastSalaryAnnual: "",
                EmployeeCode: "",
                ExitFormalities: "",
                EmploymentType: "",
                AnyBehaviourIssue: "",
                EligibilityToRehire: "",
                Contributor: initialCompany
            });

            toast.success("Employee updated!");
            // After update, go back and refresh table (best effort)
            setTimeout(() => {
                handleBack();
            }, 1200);
        } catch (err: any) {
            setSubmittingUpdate(false);
            if (err.response) {
                const apiRespJson = err.response.data;
                toast.error(`Failed to update employee. ${err.response.statusText} - ${JSON.stringify(apiRespJson)}`);
            } else {
                toast.error(`Update failed: ${err?.message || "Unknown error"}`);
            }
        }
    };

    // --- SEARCH LOGIC STARTS HERE ---

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchEmployeeCode(e.target.value);
        setSearchResults(null);
        // When input changes, clear previous table
        setActiveTable(null);
        setAllEmployeesResults(null);
    };

    const handleSearch = async () => {
        if (!searchEmployeeCode.trim()) {
            handleAllEmployees();
            return;
        }
        setSearchLoading(true);
        setSearchResults(null);
        setActiveTable(null);
        setAllEmployeesResults(null); // When searching, clear all employees

        try {
            const res = await axios.post(SEARCH_API_URL, { EmployeeCode: searchEmployeeCode.trim() }, { headers: SEARCH_API_HEADERS });
            const json: any = res.data || {};
            if (json && Array.isArray(json.data)) {
                setSearchResults(json.data);
                setActiveTable('search'); // Only show search table
                if (json.data.length === 0) {
                    toast.warn("No employee found for this EmployeeCode.");
                }
            } else if (json && json.data && typeof json.data === 'object') {
                setSearchResults([json.data]);
                setActiveTable('search');
            } else {
                throw new Error(json?.message || "Employee not found.");
            }
        } catch (err: any) {
            const message = err.response
                ? (typeof err.response.data === "object"
                    ? (err.response.data?.message || `${err.response.status} ${err.response.statusText}`)
                    : String(err.response.data))
                : (err?.message || "Unknown error");
            toast.error("Search failed: " + message);
            setSearchResults(null);
            setActiveTable(null);
        } finally {
            setSearchLoading(false);
        }
    };

    // --- ALL EMPLOYEE DATA (BY Contributor) LOGIC ---

    const handleAllEmployees = async () => {
        const isFascilatorOrAdmin =
            user && (user.Usertype === "Fascilator" || user.Usertype === "Superadmin" || user.Usertype === "Admin");

        const contributorValue =
            (company && company !== "Contributor" ? company : "") ||
            user?.CompanyName ||
            (isFascilatorOrAdmin ? (company && company !== "Contributor" ? company : "Securitas") : "Securitas India");

        if (!contributorValue) {
            toast.error("Please select a Contributor to view employee data.");
            return;
        }
        setAllEmployeesLoading(true);
        setAllEmployeesResults(null);
        setSearchResults(null); // Clear search results when viewing all employees
        setActiveTable(null);

        try {
            const res = await axios.post(ALL_EMPLOYEE_API_URL, { Contributor: contributorValue }, { headers: ALL_EMPLOYEE_API_HEADERS });
            let json: any = res.data || {};
            if (json && Array.isArray(json.data)) {
                let list = json.data;
                // Fallback attempt: if 0 records and was Securitas, try Securitas India
                if (list.length === 0 && contributorValue === "Securitas") {
                    try {
                        const fb = await axios.post(
                            ALL_EMPLOYEE_API_URL,
                            { Contributor: "Securitas India" },
                            { headers: ALL_EMPLOYEE_API_HEADERS }
                        );
                        const fbData = fb.data;
                        if (fbData && Array.isArray(fbData.data) && fbData.data.length > 0) {
                            list = fbData.data;
                        }
                    } catch {
                        // ignore fallback error
                    }
                }
                setAllEmployeesResults(list);
                setActiveTable('all'); // Only show all employees table
                if (list.length === 0) {
                    toast.warn(`No employee data found for ${contributorValue}.`);
                } else {
                    toast.success(`Found ${list.length} records for ${contributorValue}!`);
                }
            } else if (json && json.data && typeof json.data === 'object') {
                setAllEmployeesResults([json.data]);
                setActiveTable('all');
            } else {
                throw new Error(json?.message || "No employee data found.");
            }
        } catch (err: any) {
            const message = err.response
                ? (typeof err.response.data === "object"
                    ? (err.response.data?.message || `${err.response.status} ${err.response.statusText}`)
                    : String(err.response.data))
                : (err?.message || "Unknown error");
            toast.error("AllEmployeeData fetch failed: " + message);
            setAllEmployeesResults(null);
            setActiveTable(null);
        } finally {
            setAllEmployeesLoading(false);
        }
    };

    const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
        }
    };

    const userType = (user?.Usertype || '').toLowerCase().trim();
    const canEdit =
        userType === 'superadmin' ||
        userType === 'fascilator' ||
        userType === 'contributoradmin' ||
        userType === 'admin_contributor' ||
        userType === 'contributor admin';

    // Column structure with Edit column after S. No. (Visible only to Superadmin, Fascilator, and Contributor Admin)
    const tableColumns = [
        { key: "Sno", label: "S. No.", align: "center" },
        ...(canEdit ? [{ key: "edit", label: "Action", align: "center" }] : []),
        { key: "EmployeeCode", label: "Emp Code", align: "left" },
        { key: "FirstName", label: "First Name", align: "left" },
        { key: "MiddleName", label: "Middle Name", align: "left" },
        { key: "LastName", label: "Last Name", align: "left" },
        { key: "Email", label: "Email ID", align: "left" },
        { key: "MobileNo", label: "Mobile No", align: "left" },
        { key: "Department", label: "Department", align: "left" },
        { key: "DateOfJoining", label: "Joining Date", align: "left" },
        { key: "LastPositionHeld", label: "Position", align: "left" },
        { key: "DateOfLeaving", label: "Leaving Date", align: "left" },
        { key: "LastSalaryAnnual", label: "Annual Salary", align: "right" },
        { key: "ExitFormalities", label: "Exit Formalities", align: "center" },
        { key: "EmploymentType", label: "Emp Type", align: "center" },
        { key: "AnyBehaviourIssue", label: "Behavior Issue", align: "left" },
        { key: "EligibilityToRehire", label: "Rehire Eligible", align: "center" },
        { key: "Contributor", label: "Contributor", align: "left" }
    ];

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

    function formatSalary(val: any) {
        if (val === null || val === undefined || val === "") return "-";
        const num = Number(val);
        if (isNaN(num)) return String(val);
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(num);
    }

    const renderTableCell = (colKey: string, val: any) => {
        if (val === null || val === undefined || String(val).trim() === "") {
            return <span className="text-slate-400 font-normal text-xs">-</span>;
        }

        if (colKey === "EmployeeCode") {
            return (
                <span className="font-mono text-xs font-semibold text-indigo-900 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200/60">
                    {String(val)}
                </span>
            );
        }

        if (colKey === "DateOfJoining" || colKey === "DateOfLeaving" || colKey === "CreatedAt") {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {formatDate(val)}
                </span>
            );
        }

        if (colKey === "LastSalaryAnnual") {
            return (
                <span className="font-semibold text-slate-800 text-xs">
                    {formatSalary(val)}
                </span>
            );
        }

        if (colKey === "EligibilityToRehire") {
            const v = String(val).trim().toLowerCase();
            if (v === "yes") {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Yes
                    </span>
                );
            } else if (v === "no") {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        No
                    </span>
                );
            }
        }

        if (colKey === "ExitFormalities") {
            const v = String(val).trim().toLowerCase();
            if (v === "completed") {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Completed
                    </span>
                );
            } else if (v === "pending") {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Pending
                    </span>
                );
            } else if (v === "ongoing") {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                        Ongoing
                    </span>
                );
            }
        }

        if (colKey === "EmploymentType") {
            return (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                    {String(val)}
                </span>
            );
        }

        if (colKey === "Email") {
            return (
                <span className="text-xs text-indigo-600 font-medium">
                    {String(val)}
                </span>
            );
        }

        if (colKey === "FirstName" || colKey === "LastName") {
            return (
                <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {String(val)}
                </span>
            );
        }

        return <span className="text-xs text-slate-600 font-normal">{String(val)}</span>;
    };

    const renderTable = (data: any[], title: string) => {
        const filteredData = data.filter(row => {
            if (!tableSearchFilter.trim()) return true;
            const q = tableSearchFilter.toLowerCase();
            return (
                (row.FirstName && String(row.FirstName).toLowerCase().includes(q)) ||
                (row.LastName && String(row.LastName).toLowerCase().includes(q)) ||
                (row.EmployeeCode && String(row.EmployeeCode).toLowerCase().includes(q)) ||
                (row.Department && String(row.Department).toLowerCase().includes(q)) ||
                (row.Email && String(row.Email).toLowerCase().includes(q)) ||
                (row.Contributor && String(row.Contributor).toLowerCase().includes(q))
            );
        });

        return (
            <div className="w-full mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden box-border">
                {/* Table Header Bar */}
                <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800 m-0">{title}</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100/70 text-indigo-700">
                                    {data.length} {data.length === 1 ? 'Record' : 'Records'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 m-0 mt-0.5">
                                Showing employee directory and registry compliance records
                            </p>
                        </div>
                    </div>

                    {/* In-Table Quick Filter Input */}
                    <div className="relative min-w-[220px]">
                        <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter table rows..."
                            value={tableSearchFilter}
                            onChange={(e) => setTableSearchFilter(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>
                </div>

                {/* Table Scroll Wrapper */}
                <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left min-w-[1100px]">
                        <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200/80">
                                {tableColumns.map((col) => {
                                    const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
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
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={tableColumns.length} className="px-4 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Users className="w-8 h-8 text-slate-300" />
                                            <p className="text-sm font-medium text-slate-500 m-0">No matching employees found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row, rowIx) => (
                                    <tr
                                        key={rowIx}
                                        className="hover:bg-indigo-50/30 transition-colors duration-150 group"
                                    >
                                        {tableColumns.map((col) => {
                                            if (col.key === "Sno") {
                                                return (
                                                    <td
                                                        key="Sno"
                                                        className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 text-center font-medium"
                                                    >
                                                        {rowIx + 1}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "edit") {
                                                return (
                                                    <td key="edit" className="whitespace-nowrap px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditRow(row, rowIx)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-semibold text-xs transition-all duration-150 active:scale-95 cursor-pointer border border-indigo-200/60"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                                                            <span>Edit</span>
                                                        </button>
                                                    </td>
                                                );
                                            }
                                            const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`whitespace-nowrap px-4 py-3 ${alignClass}`}
                                                >
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
            </div>
        );
    };

    const renderFormField = (
        name: keyof typeof form,
        label: string,
        placeholder: string,
        type: string = "text",
        required: boolean = false,
        options?: string[]
    ) => {
        return (
            <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
                {options ? (
                    <select
                        name={name}
                        value={form[name]}
                        onChange={handleInputChange}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all"
                        required={required}
                    >
                        <option value="" disabled hidden>{placeholder}</option>
                        {options.map(opt => (
                            <option key={opt} value={opt} className="bg-white text-slate-800">
                                {opt}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        name={name}
                        type={type}
                        placeholder={placeholder}
                        value={form[name]}
                        onChange={handleInputChange}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all"
                        required={required}
                    />
                )}
            </div>
        );
    };
 
    return (
        <section className="relative bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            {toastState.type && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg font-bold text-sm text-white shadow-lg transition-all duration-300 ${
                    toastState.type === 'success' 
                        ? 'bg-emerald-500 border border-emerald-400/20' 
                        : toastState.type === 'error' 
                            ? 'bg-rose-500 border border-rose-400/20' 
                            : 'bg-amber-500 border border-amber-400/20'
                }`}>
                    {toastState.message}
                </div>
            )}

            {/* Search Bar and Action Buttons Row */}
            {activePanel === null && (
                <>
                    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 mt-2 box-border relative">
                        {/* Search Input Box */}
                        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[280px] lg:max-w-[320px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by Employee Code..."
                                value={searchEmployeeCode}
                                onChange={handleSearchChange}
                                onKeyDown={handleSearchInputKeyDown}
                                className="w-full h-11 sm:h-10 border border-slate-200 rounded-full sm:rounded-xl pl-10 pr-4 text-xs sm:text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all box-border"
                                autoComplete="off"
                            />
                        </div>

                        {/* Action Buttons: 2x2 grid on mobile screens, row on desktop */}
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
                                onClick={() => handleClick("bulk")}
                            >
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate">Bulk Upload</span>
                            </button>

                            <button
                                type="button"
                                className="flex items-center justify-center gap-1.5 sm:gap-2.5 h-10 sm:h-11 px-3 sm:px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_4px_15px_rgba(8,33,54,0.25)] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase rounded-full transition-all shadow-md cursor-pointer select-none text-center"
                                onClick={() => handleClick("new")}
                            >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate">Create New</span>
                            </button>
                        </div>
                    </div>

                    {/* Show ONLY ONE TABLE at a time based on activeTable */}
                    {activeTable === 'search' && (searchResults && searchResults.length > 0) && (
                        renderTable(searchResults, "Search Results")
                    )}

                    {/* Show ONLY ONE TABLE at a time based on activeTable */}
                    {activeTable === 'all' && (allEmployeesResults && allEmployeesResults.length > 0) && (
                        renderTable(allEmployeesResults, "All Employee Records")
                    )}
                </>
            )}

            {activePanel !== null && (
                <button
                    type="button"
                    className=" min-h-[38px] min-w-[92px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border-0 rounded-lg cursor-pointer z-10 active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5"
                    onClick={handleBack}
                >
                    &larr; Back
                </button>
            )}

            {activePanel !== null && (
                <div className="w-full mx-auto mt-4 p-0 box-border relative">
                    {activePanel === "bulk" && (
                        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
                            {/* Hero Header */}
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
                                        Download the pre-formatted Excel sheet, fill your candidate verification records, and upload for automated batch processing.
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

                            {/* 2-Step Action Grid */}
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
                                            Get the official Excel spreadsheet (<code>.xlsx</code>) pre-configured with headers and sample records matching the Single Employee Entry form.
                                        </p>

                                        {/* Included Column Chips */}
                                        <div className="mb-6">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                                                Pre-configured Columns (16 Fields):
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    "First Name",
                                                    "Middle Name",
                                                    "Last Name",
                                                    "Employee Code",
                                                    "Email",
                                                    "Mobile No",
                                                    "Department",
                                                    "Last Position Held",
                                                    "Date of Joining",
                                                    "Date of Leaving",
                                                    "Annual Salary",
                                                    "Employment Type",
                                                    "Exit Formalities",
                                                    "Any Behaviour Issue",
                                                    "Eligibility to Rehire"
                                                ].map((col, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-lg border border-slate-200/70"
                                                    >
                                                        {col}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleDownloadExcelSample}
                                        className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer select-none"
                                    >
                                        <Download className="w-5 h-5 shrink-0" />
                                        <span>Download Sample Template (.xlsx)</span>
                                    </button>
                                </div>

                                {/* Step 2: Upload Completed File */}
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
                                                Select or drop your populated Excel spreadsheet (<code>.xlsx</code> / <code>.xls</code>) to validate and insert records.
                                            </p>

                                            {/* Drag & Drop Zone */}
                                            <div
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                                                    isDragging
                                                        ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                                                        : selectedFile
                                                        ? 'border-emerald-300 bg-emerald-50/30'
                                                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                                                }`}
                                            >
                                                <input
                                                    type="file"
                                                    accept=".xlsx, .xls"
                                                    onChange={handleFileChange}
                                                    id="bulk-excel-input"
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                                />

                                                {selectedFile ? (
                                                    <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                                                        <div className="flex items-center gap-3 min-w-0 text-left">
                                                            <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                                <FileSpreadsheet className="w-5 h-5" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                                                    {selectedFile.name}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 font-mono">
                                                                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to submit
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedFile(null);
                                                            }}
                                                            className="relative z-20 text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                                            title="Remove file"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-4">
                                                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                                                            <Upload className="w-6 h-6" />
                                                        </div>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                                                            Drop your Excel file here or <span className="text-indigo-600 underline">browse</span>
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 mt-1">
                                                            Supports .xlsx and .xls workbooks
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Company Select if applicable */}
                                            {showContributorField && (
                                                <div className="mt-4 text-left">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                                                        Target Contributor / Client Organization
                                                    </label>
                                                    {showCompanyDropdown ? (
                                                        <select
                                                            value={company}
                                                            onChange={handleCompanyChange}
                                                            className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                                                            required
                                                        >
                                                            <option value="Contributor">Select Contributor</option>
                                                            {organizationsList.map((org) => (
                                                                <option key={org} value={org}>
                                                                    {org}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={company}
                                                            readOnly
                                                            className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs sm:text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                                                            tabIndex={-1}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={uploading || !selectedFile}
                                            className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed select-none"
                                        >
                                            <FileCheck className="w-5 h-5 shrink-0" />
                                            <span>{uploading ? "Processing & Ingesting..." : "Process & Upload Excel File"}</span>
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Guidelines & Compliance Card */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8">
                                <div className="flex items-center gap-2 mb-4 text-slate-900">
                                    <Info className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm sm:text-base font-bold">
                                        Data Formatting Guidelines
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-bold text-slate-900 block mb-1">
                                            📅 Date Format
                                        </span>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Use standard <code>YYYY-MM-DD</code> dates (e.g. <code>2024-01-31</code>) for Joining & Leaving dates.
                                        </p>
                                    </div>

                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-bold text-slate-900 block mb-1">
                                            💼 Employment Types
                                        </span>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Accepted values: <code>Full-Time</code>, <code>Part-Time</code>, <code>Contract</code>, or <code>Intern</code>.
                                        </p>
                                    </div>

                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70">
                                        <span className="text-xs font-bold text-slate-900 block mb-1">
                                            💰 Salary & Numbers
                                        </span>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Input numeric salary values without currency symbols or commas (e.g. <code>1200000</code>).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === "new" && (
                        <form
                            className="w-full flex flex-col items-stretch bg-transparent box-border"
                            autoComplete="off"
                            onSubmit={handleNewSubmit}
                        >
                            <h3 className="m-0 text-xl font-bold text-slate-800 text-left mb-1">
                                Create New Employee
                            </h3>
                            <p className="m-0 text-[13px] text-slate-500 text-left mb-6">
                                Input candidate records for verification and registry compliance.
                            </p>

                            <div className="w-full py-2.5">
                                {/* Personal Details Section */}
                                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-500 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-emerald-500"></span>
                                        Personal Details
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {renderFormField("FirstName", "First Name", "First Name", "text", true)}
                                        {renderFormField("MiddleName", "Middle Name", "Middle Name", "text", false)}
                                        {renderFormField("LastName", "Last Name", "Last Name", "text", true)}
                                        {renderFormField("Email", "Email ID", "Email ID", "email", true)}
                                        {renderFormField("MobileNo", "Mobile No", "Mobile No", "text", true)}
                                    </div>
                                </div>

                                {/* Employment Details Section */}
                                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-500 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-blue-500"></span>
                                        Employment Details
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {renderFormField("EmployeeCode", "Employee Code", "Employee Code", "text", true)}
                                        {renderFormField("Department", "Department", "Department", "text", true)}
                                        {renderFormField("LastPositionHeld", "Last Position Held", "Last Position Held", "text", false)}
                                        {renderFormField("DateOfJoining", "Date of Joining", "Date of Joining", "date", true)}
                                        {renderFormField("DateOfLeaving", "Date of Leaving", "Date of Leaving", "date", false)}
                                        {renderFormField("LastSalaryAnnual", "Last Salary Annual (₹)", "Last Salary Annual", "number", true)}
                                        {renderFormField("EmploymentType", "Employment Type", "Employment Type", "text", true, ["Full-Time", "Part-Time", "Intern", "Contract"])}
                                    </div>
                                </div>

                                {/* Compliance & Conduct Section */}
                                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-500 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-amber-500"></span>
                                        Compliance & Conduct
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {renderFormField("ExitFormalities", "Exit Formalities", "Exit Formalities", "text", true, ["Completed", "Pending", "Ongoing"])}
                                        {renderFormField("AnyBehaviourIssue", "Any Behavior Issues", "Any Behavior Issues", "text", false)}
                                        {renderFormField("EligibilityToRehire", "Eligibility to Rehire", "Eligibility to Rehire", "text", true, ["Yes", "No"])}
                                        
                                        {showContributorField && (
                                            <div className="flex flex-col gap-1.5 text-left">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Company (Client) <span className="text-rose-500">*</span>
                                                </label>
                                                {showCompanyDropdown ? (
                                                    <select
                                                        name="Contributor"
                                                        value={form.Contributor}
                                                        onChange={handleInputChange}
                                                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all"
                                                        required
                                                    >
                                                        <option value="Contributor">Select Contributor</option>
                                                        {organizationsList.map((org) => (
                                                            <option key={org} value={org}>
                                                                {org}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        name="Contributor"
                                                        value={form.Contributor}
                                                        readOnly
                                                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm text-slate-400 bg-slate-50 cursor-not-allowed border-slate-300"
                                                        tabIndex={-1}
                                                    />
                                                )}
                                            </div>
                                        )}
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

                    {activePanel === "edit" && (
                        <form
                            className="w-full flex flex-col items-stretch bg-transparent box-border"
                            autoComplete="off"
                            onSubmit={handleUpdateSubmit}
                        >
                            <h3 className="m-0 text-[1.35rem] font-bold text-slate-800 text-left mb-1">
                                Update Employee Details
                            </h3>
                            <p className="m-0 text-[13px] text-slate-500 text-left mb-6">
                                Edit candidate records for verification and registry compliance.
                            </p>

                            <div className="w-full py-2.5">
                                {/* Personal Details Section */}
                                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-600 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                                        <span className="inline-block w-[7px] h-[7px] rounded-full mr-2 bg-emerald-500"></span>
                                        Personal Details
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {renderFormField("FirstName", "First Name", "First Name", "text", true)}
                                        {renderFormField("MiddleName", "Middle Name", "Middle Name", "text", false)}
                                        {renderFormField("LastName", "Last Name", "Last Name", "text", true)}
                                        {renderFormField("Email", "Email ID", "Email ID", "email", true)}
                                        {renderFormField("MobileNo", "Mobile No", "Mobile No", "text", true)}
                                    </div>
                                </div>

                                {/* Employment Details Section */}
                                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-600 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                                        <span className="inline-block w-[7px] h-[7px] rounded-full mr-2 bg-blue-500"></span>
                                        Employment Details
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {renderFormField("EmployeeCode", "Employee Code", "Employee Code", "text", true)}
                                        {renderFormField("Department", "Department", "Department", "text", true)}
                                        {renderFormField("LastPositionHeld", "Last Position Held", "Last Position Held", "text", false)}
                                        {renderFormField("DateOfJoining", "Date of Joining", "Date of Joining", "date", true)}
                                        {renderFormField("DateOfLeaving", "Date of Leaving", "Date of Leaving", "date", false)}
                                        {renderFormField("LastSalaryAnnual", "Last Salary Annual (₹)", "Last Salary Annual", "number", true)}
                                        {renderFormField("EmploymentType", "Employment Type", "Employment Type", "text", true, ["Full-Time", "Part-Time", "Intern", "Contract"])}
                                    </div>
                                </div>

                                {/* Compliance & Conduct Section */}
                                <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5 shadow-sm box-border">
                                    <div className="text-[12.5px] font-extrabold tracking-wider uppercase text-slate-600 mb-5 pb-2.5 border-b border-slate-100 flex items-center box-border text-left">
                                        <span className="inline-block w-[7px] h-[7px] rounded-full mr-2 bg-amber-500"></span>
                                        Compliance & Conduct
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {renderFormField("ExitFormalities", "Exit Formalities", "Exit Formalities", "text", true, ["Completed", "Pending", "Ongoing"])}
                                        {renderFormField("AnyBehaviourIssue", "Any Behavior Issues", "Any Behavior Issues", "text", false)}
                                        {renderFormField("EligibilityToRehire", "Eligibility to Rehire", "Eligibility to Rehire", "text", true, ["Yes", "No"])}
                                        
                                        {showContributorField && (
                                            <div className="flex flex-col gap-[6px] text-left">
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
                                                        <option value="Contributor">Select Contributor</option>
                                                        {organizationsList.map((org) => (
                                                            <option key={org} value={org}>
                                                                {org}
                                                            </option>
                                                        ))}
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
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className={`${btnClass} self-center mx-auto mt-3`}
                                disabled={submittingUpdate}
                            >
                                {submittingUpdate ? "Updating..." : "Update Employee"}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </section>
    );
}

export default AddEmployee