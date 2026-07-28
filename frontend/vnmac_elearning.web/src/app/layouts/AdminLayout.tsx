import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/shared/stores/shell-store";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import { resolveBrandAsset, useBrandingSettings } from "@/shared/ui/branding";
import { OfficialLogo, OfficialPartnerMarks } from "@/shared/ui/learner-ui";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Home,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldQuestion,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../auth";

const navGroups = [
  {
    title: "",
    items: [{ label: "Tổng quan", to: "/admin", icon: Home, match: "/admin", exact: true }],
  },
  {
    title: "Quản lý nội dung",
    items: [
      { label: "Quản lý bài học", to: "/admin/lessons", icon: BookOpen, match: "/admin/lessons" },
      { label: "Quản lý chủ đề", to: "/admin/courses", icon: ListChecks, match: "/admin/courses" },
      { label: "Quản lý câu hỏi", to: "/admin/questions", icon: ShieldQuestion, match: "/admin/questions" },
      { label: "Quản lý bài kiểm tra", to: "/admin/quizzes", icon: ClipboardCheck, match: "/admin/quizzes" },
      { label: "Quản lý tài liệu", to: "/admin/materials", icon: FileText, match: "/admin/materials" },
      { label: "Quản lý thông báo", to: "/admin/notifications", icon: Bell, match: "/admin/notifications" },
    ],
  },
  {
    title: "Quản lý người dùng",
    items: [
      { label: "Quản lý người dùng", to: "/admin/users", icon: Users, match: "/admin/users" },
      { label: "Quản lý vai trò", to: "/admin/roles", icon: UserCog, match: "/admin/roles" },
    ],
  },
  {
    title: "Báo cáo & thống kê",
    items: [
      { label: "Thống kê học tập", to: "/admin/tracking", icon: BarChart3, match: "/admin/tracking" },
      { label: "Báo cáo hệ thống", to: "/admin/reports", icon: MessageSquare, match: "/admin/reports" },
    ],
  },
  {
    title: "Cài đặt hệ thống",
    items: [
      { label: "Cài đặt chung", to: "/admin/settings", icon: Settings, match: "/admin/settings" },
      { label: "Nhật ký hệ thống", to: "/admin/system-logs", icon: FileText, match: "/admin/system-logs" },
    ],
  },
] as const;

function resourceForAdminPath(path: string) {
  const segment = path.split("/").filter(Boolean)[1] ?? "overview";
  if (segment === "admin") return "overview";
  if (segment === "reports") return "reports";
  return segment;
}

export function AdminLayout() {
  const { session, logout } = useAuth();
  const branding = useBrandingSettings();
  const location = useLocation();
  const isNavOpen = useShellStore((state) => state.adminNavOpen);
  const toggleNav = useShellStore((state) => state.toggleAdminNav);
  const closeNav = useShellStore((state) => state.closeAdminNav);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  const initials = session.user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
  const roleLabel = session.user.roleName || session.user.role;

  return (
    <div className="official-admin-shell">
      <header
        className="official-admin-brandbar"
        style={{
          backgroundColor: branding.headerBackgroundColor || "#ffffff",
          backgroundImage: branding.headerBackgroundImageUrl
            ? `url(${resolveBrandAsset(branding.headerBackgroundImageUrl)})`
            : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="official-admin-brandbar-inner">
          <OfficialLogo />
          <OfficialPartnerMarks />
        </div>
      </header>

      <div className="official-admin-body">
        <aside className={cn("official-admin-sidebar", isNavOpen && "is-open")}>
          <nav className="official-admin-nav" aria-label="Admin">
            {navGroups.map((group) => (
              <div className="official-admin-nav-group" key={group.title || "overview"}>
                {group.title ? <p>{group.title}</p> : null}
                {group.items
                  .filter(
                    (item) =>
                      session.user.role === "Admin" ||
                      session.user.permissions.includes(`${resourceForAdminPath(item.to)}.view`),
                  )
                  .map((item) => {
                  const Icon = item.icon;
                  const isExact = "exact" in item && item.exact;
                  const isActive = isExact
                    ? location.pathname === item.match
                    : location.pathname.startsWith(item.match);

                  return (
                    <Link
                      className={cn("official-admin-nav-link", isActive && "is-active")}
                      key={`${group.title}-${item.to}-${item.label}`}
                      onClick={closeNav}
                      to={item.to}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                  })}
              </div>
            ))}
          </nav>

          <div className="official-admin-help">
            <CircleHelp className="size-5" />
            <div>
              <strong>Hỗ trợ quản trị</strong>
              <span>Tài liệu hướng dẫn</span>
            </div>
            <ChevronDown className="size-4 -rotate-90" />
          </div>
        </aside>

        {isNavOpen ? <button className="official-admin-overlay" onClick={closeNav} type="button" /> : null}

        <div className="official-admin-content">
          <div className="official-admin-topbar">
            <Button className="official-admin-menu-button" onClick={toggleNav} size="icon" type="button" variant="ghost">
              {isNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>

            <div className="official-admin-topbar-spacer" />

            <NotificationBell compact />
            <div className="official-admin-user-menu" ref={userMenuRef}>
              <button
                className="official-admin-user-button"
                onClick={() => setIsUserMenuOpen((current) => !current)}
                type="button"
              >
                <span className="official-admin-avatar">{initials || "A"}</span>
                <span className="official-admin-user-copy">
                  <strong>{session.user.fullName}</strong>
                  <small>{roleLabel}</small>
                </span>
                <ChevronDown className={cn("size-4", isUserMenuOpen && "rotate-180")} />
              </button>

              {isUserMenuOpen ? (
                <div className="official-admin-user-dropdown">
                  <div>
                    <strong>{session.user.fullName}</strong>
                    <span>{roleLabel}</span>
                  </div>
                  <button onClick={logout} type="button">
                    <LogOut className="size-4" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <main className="official-admin-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
