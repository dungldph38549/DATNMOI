import React from "react";
import "./Contact.css";

const ContactPage = () => {
  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb-section">
        <div className="container">
          Trang chủ / <span>Liên hệ</span>
        </div>
      </div>
      {/* Google Map */}
 {/* Google Map */}
<div className="contact-wrapper">
  <div className="container">
    <div className="map-box">
      <iframe
        title="Google Map Location"
        src="https://www.google.com/maps?q=21.0285,105.8542&z=15&output=embed"
        width="100%"
        height="350"
        loading="lazy"
      ></iframe>
    </div>
  </div>

  {/* Contact Content */}
  <div className="container">
    <div className="contact-box">
      <div className="contact-row">

        {/* LEFT SIDE */}
        <div className="contact-left">
          <h3>Form liên hệ</h3>

          <form>
            <div className="form-row">
              <div className="form-group">
                <label>Họ và tên *</label>
                <input type="text" />
              </div>

              <div className="form-group">
                <label>Địa chỉ Email *</label>
                <input type="email" />
              </div>

              <div className="form-group">
                <label>Tiêu đề *</label>
                <input type="text" />
              </div>
            </div>

            <div className="form-group full">
              <label>Nội dung góp ý *</label>
              <textarea rows="5"></textarea>
            </div>

            <button className="send-btn">GỬI TIN NHẮN</button>
          </form>
        </div>

        {/* RIGHT SIDE */}
        <div className="contact-right">
          <h3>Thông tin liên hệ</h3>

          <div className="info-item">
            <div className="icon">📍</div>
            <p>ThemesGround, 789 Đường Chính,<br/>Anytown, CA 12345 USA</p>
          </div>

          <div className="info-item">
            <div className="icon">📞</div>
            <p>
              +(888) 123-4567<br/>
              +(888) 456-7890
            </p>
          </div>

          <div className="info-item">
            <div className="icon">✉</div>
            <p>flipmart@themesground.com</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>


    </>
  );
};

export default ContactPage;