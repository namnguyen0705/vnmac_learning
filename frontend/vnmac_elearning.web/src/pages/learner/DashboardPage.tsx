import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, BookOpen, Clock3, LifeBuoy, PlayCircle, ScrollText, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/auth";
import { getLearnerCourseCatalog, getLearnerDashboard } from "../../shared/api/learner";
import { formatMinutes } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import {
  LearnerMetaChip,
  LearnerPanel,
  LearnerProgressBar,
  LearnerScreenTitle,
  LearnerStatusBadge,
} from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";

export function DashboardPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user.id ?? "";

  const dashboardQuery = useQuery({
    queryKey: ["learner", userId, "dashboard"],
    queryFn: () => getLearnerDashboard(userId),
    enabled: Boolean(userId),
  });

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  if (dashboardQuery.isLoading || catalogQuery.isLoading) {
    return <LoadingBlock label="Đang tải trang chủ học viên..." />;
  }

  if (dashboardQuery.isError || catalogQuery.isError || !dashboardQuery.data || !catalogQuery.data) {
    return <MessageBanner tone="error">Không tải được dữ liệu trang chủ học viên.</MessageBanner>;
  }

  const dashboard = dashboardQuery.data;
  const currentCourse = dashboard.courses[0] ?? null;
  const availableCourses = catalogQuery.data.courses.filter((course) => !course.isEnrolled).slice(0, 3);
  const completedCourses = dashboard.courses.filter((course) => course.certificateIssued).slice(0, 3);

  return (
    <div className="grid gap-7">
      <LearnerScreenTitle index={1} title="Trang chủ học tập" />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <LearnerPanel className="overflow-hidden">
          <div className="grid gap-6 p-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4">
              <span className="w-fit rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#163b7b]">
                Lộ trình học dành cho cộng đồng
              </span>
              <h1 className="max-w-[760px] text-[2.45rem] font-semibold leading-[1.1] tracking-[-0.045em] text-[#12284c]">
                Học kiến thức an toàn, hoàn thành từng bài và mở khóa bài kiểm tra đúng tiến độ
              </h1>
              <p className="max-w-[700px] text-sm leading-7 text-slate-600">
                Toàn bộ khóa học được tổ chức theo một luồng rõ ràng: đăng ký khóa học, hoàn thành từng bài nội dung,
                mở bài kiểm tra cuối phần hoặc cuối khóa, sau đó nhận chứng chỉ xác thực khi đạt kết quả yêu cầu.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl bg-[#163b7b] px-5 hover:bg-[#0f2e63]" type="button" onClick={() => navigate("/app/courses")}>
                  Xem danh sách khóa học
                </Button>
                <Button asChild className="rounded-2xl" variant="outline">
                  <Link to="/app/certificate">Xem chứng chỉ của tôi</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_58%),linear-gradient(145deg,#163b7b_0%,#1f4a90_44%,#2b5b9d_100%)] p-6 text-white shadow-[0_24px_60px_rgba(22,59,123,0.22)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Tiến độ tổng quan</p>
                  <p className="mt-2 text-4xl font-semibold">{dashboard.totalCompletedCourses}</p>
                </div>
                <Award className="size-9 text-amber-300" />
              </div>
              <div className="grid gap-3 text-sm text-white/85">
                <StatStrip label="Khóa học đã đăng ký" value={String(dashboard.totalEnrolledCourses)} />
                <StatStrip label="Chứng chỉ đã cấp" value={String(dashboard.totalCertificates)} />
                <StatStrip label="Tổng thời gian học" value={formatMinutes(dashboard.totalStudyTimeMinutes)} />
              </div>
            </div>
          </div>
        </LearnerPanel>

        <LearnerPanel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[1.35rem] font-semibold text-slate-950">Chặng học hiện tại</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Theo dõi khóa học đang học dở và quay lại đúng bài tiếp theo chỉ với một lần nhấn.
              </p>
            </div>
            <LearnerStatusBadge tone={currentCourse?.certificateIssued ? "success" : "brand"}>
              {currentCourse?.certificateIssued ? "Đã hoàn thành" : "Đang học"}
            </LearnerStatusBadge>
          </div>

          {currentCourse ? (
            <div className="mt-5 grid gap-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-5">
              <div className="space-y-2">
                <h4 className="text-[1.35rem] font-semibold text-slate-950">{currentCourse.title}</h4>
                <p className="text-sm leading-7 text-slate-600">{currentCourse.description}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <LearnerMetaChip>
                  <BookOpen className="size-3.5" />
                  {currentCourse.totalLessons} bài học
                </LearnerMetaChip>
                <LearnerMetaChip>
                  <ShieldCheck className="size-3.5" />
                  {currentCourse.totalQuizzes} bài kiểm tra
                </LearnerMetaChip>
                <LearnerMetaChip>
                  <Clock3 className="size-3.5" />
                  {formatMinutes(currentCourse.totalLessons * 8)}
                </LearnerMetaChip>
              </div>

              <div className="grid gap-4" id="progress">
                <LearnerProgressBar label="Tiến độ nội dung" tone="navy" value={currentCourse.contentCompletionPercent} />
                <LearnerProgressBar label="Tiến độ bài kiểm tra" tone="green" value={currentCourse.quizCompletionPercent} />
                <LearnerProgressBar label="Tiến độ toàn khóa" tone="amber" value={currentCourse.overallCompletionPercent} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]"
                  type="button"
                  onClick={() => {
                    if (currentCourse.nextLessonId) {
                      navigate(`/app/courses/${currentCourse.courseId}/lessons/${currentCourse.nextLessonId}`);
                      return;
                    }

                    if (currentCourse.nextQuizId) {
                      navigate(`/app/courses/${currentCourse.courseId}/quizzes/${currentCourse.nextQuizId}`);
                    }
                  }}
                >
                  <PlayCircle className="mr-2 size-4" />
                  {currentCourse.nextLessonId ? "Tiếp tục học" : "Làm bài kiểm tra"}
                </Button>
                <Button asChild className="rounded-2xl" variant="outline">
                  <Link to={`/app/courses/${currentCourse.courseId}`}>Xem chi tiết khóa học</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <MessageBanner tone="info">
                Bạn chưa đăng ký khóa học nào. Hãy mở danh sách khóa học và bắt đầu lộ trình học đầu tiên.
              </MessageBanner>
            </div>
          )}
        </LearnerPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]" id="support">
        <LearnerPanel className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[1.35rem] font-semibold text-slate-950">Khóa học nên bắt đầu</h3>
            <Button asChild className="rounded-2xl" variant="outline">
              <Link to="/app/courses">Tất cả khóa học</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {availableCourses.length > 0 ? (
              availableCourses.map((course) => (
                <button
                  className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                  key={course.courseId}
                  type="button"
                  onClick={() => navigate(`/app/courses/${course.courseId}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <LearnerStatusBadge tone="brand">Mới</LearnerStatusBadge>
                    <LearnerMetaChip>{formatMinutes(course.estimatedStudyTimeMinutes)}</LearnerMetaChip>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-slate-950">{course.title}</h4>
                    <p className="text-sm leading-6 text-slate-600">{course.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <LearnerMetaChip>{course.totalLessons} bài học</LearnerMetaChip>
                    <LearnerMetaChip>{course.totalQuizzes} bài kiểm tra</LearnerMetaChip>
                  </div>
                </button>
              ))
            ) : (
              <div className="md:col-span-3">
                <MessageBanner tone="info">Bạn đã đăng ký toàn bộ khóa học hiện có trên hệ thống.</MessageBanner>
              </div>
            )}
          </div>
        </LearnerPanel>

        <div className="grid gap-6">
          <LearnerPanel className="p-6">
            <h3 className="text-[1.35rem] font-semibold text-slate-950">Thành quả gần đây</h3>
            <div className="mt-5 grid gap-3">
              {completedCourses.length > 0 ? (
                completedCourses.map((course) => (
                  <div className="flex items-start justify-between gap-4 rounded-[20px] border border-slate-200 px-4 py-4" key={course.courseId}>
                    <div className="grid gap-1">
                      <p className="text-sm font-semibold text-slate-950">{course.title}</p>
                      <p className="text-xs text-slate-500">Bạn đã hoàn thành khóa học và đủ điều kiện nhận chứng chỉ.</p>
                    </div>
                    <LearnerStatusBadge tone="success">Hoàn thành</LearnerStatusBadge>
                  </div>
                ))
              ) : (
                <MessageBanner tone="info">Chưa có khóa học nào hoàn thành. Hãy tiếp tục lộ trình hiện tại.</MessageBanner>
              )}
            </div>
          </LearnerPanel>

          <LearnerPanel className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#eaf3ff] text-[#163b7b]">
                <LifeBuoy className="size-5" />
              </div>
              <div>
                <h3 className="text-[1.25rem] font-semibold text-slate-950">Hỗ trợ học viên</h3>
                <p className="text-sm text-slate-500">Liên hệ khi cần hỗ trợ tài khoản hoặc nội dung học tập.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm leading-7 text-slate-600">
              <SupportItem icon={ScrollText} label="Email hỗ trợ" value="support@vnmac-elearning.vn" />
              <SupportItem icon={BookOpen} label="Tổng đài" value="1900 6868" />
              <SupportItem icon={ShieldCheck} label="Đơn vị vận hành" value="Trung tâm Hành động Bom mìn Quốc gia Việt Nam" />
            </div>
          </LearnerPanel>
        </div>
      </div>
    </div>
  );
}

function StatStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
      <span>{label}</span>
      <strong className="text-white">{value}</strong>
    </div>
  );
}

function SupportItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] bg-slate-50 px-4 py-3">
      <div className="mt-0.5 grid size-9 place-items-center rounded-xl bg-white text-[#163b7b] shadow-sm">
        <Icon className="size-4" />
      </div>
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
