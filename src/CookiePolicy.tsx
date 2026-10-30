import { useState,useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X, Sun, Moon } from "lucide-react";
import logoWhite from "./assets/Img/logo_w.png";
import logoBlack from "./assets/Img/logo_b.png";
import Footer from "./Components/Footer";

export default function CookiePolicy() {
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
            </button>
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

      {/* Main Cookie Policy Content */}
      <div className="home-container privacy-page-container">
        {/* Breadcrumb matching exact screenshot: Home → Cookie Policy */}
        <div className="privacy-breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-arrow">→</span>
          <span className="breadcrumb-current">Cookie Policy</span>
        </div>

        {/* Header Block matching exact screenshot */}
        <div className="privacy-header-block">
          <h1 className="privacy-title-text">COOKIES POLICY</h1>

          <div className="privacy-sub-badge">
            <div className="privacy-sub-company">WALSONS SERVICES PRIVATE LIMITED</div>
            <div className="privacy-sub-regions">
              Effective date: [●] July 2026 | Version 1.0
            </div>
          </div>
        </div>

        {/* Legal Text Sections */}
        <div className="privacy-sections-content">
          {/* Section 1 */}
          <section id="section-1" className="privacy-section-item">
            <h2>1. About This Cookies Policy</h2>
            <p>
              This Cookies Policy explains how Walsons Services Private Limited and its group affiliates (“WSPL,” “we,” “us” or “our”) use cookies and similar technologies on <a href="https://walsonsverify.com/" target="_blank" rel="noreferrer" className="privacy-text-link">https://walsonsverify.com/</a> and any other website, portal or application we own or operate (the “Platform”). It should be read together with our Privacy Policy, which explains more fully how we process personal data and your rights in relation to it. Capitalised terms not defined here have the meaning given in the <Link to="/privacy-policy" className="privacy-text-link">Privacy Policy</Link> and our Terms and Conditions.
            </p>
          </section>

          <div className="cookie-policy w-full">
            <div className="w-1/4"></div>
            <div className="privacy-section w-3/4">
              {/* Section 2 */}
              <section id="section-2" className="privacy-section-item">
                <h2>2. What Are Cookies and Similar Technologies?</h2>
                <p>
                  Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work, to make them more efficient, and to provide information to the site owner. “Similar technologies” include pixels, tags, software development kits (SDKs), local storage and device identifiers that perform comparable functions. In this Policy we refer to all of these as “cookies.”
                </p>
                <ul className="privacy-bullet-list">
                  <li>
                    Session cookies are temporary and are deleted when you close your browser.
                  </li>
                  <li>
                    Persistent cookies remain on your device until they expire or you delete them.
                  </li>
                  <li>
                    First-party cookies are set by us.
                  </li>
                  <li>
                    Third-party cookies are set by a provider other than us (for example, an analytics or security provider) when you use the Platform.
                  </li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="section-3" className="privacy-section-item">
                <h2>3. How We Use Cookies</h2>
                <p>
                  We use cookies to operate and secure the Platform, to remember your preferences, to understand how the Platform is used so we can improve it, and only where you consent for analytics and marketing purposes. Not all cookies are necessary for the Platform to function.
                </p>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="privacy-section-item">
                <h2>4. Categories of Cookies We Use</h2>
                <p>We group the cookies we use into the following categories:</p>

                {/* Cookies Table matching specification */}
                <div className="cookie-table-wrapper">
                  <table className="cookie-table">
                    <thead>
                      <tr>
                        <th style={{ width: "24%" }}>Category</th>
                        <th style={{ width: "50%" }}>Purpose</th>
                        <th style={{ width: "26%" }}>Consent required?</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Strictly necessary</strong>
                        </td>
                        <td>
                          Enable core functionality such as page navigation, secure log-in, session management, load balancing and fraud prevention. The Platform cannot function properly without these.
                        </td>
                        <td className="consent-col">
                          No - exempt (set on the basis of our legitimate interest in operating a secure Platform)
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Functional / preference</strong>
                        </td>
                        <td>
                          Remember choices you make (such as language or region) to provide enhanced, personalised features.
                        </td>
                        <td className="consent-col">Yes</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Analytics / performance</strong>
                        </td>
                        <td>
                          Help us understand how visitors interact with the Platform (pages visited, errors, load times) so we can measure and improve performance. Data is used in aggregate.
                        </td>
                        <td className="consent-col">Yes</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Marketing / targeting</strong>
                        </td>
                        <td>
                          Used to deliver content relevant to you and to measure the effectiveness of campaigns. May be set by third-party advertising or social-media partners.
                        </td>
                        <td className="consent-col">Yes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p style={{ marginTop: "16px" }}>
                  An itemised list of the specific cookies in use, their providers, and their durations is presented in the cookie banner / preference centre on the Platform and is kept up to date there. [Insert or link the current cookie inventory / consent-tool cookie list.]
                </p>
              </section>

              {/* Section 5 */}
              <section id="section-5" className="privacy-section-item">
                <h2>5. Consent and Legal Basis</h2>
                <p>
                  Strictly necessary cookies are set automatically because they are essential to provide the Platform. All other categories are set only after you give consent through our cookie banner, in line with applicable law including the UK Privacy and Electronic Communications Regulations (PECR) and UK/EU GDPR, the ePrivacy rules of EU member states, the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 in India, and applicable US state privacy laws (under which you may opt out of the sale or sharing of personal information and of targeted advertising). You can accept all, reject all non-essential cookies, or set your preferences by category.
                </p>
              </section>

              {/* Section 6 */}
              <section id="section-6" className="privacy-section-item">
                <h2>6. How to Manage Your Cookie Preferences</h2>
                <ul className="privacy-bullet-list">
                  <li>
                    <strong>Cookie banner / preference centre. </strong>
                    You can change or withdraw your consent at any time using the cookie settings link available on the Platform. Withdrawing consent does not affect the lawfulness of processing carried out before withdrawal.
                  </li>
                  <li>
                    <strong>Browser settings. </strong>
                    Most browsers let you block or delete cookies through their settings. Blocking strictly necessary cookies may cause parts of the Platform to stop working.
                  </li>
                  <li>
                    <strong>Opt-out tools. </strong>
                    For analytics and advertising cookies, provider-specific opt-outs and industry tools (for example, Your Online Choices or the browser ‘Global Privacy Control’ signal, where honoured) may also be available.
                  </li>
                </ul>
              </section>

              {/* Section 7 */}
              <section id="section-7" className="privacy-section-item">
                <h2>7. Third-Party Cookies</h2>
                <p>
                  Some cookies are placed by third-party providers that support the Platform for example, analytics, content-delivery, security and, where you consent, advertising partners. These providers process data under their own privacy notices, and where a third party acts as our processor it does so under contractual data-protection obligations. Where third-party cookies transfer personal data outside your jurisdiction, we and our providers rely on the transfer safeguards described in our <Link to="/privacy-policy" className="privacy-text-link">Privacy Policy</Link>.
                </p>
              </section>

              {/* Section 8 */}
              <section id="section-8" className="privacy-section-item">
                <h2>8. Changes to This Cookies Policy</h2>
                <p>
                  We may update this Cookies Policy from time to time to reflect changes in the cookies we use or for legal, operational or regulatory reasons. We will post the updated version on the Platform and, where required, seek renewed consent. This Cookies Policy was last updated on [●] July 2026.
                </p>
              </section>

              {/* Section 9 */}
              <section id="section-9" className="privacy-section-item">
                <h2>9. Contact Us</h2>
                <p>If you have questions about our use of cookies, you can contact us at:</p>
                <div className="privacy-contact-text-block">
                  <p>
                    <strong>Walsons Services Private Limited</strong>
                  </p>
                  <p>
                    Corporate Office: 496, Udyog Vihar, Phase III, Gurugram – 122016, Haryana, India
                  </p>
                  <p>
                    <strong>Grievance Officer (India):</strong> Surbhi Sood | <a href="mailto:surbhi.sood@securitas.in" className="privacy-text-link">surbhi.sood@securitas.in</a> | <a href="tel:+919717199883" className="privacy-text-link">+91 97171 99883</a>
                  </p>
                  <p>
                    <strong>Data Protection contact (UK/EU):</strong> <a href="mailto:DPO@securitas-india.com" className="privacy-text-link">DPO@securitas-india.com</a>
                  </p>
                  <p>
                    <strong>General support:</strong> <a href="mailto:contact.us@walsonsverify.com" className="privacy-text-link">contact.us@walsonsverify.com</a> | <a href="tel:01244718888" className="privacy-text-link">0124-4718888</a>
                  </p>
                </div>
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
