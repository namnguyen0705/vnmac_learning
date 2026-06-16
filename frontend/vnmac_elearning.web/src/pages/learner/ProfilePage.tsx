import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  LifeBuoy,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import { getLearnerDashboard } from "../../shared/api/learner";
import { formatMinutes } from "../../shared/lib/format";
import { LearnerPanel } from "../../shared/ui/learner-ui";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";

export function ProfilePage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";

  const dashboardQuery = useQuery({
    queryKey: ["learner", userId, "dashboard"],
    queryFn: () => getLearnerDashboard(userId),
    enabled: Boolean(userId),
  });

  if (!session) {
    return null;
  }

  if (dashboardQuery.isLoading) {
    return <LoadingBlock label="Đang tải hồ sơ học viên..." />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <MessageBanner tone="error">Không tải được hồ sơ học viên.</MessageBanner>;
  }

  const { user } = dashboardQuery.data;

  return (
    <div className="grid gap-7">
      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <LearnerPanel className="overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#163b7b_0%,#0f2e63_100%)] p-6 text-white">
            <div className="grid size-20 place-items-center rounded-3xl bg-white/15 text-2xl font-bold">
              {getInitials(user.fullName)}
            </div>
            <h1 className="mt-5 text-[2rem] font-semibold leading-tight">{user.fullName}</h1>
            <p className="mt-2 text-sm text-white/75">{user.group}</p>
          </div>
          <div className="grid gap-3 p-6">
            <ProfileInfo icon={Phone} label="Số điện thoại" value={user.phoneNumber} />
            <ProfileInfo icon={MapPin} label="Tỉnh/thành" value={user.province} />
            <ProfileInfo icon={ShieldCheck} label="Vai trò" value={user.role === "Learner" ? "Học viên" : user.role} />
            <ProfileInfo icon={Mail} label="Email" value={user.email ?? "Chưa cập nhật"} />
          </div>
        </LearnerPanel>

        <div className="grid gap-6">
          <LearnerPanel className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#163b7b]">Hồ sơ học viên</p>
                <h2 className="mt-2 text-[1.8rem] font-semibold text-slate-950">Thông tin học tập của bạn</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Theo dõi thông tin cá nhân, kết quả học tập và các liên kết nhanh liên quan đến quá trình học.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {user.isEmailVerified ? "Đã xác thực email" : "Chưa xác thực email"}
              </div>
            </div>
          </LearnerPanel>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={GraduationCap} label="Khóa đã đăng ký" value={dashboardQuery.data.totalEnrolledCourses} />
            <Metric icon={BookOpenCheck} label="Khóa hoàn thành" value={dashboardQuery.data.totalCompletedCourses} />
            <Metric icon={Award} label="Chứng chỉ" value={dashboardQuery.data.totalCertificates} />
            <Metric icon={CalendarDays} label="Thời gian học" value={formatMinutes(dashboardQuery.data.totalStudyTimeMinutes)} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <LearnerPanel className="p-6 xl:col-span-2">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Khóa học gần đây</h2>
          <div className="mt-5 grid gap-3">
            {dashboardQuery.data.courses.length ? (
              dashboardQuery.data.courses.slice(0, 4).map((course) => (
                <Link
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#163b7b]/40 hover:shadow-md"
                  key={course.courseId}
                  to={`/app/courses/${course.courseId}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.completedLessons}/{course.totalLessons} bài học - {course.passedQuizzes}/{course.totalQuizzes} bài kiểm tra
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#163b7b]">{course.overallCompletionPercent}%</span>
                  </div>
                </Link>
              ))
            ) : (
              <MessageBanner tone="info">Bạn chưa đăng ký khóa học nào.</MessageBanner>
            )}
          </div>
        </LearnerPanel>

        <LearnerPanel className="p-6">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Liên kết nhanh</h2>
          <div className="mt-5 grid gap-3">
            <Button asChild className="justify-start rounded-2xl" variant="outline">
              <Link to="/app/courses">
                <GraduationCap className="size-4" />
                Khóa học của tôi
              </Link>
            </Button>
            <Button asChild className="justify-start rounded-2xl" variant="outline">
              <Link to="/app/certificate">
                <Award className="size-4" />
                Chứng chỉ
              </Link>
            </Button>
            <Button asChild className="justify-start rounded-2xl" variant="outline">
              <Link to="/app/support">
                <LifeBuoy className="size-4" />
                Hỗ trợ học viên
              </Link>
            </Button>
          </div>
        </LearnerPanel>
      </section>
    </div>
  );
}

function ProfileInfo({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <Icon className="mt-0.5 size-4 text-[#163b7b]" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 break-words font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: number | string }) {
  return (
    <LearnerPanel className="p-5">
      <Icon className="size-5 text-[#163b7b]" />
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </LearnerPanel>
  );
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");
}
