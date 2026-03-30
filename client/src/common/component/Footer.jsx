import React from "react";
import { Link } from "react-router-dom";
import "../style/Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footerContent">
        <div className="footerBrand">
          <Link to="/" className="footerLogo">
            <img src="/logo.jpeg" alt="GolfNow Logo" />
            <span>GolfNow</span>
          </Link>
          <p>The ultimate platform for local golf tournaments and real-time tracking.</p>
        </div>

        <div className="footerLinks">
          <div className="footerCol">
            <h4>Platform</h4>
            <Link to="/">Home</Link>
            <Link to="/tournaments">Tournaments</Link>
            <Link to="/live">Live Matches</Link>
          </div>
          <div className="footerCol">
            <h4>Stay Updated</h4>
            <Link to="/news">Latest News</Link>
            <Link to="/rules" className="rulesHighlight">Tournament Rules</Link>
          </div>
          <div className="footerCol">
            <h4>Support</h4>
            <Link to="/contact">Contact Us</Link>
            <Link to="/faq">FAQs</Link>
          </div>
        </div>
      </div>
      
      <div className="footerBottom">
        <p>&copy; {currentYear} GolfNow. All rights reserved.</p>
        <div className="footerLegal">
          <Link to="/privacy">Privacy Policy</Link>
          <span>|</span>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
