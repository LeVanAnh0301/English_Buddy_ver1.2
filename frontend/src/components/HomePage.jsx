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
      <section className="hero">
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
      <section className="how-it-works">
        <h2>English Buddy hoạt động như thế nào?</h2>
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
    </div>
  );
}

export default HomePage;
