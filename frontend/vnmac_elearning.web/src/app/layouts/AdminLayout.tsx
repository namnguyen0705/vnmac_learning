import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/shared/stores/shell-store";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../auth";

const adminNavItems = [
  { label: "Tổng quan", to: "/admin", icon: LayoutGrid, match: "/admin" },
  { label: "Khóa học", to: "/admin/courses", icon: BookOpen, match: "/admin/courses" },
  { label: "Bài học", to: "/admin/lessons", icon: ListChecks, match: "/admin/lessons" },
  { label: "Quiz", to: "/admin/quizzes", icon: ClipboardCheck, match: "/admin/quizzes" },
  { label: "Câu hỏi", to: "/admin/questions", icon: CircleHelp, match: "/admin/questions" },
  { label: "Học viên", to: "/admin/users", icon: Users, match: "/admin/users" },
  { label: "Chứng nhận", to: "/admin/certificates", icon: BadgeCheck, match: "/admin/certificates" },
  { label: "Báo cáo", to: "/admin/reports", icon: BarChart3, match: "/admin/reports" },
  { label: "Tracking", to: "/admin/tracking", icon: Activity, match: "/admin/tracking" },
  { label: "Cài đặt", to: "/admin/settings", icon: Settings, match: "/admin/settings" },
] as const;

export function AdminLayout() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const isNavOpen = useShellStore((state) => state.adminNavOpen);
  const isNavCollapsed = useShellStore((state) => state.adminNavCollapsed);
  const toggleNav = useShellStore((state) => state.toggleAdminNav);
  const toggleNavCollapsed = useShellStore((state) => state.toggleAdminNavCollapsed);
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

  const roleLabel =
    session.user.role === "Admin"
      ? "Quản trị viên"
      : session.user.role === "ContentManager"
        ? "Quản lý nội dung"
        : session.user.role === "DataViewer"
          ? "Phân tích dữ liệu"
          : session.user.role;

  const initials = session.user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");

  return (
    <div className="admin-shell min-h-screen bg-[#f6f9ff] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex flex-col bg-[linear-gradient(180deg,#08214a_0%,#0b1d3a_100%)] px-3 py-4 text-white shadow-[18px_0_44px_rgba(8,33,74,0.2)] transition-all duration-300 md:translate-x-0",
            isNavOpen ? "translate-x-0" : "-translate-x-full",
            isNavCollapsed ? "w-[84px]" : "w-[216px]",
          )}
        >
          <div className={cn("flex items-center gap-3 px-2 py-2.5", isNavCollapsed && "justify-center px-0")}>
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Shield className="size-5" />
            </div>
            {!isNavCollapsed ? (
              <div>
                <p className="text-[15px] font-semibold tracking-wide">E-LEARNING</p>
                <p className="text-[11px] text-white/70">ADMIN</p>
              </div>
            ) : null}
          </div>

          <nav className="mt-4 grid gap-2 px-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.match === "/admin"
                  ? location.pathname === "/admin"
                  : location.pathname.startsWith(item.match);

              return (
                <Link
                  className={cn(
                    "flex items-center rounded-2xl text-sm font-medium text-white/75 transition hover:bg-white/8 hover:text-white",
                    isNavCollapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-2.5",
                    isActive && "bg-[#0f60ff] text-white shadow-[0_14px_34px_rgba(15,96,255,0.35)]",
                  )}
                  key={item.to}
                  onClick={closeNav}
                  title={item.label}
                  to={item.to}
                >
                  <Icon className="size-5 shrink-0" />
                  {!isNavCollapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div
            className={cn(
              "mt-auto rounded-[22px] border border-white/12 bg-white/[0.04]",
              isNavCollapsed ? "px-2 py-3" : "px-4 py-4",
            )}
          >
            <div className={cn("flex items-center gap-3", isNavCollapsed && "justify-center")}>
              <div className="grid size-10 place-items-center rounded-2xl bg-white/10">
                <CircleHelp className="size-5" />
              </div>
              {!isNavCollapsed ? (
                <div>
                  <p className="font-semibold">Hỗ trợ quản trị</p>
                  <p className="text-sm text-white/65">Bạn cần hỗ trợ?</p>
                </div>
              ) : null}
            </div>
            <Button
              className={cn(
                "mt-3 rounded-2xl border-white/15 bg-white/8 text-white hover:bg-white/12",
                isNavCollapsed ? "w-full px-0" : "w-full",
              )}
              title="Liên hệ ngay"
              variant="outline"
            >
              {isNavCollapsed ? "?" : "Liên hệ ngay"}
            </Button>
          </div>
        </aside>

        <div
          className={cn(
            "flex min-h-screen flex-1 flex-col transition-all duration-300",
            isNavCollapsed ? "md:pl-[84px]" : "md:pl-[216px]",
          )}
        >
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/94 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-2 md:px-5">
              <div className="flex items-center gap-2">
                <Button
                  className="h-8 w-8 rounded-xl md:hidden"
                  onClick={toggleNav}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {isNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                </Button>
                <Button
                  className="hidden h-8 w-8 rounded-xl text-slate-600 md:inline-flex"
                  onClick={toggleNavCollapsed}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {isNavCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                </Button>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2">
                <div className="relative hidden w-full max-w-[290px] md:block">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-[34px] rounded-xl border-slate-200 bg-white pl-9 pr-3 text-sm shadow-none"
                    placeholder="Tìm kiếm..."
                  />
                </div>

                <Button className="relative h-8 w-8 rounded-xl text-slate-600" size="icon" type="button" variant="ghost">
                  <Bell className="size-4" />
                  <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-rose-500 text-[9px] font-semibold text-white">
                    8
                  </span>
                </Button>

                <div className="relative" ref={userMenuRef}>
                  <button
                    className="flex h-[34px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 transition hover:border-slate-300"
                    onClick={() => setIsUserMenuOpen((current) => !current)}
                    type="button"
                  >
                    <div className="grid size-7 place-items-center rounded-full bg-[linear-gradient(135deg,#fde68a,#f59e0b)] text-[11px] font-semibold text-slate-950">
                      {initials}
                    </div>
                    <div className="hidden text-left md:block">
                      <p className="text-[13px] font-semibold leading-tight text-slate-950">{session.user.fullName}</p>
                      <p className="text-[11px] leading-tight text-slate-500">{roleLabel}</p>
                    </div>
                    <ChevronDown className={cn("size-4 text-slate-400 transition", isUserMenuOpen && "rotate-180")} />
                  </button>

                  {isUserMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_46px_rgba(15,23,42,0.14)]">
                      <div className="rounded-xl px-3 py-2">
                        <p className="text-sm font-semibold text-slate-950">{session.user.fullName}</p>
                        <p className="text-xs text-slate-500">{roleLabel}</p>
                      </div>
                      <div className="my-1 h-px bg-slate-100" />
                      <button
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                        onClick={logout}
                        type="button"
                      >
                        <LogOut className="size-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-3 md:px-5 md:py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
