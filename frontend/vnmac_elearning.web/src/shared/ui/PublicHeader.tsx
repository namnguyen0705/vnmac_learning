import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { OfficialLogo, OfficialPartnerMarks } from "./learner-ui";
import "../../pages/introduction.css";
import "./public-header.css";
import "./public-site.css";

export function PublicHeader() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  return <header className="intro-header public-header public-header-unified">
    <div className="intro-brand"><Link to="/" aria-label="Trang giới thiệu RAPPORT"><OfficialLogo compact /></Link><OfficialPartnerMarks /></div>
    <nav aria-label="Điều hướng chính">
      <div className="public-menu">
        <NavLink to="/" end>Giới thiệu</NavLink>
        <NavLink to="/contact">Liên hệ</NavLink>
      </div>
      {!isAuthPage && <NavLink className="intro-primary" to="/login">Đăng nhập / Đăng ký<ArrowRight size={16} /></NavLink>}
    </nav>
  </header>;
}
