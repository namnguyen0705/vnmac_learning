import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { RapportHeader } from "../../shared/ui/RapportHeader";
import "../../shared/ui/public-header.css";
import "../../shared/ui/public-site.css";
import { PublicFooter } from "../../shared/ui/PublicFooter";
import "../../shared/ui/public-mobile.css";

export function PublicLayout() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (pathname === "/" && hash === "#gioi-thieu") {
      document.getElementById("gioi-thieu")?.scrollIntoView();
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  const isHome = pathname === "/";
  return <div className="introduction-page public-site-shell rapport-home-shell">{!isHome && <div className="rapport-interior-masthead"><RapportHeader /></div>}<div className="public-site-content"><Outlet /></div><PublicFooter home /></div>;
}
