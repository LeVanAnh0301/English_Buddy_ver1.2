import React from "react";
import "../assets/Footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="contact-block">
          <h3>Liên hệ</h3>
          <p>Bạn cần tư vấn hoặc muốn trải nghiệm demo? Hãy để lại thông tin.</p>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-row">
              <input type="text" placeholder="Họ và tên" required />
              <input type="email" placeholder="Email" required />
            </div>
            <textarea placeholder="Nội dung" rows="3" />
            <button type="submit" className="footer-submit">Gửi yêu cầu</button>
          </form>
        </div>
        <div className="copyright">© {new Date().getFullYear()} English Buddy</div>
      </div>
    </footer>
  );
}

export default Footer;


