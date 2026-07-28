import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth";
import { OfficialLogo, OfficialPartnerMarks } from "@/shared/ui/learner-ui";
import { resolveBrandAsset, useBrandingSettings } from "@/shared/ui/branding";

const learnerLinks = [
  { to: "/app/dashboard", label: "Trang chủ", icon: Home },
  { to: "/app/courses", label: "Bài học", icon: BookOpen },
  { to: "/app/certificate", label: "Kết quả", icon: BarChart3 },
  { to: "/app/library", label: "Tài liệu", icon: FileText },
  { to: "/app/profile", label: "Hồ sơ", icon: UserRound, mobileOnly: true },
];

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");
}

export function LearnerLayout() {
  const { session, logout } = useAuth();
  const branding = useBrandingSettings();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  const user = session.user;

  return (
    <div className="learner-app-shell min-h-screen bg-[#f7faff] text-slate-950">
      <header
        className="learner-official-header"
        style={{
          backgroundColor: branding.headerBackgroundColor || "#ffffff",
          backgroundImage: branding.headerBackgroundImageUrl
            ? `url(${resolveBrandAsset(branding.headerBackgroundImageUrl)})`
            : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="learner-brand-row">
            <Link className="min-w-0" to="/app/dashboard">
              <OfficialLogo />
            </Link>
            <OfficialPartnerMarks />
          </div>

          <div className="learner-greeting-row">
            <p className="min-w-0 text-sm text-[#19467f]">
              Xin chào <strong>{user.fullName}</strong>
              {user.group ? <span>, {user.group}</span> : null}
              {user.province ? <span>, {user.province}</span> : null}
            </p>

            <div className="learner-header-actions">
              <Link className="learner-header-action" to="/app/support">
                <HelpCircle className="size-4" />
                <span>Hướng dẫn</span>
              </Link>

              <div className="learner-header-action learner-notification-action">
                <NotificationBell compact />
                <span>Thông báo</span>
              </div>

              <div className="relative">
                <button
                  className="learner-account-button"
                  type="button"
                  onClick={() => setIsUserMenuOpen((value) => !value)}
                >
                  <span className="learner-avatar">
                    {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : getInitials(user.fullName)}
                  </span>
                  <span>Tài khoản</span>
                  <ChevronDown className={cn("size-4 transition", isUserMenuOpen && "rotate-180")} />
                </button>

                {isUserMenuOpen ? (
                  <div className="learner-account-menu">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="font-semibold text-slate-950">{user.fullName}</p>
                      <p className="mt-1 text-sm text-slate-500">{user.phoneNumber || user.email}</p>
                    </div>
                    <div className="grid p-2">
                      <Link
                        className="learner-account-menu-item"
                        to="/app/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <UserRound className="size-4 text-[#0d58b3]" />
                        Hồ sơ cá nhân
                      </Link>
                      <button
                        className="learner-account-menu-item text-left"
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                      >
                        <LogOut className="size-4 text-[#0d58b3]" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="learner-content-scroll">
        <main className="learner-main-shell mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <footer className="learner-bottom-nav">
        <nav className="learner-bottom-nav-inner" aria-label="Điều hướng học viên">
          {learnerLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                className={({ isActive }) => cn("learner-bottom-link", item.mobileOnly && "mobile-only", isActive && "active")}
                key={item.to}
                to={item.to}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <p className="learner-copyright">© 2026 RAPPOT Project. All rights reserved.</p>
      </footer>
    </div>
  );
}
