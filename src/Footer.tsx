import React from "react";
import { Link } from "react-router-dom";
import logoWhite from "./assets/Img/logo_w.png";
import logoBlack from "./assets/Img/logo_b.png";
import worldMapImg from "./assets/Img/World-Map.png";

const FacebookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.275-.1-.475-.15-.675.15-.2.3-.775.98-.95 1.18-.175.2-.35.225-.65.075-.3-.15-1.268-.468-2.416-1.493-.894-.798-1.498-1.784-1.674-2.085-.175-.301-.019-.464.132-.614.135-.135.301-.35.451-.526.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.63-.925-2.235-.244-.588-.493-.508-.677-.518-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.028-1.05 2.508 0 1.48 1.077 2.91 1.227 3.11.15.2 2.12 3.238 5.137 4.542.717.31 1.277.495 1.714.634.72.228 1.376.196 1.895.118.578-.087 1.78-.727 2.03-1.43.25-.703.25-1.306.175-1.431-.075-.125-.275-.2-.575-.35zM12.04 2C6.516 2 2.028 6.488 2.028 12.012c0 1.764.46 3.486 1.334 5.004L2 22.04l5.176-1.332c1.465.798 3.119 1.218 4.864 1.218 5.524 0 10.012-4.488 10.012-10.012C22.052 6.488 17.564 2 12.04 2zm0 18.293c-1.503 0-2.977-.404-4.264-1.168l-.306-.182-3.17.816.846-3.088-.2-.318a8.27 8.27 0 0 1-1.268-4.341c0-4.57 3.718-8.288 8.288-8.288 4.57 0 8.288 3.718 8.288 8.288 0 4.57-3.718 8.288-8.288 8.288z" />
  </svg>
);

const WalsonsLogo = () => (
  <div className="footer-walsons-brand">
    <img
      src="https://worktrail.ai/static/images/Walsons-Logo-White.png"
      alt="Walsons Logo"
      className="footer-walsons-img"
    />
  </div>
);


interface FooterProps {
  theme?: string;
}

export const Footer: React.FC<FooterProps> = ({ theme = "dark" }) => {
  return (
    <footer className="home-footer" style={{ backgroundImage: `url(${worldMapImg})` }}>
      <div className="home-container footer-inner-grid">
        {/* Column 1: Brand & Socials */}
        <div className="footer-brand-col">
          <div className="footer-securitas-logo-wrap">
            <img
              src={theme === "light" ? logoBlack : logoWhite}
              alt="Securitas Logo"
              className="footer-securitas-logo"
            />
          </div>
          <h3 className="footer-brand-headline">
            <span className="footer-brand-purple">Securitas</span>{" "}
            <span className="footer-brand-white">India</span>
          </h3>
          <p className="footer-brand-tagline">
            Comprehensive Background Verification Services
          </p>
          <div className="footer-social-row">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="footer-social-btn"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="footer-social-btn"
            >
              <LinkedInIcon />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="footer-social-btn"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="footer-social-btn"
            >
              <WhatsAppIcon />
            </a>
          </div>
        </div>

        {/* Column 2: About us */}
        <div className="footer-nav-col">
          <h4 className="footer-col-header">About us</h4>
          <ul className="footer-nav-list">
            <li>
              <a href="#history" className="footer-nav-link">
                History & partnership
              </a>
            </li>
            <li>
              <a href="#services" className="footer-nav-link">
                Services
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Legal */}
        <div className="footer-nav-col">
          <h4 className="footer-col-header">Legal</h4>
          <ul className="footer-nav-list">
            <li>
              <Link to="/cookie-policy" className="footer-nav-link" onClick={() => window.scrollTo(0, 0)}>
                Cookie policy
              </Link>
            </li>
            <li>
              <Link to="/privacy-policy" className="footer-nav-link" onClick={() => window.scrollTo(0, 0)}>
                Privacy policy
              </Link>
            </li>
            <li>
              <a href="#code-of-conduct" className="footer-nav-link">
                Code of conduct
              </a>
            </li>
            <li>
              <a href="#responsible-disclosure" className="footer-nav-link">
                Responsible disclosure
              </a>
            </li>
            <li>
              <a href="#sitemap" className="footer-nav-link">
                Sitemap
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: Address & Contact + Walsons Logo */}
        <div className="footer-address-col">
          <div className="footer-address-block">
            <h4 className="footer-col-header">Address</h4>
            <p className="footer-address-text">
              Walsons Services Private Limited, 496,
              <br />
              Udyog Vihar, Phase - 3, Gurugram - 122016
              <br />
              Haryana
            </p>
          </div>

          <div className="footer-contact-block">
            <h4 className="footer-col-header footer-contact-header">Contact</h4>
            <a href="tel:+919319585385" className="footer-contact-link">
              +91 9319 585 385
            </a>
            <a href="mailto:verify.global@securitas.in" className="footer-contact-link">
              verify.global@securitas.in
            </a>
          </div>

          <div className="footer-walsons-wrapper">
            <WalsonsLogo />
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright */}
      <div className="footer-bottom-bar">
        <p className="footer-bottom-text">
          © <span className="footer-bottom-accent">Securitas</span>. Inc. 2026. Securitas made easy
        </p>
      </div>
    </footer>
  );
};

export default Footer;
