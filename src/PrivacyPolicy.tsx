import { useState,useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X, Sun, Moon } from "lucide-react";
import logoWhite from "./assets/Img/logo_w.png";
import logoBlack from "./assets/Img/logo_b.png";
import Footer from "./Components/Footer";

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
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

  return (
    <main className={`home-page privacy-policy-page ${theme}`}>
      {/* Same Header as Home Page */}
      <header className="home-header">
        <div className="home-container home-nav">
          <Link className="securitas-logo" to="/">
            <img
              className="public-logo"
              src={theme === "light" ? logoBlack : logoWhite}
              alt="Securitas Logo"
            />
          </Link>

          <nav className={menuOpen ? "home-menu open" : "home-menu"}>
            <a href="/#solutions" onClick={() => setMenuOpen(false)}>
              Solutions
            </a>
            <a href="/#process" onClick={() => setMenuOpen(false)}>
              How It Works
            </a>
            <a href="/#resources" onClick={() => setMenuOpen(false)}>
              Resources
            </a>
            <a href="/#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            <Link className="nav-login" to="/login">
              Login
            </Link>
            <a
              className="nav-cta"
              href="/#contact"
              onClick={() => setMenuOpen(false)}
            >
              Get Started <ArrowRight size={15} />
            </a>
          </nav>

          <div className="home-nav-mobile-bar">
         
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

      {/* Main Privacy Policy Content */}
      <div className="home-container privacy-page-container">
        {/* Breadcrumb: Home → Privacy Policy */}
        <div className="privacy-breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-arrow">→</span>
          <span className="breadcrumb-current">Privacy Policy</span>
        </div>

        {/* Header Block */}
        <div className="privacy-header-block">
          <h1 className="privacy-title-text">PRIVACY POLICY</h1>

        </div>

        {/* Legal Text Sections */}
        <div className="privacy-sections-content">
          {/* Section 1 */}
          <section id="section-1" className="privacy-section-item">
            <h2>1. About This Privacy Policy</h2>
            <p>
              This Privacy Policy (“Privacy Policy” or “Notice”) explains how Walsons Services Private Limited and its group affiliates (“WSPL,” “we,” “us” or “our”) collect, use, disclose, transfer, retain and protect personal data in connection with <a href="https://walsonsverify.com/" target="_blank" rel="noreferrer" className="privacy-text-link">https://walsonsverify.com/</a> and any other website, portal, API or mobile application we own or operate (the “Platform”), and the background-verification, identity-verification and related services we provide (the “Services”).
            </p>
            <p>
              This Notice should be read together with our Terms and Conditions and, where applicable, a Client’s master services agreement, order form, Data Processing Agreement, and any Candidate Disclosure &amp; Authorization. Capitalised terms not defined here have the meaning given in the Terms and Conditions. Where this Notice conflicts with a mandatory provision of applicable data protection law in the jurisdiction of an individual, that mandatory law prevails as against that individual.
            </p>
            <p>
              The Platform may contain links to third-party websites. We are not responsible for the privacy practices of those websites, and this Notice does not apply to them.
            </p>
          </section>
 


 <div className="flex justify-center sm:flex-wrap items-center w-full">
<div className="w-1/4 "></div>
  <div className="lg:w-3/4 sm:w-full ">
    
          {/* Section 2 */}
          <section id="section-2" className="privacy-section-item">
            <h2>2. Who We Are and Our Role in Processing</h2>
            <p>
              The Services involve two principal groups of individuals: the “Client” (the person or organization that requests a check for example, an employer, staffing agency, landlord, or an individual requesting a matrimonial or tenant verification) and the “Candidate” or “Data Subject” (the individual who is the subject of a check). The Services are offered on both a business-to-business (B2B) and a business-to-consumer (B2C) basis. Our role under applicable data protection law depends on the data concerned:
            </p>
            <ul className="privacy-bullet-list">
              <li>
                <strong>Candidate data collected to produce a Report — </strong>
                the Client who requests the verification is the controller, because the Client determines the purpose of the check and the personal data to be processed. WSPL acts as the processor, processing such data only on the Client’s documented instructions. In a B2B engagement the controller is the requesting organization; in a B2C engagement the controller is the individual who requests the check.
              </li>
              <li>
                <strong>Client account and billing data — </strong>
                WSPL acts as a controller and determines the purposes and means of processing, because this data relates to the operation of our own accounts and Services.
              </li>
              <li>
                <strong>Our own compliance processing (for example, mandatory sanctions and watchlist screening under Section 21.1 of the Terms) — </strong>
                WSPL acts as an independent controller, because we determine the purpose and means of that processing to meet our own legal obligations.
              </li>
            </ul>
            <p>
              The WSPL entity responsible for processing is Walsons Services Private Limited. Where the Services are delivered through, or personal data is shared with, Securitas India Private Limited or another company within the Securitas Group, that company acts under WSPL’s processor arrangements or as a joint controller for its own compliance processing, in accordance with this Notice and the applicable agreement. As processor for Candidate data, WSPL processes that data only on the Client’s instructions, does not determine the purposes of the verification, and makes the processor terms in Section 6 and a Data Processing Agreement available to Clients on request.
            </p>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="privacy-section-item">
            <h2>3. Personal Data We Collect</h2>
            <p>
              Depending on the Service and your relationship with us, we may collect and process the following categories of personal data:
            </p>

            <h3>3.1 Website and contact data</h3>
            <ul className="privacy-bullet-list">
              <li>
                Contact information you submit through our forms — name, email address, company, country and the content of your message;
              </li>
              <li>
                Browsing information — IP address, device and browser information, and cookie data (see Section 11).
              </li>
            </ul>

            <h3>3.2 Client account data</h3>
            <ul className="privacy-bullet-list">
              <li>
                Registration and identity-verification data, including account credentials and one-time-password verification of a mobile number or email;
              </li>
              <li>
                Billing and payment data, and records of your requests and use of the Services.
              </li>
            </ul>

            <h3>3.3 Candidate verification data</h3>
            <ul className="privacy-bullet-list">
              <li>
                Identity data (name, date of birth, government identifiers where lawfully required), address and contact details;
              </li>
              <li>
                Employment, education, professional-reference and credential information;
              </li>
              <li>
                Criminal-record and court-record data, where a check of that type is lawfully requested (see Section 4);
              </li>
              <li>
                Credit-history and financial information, where legally permissible and relevant to the check;
              </li>
              <li>
                Sanctions and watchlist screening data;
              </li>
              <li>
                Field-verification data, including photographs of address proof, signed verification forms, and records of an in-person visit to a specified address;
              </li>
              <li>
                Biometric data, where a Service involves it (see Section 4).
              </li>
            </ul>

            <p>
              A Report is the output of a verification Service and may contain any combination of the above. We are not the author or original creator of the underlying information; we collect and compile it from Clients, Candidates and authorized third-party sources.
            </p>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="privacy-section-item">
            <h2>4. Special-Category, Criminal-Record and Biometric Data</h2>
            <p>
              Certain data receives heightened protection under applicable law and is subject to additional safeguards, over and above our general lawful-basis obligations.
            </p>

            <h3>4.1 Criminal-record data</h3>
            <p>
              Criminal-record checks are processed only where we have a documented lawful basis. In the UK and EU, criminal-offence data is processed only in reliance on a condition permitted under UK GDPR Article 10 / Data Protection Act 2018, Schedule 1 (or equivalent EU member-state law), such as an employment-vetting obligation, fraud prevention, or explicit consent where no other condition applies. We maintain an Appropriate Policy Document describing our retention and erasure practices for such data, available to Clients and regulators on request. In the United States, criminal-history checks are additionally subject to applicable fair-chance / “ban-the-box”, salary-history and use-restriction laws, compliance with which is the Client’s responsibility.
            </p>

            <h3>4.2 Biometric data</h3>
            <p>
              Where a Service involves biometric identifiers or information (such as a facial scan or “faceprint” for photo/liveness matching against an identity document, a fingerprint, or a voiceprint):
            </p>
            <ul className="privacy-bullet-list">
              <li>
                <strong>Separate written consent. </strong>
                We will not collect a Candidate’s biometric data without first obtaining separate, informed written consent (distinct from the general disclosure/authorization), specifying the purpose and the period for which the data will be collected, stored and used, in a form satisfying applicable law — including the Illinois Biometric Information Privacy Act (BIPA), the Texas and Washington biometric statutes, and, in the UK/EU, treatment as special-category data under GDPR Article 9 requiring explicit consent or another Article 9(2) condition.
              </li>
              <li>
                <strong>Retention and destruction. </strong>
                Biometric data is retained only as long as necessary to complete the specific verification and, in any event, no longer than three (3) years from the individual’s last interaction with us or one (1) year from satisfaction of the collection purpose, whichever is earlier, after which it is permanently destroyed under a written retention schedule.
              </li>
              <li>
                <strong>No sale or profiting. </strong>
                We do not sell, lease, trade or otherwise profit from biometric data, and disclose it only to the requesting Client, a vendor bound by equivalent obligations, or as required by law.
              </li>
              <li>
                <strong>Security. </strong>
                Biometric data is stored using encryption and access controls at least as protective as those applied to our most sensitive confidential information, and is covered by the breach-notification commitments in Section 9.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="privacy-section-item">
            <h2>5. Purposes and Lawful Bases for Processing</h2>
            <p>
              We process personal data for the following purposes, relying on the lawful basis appropriate to the data and jurisdiction:
            </p>
            <ul className="privacy-bullet-list">
              <li>
                To respond to website enquiries and provide requested information or materials — relying on your consent;
              </li>
              <li>
                To register and administer Client accounts, deliver the Services, produce Reports and process payments — relying on performance of a contract and our legitimate interests;
              </li>
              <li>
                To verify Candidate information processing only on the instructions of the Client, who as controller establishes the lawful basis for the check (consent, legitimate interest, legal obligation, or another valid basis under applicable law) and warrants that basis to us under the Terms;
              </li>
              <li>
                To comply with our own legal and regulatory obligations, including mandatory sanctions and watchlist screening relying on legal obligation and legitimate interests, as an independent controller;
              </li>
              <li>
                To maintain the security and integrity of the Platform, prevent fraud and misuse, and establish, exercise or defend legal claims — relying on our legitimate interests and legal obligations.
              </li>
            </ul>
            <p>
              <strong>Candidate consent and disclosure. </strong>
              As the controller of Candidate data, the Client — whether a business (B2B) or an individual requester (B2C) — is responsible for obtaining any required consent or establishing another valid lawful basis, and for informing the Candidate of the categories of data collected, the purpose of the check, WSPL’s role as processor, and how to exercise their rights, before the Candidate’s data is submitted to us. In the United States, for employment-purpose Reports, the Client must provide a standalone FCRA disclosure and obtain written authorization before we procure the Report. A Candidate may withdraw consent, or raise a request, at any time using the contacts in Section 13; because the Client is the controller, we will act on the Client’s instructions and, where appropriate, refer the request to the Client or assist the Client in responding. Withdrawal of consent does not affect processing already carried out and may result in an incomplete or “Unable to Verify” Report.
            </p>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="privacy-section-item">
            <h2>6. How We Share Personal Data</h2>
            <ul className="privacy-bullet-list">
              <li>
                <strong>Service providers and sub-processors. </strong>
                Field-verification vendors, cloud-hosting providers, source-verification intermediaries, payment processors and technical-support providers, acting on our instructions under contractual confidentiality and data-protection obligations, and accessing no more data than needed to perform their service. A current list of sub-processors is available to Clients on request, with advance notice of intended changes and an opportunity to object on data-protection grounds.
              </li>
              <li>
                <strong>Clients. </strong>
                The Report and related data are disclosed to the requesting Client for the disclosed permissible purpose.
              </li>
              <li>
                <strong>Securitas Group companies. </strong>
                Affiliates that support delivery of the Services, acting as our processor or joint controller and only for the purposes and on the instructions we provide.
              </li>
              <li>
                <strong>Government and regulatory authorities. </strong>
                Where required by law, or in good faith to protect our rights, your safety or that of others, to investigate crime, or to respond to a lawful request. Authorities that receive personal data act as their own controllers.
              </li>
              <li>
                <strong>Corporate transactions. </strong>
                In connection with a merger, acquisition or sale of assets, subject to applicable data protection law.
              </li>
            </ul>
            <p>
              We do not sell, rent or trade personal data to third parties outside the Securitas Group for their own purposes, and we do not use personal data for unrelated monetization. Except where an automated tool is used solely to route, format or quality-check a Report before human review, we do not use Candidate or Client personal data to train, fine-tune or improve any artificial-intelligence or machine-learning model.
            </p>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="privacy-section-item">
            <h2>7. Cross-Border Data Transfers</h2>
            <p>
              Because our operations span the US, UK, EU, India and Asia-Pacific, personal data may be transferred to, stored in, or accessed from a country other than your own including India and the United States. Where personal data originating in the UK or EU is transferred to a jurisdiction not recognised as providing an adequate level of protection, we rely on an approved transfer mechanism such as the UK International Data Transfer Agreement / Addendum or the EU Standard Contractual Clauses (GDPR Article 46) together with any supplementary measures reasonably required. A copy of the relevant transfer safeguard is available on request using the contacts in Section 13.
            </p>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="privacy-section-item">
            <h2>8. Data Retention and Deletion</h2>
            <p>
              We retain personal data, including Reports, only for as long as reasonably necessary to fulfil the purpose for which it was collected, to comply with our legal and regulatory obligations (including record-keeping obligations under consumer-reporting and employment-verification laws), to resolve disputes and to enforce our agreements. Website enquiry data is kept only as long as needed to handle your request or as required by law. Biometric data follows the shorter schedule in Section 4.2. On expiry of the applicable retention period, personal data is securely deleted or irreversibly anonymized. Indicative retention periods are set out in this Notice and the applicable agreement and will not exceed 90 Days from completion of the relevant Service unless a longer period is required by law or requested in writing by the Client for a legitimate purpose permitted under applicable law.
            </p>
          </section>

          {/* Section 9 */}
          <section id="section-9" className="privacy-section-item">
            <h2>9. Data Security and Breach Notification</h2>
            <p>
              We maintain administrative, technical and organizational measures designed to protect personal data against unauthorized access, loss, misuse or alteration, appropriate to the sensitivity of the data. No system is completely secure and we cannot guarantee absolute security. If we become aware of a security incident that constitutes a personal data breach under applicable law, we will notify affected Clients (and, through them or directly where legally required, affected Candidates) and any competent regulator without undue delay and within the timeframe required by the relevant law including the 72-hour standard under UK/EU GDPR where applicable — together with the information reasonably available about the nature, likely consequences and remedial steps taken.
            </p>
          </section>

          {/* Section 10 */}
          <section id="section-10" className="privacy-section-item">
            <h2>10. Your Data Protection Rights</h2>
            <p>
              Subject to the exemptions available under applicable law (including those commonly applicable to fraud-prevention and consumer-reporting data), a Candidate or Client may request to:
            </p>
            <ul className="privacy-bullet-list">
              <li>
                obtain confirmation of, and access to, the personal data we hold about them;
              </li>
              <li>
                obtain a copy of a Report concerning them (a Candidate in the United States is separately entitled to a free copy of their Consumer Report and a summary of rights under FCRA §§609–610 on request, and automatically where an adverse action is taken);
              </li>
              <li>
                request correction of inaccurate or incomplete personal data;
              </li>
              <li>
                request erasure or restriction of processing, where applicable law provides such a right and no overriding legal ground for retention exists;
              </li>
              <li>
                object to processing based on legitimate interests, and opt out of the sale or sharing of personal data where a Do-Not-Sell/Share right applies under US state law;
              </li>
              <li>
                receive their personal data in a portable format, where a data-portability right applies; and
              </li>
              <li>
                lodge a complaint with the relevant supervisory authority (see Section 12).
              </li>
            </ul>
            <p>
              <strong>How requests are handled. </strong>
              For personal data where WSPL is the controller (Client account data and our own compliance processing), we respond to requests directly. For Candidate verification data, the requesting Client is the controller, so we act on the Client’s instructions and will either refer your request to that Client or assist the Client in responding; in a B2C engagement the individual requester is the controller. Requests may be submitted using the contacts in Section 13. We will verify the requester’s identity before acting and will respond, or assist the controller in responding, within the timeframe required by applicable law (for example, one month under UK/EU GDPR, subject to extension for complex requests).
            </p>
          </section>

          {/* Section 11 */}
          <section id="section-11" className="privacy-section-item">
            <h2>11. Report Accuracy, Disputes and Cookies</h2>
            <p>
              <strong>Report accuracy and disputes. </strong>
              We take reasonable care in collating and transcribing information from third-party sources but do not warrant that a Report is error-free. A Candidate who believes information in a Report is inaccurate or incomplete may dispute it using the contacts in Section 13; the reinvestigation and dispute procedure, including FCRA reinvestigation timeframes, is set out in our Terms and Conditions.
            </p>
            <p>
              <strong>Cookies. </strong>
              We use cookies and similar technologies on the Platform to enable core functionality and to enhance your experience. Not all cookies are necessary for the Platform to function. You can accept or adjust non-essential cookies through the cookie banner or your browser settings. Further detail is provided in our separate <Link to="/cookies-policy" className="privacy-text-link">Cookies Policy</Link>.
            </p>
          </section>

          {/* Section 12 */}
          <section id="section-12" className="privacy-section-item">
            <h2>12. Complaints and Supervisory Authorities</h2>
            <p>
              You may raise a complaint with us using the contacts in Section 13, or with the data protection or consumer authority in your jurisdiction, including:
            </p>
            <ul className="privacy-bullet-list">
              <li>
                <strong>India — </strong>
                the Data Protection Board of India, once constituted under the Digital Personal Data Protection Act, 2023;
              </li>
              <li>
                <strong>United Kingdom — </strong>
                the Information Commissioner’s Office (<a href="https://ico.org.uk" target="_blank" rel="noreferrer" className="privacy-text-link">ico.org.uk</a>);
              </li>
              <li>
                <strong>European Union — </strong>
                the relevant national supervisory authority;
              </li>
              <li>
                <strong>United States — </strong>
                the Federal Trade Commission or the applicable State Attorney General for FCRA-related concerns;
              </li>
              <li>
                <strong>Asia-Pacific — </strong>
                the Personal Data Protection Commission of Singapore or the Office of the Australian Information Commissioner, as applicable.
              </li>
            </ul>
          </section>

          {/* Section 13 */}
          <section id="section-13" className="privacy-section-item">
            <h2>13. Contact Information</h2>
            <div className="privacy-contact-text-block">
              <p>
                <strong>Walsons Services Private Limited</strong>
              </p>
              <p>
                Registered Office: At Plot No. 3, 1st Floor, LSC, Mayur Vihar Phase-1, East Delhi - 110091, India
              </p>
              <p>
                Corporate Office: 496, Udyog Vihar, Phase III, Gurugram – 122016, Haryana, India
              </p>
              <p>
                <strong>Grievance Officer (India):</strong> Surbhi Sood | Email: <a href="mailto:surbhi.sood@securitas.in" className="privacy-text-link">surbhi.sood@securitas.in</a> | Phone: <a href="tel:+919717199883" className="privacy-text-link">+91 97171 99883</a> | The Walsons House, 496, Udyog Vihar, Phase III, Gurugram – 122016, India
              </p>
              <p>
                <strong>Data Protection contact (UK/EU):</strong> <a href="mailto:DPO@securitas-india.com" className="privacy-text-link">DPO@securitas-india.com</a>
              </p>
              <p>
                <strong>US Consumer-Reporting / FCRA queries:</strong> <a href="mailto:Compliance@securitas-india.com" className="privacy-text-link">Compliance@securitas-india.com</a>
              </p>
              <p>
                <strong>Information security:</strong> <a href="mailto:infosec@securitas-india.com" className="privacy-text-link">infosec@securitas-india.com</a>
              </p>
              <p>
                <strong>General support:</strong> <a href="mailto:contact.us@walsonsverify.com" className="privacy-text-link">contact.us@walsonsverify.com</a> | <a href="tel:01244718888" className="privacy-text-link">0124-4718888</a>
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section id="section-14" className="privacy-section-item">
            <h2>14. Changes to This Privacy Policy</h2>
            <p>
              We may update this Notice from time to time. Where we make material changes affecting Candidates’ rights or Clients’ obligations, we will notify you by posting the updated Notice on the Platform or by another appropriate means before it takes effect, except where a shorter period is required to comply with law. This Notice was last updated on [●] July 2026.
            </p>
          </section>
  </div>
 </div>
        </div>
      </div>

      {/* Same Footer as Home Page */}
      <Footer theme={theme} />
    </main>
  );
}
