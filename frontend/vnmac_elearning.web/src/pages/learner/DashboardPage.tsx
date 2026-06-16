import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Award,
  BookOpenCheck,
  Clock3,
  GraduationCap,
  LifeBuoy,
  MapPin,
  Phone,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../../app/auth";
import { getLearnerCourseCatalog, getLearnerDashboard, getPublishedCourses } from "../../shared/api/learner";
import { formatMinutes } from "../../shared/lib/format";
import { getCourseCoverAsset } from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerMetaChip, LearnerPanel, LearnerProgressBar, LearnerStatusBadge } from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type { LearnerCourseCatalogItem, LearnerEnrollmentSummary } from "../../shared/types/api";

type CourseCover = {
  posterUrl: string | null;
  lessonTitle: string | null;
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
];

function getCurrentCourse(courses: LearnerEnrollmentSummary[]) {
  return (
    courses.find((course) => !course.certificateIssued && course.overallCompletionPercent > 0) ??
    courses.find((course) => !course.certificateIssued) ??
    courses[0] ??
    null
  );
}

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

  const publishedCoursesQuery = useQuery({
    queryKey: ["courses", "published", "covers"],
    queryFn: getPublishedCourses,
  });

  const coverMap = useMemo(() => {
    return new Map(
      (publishedCoursesQuery.data ?? []).map((course) => [course.id, getCourseCoverAsset(course)]),
    );
  }, [publishedCoursesQuery.data]);

  if (dashboardQuery.isLoading || catalogQuery.isLoading) {
    return <LoadingBlock label="Đang tải trang chủ học viên..." />;
  }

  if (dashboardQuery.isError || catalogQuery.isError || !dashboardQuery.data || !catalogQuery.data) {
    return <MessageBanner tone="error">Không tải được dữ liệu học viên.</MessageBanner>;
  }

  const dashboard = dashboardQuery.data;
  const catalog = catalogQuery.data;
  const currentCourse = getCurrentCourse(dashboard.courses);
  const currentCover = currentCourse ? coverMap.get(currentCourse.courseId) : null;
  const inProgressCourses = dashboard.courses.filter((course) => !course.certificateIssued);
  const completedCourses = dashboard.courses.filter((course) => course.certificateIssued);
  const newCourses = catalog.courses.filter((course) => !course.isEnrolled).slice(0, 4);
  const heroImage = currentCover?.posterUrl ?? getFallbackImage(currentCourse?.courseId ?? "dashboard");

  return (
    <div className="grid gap-7">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LearnerPanel className="overflow-hidden">
          <div className="relative min-h-[500px]">
            <img className="absolute inset-0 h-full w-full object-cover" src={heroImage} alt="Trang chủ học tập" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,252,0.98)_0%,rgba(248,250,252,0.92)_48%,rgba(15,46,99,0.34)_100%)]" />
            <div className="relative z-10 grid min-h-[500px] content-between gap-8 p-7 sm:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#163b7b] shadow-sm">
                  <Sparkles className="size-3.5" />
                  Hồ sơ học viên
                </div>
                <h1 className="mt-5 max-w-3xl text-[2.35rem] font-semibold leading-tight text-slate-950 sm:text-[3rem]">
                  Xin chào, {dashboard.user.fullName}
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700">
                  Theo dõi khóa đang học, khóa mới nên bắt đầu, chứng chỉ đã nhận và thông tin hỗ trợ trên cùng một màn hình.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-12 rounded-2xl bg-[#163b7b] px-6 hover:bg-[#0f2e63]">
                    <Link to="/app/courses">Khám phá khóa học</Link>
                  </Button>
                  <Button asChild className="h-12 rounded-2xl bg-white/90 px-6" variant="outline">
                    <Link to="/app/certificate">Xem chứng chỉ</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Khóa đã đăng ký" value={dashboard.totalEnrolledCourses} icon={GraduationCap} />
                <Metric label="Khóa hoàn thành" value={dashboard.totalCompletedCourses} icon={BookOpenCheck} />
                <Metric label="Chứng chỉ" value={dashboard.totalCertificates} icon={Award} />
                <Metric label="Thời gian học" value={formatMinutes(dashboard.totalStudyTimeMinutes)} icon={Clock3} />
              </div>
            </div>
          </div>
        </LearnerPanel>

        <LearnerPanel className="overflow-hidden">
          <div className="relative aspect-video bg-slate-100">
            <img className="h-full w-full object-cover" src={heroImage} alt={currentCourse?.title ?? "Khóa đang học"} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.78)_100%)]" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Khóa đang học</p>
              <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-white">
                {currentCourse?.title ?? "Bạn chưa đăng ký khóa học"}
              </h2>
            </div>
            <span className="absolute right-5 top-5 grid size-12 place-items-center rounded-full bg-white text-[#163b7b] shadow-lg">
              <PlayCircle className="size-6" />
            </span>
          </div>

          <div className="grid gap-4 p-6">
            {currentCourse ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-6 text-slate-600">{currentCourse.description}</p>
                  <LearnerStatusBadge tone={currentCourse.certificateIssued ? "success" : "brand"}>
                    {currentCourse.certificateIssued ? "Hoàn thành" : "Đang học"}
                  </LearnerStatusBadge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LearnerMetaChip>{currentCourse.completedLessons}/{currentCourse.totalLessons} bài học</LearnerMetaChip>
                  <LearnerMetaChip>{currentCourse.passedQuizzes}/{currentCourse.totalQuizzes} bài kiểm tra</LearnerMetaChip>
                </div>
                <div className="grid gap-3">
                  <LearnerProgressBar label="Nội dung" tone="navy" value={currentCourse.contentCompletionPercent} />
                  <LearnerProgressBar label="Bài kiểm tra" tone="green" value={currentCourse.quizCompletionPercent} />
                  <LearnerProgressBar label="Toàn khóa" tone="amber" value={currentCourse.overallCompletionPercent} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]"
                    type="button"
                    onClick={() => openNextLearningStep(currentCourse, navigate)}
                  >
                    <PlayCircle className="size-4" />
                    Tiếp tục học
                  </Button>
                  <Button asChild className="rounded-2xl" variant="outline">
                    <Link to={`/app/courses/${currentCourse.courseId}`}>Chi tiết khóa</Link>
                  </Button>
                </div>
              </>
            ) : (
              <MessageBanner tone="info">Bạn chưa đăng ký khóa học nào.</MessageBanner>
            )}
          </div>
        </LearnerPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <LearnerPanel className="p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.25rem] font-semibold text-slate-950">Khóa học mới nên bắt đầu</h2>
              <p className="mt-2 text-sm text-slate-600">Các khóa mới có thumbnail video để bạn nhận diện nhanh nội dung.</p>
            </div>
            <Button asChild className="rounded-2xl" variant="outline">
              <Link to="/app/courses">Xem tất cả</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {newCourses.length ? (
              newCourses.map((course) => (
                <CompactCourseCard course={course} cover={coverMap.get(course.courseId)} key={course.courseId} />
              ))
            ) : (
              <MessageBanner tone="info">Bạn đã đăng ký tất cả khóa học hiện có.</MessageBanner>
            )}
          </div>
        </LearnerPanel>

        <LearnerPanel className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#163b7b] text-white">
              <UserRound className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-950">{dashboard.user.fullName}</h2>
              <p className="text-sm text-slate-500">{dashboard.user.group}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-slate-600">
            <ProfileRow icon={Phone} label="Số điện thoại" value={dashboard.user.phoneNumber} />
            <ProfileRow icon={MapPin} label="Tỉnh/thành" value={dashboard.user.province} />
            <ProfileRow icon={ShieldCheck} label="Tài khoản" value={dashboard.user.isEmailVerified ? "Đã xác thực email" : "Chưa xác thực email"} />
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-950">Hỗ trợ nhanh</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Liên hệ khi cần hỗ trợ tài khoản, nội dung học hoặc chứng chỉ.</p>
            <Button asChild className="mt-4 w-full rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]">
              <Link to="/app/support">
                <LifeBuoy className="size-4" />
                Mở trang hỗ trợ
              </Link>
            </Button>
          </div>
        </LearnerPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <LearnerPanel className="p-6">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Khóa đang học</h2>
          <div className="mt-5 grid gap-3">
            {inProgressCourses.length ? (
              inProgressCourses.map((course) => (
                <CourseProgressRow course={course} cover={coverMap.get(course.courseId)} key={course.courseId} />
              ))
            ) : (
              <MessageBanner tone="info">Không có khóa đang học.</MessageBanner>
            )}
          </div>
        </LearnerPanel>

        <LearnerPanel className="p-6">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Khóa đã hoàn thành</h2>
          <div className="mt-5 grid gap-3">
            {completedCourses.length ? (
              completedCourses.map((course) => (
                <Link
                  className="group grid grid-cols-[92px_minmax(0,1fr)] gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  key={course.courseId}
                  to={`/app/courses/${course.courseId}`}
                >
                  <CourseThumb courseId={course.courseId} cover={coverMap.get(course.courseId)} title={course.title} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold text-slate-950">{course.title}</p>
                    <p className="mt-1 text-sm text-slate-600">Đã đủ điều kiện nhận chứng chỉ.</p>
                    <div className="mt-2">
                      <LearnerStatusBadge tone="success">Hoàn thành</LearnerStatusBadge>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <MessageBanner tone="info">Chưa có khóa học hoàn thành.</MessageBanner>
            )}
          </div>
        </LearnerPanel>
      </section>
    </div>
  );
}

function openNextLearningStep(course: LearnerEnrollmentSummary, navigate: ReturnType<typeof useNavigate>) {
  if (course.nextLessonId) {
    navigate(`/app/courses/${course.courseId}/lessons/${course.nextLessonId}`);
    return;
  }

  if (course.nextQuizId) {
    navigate(`/app/courses/${course.courseId}/quizzes/${course.nextQuizId}`);
    return;
  }

  navigate(`/app/courses/${course.courseId}`);
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <Icon className="size-5 text-[#163b7b]" />
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <Icon className="mt-0.5 size-4 text-[#163b7b]" />
      <div>
        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function CompactCourseCard({ course, cover }: { course: LearnerCourseCatalogItem; cover?: CourseCover | null }) {
  return (
    <Link
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#163b7b]/40 hover:shadow-[0_18px_45px_rgba(15,46,99,0.12)]"
      to={`/app/courses/${course.courseId}`}
    >
      <div className="relative aspect-video overflow-hidden">
        <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={cover?.posterUrl ?? getFallbackImage(course.courseId)} alt={course.title} loading="lazy" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.7)_100%)]" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <p className="line-clamp-1 text-sm font-semibold text-white">{cover?.lessonTitle ?? "Video giới thiệu"}</p>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#163b7b]">
            <PlayCircle className="size-5" />
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="line-clamp-2 font-semibold text-slate-950">{course.title}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{course.description}</p>
          </div>
          <LearnerStatusBadge tone="brand">Mới</LearnerStatusBadge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <LearnerMetaChip>{course.totalLessons} bài học</LearnerMetaChip>
          <LearnerMetaChip>{formatMinutes(course.estimatedStudyTimeMinutes)}</LearnerMetaChip>
        </div>
      </div>
    </Link>
  );
}

function CourseProgressRow({ course, cover }: { course: LearnerEnrollmentSummary; cover?: CourseCover | null }) {
  return (
    <Link
      className="group grid grid-cols-[92px_minmax(0,1fr)] gap-4 rounded-2xl border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-[#163b7b]/40 hover:shadow-md"
      to={`/app/courses/${course.courseId}`}
    >
      <CourseThumb courseId={course.courseId} cover={cover} title={course.title} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="line-clamp-2 font-semibold text-slate-950">{course.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              {course.completedLessons}/{course.totalLessons} bài học - {course.passedQuizzes}/{course.totalQuizzes} bài kiểm tra
            </p>
          </div>
          <span className="text-sm font-semibold text-[#163b7b]">{course.overallCompletionPercent}%</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-[#163b7b]" style={{ width: `${Math.max(0, Math.min(100, course.overallCompletionPercent))}%` }} />
        </div>
      </div>
    </Link>
  );
}

function CourseThumb({ courseId, cover, title }: { courseId: string; cover?: CourseCover | null; title: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
      <img className="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={cover?.posterUrl ?? getFallbackImage(courseId)} alt={title} loading="lazy" />
      <div className="absolute inset-0 grid place-items-center bg-slate-950/22 text-white">
        <PlayCircle className="size-6" />
      </div>
    </div>
  );
}

function getFallbackImage(seed: string) {
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return fallbackImages[hash % fallbackImages.length];
}
