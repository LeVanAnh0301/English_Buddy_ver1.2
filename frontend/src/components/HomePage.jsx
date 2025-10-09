import React from "react";
import { useNavigate } from "react-router-dom"; 
import "../assets/HomePage.css"; 

function HomePage() {
  const navigate = useNavigate();

  const handleDemoClick = () => {
    navigate("/videos");
  };

  return (
    <div className="homepage">
      {/* Hero section */}
      <section className="hero" id="hero">
        <div className="hero-content">
          {/* <span className="badge">🐦 Nền tảng học tiếng Anh AI</span> */}
          <h1>Học tiếng Anh thông minh cho học sinh Việt Nam</h1>
          <p>Luyện nói, đọc, viết và ngữ pháp cùng chú vẹt AI thông minh!</p>
          <div className="hero-buttons">
            <button onClick={handleDemoClick} className="btn-primary">
              Bắt đầu ngay
            </button>
            <button className="btn-secondary">Tìm hiểu thêm</button>
          </div>
        </div>
        <div className="hero-logo">
          <img src="../logo/logo_english_buddy.jpg" alt="English Buddy Logo" />
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works" id="features">
        <h2>Tính năng nổi bật</h2>
        <p>
          Chỉ với 3 bước đơn giản, học sinh có thể bắt đầu hành trình học tiếng Anh hiệu quả
        </p>
        <div className="steps">
          <div className="step-card">
            <h3>1. Học</h3>
            <p>Học từ vựng và ngữ pháp theo chương trình Bộ GD&ĐT</p>
          </div>
          <div className="step-card">
            <h3>2. Luyện tập</h3>
            <p>Luyện nói với AI thông minh, nhận phản hồi tức thì</p>
          </div>
          <div className="step-card">
            <h3>3. Phát triển</h3>
            <p>Theo dõi tiến độ và nhận chứng chỉ hoàn thành</p>
          </div>
        </div>
      </section>

      {/* About section */}
      <section className="about" id="about">
        <div className="about-inner">
          <h2>Giới thiệu</h2>
          <p>
            English Buddy là nền tảng học tiếng Anh ứng dụng AI, được thiết kế dành riêng cho học sinh Việt Nam.
            Mục tiêu của chúng tôi là giúp học sinh tự tin giao tiếp, nắm vững kiến thức và duy trì thói quen học tập hiệu quả.
          </p>
          <ul className="about-highlights">
            <li>Chương trình bám sát chuẩn Bộ GD&ĐT</li>
            <li>AI phản hồi phát âm và ngữ pháp theo thời gian thực</li>
            <li>Dashboard theo dõi tiến độ học tập</li>
          </ul>
        </div>
      </section>

      {/* Contact section */}
      <section className="contact" id="contact">
        <div className="contact-inner">
          <h2>Liên hệ</h2>
          <p>Bạn cần tư vấn hoặc muốn trải nghiệm demo? Hãy để lại thông tin.</p>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-row">
              <input type="text" placeholder="Họ và tên" required />
              <input type="email" placeholder="Email" required />
            </div>
            <textarea placeholder="Nội dung" rows="4" />
            <button type="submit" className="btn-primary">Gửi yêu cầu</button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
