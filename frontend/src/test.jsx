import React from "react";
import { useParams, Link } from "react-router-dom";

function VideoDetailPage() {
  const { id } = useParams();

  return (
    <div style={{ padding: "20px" }}>
      <h2>Trang học Listening</h2>
      <p>Bạn đang xem video có ID: {id}</p>

      <div style={{ margin: "20px 0" }}>
        <iframe
          width="560"
          height="315"
          src={`https://www.youtube.com/embed/${id}`}
          title="YouTube video player"
          frameBorder="0" hàh rgagw
          
          allowFullScreen
        ></iframe>
      </div>

      <Link to="/">← Quay lại danh sách</Link>
    </div>
  );
}

export default VideoDetailPage;
 return (
    <div style={{ padding: "20px"}}>
    
    hd )
