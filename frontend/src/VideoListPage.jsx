import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;

function VideoListPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/videos/`)
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
      .catch((err) => {
        console.error("Error fetching videos:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (id) => {
    navigate(`/video/${id}`);
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {videos.map((video) => {
          // ✅ Ưu tiên ảnh từ backend, fallback về ảnh YouTube
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
    </div>
  );
}

export default VideoListPage;
