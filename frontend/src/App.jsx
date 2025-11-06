import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import VideoListPage from "./VideoListPage";
import VideoDetailPage from "./VideoDetailPage";
import HomePage from "./components/HomePage";
import Navbar from "./components/Navbar"; 
import Footer from "./components/Footer";
import WordSpeakingPage from "./WordSpeakingPage";
import CreateVideoPage from "./CreateVideoPage";
import AboutPage from "./AboutPage";
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
        <Route path="/videos/new" element={<CreateVideoPage />} />
        <Route path="/word-speaking" element={<WordSpeakingPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>

      {/* Footer luôn hiển thị */}
      <Footer />
    </Router>
  );
}

export default App;