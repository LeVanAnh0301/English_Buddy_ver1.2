import React, { useCallback, useEffect, useState } from "react";
import "../assets/Navbar.css";
import { useLocation, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState("");

  const scrollToSection = useCallback((sectionId) => {
    const doScroll = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    if (location.pathname !== "/") {
      navigate("/", { replace: false });
      setTimeout(doScroll, 50);
    } else {
      doScroll();
    }
  }, [location.pathname, navigate]);

  const handleNavClick = (target) => (e) => {
    e.preventDefault();
    if (target === "home") {
      if (location.pathname !== "/") {
        navigate("/");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    scrollToSection(target);
  };

  useEffect(() => {
    // Basic active state based on hash or top of page
    const hash = location.hash?.replace("#", "");
    if (!hash && location.pathname === "/") {
      setActive("home");
    } else if (hash) {
      setActive(hash);
    } else {
      setActive("");
    }

    // Highlight based on visible section
    const sectionIds = ["features", "about", "contact", "hero"]; // hero maps to home
    const observers = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              setActive(id === "hero" ? "home" : id);
            }
          });
        },
        { threshold: [0.51] }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [location]);

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
          <a href="#home" onClick={handleNavClick("home")} className={active === "home" ? "active" : undefined}>
            Trang chủ
          </a>
        </li>
        <li>
          <a href="/word-speaking" onClick={(e) => { e.preventDefault(); navigate('/word-speaking'); }}>
            Luyện từ
          </a>
        </li>
        <li>
          <a href="/videos" onClick={(e) => { e.preventDefault(); navigate('/videos'); }}>
            Luyện nói
          </a>
        </li>
        {/* <li>
          <a href="#about" onClick={handleNavClick("about")} className={active === "about" ? "active" : undefined}>
            Giới thiệu
          </a>
        </li> */}
        <li>
          <a href="#contact" onClick={handleNavClick("contact")} className={active === "contact" ? "active" : undefined}>
            Liên hệ
          </a>
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
