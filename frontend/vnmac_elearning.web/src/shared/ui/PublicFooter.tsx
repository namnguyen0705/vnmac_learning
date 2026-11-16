import { Link } from "react-router-dom";
import { OfficialLogo } from "./learner-ui";

export function PublicFooter({ home = false }: { home?: boolean }) {
  return <footer className="public-site-footer"><div className="public-site-footer-inner"><Link to="/" aria-label="RAPPORT PROJECT"><OfficialLogo compact /></Link><p>{home ? "Vì cộng đồng an toàn, không còn bom mìn." : <>Giáo dục phòng tránh tai nạn bom mìn,<br />vật nổ cho cộng đồng</>}</p><nav aria-label="Điều hướng chân trang"><Link to="/">Giới thiệu</Link><Link to="/contact">Liên hệ</Link><Link to="/login">Đăng nhập / Đăng ký</Link></nav></div></footer>;
}
