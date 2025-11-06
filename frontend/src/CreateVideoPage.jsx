import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Hàm helper (Giữ nguyên)
const extractYouTubeId = (url) => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const matches = url.match(regex);
  return matches ? matches[1] : null;
};

function CreateVideoPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    youtube_video_id: "",
    transcript: "", 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "url") {
      const videoId = extractYouTubeId(value);
      if (videoId) {
        setFormData((prev) => ({
          ...prev,
          youtube_video_id: videoId,
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.url || !formData.youtube_video_id) {
      setMessage("❌ Vui lòng điền đầy đủ thông tin (Title, URL, ID).");
      return;
    }
    // Transcript có thể là optional, nên không cần check ở đây

    setIsSubmitting(true);
    setMessage("Đang xử lý và tạo video mới...");

    try {
      // ✅ THÊM 3: Gửi 'transcript' trong request body
      const res = await axios.post(`${BACKEND_URL}/api/videos/`, {
        title: formData.title,
        url: formData.url,
        youtube_video_id: formData.youtube_video_id,
        transcript: formData.transcript, 
      });

      setMessage("✅ Tạo video thành công!");
      
      setTimeout(() => {
        navigate("/videos"); 
      }, 1500);

    } catch (err) {
      console.error("Lỗi khi tạo video:", err);
      setMessage(`❌ Lỗi: ${err.response?.data?.detail || "Không thể tạo video."}`);
      setIsSubmitting(false);
    }
  };


  // === CÁC STYLE OBJECT (Giữ nguyên) ===
  const formStyle = {
    maxWidth: "600px",
    margin: "40px auto",
    padding: "30px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };
  
  const inputGroupStyle = {
    marginBottom: "20px",
  };
  
  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
  };
  
  const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
  };

  
  const textareaStyle = {
    ...inputStyle, 
    minHeight: "150px", 
    fontFamily: "system-ui, sans-serif", 
    resize: "vertical", 
  };
  
  const buttonStyle = {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "6px",
    background: "#007bff",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    opacity: isSubmitting ? 0.7 : 1,
  };
  
  const messageStyle = {
    textAlign: "center",
    marginTop: "15px",
    padding: "10px",
    borderRadius: "6px",
    background: message.startsWith("❌") ? "#f8d7da" : "#d4edda",
    color: message.startsWith("❌") ? "#721c24" : "#155724",
  };

  const backLinkStyle = {
    display: "inline-block", 
    padding: "10px 18px",
    backgroundColor: "#4F46E5", 
    color: "white",
    textDecoration: "none", 
    borderRadius: "8px", 
    fontWeight: "600", 
    fontFamily: "system-ui, sans-serif",
    transition: "background-color 0.2s",
  };


  return (
    <div style={{ background: "#f4f6f9", minHeight: "100vh", padding: "20px" }}>
      
      {/* Nút quay lại (Giữ nguyên) */}
      <Link to="/videos" style={backLinkStyle}>
        ← Quay lại danh sách
      </Link>

      <form onSubmit={handleSubmit} style={formStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "25px" }}>
          Tạo Video Học Tập Mới
        </h2>
        
         <div style={inputGroupStyle}>
          <label htmlFor="title" style={labelStyle}>Tiêu đề (Title)</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            style={inputStyle}
            placeholder="Ví dụ: Bài nghe tiếng Anh hàng ngày"
            required
          />
        </div>
        
        <div style={inputGroupStyle}>
          <label htmlFor="url" style={labelStyle}>Link YouTube (URL)</label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            style={inputStyle}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
        </div>
        
        <div style={inputGroupStyle}>
          <label htmlFor="youtube_video_id" style={labelStyle}>YouTube Video ID</label>
          <input
            type="text"
            id="youtube_video_id"
            name="youtube_video_id"
            value={formData.youtube_video_id}
            onChange={handleChange}
            style={inputStyle}
            placeholder="ID sẽ tự động điền khi bạn dán link"
            readOnly
          />
        </div>

        {/* ✅ THÊM 2: Thêm textarea cho transcript */}
        <div style={inputGroupStyle}>
          <label htmlFor="transcript" style={labelStyle}>
            Nội dung (Transcript) (Optional)
          </label>
          <textarea
            id="transcript"
            name="transcript"
            value={formData.transcript}
            onChange={handleChange}
            style={textareaStyle} // Sử dụng style mới
            placeholder="Dán nội dung transcript của video vào đây..."
          />
        </div>
        
        <button type="submit" style={buttonStyle} disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo..." : "Tạo Video"}
        </button>

        {message && (
          <div style={messageStyle}>
            {message}
          </div>
        )}
        
      </form>
    </div>
  );
}

export default CreateVideoPage;