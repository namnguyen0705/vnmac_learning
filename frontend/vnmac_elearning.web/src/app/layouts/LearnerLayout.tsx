import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/shared/stores/shell-store";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import { ChevronDown, GraduationCap, LogOut, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth";

const learnerLinks = [
  { to: "/app/dashboard", label: "Trang chủ" },
  { to: "/app/courses", label: "Khóa học" },
  { to: "/app/certificate", label: "Chứng chỉ" },
  { to: "/app/support", label: "Hỗ trợ" },
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
  const isNavOpen = useShellStore((state) => state.learnerNavOpen);
  const toggleNav = useShellStore((state) => state.toggleLearnerNav);
  const closeNav = useShellStore((state) => state.closeLearnerNav);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex w-full items-center gap-4 px-5 py-3 xl:px-8">
          <Button className="lg:hidden" size="icon" type="button" variant="outline" onClick={toggleNav}>
            {isNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>

          <div className="grid size-11 place-items-center rounded-2xl bg-[#0d2857] text-white">
            <GraduationCap className="size-5" />
          </div>

          <nav
            className={cn(
              "absolute left-0 right-0 top-[68px] z-20 hidden flex-col gap-1 border-b border-slate-200 bg-white px-5 py-4 lg:static lg:flex lg:flex-1 lg:flex-row lg:items-center lg:justify-center lg:border-0 lg:bg-transparent lg:px-0 lg:py-0",
              isNavOpen && "flex",
            )}
          >
            {learnerLinks.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                    isActive && "bg-[#eaf3ff] text-[#163b7b]",
                  )
                }
                key={item.to}
                to={item.to}
                onClick={closeNav}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />

            <div className="relative">
              <button
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1 pr-3 transition hover:border-[#163b7b]/35 hover:shadow-sm"
                type="button"
                onClick={() => setIsUserMenuOpen((value) => !value)}
              >
                <div className="grid size-10 place-items-center rounded-full bg-amber-300 text-sm font-bold text-slate-900">
                  {getInitials(session.user.fullName)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-slate-950">{session.user.fullName}</p>
                  <p className="text-xs text-slate-500">{session.user.group}</p>
                </div>
                <ChevronDown className={cn("size-4 text-slate-500 transition", isUserMenuOpen && "rotate-180")} />
              </button>

              {isUserMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="font-semibold text-slate-950">{session.user.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{session.user.phoneNumber}</p>
                  </div>
                  <div className="grid p-2">
                    <Link
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      to="/app/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <UserRound className="size-4 text-[#163b7b]" />
                      Hồ sơ cá nhân
                    </Link>
                    <button
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="size-4 text-[#163b7b]" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-col gap-6 px-5 py-6 xl:px-8">
        <Outlet />
      </main>
    </div>
  );
}
