import React from "react";
import "../assets/Navbar.css";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      {/* Logo bên trái */}
      <div className="navbar-left">
        <img src="../logo/logo_english_buddy.jpg" alt="Logo" className="logo" />
        <span className="brand">English Buddy</span>
      </div>

      {/* Menu giữa */}
      <ul className="navbar-menu">
        <li>
          <Link to="/" className="active">
            Trang chủ
          </Link>
        </li>
        <li>
          <Link to="/features">Tính năng</Link>
        </li>
        <li>
          <Link to="/about">Giới thiệu</Link>
        </li>
        <li>
          <Link to="/contact">Liên hệ</Link>
        </li>
      </ul>

      {/* Ngôn ngữ và nút */}
      <div className="navbar-right">
        <button className="lang-btn">
          🌐 EN
        </button>
        {/* <button className="demo-btn">Đặt lịch Demo</button> */}
      </div>
    </nav>
  );
}

export default Navbar;
