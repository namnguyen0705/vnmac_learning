import { Menu, User, X } from "lucide-react";
import { useId, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { OfficialLogo, OfficialPartnerMarks } from "./learner-ui";

export function RapportHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = () => setMenuOpen(false);

  return <header className="rapport-home-header rapport-home-width" onKeyDown={(event) => {
    if (event.key === "Escape" && menuOpen) {
      closeMenu();
      event.currentTarget.querySelector<HTMLButtonElement>(".rapport-menu-toggle")?.focus();
    }
  }}>
    <Link to="/" aria-label="Trang chủ RAPPORT"><OfficialLogo compact /></Link>
    <button className="rapport-menu-toggle" type="button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(!menuOpen)}>
      {menuOpen ? <X size={18} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={18} strokeWidth={1.75} aria-hidden="true" />}
    </button>
    <div className="rapport-menu-backdrop" data-open={menuOpen} aria-hidden="true" onClick={closeMenu} />
    <nav id={menuId} data-open={menuOpen} aria-label="Điều hướng chính">
      <Link to="/#gioi-thieu" onClick={closeMenu}>Giới thiệu</Link>
      <NavLink to="/contact" onClick={closeMenu}>Liên hệ</NavLink>
      <NavLink to="/login" onClick={closeMenu}><User size={16} /> Đăng nhập / Đăng ký</NavLink>
    </nav>
    <OfficialPartnerMarks />
  </header>;
}
