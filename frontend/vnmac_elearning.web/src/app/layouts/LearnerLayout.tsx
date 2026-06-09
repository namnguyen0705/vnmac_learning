import { NavLink, Navigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/shared/stores/shell-store";
import { Bell, ChevronDown, GraduationCap, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../auth";

const learnerLinks = [
  { to: "/app/dashboard", label: "Trang chủ" },
  { to: "/app/courses", label: "Khóa học" },
  { to: "/app/certificate", label: "Chứng chỉ" },
  { to: "/app/dashboard#progress", label: "Tiến độ" },
  { to: "/app/dashboard#support", label: "Hỗ trợ" },
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

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(40,92,173,0.08),_transparent_34%),linear-gradient(180deg,#f9fbfe_0%,#f4f8fc_100%)] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1560px] items-center gap-5 px-5 py-4 xl:px-8">
          <div className="flex items-center gap-3">
            <Button className="lg:hidden" size="icon" type="button" variant="outline" onClick={toggleNav}>
              {isNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
            <div className="grid size-11 place-items-center rounded-2xl bg-[#0d2857] text-white shadow-[0_16px_36px_rgba(13,40,87,0.18)]">
              <GraduationCap className="size-5" />
            </div>
          </div>

          <nav
            className={cn(
              "absolute left-0 right-0 top-[76px] z-20 hidden flex-col gap-2 border-b border-slate-200 bg-white px-5 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] lg:static lg:flex lg:flex-1 lg:flex-row lg:items-center lg:justify-center lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none",
              isNavOpen && "flex",
            )}
          >
            {learnerLinks.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "relative px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-950",
                    isActive && "text-[#163b7b]",
                  )
                }
                key={item.to}
                to={item.to}
                onClick={closeNav}
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive ? <span className="absolute inset-x-4 -bottom-2 h-0.5 rounded-full bg-[#1f6fb2]" /> : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:gap-4">
            <button
              className="relative grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              type="button"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                2
              </span>
            </button>

            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              <div className="grid size-10 place-items-center rounded-full bg-amber-300 text-sm font-bold text-slate-900">
                {getInitials(session.user.fullName)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-950">{session.user.fullName}</p>
                <p className="text-xs text-slate-500">{session.user.group}</p>
              </div>
              <ChevronDown className="hidden size-4 text-slate-500 sm:block" />
            </div>

            <Button className="rounded-full" title="Đăng xuất" type="button" variant="ghost" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-8 px-5 py-6 xl:px-8 xl:py-8">
        <Outlet />
      </main>
    </div>
  );
}
