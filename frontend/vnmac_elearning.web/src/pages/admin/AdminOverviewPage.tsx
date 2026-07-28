import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminProgressRow,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { getAdminCourses, getAnalytics, getTracking } from "../../shared/api/admin";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import {
  Activity,
  ArrowRight,
  Award,
  BookOpenCheck,
  BookPlus,
  Clock3,
  FileSpreadsheet,
  GraduationCap,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(value)));
}

function formatMinutes(value: number) {
  const minutes = Math.max(0, Math.round(value));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} giờ ${remainder} phút` : `${remainder} phút`;
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function AdminOverviewPage() {
  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: getAdminCourses,
  });
  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", "overview"],
    queryFn: () => getAnalytics({}),
  });
  const trackingQuery = useQuery({
    queryKey: ["admin", "tracking", "overview"],
    queryFn: () => getTracking({}),
  });

  if (coursesQuery.isLoading || analyticsQuery.isLoading || trackingQuery.isLoading) {
    return <LoadingBlock label="Đang tải dữ liệu tổng quan..." />;
  }

  if (
    coursesQuery.isError ||
    analyticsQuery.isError ||
    trackingQuery.isError ||
    !coursesQuery.data ||
    !analyticsQuery.data ||
    !trackingQuery.data
  ) {
    return <MessageBanner tone="error">Không tải được dữ liệu tổng quan hệ thống.</MessageBanner>;
  }

  const courses = coursesQuery.data;
  const analytics = analyticsQuery.data;
  const tracking = trackingQuery.data;
  const learners = analytics.learners;
  const totalLearners = analytics.totalLearners;
  const totalCertificates = learners.reduce((total, learner) => total + learner.certificateCount, 0);

  const learnersWithEnrollment = tracking.learners.filter((learner) => learner.courses.length > 0).length;
  const learnersStarted = tracking.learners.filter((learner) =>
    learner.courses.some((course) =>
      course.lessons.some((lesson) =>
        lesson.status !== "NotStarted" ||
        lesson.watchPercent > 0 ||
        lesson.interactionAttempts > 0 ||
        lesson.quizAttempts > 0 ||
        lesson.scormAttempts > 0,
      ),
    ),
  ).length;
  const learnersWithQuiz = tracking.learners.filter((learner) =>
    learner.courses.some((course) => course.lessons.some((lesson) => lesson.quizAttempts > 0)),
  ).length;
  const completedLearners = learners.filter((learner) => learner.completionPercent >= 100).length;
  const certifiedLearners = learners.filter((learner) => learner.certificateCount > 0).length;

  const journey = [
    { label: "Đã ghi danh", value: learnersWithEnrollment, color: "bg-blue-500" },
    { label: "Đã bắt đầu học", value: learnersStarted, color: "bg-cyan-500" },
    { label: "Đã làm bài kiểm tra", value: learnersWithQuiz, color: "bg-violet-500" },
    { label: "Hoàn thành", value: completedLearners, color: "bg-emerald-500" },
    { label: "Có chứng chỉ", value: certifiedLearners, color: "bg-amber-500" },
  ].map((item) => ({ ...item, percent: percentage(item.value, totalLearners) }));

  const provinceRows = Array.from(
    learners.reduce((map, learner) => {
      const province = learner.province.trim() || "Chưa cập nhật";
      const current = map.get(province) ?? { count: 0, completion: 0 };
      current.count += 1;
      current.completion += learner.completionPercent;
      map.set(province, current);
      return map;
    }, new Map<string, { count: number; completion: number }>()),
  )
    .map(([province, value]) => ({
      province,
      count: value.count,
      completion: value.count ? value.completion / value.count : 0,
    }))
    .sort((left, right) => right.count - left.count || left.province.localeCompare(right.province, "vi"));

  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const courseRows = tracking.courseSummaries
    .slice()
    .sort((left, right) => right.enrolledLearners - left.enrolledLearners)
    .slice(0, 6)
    .map((summary) => {
      const course = courseMap.get(summary.courseId);
      return {
        ...summary,
        lessonCount: course?.sections.reduce((total, section) => total + section.lessons.length, 0) ?? 0,
        status: course?.status ?? "Draft",
      };
    });

  const maxDifficult = Math.max(0, ...analytics.topDifficultLessons.map((item) => item.total));
  const maxDropOff = Math.max(0, ...tracking.dropOffLessons.map((item) => item.learnerCount));

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        breadcrumbs={["Quản trị", "Tổng quan"]}
        actions={
          <>
            <Button asChild className="rounded-xl" variant="outline">
              <Link to="/admin/reports"><FileSpreadsheet className="size-4" /> Xem báo cáo</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/admin/lessons"><BookPlus className="size-4" /> Thêm bài học</Link>
            </Button>
          </>
        }
        title="Tổng quan hệ thống"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard accent="blue" icon={<Users className="size-7" />} label="Người học" value={formatNumber(totalLearners)} />
        <AdminMetricCard accent="green" icon={<GraduationCap className="size-7" />} label="Hoàn thành" value={`${analytics.completionRatePercent.toFixed(1)}%`} />
        <AdminMetricCard accent="amber" icon={<Trophy className="size-7" />} label="Đạt yêu cầu" value={`${analytics.passRatePercent.toFixed(1)}%`} />
        <AdminMetricCard accent="blue" icon={<Clock3 className="size-7" />} label="Thời gian học TB" value={formatMinutes(analytics.averageStudyTimeMinutes)} />
        <AdminMetricCard accent="violet" icon={<Award className="size-7" />} label="Chứng chỉ đã cấp" value={formatNumber(totalCertificates)} />
      </section>

      <AdminSection
        action={
          <Button asChild className="rounded-xl" variant="outline">
            <Link to="/admin/tracking">Theo dõi chi tiết <ArrowRight className="size-4" /></Link>
          </Button>
        }
        subtitle="Tính trực tiếp từ ghi danh, tiến độ bài học, lượt làm bài và chứng chỉ."
        title="Hành trình người học"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {journey.map((item, index) => (
            <div className="rounded-2xl border border-slate-200 bg-white p-4" key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatNumber(item.value)}</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(100, item.percent)}%` }} />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">{item.percent.toFixed(1)}% tổng người học</p>
            </div>
          ))}
        </div>
      </AdminSection>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <div className="grid gap-5">
          <AdminSection
            action={<Button asChild className="rounded-xl" variant="ghost"><Link to="/admin/courses">Tất cả khóa học <ArrowRight className="size-4" /></Link></Button>}
            subtitle="Xếp theo số người ghi danh; tiến độ lấy từ enrollment."
            title="Hiệu quả khóa học"
          >
            {courseRows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="pb-3">Khóa học</th>
                      <th className="pb-3 text-center">Bài học</th>
                      <th className="pb-3 text-center">Ghi danh</th>
                      <th className="pb-3 text-center">Đang học</th>
                      <th className="pb-3">Hoàn thành TB</th>
                      <th className="pb-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseRows.map((course) => (
                      <tr className="border-b border-slate-100 last:border-0" key={course.courseId}>
                        <td className="max-w-[280px] py-4 pr-4 font-semibold text-slate-900">{course.courseTitle}</td>
                        <td className="py-4 text-center text-slate-600">{formatNumber(course.lessonCount)}</td>
                        <td className="py-4 text-center text-slate-600">{formatNumber(course.enrolledLearners)}</td>
                        <td className="py-4 text-center text-slate-600">{formatNumber(course.activeLearners)}</td>
                        <td className="min-w-44 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${course.averageCompletionPercent}%` }} />
                            </div>
                            <span className="w-12 text-right font-semibold text-slate-700">{course.averageCompletionPercent}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <AdminStatusBadge status={course.status === "Published" ? "Công khai" : "Bản nháp"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState>Chưa có lượt ghi danh để tổng hợp theo khóa học.</EmptyState>}
          </AdminSection>

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminSection subtitle="Chỉ bao gồm tài khoản có vai trò học viên." title="Người học theo tỉnh">
              {provinceRows.length ? (
                <div className="space-y-4">
                  {provinceRows.slice(0, 7).map((item) => (
                    <div className="grid grid-cols-[minmax(0,1fr)_44px_120px] items-center gap-3" key={item.province}>
                      <div className="flex min-w-0 items-center gap-2">
                        <MapPin className="size-4 shrink-0 text-blue-500" />
                        <span className="truncate text-sm font-medium text-slate-700">{item.province}</span>
                      </div>
                      <span className="text-right text-sm font-semibold text-slate-900">{formatNumber(item.count)}</span>
                      <div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${item.completion}%` }} />
                        </div>
                        <p className="mt-1 text-right text-[11px] text-slate-400">{item.completion.toFixed(1)}% hoàn thành</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState>Chưa có dữ liệu địa bàn của người học.</EmptyState>}
            </AdminSection>

            <AdminSection subtitle="Sự kiện học tập mới nhất từ hệ thống tracking." title="Hoạt động gần đây">
              {tracking.recentEvents.length ? (
                <div className="space-y-1">
                  {tracking.recentEvents.slice(0, 6).map((event) => (
                    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-0" key={event.id}>
                      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <Activity className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{event.learnerName}</p>
                        <p className="line-clamp-2 text-xs leading-5 text-slate-500">{event.detail}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{dateFormatter.format(new Date(event.occurredAt))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState>Chưa phát sinh hoạt động học tập.</EmptyState>}
            </AdminSection>
          </div>
        </div>

        <div className="grid content-start gap-5">
          <AdminSection subtitle="Xếp theo tổng số câu trả lời sai thực tế." title="Bài học khó">
            {analytics.topDifficultLessons.length ? (
              <div className="space-y-4">
                {analytics.topDifficultLessons.slice(0, 5).map((item, index) => (
                  <div key={item.id}>
                    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">{index + 1}. {item.title}</span>
                      <span className="shrink-0 font-semibold text-amber-600">{formatNumber(item.total)} lỗi</span>
                    </div>
                    <AdminProgressRow
                      colorClassName="bg-amber-500"
                      label=""
                      value={percentage(item.total, maxDifficult)}
                    />
                  </div>
                ))}
              </div>
            ) : <EmptyState>Chưa có câu trả lời sai để thống kê.</EmptyState>}
          </AdminSection>

          <AdminSection subtitle="Người học dừng tại bài trước khi hoàn thành khóa." title="Điểm rơi rụng">
            {tracking.dropOffLessons.length ? (
              <div className="space-y-4">
                {tracking.dropOffLessons.slice(0, 5).map((item) => (
                  <div key={item.lessonId}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">{item.title}</p>
                        <p className="truncate text-xs text-slate-400">{item.courseTitle}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-rose-600">{item.learnerCount} người</span>
                    </div>
                    <AdminProgressRow
                      colorClassName="bg-rose-500"
                      label=""
                      value={percentage(item.learnerCount, maxDropOff)}
                    />
                  </div>
                ))}
              </div>
            ) : <EmptyState>Chưa có người học dừng giữa chừng.</EmptyState>}
          </AdminSection>

          <AdminSection subtitle="Các trạng thái theo dõi hiện tại." title="Sức khỏe học tập">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <Activity className="size-5 text-emerald-600" />
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatNumber(tracking.overview.activeLearners)}</p>
                <p className="text-xs text-slate-500">Đang học</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <BookOpenCheck className="size-5 text-amber-600" />
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatNumber(tracking.overview.stalledLearners)}</p>
                <p className="text-xs text-slate-500">Mắc kẹt</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <GraduationCap className="size-5 text-blue-600" />
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatNumber(tracking.overview.completedCourses)}</p>
                <p className="text-xs text-slate-500">Lượt hoàn thành khóa</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-4">
                <Award className="size-5 text-violet-600" />
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatNumber(totalCertificates)}</p>
                <p className="text-xs text-slate-500">Chứng chỉ</p>
              </div>
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  );
}
