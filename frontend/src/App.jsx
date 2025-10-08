import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import VideoListPage from "./VideoListPage";
import VideoDetailPage from "./VideoDetailPage";
import HomePage from "./components/HomePage";
import Navbar from "./components/Navbar"; 
import "./App.css";

function App() {
  return (
    <Router>
      {/* Navbar luôn hiển thị */}
      <Navbar />

      {/* Các route thay đổi nội dung bên dưới Navbar */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/videos" element={<VideoListPage />} />
        <Route path="/video/:id" element={<VideoDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;