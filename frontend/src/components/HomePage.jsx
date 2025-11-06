import React from "react";
import { useNavigate } from "react-router-dom"; 
import "../assets/HomePage.css"; 
// --- SVG Icons ---
const HeadphonesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/></svg>
);
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
);
const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
); 

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
          <h1>Học tiếng anh thông minh để sử dụng tiếng anh tự nhiên.</h1>
          <p>Luyện nói, đọc, viết và ngữ pháp cùng chú vẹt AI thông minh!</p>
          <div className="hero-buttons">
            <button onClick={handleDemoClick} className="btn-primary">
              Bắt đầu ngay
            </button>
            <button className="btn-secondary">Tìm hiểu thêm</button>
          </div>
        </div>
        <div className="hero-logo">
          <img src="/logo/logo_english_buddy.jpg" alt="English Buddy Logo" />
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
            <h3>1. Học liệu</h3>
            <p>Bám sát theo chương trình Bộ GD&ĐT</p>
          </div>
          <div className="step-card">
            <h3>2. Thực hành</h3>
            <p>Luyện nói với AI thông minh, nhận phản hồi tức thì</p>
          </div>
          <div className="step-card">
            <h3>3. Lộ trình hoàn hảo</h3>
            <p>Theo dõi tiến độ và nhận chứng chỉ hoàn thành</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-content">
          <h2>Tại Sao Chọn English Buddy?</h2>
          <p>Học để sử dụng. Học để thành công. </p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon icon-listen">
              <HeadphonesIcon />
            </div>
            <h3>Nâng Cao Kỹ Năng Nghe</h3>
            <p>Rèn luyện đôi tai với giọng đọc của người bản xứ và cải thiện khả năng nghe hiểu tiếng Anh.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-speak">
              <MicIcon />
            </div>
            <h3>Luyện Nói Tự Nhiên</h3>
            <p>Thực hành nói một cách tự nhiên bằng cách shadowing theo phát âm chuẩn bản xứ.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-memory">
              <CodeIcon />
            </div>
            <h3>Tăng Cường Ghi Nhớ</h3>
            <p>Ghi nhớ từ vựng và cấu trúc câu lâu hơn thông qua học tập chủ động và tập trung.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-progress">
              <TargetIcon />
            </div>
            <h3>Theo Dõi Lộ Trình Tiến Bộ</h3>
            <p>Giám sát sự cải thiện của bạn với hệ thống theo dõi tiến trình học tập chi tiết.</p>
          </div>
        </div>
      </section>

    </div>
  );
}

export default HomePage;
