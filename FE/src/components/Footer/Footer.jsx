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
            <h5>LIÊN HỆ</h5>

            <div className="contact-item">
              <FaMapMarkerAlt className="icon" />
              <div>
                ThemesGround, 789 Đường Chính,<br />
                Anytown, CA 12345, USA
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
            <h5>DỊCH VỤ KHÁCH HÀNG</h5>
            <ul>
              <li>Tài khoản của tôi</li>
              <li>Lịch sử đơn hàng</li>
              <li>Câu hỏi thường gặp</li>
              <li>Ưu đãi</li>
              <li>Trung tâm hỗ trợ</li>
            </ul>
          </div>

          {/* CORPORATION */}
          <div>
            <h5>VỀ CÔNG TY</h5>
            <ul>
              <li>Giới thiệu</li>
              <li>Dịch vụ khách hàng</li>
              <li>Công ty</li>
              <li>Quan hệ nhà đầu tư</li>
              <li>Tìm kiếm nâng cao</li>
            </ul>
          </div>

          {/* WHY CHOOSE US */}
          <div>
            <h5>VÌ SAO CHỌN CHÚNG TÔI</h5>
            <ul>
              <li>Hướng dẫn mua sắm</li>
              <li>Blog</li>
              <li>Về công ty</li>
              <li>Quan hệ nhà đầu tư</li>
              <li>Liên hệ</li>
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