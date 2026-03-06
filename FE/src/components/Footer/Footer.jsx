import React from "react";
import "./Footer.css";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { 
  FaFacebookF,
  FaTwitter,
  FaGooglePlusG,
  FaRss,
  FaPinterestP,
  FaLinkedinIn,
  FaYoutube
} from "react-icons/fa";
const Footer = () => {
  return (
    <>
      {/* ===== TOP FOOTER ===== */}
      <div className="footer-top">
        <div className="container footer-grid">

          {/* CONTACT */}
          <div>
            <h5>CONTACT US</h5>

            <div className="contact-item">
              <FaMapMarkerAlt className="icon" />
              <div>
                ThemesGround, 789 Main rd,<br />
                Anytown, CA 12345 USA
              </div>
            </div>

            <div className="contact-item">
              <FaPhoneAlt className="icon" />
              <div>
                +(888) 123-4567 <br />
                +(888) 456-7890
              </div>
            </div>

            <div className="contact-item">
              <FaEnvelope className="icon" />
              flipmart@themesground.com
            </div>
          </div>

          {/* CUSTOMER SERVICE */}
          <div>
            <h5>CUSTOMER SERVICE</h5>
            <ul>
              <li>My Account</li>
              <li>Order History</li>
              <li>FAQ</li>
              <li>Specials</li>
              <li>Help Center</li>
            </ul>
          </div>

          {/* CORPORATION */}
          <div>
            <h5>CORPORATION</h5>
            <ul>
              <li>About us</li>
              <li>Customer Service</li>
              <li>Company</li>
              <li>Investor Relations</li>
              <li>Advanced Search</li>
            </ul>
          </div>

          {/* WHY CHOOSE US */}
          <div>
            <h5>WHY CHOOSE US</h5>
            <ul>
              <li>Shopping Guide</li>
              <li>Blog</li>
              <li>Company</li>
              <li>Investor Relations</li>
              <li>Contact Us</li>
            </ul>
          </div>

        </div>
      </div>

      {/* ===== BOTTOM FOOTER ===== */}
      <div className="footer-bottom">
        <div className="container footer-bottom-flex">

          {/* SOCIAL ICONS */}
<div className="social-icons">
  <a className="facebook"><FaFacebookF /></a>
  <a className="twitter"><FaTwitter /></a>
  <a className="google"><FaGooglePlusG /></a>
  <a className="rss"><FaRss /></a>
  <a className="pinterest"><FaPinterestP /></a>
  <a className="linkedin"><FaLinkedinIn /></a>
  <a className="youtube"><FaYoutube /></a>
</div>

          {/* PAYMENT METHODS */}
          <div className="payment-methods">
            <ul className="payment-list">
              <li><img src="/assets/images/payments/1.jpg" alt="payment1" /></li>
            <li><img src="/assets/images/payments/2.png" alt="payment2" /></li>
            <li><img src="/assets/images/payments/3.jpg" alt="payment3" /></li>
            <li><img src="/assets/images/payments/4.png" alt="payment4" /></li>
            </ul>
          </div>

        </div>
      </div>
    </>
  );
};

export default Footer;