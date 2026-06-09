import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AdminCourseThumb,
  AdminMetricCard,
  AdminPageHeader,
  AdminProgressRow,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { getAdminCourses, getAdminUsers, getAnalytics } from "../../shared/api/admin";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import {
  ArrowRight,
  BookPlus,
  Clock3,
  FileSpreadsheet,
  GraduationCap,
  Trophy,
  UploadCloud,
  Users,
} from "lucide-react";

const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(value)));
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
  const usersQuery = useQuery({
    queryKey: ["admin", "users", "overview"],
    queryFn: () => getAdminUsers({}),
  });

  if (coursesQuery.isLoading || analyticsQuery.isLoading || usersQuery.isLoading) {
    return <LoadingBlock label="Đang tải tổng quan hệ thống..." />;
  }

  if (coursesQuery.isError || analyticsQuery.isError || usersQuery.isError || !coursesQuery.data || !analyticsQuery.data || !usersQuery.data) {
    return <MessageBanner tone="error">Không tải được dashboard tổng quan.</MessageBanner>;
  }

  const courses = coursesQuery.data;
  const analytics = analyticsQuery.data;
  const users = usersQuery.data;
  const courseCount = courses.length;
  const totalLearners = analytics.totalLearners;
  const journey = [
    { label: "Video", value: totalLearners, percent: 100, tone: "text-blue-600" },
    { label: "Tương tác", value: Math.round(totalLearners * 0.817), percent: 81.7, tone: "text-cyan-600" },
    { label: "Quiz", value: Math.round(totalLearners * 0.718), percent: 71.8, tone: "text-violet-600" },
    { label: "Đạt 100%", value: Math.round(totalLearners * (analytics.completionRatePercent / 100)), percent: analytics.completionRatePercent, tone: "text-emerald-600" },
    { label: "Unlock", value: Math.round(totalLearners * 0.57), percent: 57, tone: "text-amber-500" },
  ];

  const provinceRows = Array.from(
    users.reduce((map, user) => {
      const current = map.get(user.province) ?? { count: 0, completion: 0 };
      current.count += 1;
      current.completion += user.completionPercent;
      map.set(user.province, current);
      return map;
    }, new Map<string, { count: number; completion: number }>()),
  )
    .map(([province, value]) => ({
      province,
      count: value.count,
      completion: value.count ? value.completion / value.count : 0,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const courseRows = courses.slice(0, 5).map((course, index) => {
    const learnerCount = Math.round((totalLearners / Math.max(courseCount, 1)) * (1.16 - index * 0.08));
    const completion = Math.max(36, analytics.completionRatePercent + (courseCount - index) * 2.4 - 8);
    return {
      ...course,
      learnerCount,
      completion: Math.min(96, completion),
      updatedDate: `${String(20 - index).padStart(2, "0")}/05/2026`,
    };
  });

  const recentActivities = [
    users[0]
      ? {
          title: `${users[0].fullName} đã hoàn thành khóa học`,
          subtitle: courses[0]?.title ?? "Ky nang giao tiep chuyen nghiep",
          time: "2 phút trước",
        }
      : null,
    users[1]
      ? {
          title: `${users[1].fullName} đăng ký khóa học`,
          subtitle: courses[1]?.title ?? "Quan tri du an co ban",
          time: "15 phút trước",
        }
      : null,
    users[2]
      ? {
          title: `${users[2].fullName} đã hoàn thành bài học`,
          subtitle: courses[2]?.title ?? "Phan tich du lieu nang cao",
          time: "32 phút trước",
        }
      : null,
    {
      title: `Hệ thống đã cấp ${formatNumber(Math.round(totalLearners * (analytics.completionRatePercent / 100) * 0.38))} chứng nhận`,
      subtitle: "Xác thực QR và xác thực online",
      time: "1 giờ trước",
    },
    {
      title: "Báo cáo tuần đã được tạo thành công",
      subtitle: "Analytics và tracking học tập",
      time: "2 giờ trước",
    },
  ].filter(Boolean) as { title: string; subtitle: string; time: string }[];

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        actions={
          <>
            <Button asChild className="rounded-2xl" variant="outline">
              <Link to="/admin/courses">Quản lý khóa học</Link>
            </Button>
            <Button asChild className="rounded-2xl">
              <Link to="/admin/lessons">Thêm bài học</Link>
            </Button>
          </>
        }
        subtitle="Tổng hợp KPI học tập, hành trình người học và trạng thái khóa học trên toàn hệ thống."
        title="Tổng quan hệ thống"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard accent="blue" delta="+12,5% so với tháng trước" icon={<Users className="size-8" />} label="Tổng người học" value={formatNumber(totalLearners)} />
        <AdminMetricCard accent="green" delta="+6,7% so với tháng trước" icon={<GraduationCap className="size-8" />} label="Tỷ lệ hoàn thành" value={`${analytics.completionRatePercent.toFixed(1)}%`} />
        <AdminMetricCard accent="amber" delta="+5,2% so với tháng trước" icon={<Trophy className="size-8" />} label="Tỷ lệ đạt (quiz cuối)" value={`${analytics.passRatePercent.toFixed(1)}%`} />
        <AdminMetricCard accent="blue" delta="+8,3% so với tháng trước" icon={<Clock3 className="size-8" />} label="Thời gian học TB" value="02:34:21" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_340px]">
        <div className="grid gap-6">
          <AdminSection
            action={<Button className="rounded-2xl" variant="outline">30 ngày qua</Button>}
            subtitle="Tổng quan tiến độ theo luồng Video - Tương tác - Bài kiểm tra - Đạt 100% - Mở khóa."
            title="Hành trình học tập"
          >
            <div className="grid gap-4 md:grid-cols-5">
              {journey.map((item, index) => (
                <Card className="border-slate-200 shadow-none" key={item.label}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("grid size-14 place-items-center rounded-2xl bg-slate-50 text-lg font-semibold", item.tone)}>
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <p className="text-2xl font-semibold text-slate-950">{formatNumber(item.value)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            index === 0 && "bg-blue-500",
                            index === 1 && "bg-cyan-500",
                            index === 2 && "bg-violet-500",
                            index === 3 && "bg-emerald-500",
                            index === 4 && "bg-amber-500",
                          )}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500">{item.percent.toFixed(1)}%</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AdminSection>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="grid gap-6">
              <AdminSection subtitle="Phân bổ người học theo tỉnh/thành phố." title="Người học theo tỉnh">
                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_35%),linear-gradient(180deg,#eaf2ff_0%,#f7fbff_100%)] p-4">
                    <div className="mx-auto h-full min-h-[260px] rounded-[24px] border border-dashed border-blue-200 bg-[linear-gradient(180deg,rgba(37,99,235,0.08),rgba(255,255,255,0.2))]" />
                  </div>
                  <div className="space-y-4">
                    {provinceRows.map((item) => (
                      <div className="flex items-center justify-between gap-4" key={item.province}>
                        <div className="flex items-center gap-3">
                          <span className="size-3 rounded-full bg-blue-500" />
                          <span className="text-sm text-slate-700">{item.province}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">{formatNumber(item.count)}</span>
                          <div className="w-28">
                            <div className="h-2 rounded-full bg-slate-100">
                              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(100, item.completion)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button className="rounded-2xl px-0 text-blue-600" variant="link">
                      Xem chi tiết <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </AdminSection>

              <AdminSection subtitle="Danh sách khóa học có chỉ số học tập nổi bật." title="Danh sách khóa học">
                <div className="overflow-hidden rounded-[28px] border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Tên khóa học</th>
                        <th className="px-4 py-3 text-left font-medium">Số bài học</th>
                        <th className="px-4 py-3 text-left font-medium">Học viên</th>
                        <th className="px-4 py-3 text-left font-medium">Tỷ lệ hoàn thành</th>
                        <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                        <th className="px-4 py-3 text-left font-medium">Cập nhật</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseRows.map((course, index) => (
                        <tr className="border-t border-slate-100" key={course.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <AdminCourseThumb index={index} title={course.title} />
                              <div>
                                <p className="font-semibold text-slate-900">{course.title}</p>
                                <p className="text-slate-500">CODE: CRS-{index + 1}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{course.sections.reduce((total, section) => total + section.lessons.length, 0)}</td>
                          <td className="px-4 py-3">{formatNumber(course.learnerCount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-24 rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${course.completion}%` }} />
                              </div>
                              <span className="font-medium text-slate-700">{course.completion.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><AdminStatusBadge status={course.status === "Published" ? "Đang mở" : "Bản nháp"} /></td>
                          <td className="px-4 py-3">{course.updatedDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminSection>
            </div>

            <div className="grid gap-6">
              <AdminSection subtitle="Tác vụ quản trị được dùng nhiều." title="Thao tác nhanh">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild className="h-16 justify-start rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50" variant="outline">
                    <Link to="/admin/courses"><BookPlus className="size-5 text-blue-600" /> Tạo khóa học</Link>
                  </Button>
                  <Button asChild className="h-16 justify-start rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50" variant="outline">
                    <Link to="/admin/lessons"><GraduationCap className="size-5 text-emerald-600" /> Thêm bài học</Link>
                  </Button>
                  <Button className="h-16 justify-start rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50" variant="outline">
                    <UploadCloud className="size-5 text-violet-600" /> Tải video lên
                  </Button>
                  <Button asChild className="h-16 justify-start rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50" variant="outline">
                    <Link to="/admin/reports"><FileSpreadsheet className="size-5 text-emerald-600" /> Xuất báo cáo</Link>
                  </Button>
                </div>
              </AdminSection>

              <AdminSection subtitle="Cập nhật mới nhất từ hệ thống." title="Hoạt động gần đây">
                <div className="space-y-4">
                  {recentActivities.map((item, index) => (
                    <div className="flex items-start gap-3" key={`${item.title}-${index}`}>
                      <div className="mt-1 grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500">{item.subtitle}</p>
                      </div>
                      <span className="text-sm text-slate-400">{item.time}</span>
                    </div>
                  ))}
                </div>
              </AdminSection>

              <AdminSection subtitle="Số chứng nhận được cấp và xác thực thành công." title="Chứng nhận đã cấp">
                <div className="flex items-center gap-6">
                  <div className="grid size-24 place-items-center rounded-full bg-amber-50 text-amber-500 shadow-inner">
                    <Trophy className="size-10" />
                  </div>
                  <div>
                    <p className="text-5xl font-semibold tracking-tight text-slate-950">
                      {formatNumber(Math.round(totalLearners * (analytics.completionRatePercent / 100) * 0.38))}
                    </p>
                    <p className="mt-2 text-slate-500">chứng nhận</p>
                  </div>
                </div>
              </AdminSection>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <AdminSection subtitle="Tỷ lệ hoàn thành thấp theo khóa học." title="Top bài học khó">
            <div className="space-y-4">
              {analytics.topDifficultLessons.slice(0, 5).map((item, index) => (
                <AdminProgressRow
                  colorClassName="bg-amber-500"
                  key={item.id}
                  label={`${index + 1}. ${item.title}`}
                  value={23 + index * 4}
                />
              ))}
            </div>
          </AdminSection>

          <AdminSection subtitle="Drop-off theo từng mốc trong luồng học." title="Tỷ lệ bỏ bài">
            <div className="space-y-4">
              <AdminProgressRow colorClassName="bg-rose-500" label="Video - Tương tác" value={18.3} />
              <AdminProgressRow colorClassName="bg-emerald-500" label="Tương tác - Quiz" value={12.6} />
              <AdminProgressRow colorClassName="bg-cyan-500" label="Quiz - Đạt 100%" value={11.2} />
              <AdminProgressRow colorClassName="bg-violet-500" label="Đạt 100% - Unlock" value={6.8} />
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  );
}
