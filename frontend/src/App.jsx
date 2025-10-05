import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import VideoListPage from "./VideoListPage";
import VideoDetailPage from "./VideoDetailPage";

function App() {
  return (
    <Router>
      <div style={{ fontFamily: "Arial, sans-serif" }}>
        {/* 🔹 Navbar */}
        <nav
          style={{
            background: "#007bff",
            color: "#fff",
            padding: "15px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: "bold" }}>
            🎧 English Learning
          </div>
          <div>
            <Link
              to="/"
              style={{
                color: "#fff",
                marginRight: "20px",
                textDecoration: "none",
                fontWeight: "500",
              }}
            >
              Trang chủ
            </Link>
            <Link
              to="/about"
              style={{
                color: "#fff",
                textDecoration: "none",
                fontWeight: "500",
              }}
            >
              Giới thiệu
            </Link>
          </div>
        </nav>

        {/* 🔹 Nội dung chính */}
        <div style={{ paddingTop: "30px" }}>
          <Routes>
            <Route path="/" element={<VideoListPage />} />
            <Route path="/video/:id" element={<VideoDetailPage />} />
            {/* Trang fake thêm cho nút Giới thiệu */}
            <Route
              path="/about"
              element={
                <div style={{ textAlign: "center", marginTop: "40px" }}>
                  <h2>Về ứng dụng học Listening & Speaking</h2>
                  <p>
                    Đây là nền tảng giúp bạn luyện kỹ năng nghe và nói tiếng Anh
                    thông qua video YouTube và bài tập tương tác.
                  </p>
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
