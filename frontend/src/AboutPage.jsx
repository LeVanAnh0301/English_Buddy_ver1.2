import React from "react";
import "./assets/About.css";

const AboutPage = () => {
  return (
    <div className="about-wrapper">

      {/* HERO */}
      <section className="about-hero">
        <h1>English Buddy — Nền tảng học tiếng Anh thông minh cho học sinh Việt Nam</h1>
        <p>
          Học tiếng anh thông minh để sử dụng tiếng anh tự nhiên.
        </p>
      </section>

      {/* MISSION */}
      <section className="about-section">
        <h2>🎯 Sứ mệnh</h2>
        <p>
          Giúp mọi học sinh Việt Nam tiếp cận phương pháp học tiếng Anh hiện đại, cá nhân hóa
          và phù hợp với năng lực từng người.
        </p>

        <ul>
          <li>Tạo thói quen học tiếng Anh mỗi ngày một cách tự nhiên</li>
          <li>Giúp học sinh tự tin giao tiếp với AI mà không ngại nói sai</li>
          <li>Biến việc học thành trải nghiệm thú vị và nhẹ nhàng</li>
          <li>Nâng cao điểm số và năng lực trên lớp</li>
        </ul>
      </section>

      {/* AI TECHNOLOGY */}
      <section className="about-section">
        <h2>🤖 Công nghệ AI</h2>
        <p>English Buddy sử dụng AI để hỗ trợ toàn diện cho quá trình học của học sinh:</p>

        <ul>
          <li>Nhận dạng giọng nói chính xác để luyện phát âm chuẩn Mỹ</li>
          <li>AI Chat luyện nói tự nhiên giúp tăng phản xạ giao tiếp</li>
          <li>AI phân tích lỗi chi tiết từng câu, từng từ</li>
          <li>Từ điển thông minh tra cứu nghĩa, ví dụ, phát âm ngay lập tức</li>
        </ul>
      </section>

      {/* BENEFITS */}
      <section className="about-section">
        <h2>📘 Học sinh nhận được gì?</h2>

        <ul>
          <li>Phát âm chuẩn theo giọng Mỹ (US)</li>
          <li>Cải thiện vốn từ vựng và ngữ pháp</li>
          <li>Phản xạ giao tiếp tốt hơn mỗi ngày</li>
          <li>Tự tin hơn trong học tập và thi cử</li>
        </ul>
      </section>

      {/* VISION */}
      <section className="about-vision">
        <h2>❤️ Tầm nhìn</h2>
        <p>
          English Buddy hướng tới xây dựng một nền tảng học tiếng Anh thông minh, dễ tiếp cận,
          đáng tin cậy và hữu ích cho mọi học sinh phổ thông Việt Nam.
        </p>
      </section>

    </div>
  );
};

export default AboutPage;
