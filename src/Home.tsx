import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
  Users,
  Handshake,
  LogIn,
  CreditCard,
  Cpu,
  Eye,
  FileText,
  Clock,
  AlertTriangle,
  Zap,
  Lock,
  Sun,
  Moon,
  ChevronDown,
  Check,
  ChevronsRight,
} from "lucide-react";
import { motion, useInView, animate } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { API_ENDPOINTS } from "./endpoint";
import bannerVideo from "./assets/video/banner-video.mp4";
import logoWhite from "./assets/Img/logo_w.png";
import logoBlack from "./assets/Img/logo_b.png";
import challengeImg from "./assets/Img/Screenshot 2026-09-28 165143.png";
import worldMapImg from "./assets/Img/World-Map.png";
import ctaBgImg from "./assets/Img/background-image-removebg.png";
import Footer from "./Components/Footer";
import axios from "axios"; // ADDED

const CloudLockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16.5H6a4 4 0 0 1-.4-7.98 5 5 0 0 1 9.8-1.5A4.5 4.5 0 0 1 18 12a4 4 0 0 1-.5 2" />
    <rect x="9.5" y="12.5" width="5.5" height="4.5" rx="1" />
    <path d="M10.8 12.5v-1.2a1.4 1.4 0 0 1 2.8 0v1.2" />
  </svg>
);

const AutomateIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="5" height="5" rx="1" />
    <rect x="15" y="15" width="5" height="5" rx="1" />
    <path d="M9 6.5h6.5a2.5 2.5 0 0 1 2.5 2.5v3.5" />
    <path d="M15 17.5H8.5A2.5 2.5 0 0 1 6 15v-3.5" />
    <polyline points="15.5 10.5 18 13 20.5 10.5" />
    <polyline points="8.5 13.5 6 11 3.5 13.5" />
  </svg>
);

const ShieldEyeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.5s7.5-3.8 7.5-9.5V5.5L12 2.5 4.5 5.5V12c0 5.7 7.5 9.5 7.5 9.5z" />
    <path d="M8.5 12c.9-1.8 2.1-2.6 3.5-2.6s2.6.8 3.5 2.6c-.9 1.8-2.1 2.6-3.5 2.6s-2.6-.8-3.5-2.6z" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
  </svg>
);

const IntegrateIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    <path d="m5.3 5.3 2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    <circle cx="12" cy="2.5" r="1" fill="currentColor" />
    <circle cx="12" cy="21.5" r="1" fill="currentColor" />
    <circle cx="2.5" cy="12" r="1" fill="currentColor" />
    <circle cx="21.5" cy="12" r="1" fill="currentColor" />
    <circle cx="5.3" cy="5.3" r="0.8" fill="currentColor" />
    <circle cx="18.7" cy="18.7" r="0.8" fill="currentColor" />
    <circle cx="5.3" cy="18.7" r="0.8" fill="currentColor" />
    <circle cx="18.7" cy="5.3" r="0.8" fill="currentColor" />
  </svg>
);

const ShieldClockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.5s7.5-3.8 7.5-9.5V5.5L12 2.5 4.5 5.5V12c0 5.7 7.5 9.5 7.5 9.5z" />
    <circle cx="12" cy="12" r="3.5" />
    <polyline points="12 10.2 12 12 13.5 12.9" />
  </svg>
);

interface SolutionCardItem {
  id: string;
  title: string;
  copy: string;
  Icon: React.ComponentType;
}

const solutions: SolutionCardItem[] = [
  {
    id: "centralise",
    title: "Centralise\nWith\nConfidence",
    copy: "Keep all exited employee records in one secure location.",
    Icon: CloudLockIcon,
  },
  {
    id: "automate",
    title: "Automate\nWith Ease",
    copy: "Streamline third-party verifications through real-time APIs or simple file uploads.",
    Icon: AutomateIcon,
  },
  {
    id: "control",
    title: "Control With\nClarity",
    copy: "Define how your data is used, shared, and accessed.",
    Icon: ShieldEyeIcon,
  },
  {
    id: "integrate",
    title: "Integrate\nSeamlessly",
    copy: "Connect effortlessly with your HRMS or run Worktrail independently, even offline.",
    Icon: IntegrateIcon,
  },
  {
    id: "uptime",
    title: "Quick\nUptime",
    copy: "99.99% uptime ensures uninterrupted access whenever you need it.",
    Icon: ShieldClockIcon,
  },
];


const topRibbonItems = [
  "Data Protection",
  "Fraud Prevention",
  "Integrity Matters",
  "Hire with Confidence",
  "Ex-Employee Verification",
  "Automated Compliance",
  "Audit-Ready Records",
  "Authentic Credentials",
  "Data Protection",
  "Fraud Prevention",
  "Integrity Matters",
  "Hire with Confidence",
];

const bottomRibbonItems = [
  "Fraud Prevention",
  "Integrity Matters",
  "Hire with Confidence",
  "Identity Authentication",
  "Trusted Screening",
  "Direct HRMS Sync",
  "Zero Non-Compliance",
  "Bank-Grade Security",
  "Fraud Prevention",
  "Integrity Matters",
  "Hire with Confidence",
  "Identity Authentication",
];

const process: Array<[string, string, string, any]> = [
  [
    "01",
    "Login & Create Request",
    "Start by creating your request with candidate details.",
    LogIn,
  ],
  [
    "02",
    "Payment",
    "Securely complete the payment.",
    CreditCard,
  ],
  [
    "03",
    "Verification Process",
    "Our system automatically verifies data.",
    Cpu,
  ],
  [
    "04",
    "Review & Clarify",
    "Review results and raise any questions.",
    Eye,
  ],
  [
    "05",
    "Final Report",
    "Get the completed report.",
    FileCheck2,
  ],
];

interface CounterProps {
  value: number;
  suffix?: string;
}

function Counter({ value, suffix = "%" }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (inView) {
      const controls = animate(0, value, {
        duration: 2.0,
        ease: "easeOut",
        onUpdate(latest) {
          if (ref.current) {
            ref.current.textContent = Math.round(latest) + suffix;
          }
        },
      });
      return () => controls.stop();
    }
  }, [value, inView, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

const businessTypeOptions = [
  "Background Screening Agency",
  "Enterprise Employer",
  "Startup / SME",
  "Other",
];

const employeeCountOptions = [
  "1-99",
  "100-499",
  "500-1999",
  "2000+",
];

function CustomDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`form-group custom-dropdown-container ${isOpen ? "is-open" : ""}`} ref={dropdownRef}>
      <label>{label}</label>
      <div
        className={`custom-dropdown-trigger ${isOpen ? "open" : ""} ${value ? "has-value" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
          if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
      >
        <span className={value ? "dropdown-selected-text" : "dropdown-placeholder"}>
          {value || placeholder}
        </span>
        <ChevronDown size={17} className={`dropdown-chevron ${isOpen ? "rotate" : ""}`} />
      </div>

      {isOpen && (
        <div className="custom-dropdown-menu" role="listbox">
          {options.map((option) => (
            <div
              key={option}
              className={`custom-dropdown-item ${value === option ? "selected" : ""}`}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={value === option}
            >
              <span>{option}</span>
              {value === option && <Check size={15} className="dropdown-check-icon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Home() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("worktrail_home_theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("worktrail_home_theme", next);
      return next;
    });
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(4);
  const [isPaused, setIsPaused] = useState(false);
  const [benefitsTab, setBenefitsTab] = useState<"candidate" | "partner">("candidate");
  
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    companyName: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    if (!formState.firstName || !formState.lastName || !formState.email || !formState.phoneNumber || !formState.companyName || !formState.message) {
      setFormError("Please fill out all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (import.meta.env.DEV) {
        console.log("[Contact API] Submit Request:", formState);
      }
      const postData = {
        username: `${formState.firstName}_${formState.lastName}`.trim().toLowerCase().replace(/\s+/g, "_") + "_lead",
        password: "LeadUserTempPassword@123",
        UserType: "Lead",
        EmailID: formState.email,
        FirstName: formState.firstName,
        LastName: formState.lastName,
        CompanyName: formState.companyName,
        GSTNumber: "",
        Address: formState.message,
        City: "",
        State: "",
        Country: formState.phoneNumber,
        ZIPcode: ""
      };
      let responseData: any;

      try {
        const response = await axios.post(
          API_ENDPOINTS.auth.register,
          postData,
          {
            headers: {
              APIKEY: "Securitas@#!1234",
              "Content-Type": "application/json",
            },
          }
        );
        responseData = response.data;
      } catch (axiosError: any) {
        // Try to get the error body for consistent handling
        responseData =
          axiosError.response?.data ||
          { message: axiosError.message || "Connection error. Please try again." };
        throw new Error(
          responseData.message ||
            (typeof responseData === "string" ? responseData : "Something went wrong. Please try again.")
        );
      }

      setFormSuccess("Thank you! We've received your request and will connect with you soon.");
      setFormState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        companyName: "",
        message: ""
      });
    } catch (err: any) {
      setFormError(err.message || "Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(
      () => setActiveStep((step) => (step + 1) % process.length),
      2500,
    );
    return () => window.clearInterval(timer);
  }, [isPaused]);

  return (
    <main
      className={`home-page ${theme}`}
      style={{ backgroundColor: theme === "light" ? undefined : "#061325" }}
    >
      <header className="home-header">
        <div className="home-container home-nav">
          <motion.a
            className="securitas-logo"
            href="https://www.securitas.in"
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img
              className="public-logo"
              src={theme === "light" ? logoBlack : logoWhite}
              alt="Securitas Logo"
            />
          </motion.a>
          <nav className={menuOpen ? "home-menu open" : "home-menu"}>
            <a href="#solutions" onClick={() => setMenuOpen(false)}>
              Solutions
            </a>
            <a href="#process" onClick={() => setMenuOpen(false)}>
              How It Works
            </a>
            <a href="#resources" onClick={() => setMenuOpen(false)}>
              Resources
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            <Link className="nav-login" to="/login">
              Login
            </Link>
            <a
              className="nav-cta"
              href="#contact"
              onClick={() => setMenuOpen(false)}
            >
              Get Started <ArrowRight size={15} />
            </a>
            {/* <button
              type="button"
              className="theme-toggle-btn desktop-theme-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <>
                  <Sun size={15} className="theme-toggle-icon sun" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="theme-toggle-icon moon" />
                  <span>Dark</span>
                </>
              )}
            </button> */}
          </nav>
          <div className="home-nav-mobile-bar">
            {/* <button
              type="button"
              className="theme-toggle-btn mobile-theme-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun size={18} className="theme-toggle-icon sun" />
              ) : (
                <Moon size={18} className="theme-toggle-icon moon" />
              )}
            </button> */}
            <button
              className="menu-toggle"
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <section className="home-hero">
        {/* Full-bleed Background Video */}
        <div className="hero-bg-video-wrapper" aria-hidden="true">
          <video
            className="hero-bg-video"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={bannerVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="hero-bg-overlay"></div>
        </div>

        <div className="home-container hero-layout">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <p className="home-kicker">Secure workforce intelligence</p>
            <h1>
              Worktrail: Drowning in Manual Verification Requests & Compliance Risks?
            </h1>
            <p>
              Hiring for complex work environments? Streamline background screening with a faster, smarter approach. Move beyond outdated checks to get better visibility into employee history and credentials.
            </p>
            <div className="hero-cta-group">
              <a className="hero-button" href="#contact">
                Get in Touch <ArrowRight size={17} />
              </a>
            </div>
          </motion.div>
        </div>
        <div className="hero-fade"></div>
      </section>

      <motion.section
        className="intro-section"
        id="solutions"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, visible: {} }}
      >
        <motion.div
          className="intro-container intro-copy"
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="intro-main-title">
            <span className="intro-brand-title">WorkTrail</span>
            <span className="intro-title-white"> - Simplifying the Verification Journey</span>
          </h2>
          <p className="intro-subtitle">Secure. Scalable. Instant Solution</p>
          <p className="intro-description">
            WorkTrail provides businesses with a secure, scalable, and instant solution to manage exited employee records. It centralises, controls, and automates the entire verification workflow.
          </p>
        </motion.div>
        
        <div className="intro-container solution-grid">
          {solutions.map((item, index) => (
            <motion.article
              className="solution-card"
              key={item.id}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <div className="card-purple-glow" />
              <div className="solution-icon-badge">
                <item.Icon />
              </div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

    

      <section className="challenge-section" id="resources">
        <div className="home-container challenge-layout">
          <motion.div 
            className="challenge-copy"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h2>The Challenge</h2>
            <p className="challenge-subhead">
              to convert compliance risks into<br />
              measurable business impact
            </p>

            <div className="challenge-image-wrapper">
              <img 
                src={challengeImg} 
                alt="The Challenge - Verification Overview" 
                className="challenge-img" 
              />
            </div>
            
            <p className="challenge-desc">
              A mid-sized supply chain firm with high employee turnover, was overwhelmed. Their HR team received
            </p>

            <div className="challenge-callout-highlight">
              50+ emails &amp; calls weekly from<br />
              third-party verifiers
            </div>

            <p className="challenge-desc">
              asking to confirm details of former employees. This manual process was delaying their own recruitment efforts, creating compliance risks regarding data privacy, &amp; offering zero return on investment.
            </p>

            <a href="#contact" className="challenge-get-started-btn">
              Get Started
            </a>
          </motion.div>
          
          <div className="impact-stack">
            {/* The Solution Card */}
            <motion.article 
              className="impact-card solution-impact"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              whileHover={{ 
                y: -6, 
                boxShadow: "0 20px 45px rgba(155, 119, 255, 0.25)",
                borderColor: "rgba(155, 119, 255, 0.6)"
              }}
            >
              <h3>The Solution</h3>
              <p className="impact-card-intro">
                The firm onboarded onto Worktrail as a &quot;Contributor.&quot; They uploaded their master ex-employee data into our secure, encrypted environment
              </p>
              
              <div className="card-two-cols">
                <div className="card-feature-item">
                  <div className="feature-icon-wrapper purple">
                    <Cpu size={22} />
                  </div>
                  <p>
                    <strong>Automation:</strong> Instead of HR manually digging through files, our APIs automatically matched incoming requests against the uploaded records.
                  </p>
                </div>

                <div className="card-feature-item">
                  <div className="feature-icon-wrapper purple">
                    <Database size={22} />
                  </div>
                  <p>
                    <strong>Centralization:</strong> All verification requests were redirected to the our portal.
                  </p>
                </div>
              </div>
            </motion.article>
            
            {/* The Impact Card */}
            <motion.article 
              className="impact-card result-impact"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              whileHover={{ 
                y: -6, 
                boxShadow: "0 20px 45px rgba(77, 255, 149, 0.25)",
                borderColor: "rgba(77, 255, 149, 0.6)"
              }}
            >
              <h3>The Impact</h3>
              <p className="impact-card-intro">
                Within three months, the firm saw a complete transformation:
              </p>
              
              <div className="card-two-cols">
                <div className="card-feature-item">
                  <div className="feature-icon-wrapper green">
                    <Clock size={22} />
                  </div>
                  <p>
                    <strong>90% Reduction in Admin Work:</strong> The HR team stopped answering verification calls entirely, freeing them to focus on active hiring.
                  </p>
                </div>

                <div className="card-feature-item">
                  <div className="feature-icon-wrapper green">
                    <CreditCard size={22} />
                  </div>
                  <p>
                    <strong>New Revenue Channel:</strong> By leveraging our monetisation benefit, it began earning a fee for every verified record, turning a tedious task into a measurable business impact.
                  </p>
                </div>
              </div>
            </motion.article>
         
            {/* Glowing spotlight cone pointing downward from The Impact */}
            <div className="challenge-spotlight-beam" />

            {/* 3 Number Stats Cards Matching Mockup */}
            <div className="challenge-stats-grid">
              <motion.div 
                className="challenge-stat-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="challenge-stat-num">
                  <Counter value={90} suffix="%" />
                </div>
                <div className="challenge-stat-label">
                  Reduction in<br />Admin Work
                </div>
              </motion.div>

              <motion.div 
                className="challenge-stat-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="challenge-stat-num">
                  <Counter value={50} suffix="+" />
                </div>
                <div className="challenge-stat-label">
                  Third-party<br />Verifiers Request
                </div>
              </motion.div>

              <motion.div 
                className="challenge-stat-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="challenge-stat-num">
                  <Counter value={98} suffix="%" />
                </div>
                <div className="challenge-stat-label">
                  Faster<br />Processing Time
                </div>
              </motion.div>
            </div>  
          </div>
        </div>
      </section>

 

      <section className="process-section" id="process">
        <div className="home-container">
          <motion.div
            className="process-heading"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="process-heading-left">
              <h2>
                Process to Verify<br />
                <span className="process-heading-highlight">Ex-Employees with Ease</span>
              </h2>
            </div>
            <p className="process-heading-desc">
              Our end-to-end verification platform streamlines the entire process of validating ex-employee records with speed, accuracy, and transparency.
            </p>
          </motion.div>

          <div className="process-timeline-wrapper">
            {/* Horizontal dashed connecting line */}
            <div className="process-timeline-track" />

            <div 
              className="process-stepper-grid"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {process.map(([number, title, copy, IconComponent], index) => {
                const isActive = index === activeStep;
                const isFinal = index === process.length - 1;
                const StepIcon = isFinal ? FileCheck2 : (IconComponent || FileCheck2);

                return (
                  <motion.div
                    key={number}
                    className={`process-stepper-node ${isActive ? "active" : "inactive"}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => setActiveStep((prev) => (prev === index ? -1 : index))}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={`Step ${number}: ${title} (${isActive ? "Active" : "Inactive"})`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveStep((prev) => (prev === index ? -1 : index));
                      }
                    }}
                  >
                    {/* Circle Badge with outer halo outline on active */}
                    <div className="process-circle-badge">
                      {isActive && (
                        <motion.div 
                          className="active-floating-icon" 
                          title={title}
                          initial={{ opacity: 0, scale: 0.6, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 20 }}
                        >
                          <StepIcon size={26} strokeWidth={2} />
                        </motion.div>
                      )}
                      <span className="process-circle-number">{number}</span>
                    </div>

                    {/* Step Title */}
                    <h3 className="process-step-title">{title}</h3>

                    {/* Step Description */}
                    <p className="process-step-desc">{copy}</p>

                    {/* Active Step Chevrons Indicator */}
                    {isActive && (
                      <motion.div 
                        className="active-chevrons-arrow"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <svg className="final-chevrons-svg" width="34" height="16" viewBox="0 0 34 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 2L10 8L4 14" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M13 2L19 8L13 14" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M22 2L28 8L22 14" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      {/* Dual Angled Ribbon Marquee (Matching Reference) */}
      <section className="dual-ribbon-section" aria-label="Key highlights marquee">
        {/* Top Ribbon (Light Mint Green) */}
        <div className="ribbon-band ribbon-top">
          <motion.div
            className="ribbon-track"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          >
            {[...topRibbonItems, ...topRibbonItems].map((item, idx) => (
              <span key={`top-${idx}`} className="ribbon-item">
                <span className="ribbon-text">{item}</span>
                <span className="ribbon-separator">/</span>
              </span>
            ))}
          </motion.div>
        </div>

        {/* Bottom Ribbon (Vibrant Emerald Green) */}
        <div className="ribbon-band ribbon-bottom">
          <motion.div
            className="ribbon-track"
            animate={{ x: ["-50%", "0%"] }}
            transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          >
            {[...bottomRibbonItems, ...bottomRibbonItems].map((item, idx) => (
              <span key={`bottom-${idx}`} className="ribbon-item">
                <span className="ribbon-text">{item}</span>
                <span className="ribbon-separator">/</span>
              </span>
            ))}
          </motion.div>
        </div>
      </section>



      <section className="benefits-toggle-section">
        <div className="home-container">
          <motion.div 
            className="benefits-heading"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>What's in it for <em>YOU?</em></h2>
          </motion.div>

          <div className="benefits-tab-wrapper">
            <div className="benefits-tabs">
              <button 
                className={`benefits-tab ${benefitsTab === "candidate" ? "active" : ""}`}
                onClick={() => setBenefitsTab("candidate")}
              >
                <Users size={16} />
                Candidate
              </button>
              <button 
                className={`benefits-tab ${benefitsTab === "partner" ? "active" : ""}`}
                onClick={() => setBenefitsTab("partner")}
              >
                <Handshake size={16} />
                Client
              </button>
            </div>
          </div>

          <div className="benefits-content-layout">
            <motion.div 
              className="benefits-visual-box"
              key={benefitsTab}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <img  
                src={benefitsTab === "candidate" ? "https://worktrail.ai/static/assets/img/11.png" : "https://worktrail.ai/static/assets/img/22.png"} 
                alt={benefitsTab === "candidate" ? "Candidate" : "Partner"} 
                className="benefits-image"
              />
            </motion.div>

            <div className="benefits-details">
              {benefitsTab === "candidate" ? (
                <div className="benefits-list">
                  <motion.div className="benefit-item" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <div className="benefit-icon"><ShieldCheck size={20} /></div>
                    <div className="benefit-text">
                      <h3>Faster Hiring</h3>
                      <p>Speed up onboarding with seamless workflows & instant verification.</p>
                    </div>
                  </motion.div>
                  <motion.div className="benefit-item" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <div className="benefit-icon"><ShieldCheck size={20} /></div>
                    <div className="benefit-text">
                      <h3>Real-time visibility</h3>
                      <p>Stay updated on application status & screening progress.</p>
                    </div>
                  </motion.div>
                  <motion.div className="benefit-item" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <div className="benefit-icon"><ShieldCheck size={20} /></div>
                    <div className="benefit-text">
                      <h3>Access from anywhere</h3>
                      <p>Access the platform from any device, anywhere, anytime.</p>
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="benefits-list">
                  <motion.div className="benefit-item" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <div className="benefit-icon"><ShieldCheck size={20} /></div>
                    <div className="benefit-text">
                      <h3>Direct Integrations</h3>
                      <p>Easily connect via API or HRMS widgets with full documentation.</p>
                    </div>
                  </motion.div>
                  <motion.div className="benefit-item" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <div className="benefit-icon"><ShieldCheck size={20} /></div>
                    <div className="benefit-text">
                      <h3>Monetisation Channel</h3>
                      <p>Turn historical compliance checks into passive revenue streams.</p>
                    </div>
                  </motion.div>
                  <motion.div className="benefit-item" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <div className="benefit-icon"><ShieldCheck size={20} /></div>
                    <div className="benefit-text">
                      <h3>Secure Ecosystem</h3>
                      <p>Data privacy first design with full auditing and access control.</p>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-container">
          <motion.div 
            className="cta-aurora-card"
            style={{ backgroundImage: `url(${ctaBgImg})` }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="cta-headline">
              <span className="cta-headline-light">Modern Verification for</span>
              <span className="cta-headline-bold">Modern Businesses.</span>
            </h2>

            <a className="cta-get-started-btn" href="#contact">
              Get Started
            </a>
          </motion.div>
        </div>
      </section>

      {/* Modern Contact Form Section Matching Reference Image */}
      <section className="contact-modern-section" id="contact">
        <div className="home-container">
          {/* Centered Heading & Subtitle */}
          <motion.div 
            className="contact-modern-header"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2>Ready to Modernize Your Verification Process?</h2>
            <p>
              Our dedicated team is prepared and eager to provide you with the assistance you need, ensuring your success and satisfaction. Feel free to reach out anytime for our support
            </p>
          </motion.div>

          <div className="contact-modern-layout">
            {/* Left Column: Dark Glass Form Card */}
            <motion.div 
              className="contact-glass-card"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="glass-card-header">
                <h3>Send us a Message</h3>
                <p>Fill out the form below and we'll get back to you shortly</p>
              </div>

              <form onSubmit={handleFormSubmit} className="contact-underline-form">
                <div className="form-row-two-col">
                  <div className="underline-field">
                    <label>First Name <span className="field-req">*</span></label>
                    <input 
                      type="text" 
                      name="firstName" 
                      placeholder="Lorem" 
                      value={formState.firstName} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="underline-field">
                    <label>Last Name <span className="field-req">*</span></label>
                    <input 
                      type="text" 
                      name="lastName" 
                      placeholder="Ipsum" 
                      value={formState.lastName} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row-two-col">
                  <div className="underline-field">
                    <label>Email <span className="field-req">*</span></label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Lorem@example.com" 
                      value={formState.email} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="underline-field">
                    <label>Phone Number <span className="field-req">*</span></label>
                    <input 
                      type="tel" 
                      name="phoneNumber" 
                      placeholder="+ 1 (555) 000-000" 
                      value={formState.phoneNumber} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                </div>

                <div className="underline-field full-width">
                  <label>Company Name <span className="field-req">*</span></label>
                  <input 
                    type="text" 
                    name="companyName" 
                    placeholder="Your Company Name" 
                    value={formState.companyName} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>

                <div className="underline-field full-width">
                  <label>Message <span className="field-req">*</span></label>
                  <input 
                    type="text" 
                    name="message" 
                    placeholder="Tell us how we can help you...." 
                    value={formState.message} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>

                {formSuccess && <p className="form-feedback success">{formSuccess}</p>}
                {formError && <p className="form-feedback error">{formError}</p>}

                <div className="form-action-row">
                  <button type="submit" className="contact-modern-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Right Column: 3 Massive Stat Metrics */}
            <motion.div 
              className="contact-stats-column"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="contact-stat-block">
                <div className="contact-stat-giant-num">
                  <span className="num-digits"><Counter value={100} suffix="" /></span>
                  <span className="num-accent">+</span>
                </div>
                <p className="contact-stat-giant-label">Countries Served</p>
              </div>

              <div className="contact-stat-block">
                <div className="contact-stat-giant-num">
                  <span className="num-digits"><Counter value={99} suffix="" /></span>
                  <span className="num-accent">%</span>
                </div>
                <p className="contact-stat-giant-label">Process Up Time</p>
              </div>

              <div className="contact-stat-block">
                <div className="contact-stat-giant-num">
                  <span className="num-digits">24</span>
                  <span className="num-accent">x7</span>
                </div>
                <p className="contact-stat-giant-label">Support Available</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer theme={theme} />
    </main>

  );
}

export default Home;
