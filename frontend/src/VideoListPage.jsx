import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "http://localhost:8000";

function VideoListPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fake data test
  const fakeData = [
    {
      id: "dQw4w9WgXcQ",
      title: "English Listening - Daily Conversation",
      transcript: "Practice listening with real conversations.",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    },
    {
      id: "_DmYA7OzyRE",
      title: "Speaking Practice - Travel Roleplay",
      transcript: "Improve your speaking with travel scenarios.",
      thumbnail: "https://img.youtube.com/vi/_DmYA7OzyRE/0.jpg",
    },
    {
      id: "M7lc1UVf-VE",
      title: "Learn Loops in Computer Science",
      transcript: "Simple explanation with examples.",
      thumbnail: "https://img.youtube.com/vi/M7lc1UVf-VE/0.jpg",
    },
  ];

  useEffect(() => {
    // Gán fake data tạm thời ngay khi mount
    setVideos(fakeData);
    setLoading(false);

    // Thử gọi API backend
    axios
      .get(`${BACKEND_URL}/sources/`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setVideos(res.data); // nếu API trả dữ liệu mới, update state
        }
      })
      .catch((err) => {
        console.error("Error fetching sources, keep using fake data:", err);
        // Nếu API lỗi, vẫn giữ fakeData
      });
  }, []);

  const handleClick = (id) => {
    navigate(`/video/${id}`);
  };

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
        {videos.map((video) => (
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
              src={video.thumbnail}
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
              {/* <p style={{ fontSize: "14px", color: "#555" }}>
                {video.transcript}
              </p> */}
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
        ))}
      </div>
    </div>
  );
}

export default VideoListPage;
