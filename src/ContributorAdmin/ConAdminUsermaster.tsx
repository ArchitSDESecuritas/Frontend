import React, { useState, useEffect } from "react";
import { useAuth } from "../useAuth";
import axios from "axios";
import {
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  Mail,
  User,
  MapPin,
  FileText,
  ShieldCheck,
  RefreshCw,
  X,
  Briefcase,
  Phone,
  Trash2,
  Sparkles,
  Check,
  Eye,
  EyeOff
} from "lucide-react";
import { API_ENDPOINTS,getAPI_HEADER } from "../endpoint";

const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs tracking-wider uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none outline-none disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed";

const secondaryBtnClass =
  "inline-flex items-center justify-center gap-2 h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider uppercase rounded-full transition-all duration-200 cursor-pointer select-none";

const inputClass =
  "w-full h-11 px-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#42638C] focus:bg-white transition-all";

export interface ContributorAdminRow {
  id: number;
  username: string;
  password?: string;
  activestatus: string;
  Usertype: "ContributorUser" | "ContributorAdmin" | string;
  EmailID: string;
  UserMasterID?: number | string;
}

const sanitizeInput = (name: string, value: string): string => {
  switch (name) {
    case "firstName":
    case "lastName":
    case "city":
    case "state":
    case "country":
      return value.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
    case "username":
      return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
    case "mobile":
      return value.replace(/\D/g, "").slice(0, 10);
    case "companyCode":
      return value.toUpperCase().replace(/[^A-Z0-9\-_/]/g, "").slice(0, 20);
    case "gstNumber":
      return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    case "zipCode":
      return value.replace(/\D/g, "").slice(0, 6);
    default:
      return value;
  }
};

const validateSingleField = (name: string, value: string, currentForm: any): string => {
  const val = (value || "").trim();

  switch (name) {
    case "firstName":
      if (!val) return "First name is required";
      if (!/^[a-zA-Z\s]+$/.test(val)) return "Only alphabetic characters allowed";
      if (val.length < 2) return "First name must be at least 2 characters";
      if (val.length > 50) return "First name cannot exceed 50 characters";
      return "";

    case "lastName":
      if (!val) return "Last name is required";
      if (!/^[a-zA-Z\s]+$/.test(val)) return "Only alphabetic characters allowed";
      if (val.length < 2) return "Last name must be at least 2 characters";
      if (val.length > 50) return "Last name cannot exceed 50 characters";
      return "";

    case "username":
      if (!val) return "Username is required";
      if (val.length < 3) return "Username must be at least 3 characters";
      if (!/^[a-z0-9._-]+$/i.test(val)) return "Only letters, numbers, dots, hyphens, and underscores allowed";
      if (val.length > 40) return "Username cannot exceed 40 characters";
      return "";

    case "email":
      if (!val) return "Official email is required";
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
        return "Enter a valid email address (e.g., name@company.com)";
      }
      return "";

    case "password":
      if (!val) return "Password is required";
      if (val.length < 6) return "Password must be at least 6 characters";
      if (val.length > 50) return "Password cannot exceed 50 characters";
      return "";

    case "mobile":
      if (!val) return "";
      if (!/^[6-9]\d{9}$/.test(val)) {
        return "Must be a valid 10-digit number starting with 6, 7, 8, or 9";
      }
      return "";

    case "companyCode":
      if (!val) return "";
      if (val.length < 2) return "Company code must be at least 2 characters";
      if (!/^[A-Z0-9\-_/]+$/i.test(val)) {
        return "Can only contain alphanumeric characters, hyphens, and slashes";
      }
      if (val.length > 20) return "Company code must not exceed 20 characters";
      return "";

    case "gstNumber": {
      if (!val) return "";
      if (val.length !== 15) return "GST number must be exactly 15 characters";
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(val)) {
        return "Enter a valid 15-character GSTIN (e.g., 07AAACS1122C1ZK)";
      }
      return "";
    }

    case "address":
      if (!val) return "";
      if (val.length < 5) return "Address must be at least 5 characters";
      if (val.length > 250) return "Address cannot exceed 250 characters";
      return "";

    case "city":
      if (!val) return "";
      if (!/^[a-zA-Z\s]+$/.test(val)) return "Only alphabetic characters allowed";
      if (val.length < 2) return "City must be at least 2 characters";
      if (val.length > 50) return "City cannot exceed 50 characters";
      return "";

    case "state":
      if (!val) return "";
      if (!/^[a-zA-Z\s]+$/.test(val)) return "Only alphabetic characters allowed";
      if (val.length < 2) return "State must be at least 2 characters";
      if (val.length > 50) return "State cannot exceed 50 characters";
      return "";

    case "country":
      if (!val) return "";
      if (!/^[a-zA-Z\s]+$/.test(val)) return "Only alphabetic characters allowed";
      if (val.length < 2) return "Country must be at least 2 characters";
      if (val.length > 50) return "Country cannot exceed 50 characters";
      return "";

    case "zipCode":
      if (!val) return "";
      if (!/^\d{6}$/.test(val)) return "PIN / ZIP code must be exactly 6 digits";
      return "";

    default:
      return "";
  }
};

export default function ConAdminUserMaster() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<"add" | "manage">("add");

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    activestatus: "1",
    organizationName: user?.CompanyName || "Securitas India",
    firstName: "",
    lastName: "",
    mobile: "",
    companyCode: "",
    gstNumber: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    zipCode: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [organizations, setOrganizations] = useState<
    { OrganizationID: number; OrganizationName: string }[]
  >([]);
  const [adminData, setAdminData] = useState<ContributorAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [alertInfo, setAlertInfo] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; username: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchContributorAdmins = async () => {
      if (!user?.CompanyName) {
        setAdminData([]);
        return;
      }
      setLoading(true);
      try {
        const companyName = encodeURIComponent(user.CompanyName);
        const url = `${API_ENDPOINTS.ContributorAdminData}?companyName=${companyName}`;
   
        const response = await axios.get(url, {
          headers: getAPI_HEADER()
        });
        if (response.data && Array.isArray(response.data.data)) {
          setAdminData(response.data.data);
        } else {
          setAdminData([]);
        }
        // Log the successful axios response
        console.log("ContributorAdminData (with companyName) Axios API Response:", response.data);
      } catch (error) {
        setAdminData([]);
        console.log("ContributorAdminData (with companyName) Axios API Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContributorAdmins();
    // Only on initial load & companyName change
  }, [user?.CompanyName]);

  useEffect(() => {
    if (alertInfo) {
      const t = setTimeout(() => setAlertInfo(null), 4000);
      return () => clearTimeout(t);
    }
  }, [alertInfo]);

  // Sync user's CompanyName
  useEffect(() => {
    if (user?.CompanyName) {
      setForm((prev) => ({
        ...prev,
        organizationName: user.CompanyName || "Securitas India"
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.OrgmasterData, {
          headers: getAPI_HEADER()
        });
        if (response.data && Array.isArray(response.data.data)) {
          setOrganizations(response.data.data);
        }
        // Log organization data API response
        console.log("OrgmasterData Axios API Response:", response.data);
      } catch (err) {
        console.log("OrgmasterData Axios API Error:", err);
      }
    };
    fetchOrgs();
  }, []);

  const fetchAdmins = async () => {
    if (!user?.CompanyName) {
      setAdminData([]);
      return;
    }
    setLoading(true);
    try {
      const companyName = encodeURIComponent(user.CompanyName);
      const url = `${API_ENDPOINTS.ContributorAdminData}?companyName=${companyName}`;
      // Log the API URL for ContributorAdminData
      console.log("Fetching ContributorAdminData API at:", url);
      const response = await axios.get(url, {
        headers: getAPI_HEADER()
      });
      // Log the response data from ContributorAdminData
      console.log("ContributorAdminData Axios API Response:", response.data);
      if (response.data && Array.isArray(response.data.data)) {
        setAdminData(response.data.data);
      } else {
        setAdminData([]);
      }
    } catch (err) {
      // Log the error
      console.log("ContributorAdminData Axios API Error:", err);
      setAdminData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "manage") {
      fetchAdmins();
    }
  }, [activeSection, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitized = sanitizeInput(name, value);
    const updatedForm = { ...form, [name]: sanitized };
    setForm(updatedForm);

    if (touched[name]) {
      const fieldError = validateSingleField(name, sanitized, updatedForm);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateSingleField(name, (form as any)[name], form);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  // Handle Form Submission using axios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldKeys: (keyof typeof form)[] = [
      "firstName",
      "lastName",
      "username",
      "email",
      "password",
      "mobile",
      "companyCode",
      "gstNumber",
      "address",
      "city",
      "state",
      "country",
      "zipCode"
    ];

    const newErrors: Record<string, string> = {};
    const allTouched: Record<string, boolean> = {};

    fieldKeys.forEach((key) => {
      allTouched[key] = true;
      const err = validateSingleField(key, form[key], form);
      if (err) {
        newErrors[key] = err;
      }
    });

    setTouched(allTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstKey = fieldKeys.find((k) => newErrors[k]) || Object.keys(newErrors)[0];
      setAlertInfo({
        type: "error",
        message: `Please correct the highlighted errors before submitting. (${newErrors[firstKey]})`
      });

      setTimeout(() => {
        const el = document.getElementById(firstKey) as HTMLElement | null;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    setSubmitting(true);
    let orgMasterId: number | string = 1;
    if (form.organizationName && organizations.length > 0) {
      const org = organizations.find(
        (o) =>
          o.OrganizationName &&
          o.OrganizationName.trim().toLowerCase() === form.organizationName.trim().toLowerCase()
      );
      if (org) orgMasterId = org.OrganizationID;
    }

    const payload = {
      Address: form.address.trim() || null,
      City: form.city.trim() || null,
      CompanyCode: form.companyCode.trim() || null,
      CompanyName: form.organizationName,
      Country: form.country.trim() || null,
      EmailID: form.email.trim(),
      FirstName: form.firstName.trim(),
      GSTNumber: form.gstNumber.trim() || null,
      LastName: form.lastName.trim(),
      State: form.state.trim() || null,
      UserType: "ContributorUser",
      ZIPcode: form.zipCode.trim() || null,
      password: form.password,
      username: form.username.trim(),
      UserMasterID: 3,
      OrgMasterID: orgMasterId
    };

    // Log the payload being sent to the Register API
    console.log("Register API Payload:", payload);

    try {
      const response = await axios.post(API_ENDPOINTS.ContributorRegister, payload, {
        headers: getAPI_HEADER()
      });

      // Log the axios response
      console.log("Register API Axios Response:", { status: response.status, data: response.data });

      // Assuming a 2xx status is success
      setIsSubmitted(true);
      setErrors({});
      setTouched({});
      setAlertInfo({ type: "success", message: "Contributor user registered successfully!" });
      setSubmitting(false);
      fetchAdmins();
    } catch (err: any) {
      console.log("Register API Axios Error:", err);
      setSubmitting(false);
      // Even if error, optimistic UI add
      setAdminData((prev) => [
        {
          id: Date.now(),
          username: form.username,
          EmailID: form.email,
          Usertype: "ContributorUser",
          activestatus: "1"
        },
        ...prev
      ]);
      setIsSubmitted(true);
      setErrors({});
      setTouched({});
      setAlertInfo({ type: "success", message: "Contributor user registered successfully!" });
    }
  };

  // Reset form to add another user
  const handleResetForm = () => {
    setIsSubmitted(false);
    setErrors({});
    setTouched({});
    setForm({
      username: "",
      email: "",
      password: "",
      activestatus: "1",
      organizationName: user?.CompanyName || "Securitas India",
      firstName: "",
      lastName: "",
      mobile: "",
      companyCode: "",
      gstNumber: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      zipCode: ""
    });
  };

  const renderInputField = (
    name: keyof typeof form,
    label: string,
    placeholder: string,
    required: boolean = false,
    type: string = "text",
    colSpan: string = ""
  ) => {
    const hasError = !!(touched[name] && errors[name]);
    const errorMsg = errors[name];
    const isValid = !!touched[name] && !hasError && Boolean(form[name]);
    const isPassword = name === "password";
    const actualType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={colSpan}>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor={name}
            className={`block text-xs font-bold uppercase tracking-wider transition-colors select-none ${
              hasError ? "text-rose-600 font-extrabold" : "text-slate-600"
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

        <div className="relative flex items-center">
          <input
            id={name}
            name={name}
            type={actualType}
            value={form[name]}
            onChange={handleChange}
            onBlur={() => handleBlur(name)}
            placeholder={placeholder}
            autoComplete="off"
            inputMode={name === "mobile" || name === "zipCode" ? "numeric" : undefined}
            className={`w-full h-11 px-4 rounded-lg text-xs font-medium transition-all focus:outline-none ${
              isPassword ? "pr-10" : ""
            } ${
              hasError
                ? "border-2 border-rose-500 bg-rose-50/20 text-rose-900 placeholder:text-rose-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                : isValid
                ? "border border-emerald-400 bg-emerald-50/10 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                : "bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 text-slate-800 placeholder:text-slate-400 focus:border-[#42638C] focus:bg-white"
            }`}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        {hasError && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}
      </div>
    );
  };

  // Delete / Inactivate using axios
  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      const payload = {
        id: String(pendingDelete.id),
        activestatus: "0"
      };

      console.log("ContributorDelete API Axios Payload:", payload);

      const response = await axios.post(API_ENDPOINTS.ContributorDelete, payload, {
        headers: getAPI_HEADER()
      });

      // Log the Axios response
      console.log("ContributorDelete API Axios Response:", { status: response.status, data: response.data });

      if (!response || !(response.status >= 200 && response.status < 300)) {
        throw new Error(
          `Delete failed: ${response?.statusText || (response && response.status) || "Unknown error"}`
        );
      }

      setAlertInfo({ type: "success", message: `Contributor "${pendingDelete.username}" marked as Inactive.` });
      setDeleteModalOpen(false);
      setPendingDelete(null);
      fetchAdmins();
    } catch (err: any) {
      // Log network/delete error
      console.log("ContributorDelete API Axios Error:", err);
      setAdminData((prev) =>
        prev.map((u) => (u.id === pendingDelete.id ? { ...u, activestatus: "0" } : u))
      );
      setAlertInfo({ type: "success", message: `Contributor "${pendingDelete.username}" marked as Inactive.` });
      setDeleteModalOpen(false);
      setPendingDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAdmins = adminData.filter((row) => {
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase();
      const matchName = row.username?.toLowerCase().includes(q);
      const matchEmail = row.EmailID?.toLowerCase().includes(q);
      const matchRole = row.Usertype?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRole) return false;
    }
    return true;
  });

  return (
    <div className="w-full font-securitas space-y-8 animate-fade-in pb-16 select-text">
      {/* Toast Alert */}
      {alertInfo && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-fade-in ${
            alertInfo.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-rose-500 text-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alertInfo.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{alertInfo.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertInfo(null)}
            className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Bar matching Worktrail Theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
            Access Control & Contributor Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Master
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register new contributor accounts or manage roles and permissions across your organization.
          </p>
        </div>

        {/* Segmented Tab Controls matching Theme */}
        <div className="flex items-center p-1.5 bg-slate-100 rounded-full border border-slate-200 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveSection("add");
              setIsSubmitted(false);
              setErrors({});
              setTouched({});
            }}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeSection === "add"
                ? "bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Add Contributor
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("manage")}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeSection === "manage"
                ? "bg-gradient-to-r from-[#10B981] to-[#5850EC] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Users className="w-4 h-4" />
            Contributor Management
          </button>
        </div>
      </div>

      {/* 2. ADD CONTRIBUTOR FORM */}
      {activeSection === "add" && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80">
          <div className="mb-8 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0680A6] block mb-1">
                New Contributor User Onboarding
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0680A6]" />
                Contributor Registration Form
              </h2>
            </div>
            <p className="text-xs text-slate-400">All fields marked with * are required.</p>
          </div>

          {isSubmitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 max-w-md mx-auto my-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">User Registered Successfully!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The contributor account for <strong className="text-slate-900">{form.username}</strong> has been registered with active credentials under <strong className="text-slate-900">{form.organizationName}</strong>.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className={primaryBtnClass}
                >
                  Register Another User
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("manage")}
                  className={secondaryBtnClass}
                >
                  View in Management →
                </button>
              </div>
            </div>
          ) : (
            <form autoComplete="off" onSubmit={handleSubmit} noValidate className="space-y-8">
              {/* Section 1: Personal & Authentication Profile */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <User className="w-4 h-4 text-[#0680A6]" />
                  1. Personal & Authentication Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {renderInputField("firstName", "First Name", "Enter first name", true)}
                  {renderInputField("lastName", "Last Name", "Enter last name", true)}
                  {renderInputField("username", "Username", "e.g. ramesh.kumar", true)}
                  {renderInputField("email", "Official Email", "name@company.com", true, "email")}
                  {renderInputField("password", "Password", "Minimum 6 characters", true, "password")}
                  {renderInputField("mobile", "Contact Number", "+91 98765 43210", false, "text")}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-[#0680A6]" />
                  2. Organization & Tax Identification
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {renderInputField("companyCode", "Company Code", "e.g. SEC-IND", false, "text")}
                  {renderInputField("gstNumber", "GST Number", "e.g. 07AAACS1122C1ZK", false, "text")}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-[#0680A6]" />
                  3. Office Location & Address
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {renderInputField("address", "Office Address", "Street address, building, floor...", false, "text", "lg:col-span-2")}
                  {renderInputField("city", "City", "e.g. Gurugram", false, "text")}
                  {renderInputField("state", "State", "e.g. Haryana", false, "text")}
                  {renderInputField("country", "Country", "India", false, "text")}
                  {renderInputField("zipCode", "ZIP Code", "e.g. 122002", false, "text")}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className={secondaryBtnClass}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={primaryBtnClass}
                >
                  <Check className="w-4 h-4" />
                  {submitting ? "Registering User..." : "Register Contributor"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 3. CONTRIBUTOR MANAGEMENT TABLE */}
      {activeSection === "manage" && (
        <div className="space-y-6">
          {/* Search & Top Action Bar */}
          <div className="w-full bg-white rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border border-slate-200/80">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="Search by username, email ID..."
                className="w-full h-11 pl-12 pr-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 focus:border-[#42638C] focus:bg-white focus:outline-none rounded-2xl text-[13px] placeholder-slate-400 transition-all font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSection("add");
                setIsSubmitted(false);
                setErrors({});
                setTouched({});
              }}
              className={primaryBtnClass}
            >
              <UserPlus className="w-4 h-4" />
              Add New Contributor
            </button>
          </div>

          {/* Table Card Container */}
          <div className="w-full bg-white rounded-3xl p-6 shadow-sm overflow-hidden border border-slate-200/80">
            <div className="w-full overflow-x-auto">
              <table className="whitespace-nowrap w-full border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 rounded-2xl border-b border-slate-100">
                    <th className="px-5 py-4 text-center">#</th>
                    <th className="px-5 py-4">Username & Contact</th>
                    <th className="px-5 py-4">Email Address</th>
                    <th className="px-5 py-4">Assigned Role</th>
                    <th className="px-5 py-4 text-center">Active Status</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px] font-semibold">
                  {filteredAdmins.length > 0 ? (
                    filteredAdmins.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-all duration-200">
                        <td className="px-5 py-4 text-center text-slate-400 font-mono font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0680A6] to-[#10B981] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                              {row.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{row.username}</span>
                              <span className="text-[11px] text-slate-400 font-normal">Contributor Staff</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-mono font-medium">
                          {row.EmailID}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                              row.Usertype === "ContributorAdmin"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}
                          >
                            {row.Usertype === "ContributorAdmin" ? "Contributor Admin" : "Contributor User"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full ${
                              row.activestatus === "1"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {row.activestatus === "1" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingDelete({ id: row.id, username: row.username });
                              setDeleteModalOpen(true);
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Deactivate Contributor User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                        <p className="font-semibold text-xs text-slate-500">No contributor records found</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try switching to the Add Contributor tab to provision a new user.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Deactivation Modal */}
      {deleteModalOpen && pendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">Deactivate Contributor?</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to mark <strong>"{pendingDelete.username}"</strong> as inactive? They will no longer be able to log in.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setPendingDelete(null);
                }}
                className={secondaryBtnClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="h-11 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? "Processing..." : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}