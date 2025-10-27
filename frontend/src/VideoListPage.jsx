import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaPlay, FaMagic } from "react-icons/fa";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function VideoListPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/videos/`)
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setVideos(data);
        } else if (Array.isArray(data.data)) {
          setVideos(data.data);
        } else {
          setVideos([]);
          console.warn("Unexpected API response:", data);
        }
      })
      .catch((err) => console.error("Error fetching videos:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (id) => {
    navigate(`/video/${id}`);
  };

  const handleGenerateVideo = async () => {
    setCreating(true);
    setMessage("🎬 Đang tạo video học tập tự động, vui lòng đợi...");

    try {
      const youtubeVideoId = "e05422b2-c11f-498c-9577-b699f17b972e"; // 🔹 demo fixed ID
      const res = await axios.post(
        `${BACKEND_URL}/api/ai/questions/generate_questions/${youtubeVideoId}`
      );

      setMessage(`✅ Đã tạo thành công: ${res.data.title}`);
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Có lỗi khi tạo video học tập!");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: "100px" }}>
        <h3>Đang tải danh sách video...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", background: "#f4f6f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        🎥 Danh sách Video Học Tập
      </h1>

      {/* 🔹 ICON TẠO VIDEO */}
      <div
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          background: "linear-gradient(135deg, #00b4d8, #0077b6)",
          color: "#fff",
          borderRadius: "50%",
          width: "70px",
          height: "70px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
          cursor: "pointer",
          animation: "pulse 2s infinite",
          zIndex: 1000,
        }}
        title="Bấm vào đây để tự tạo video học tập"
        onClick={handleGenerateVideo}
      >
        <FaMagic size={28} />
      </div>

      {message && (
        <div
          style={{
            position: "fixed",
            bottom: "110px",
            right: "30px",
            background: "#fff",
            color: "#333",
            borderRadius: "12px",
            padding: "12px 20px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            maxWidth: "280px",
            animation: "fadeInUp 0.5s ease",
          }}
        >
          {creating ? "⚙️ " : "✨ "} {message}
        </div>
      )}

      {/* GRID VIDEO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {videos.map((video) => {
          const thumbnailUrl =
            video.thumbnail ||
            (video.youtube_video_id
              ? `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`
              : "https://via.placeholder.com/300x180?text=No+Thumbnail");

          return (
            <div
              key={video.id}
              style={{
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                overflow: "hidden",
                transition: "transform 0.2s",
              }}
            >
              <img
                src={thumbnailUrl}
                alt={video.title}
                style={{
                  width: "100%",
                  height: "180px",
                  objectFit: "cover",
                  cursor: "pointer",
                }}
                onClick={() => handleClick(video.id)}
              />
              <div style={{ padding: "15px" }}>
                <h3 style={{ margin: "0 0 10px" }}>{video.title}</h3>
                <button
                  onClick={() => handleClick(video.id)}
                  style={{
                    marginTop: "10px",
                    padding: "10px 15px",
                    border: "none",
                    borderRadius: "6px",
                    background: "#007bff",
                    color: "#fff",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Học ngay →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hiệu ứng keyframes */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,123,255,0.4); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(0,123,255,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,123,255,0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default VideoListPage;
