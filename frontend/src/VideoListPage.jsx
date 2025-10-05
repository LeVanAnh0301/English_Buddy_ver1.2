// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";

// const BACKEND_URL = "http://localhost:8000"; // chỉnh theo env của bạn

// export default function VideoListPage() {
//   const [videos, setVideos] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     axios.get(`${BACKEND_URL}/sources/`)
//       .then(res => setVideos(res.data))
//       .catch(err => console.error("Error fetching sources:", err));
//   }, []);

//   const handleClick = (id) => {
//     navigate(`/learn/${id}`);
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>Danh sách Video học</h2>
//       <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
//         {videos.map(video => (
//           <div 
//             key={video.id} 
//             style={{ border: "1px solid #ccc", padding: "10px", cursor: "pointer" }}
//             onClick={() => handleClick(video.id)}
//           >
//             <img 
//               src={`https://img.youtube.com/vi/${video.youtube_video_id}/0.jpg`} 
//               alt={video.title} 
//               width="200"
//             />
//             <h4>{video.title}</h4>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
import React from "react";
import { useNavigate } from "react-router-dom";

function VideoListPage() {
  const navigate = useNavigate();

  // Fake dữ liệu test (sau có thể fetch từ backend)
  const videos = [
    {
      id: "dQw4w9WgXcQ",
      title: "English Listening - Daily Conversation",
      description: "Practice listening with real conversations.",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
    },
    {
      id: "_DmYA7OzyRE",
      title: "Speaking Practice - Travel Roleplay",
      description: "Improve your speaking with travel scenarios.",
      thumbnail: "https://img.youtube.com/vi/_DmYA7OzyRE/0.jpg",
    },
    {
      id: "M7lc1UVf-VE",
      title: "Learn Loops in Computer Science",
      description: "Simple explanation with examples.",
      thumbnail: "https://img.youtube.com/vi/M7lc1UVf-VE/0.jpg",
    },
  ];

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
              <p style={{ fontSize: "14px", color: "#555" }}>
                {video.description}
              </p>
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
