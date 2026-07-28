import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Clock3,
  Download,
  FilterX,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTracking, getTrackingExportUrl } from "@/shared/api/admin";
import { clampPercent, formatDateTime, humanizeEnum } from "@/shared/lib/format";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminProgressRow,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { ProvinceSelect } from "@/shared/ui/ProvinceSelect";
import type { TrackingCourseProgress, TrackingLearnerRow } from "@/shared/types/api";

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang học" },
  { value: "stalled", label: "Mắc kẹt" },
  { value: "completed", label: "Hoàn thành" },
  { value: "not-started", label: "Chưa bắt đầu" },
];

function numberLabel(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)));
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function primaryCourse(learner: TrackingLearnerRow): TrackingCourseProgress | null {
  return (
    learner.courses.find((course) => course.overallCompletionPercent > 0 && course.overallCompletionPercent < 100) ??
    learner.courses[0] ??
    null
  );
}

export function LearningStatsPage() {
  const [courseId, setCourseId] = useState("all");
  const [status, setStatus] = useState("all");
  const [province, setProvince] = useState("");
  const [group, setGroup] = useState("");
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["admin", "learning-stats", { courseId, status, province, group }],
    queryFn: () =>
      getTracking({
        courseId: courseId === "all" ? undefined : courseId,
        status,
        province: province || undefined,
        group: group || undefined,
      }),
  });

  const learners = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = query.data?.learners ?? [];
    if (!keyword) {
      return rows;
    }

    return rows.filter((learner) =>
      [learner.fullName, learner.username, learner.phoneNumber, learner.province, learner.group, learner.status]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [query.data?.learners, search]);

  const exportUrl = getTrackingExportUrl({
    courseId: courseId === "all" ? undefined : courseId,
    status,
    province: province || undefined,
    group: group || undefined,
  });

  function resetFilters() {
    setCourseId("all");
    setStatus("all");
    setProvince("");
    setGroup("");
    setSearch("");
  }

  if (query.isLoading) {
    return <LoadingBlock label="Đang tải thống kê học tập..." />;
  }

  if (query.isError || !query.data) {
    return <MessageBanner tone="error">Không tải được dữ liệu thống kê học tập.</MessageBanner>;
  }

  const data = query.data;
  const completionAverage = data.courseSummaries.length
    ? Math.round(data.courseSummaries.reduce((sum, item) => sum + item.averageCompletionPercent, 0) / data.courseSummaries.length)
    : 0;

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        actions={
          <>
            <Button asChild className="gap-2" variant="outline">
              <a href={exportUrl}>
                <Download className="size-4" />
                Xuất báo cáo
              </a>
            </Button>
            <Button className="gap-2" type="button" variant="outline" onClick={resetFilters}>
              <FilterX className="size-4" />
              Đặt lại
            </Button>
          </>
        }
        breadcrumbs={["Trang chủ", "Báo cáo & thống kê", "Thống kê học tập"]}
        title="Thống kê học tập"
      />

      <AdminSection title="Bộ lọc dữ liệu">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_190px_180px_180px_minmax(0,1fr)]">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Chủ đề" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chủ đề</SelectItem>
              {data.courses.map((course) => (
                <SelectItem key={course.courseId} value={course.courseId}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ProvinceSelect allowAll value={province} onChange={setProvince} />
          <Input placeholder="Nhóm học viên" value={group} onChange={(event) => setGroup(event.target.value)} />
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Tìm học viên..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </AdminSection>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard icon={<Users className="size-5" />} label="Học viên" value={numberLabel(data.overview.totalLearners)} />
        <AdminMetricCard accent="green" icon={<Activity className="size-5" />} label="Đang học" value={numberLabel(data.overview.activeLearners)} />
        <AdminMetricCard accent="amber" icon={<AlertTriangle className="size-5" />} label="Mắc kẹt" value={numberLabel(data.overview.stalledLearners)} />
        <AdminMetricCard accent="violet" icon={<BookOpenCheck className="size-5" />} label="Khóa hoàn thành" value={numberLabel(data.overview.completedCourses)} />
        <AdminMetricCard accent="green" icon={<GraduationCap className="size-5" />} label="Tiến độ TB" value={`${completionAverage}%`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <AdminSection title="Tiến độ theo chủ đề">
          <div className="grid gap-3">
            {data.courseSummaries.map((course) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={course.courseId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{course.courseTitle}</p>
                    <p className="text-sm text-slate-500">
                      {course.enrolledLearners} học viên - {course.activeLearners} đang học - {course.completedLearners} hoàn thành
                    </p>
                  </div>
                  <Badge variant="secondary">{course.averageCompletionPercent}% TB</Badge>
                </div>
                <div className="mt-4">
                  <AdminProgressRow label="Tỷ lệ hoàn thành trung bình" value={course.averageCompletionPercent} />
                </div>
              </div>
            ))}
            {data.courseSummaries.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu chủ đề.</p> : null}
          </div>
        </AdminSection>

        <AdminSection title="Điểm cần chú ý">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
                <AlertTriangle className="size-5" />
                Bài học có nguy cơ dừng giữa chừng
              </div>
              <div className="grid gap-3">
                {data.dropOffLessons.slice(0, 5).map((item) => (
                  <div className="rounded-xl bg-white p-3" key={item.lessonId}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.courseTitle}</p>
                      </div>
                      <Badge variant="warning">{item.learnerCount} HV</Badge>
                    </div>
                    <div className="mt-3">
                      <AdminProgressRow
                        colorClassName="bg-amber-500"
                        label="Tiến độ xem trung bình"
                        value={clampPercent(item.averageWatchPercent)}
                      />
                    </div>
                  </div>
                ))}
                {data.dropOffLessons.length === 0 ? <p className="text-sm text-slate-600">Chưa phát hiện điểm nghẽn.</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                <Clock3 className="size-5 text-blue-600" />
                Hoạt động gần đây
              </div>
              <div className="grid gap-3">
                {data.recentEvents.slice(0, 6).map((event) => (
                  <div className="border-l-2 border-blue-200 pl-3" key={event.id}>
                    <p className="font-semibold text-slate-950">{event.learnerName}</p>
                    <p className="text-sm text-slate-600">{event.detail || `${event.courseTitle} - ${event.lessonTitle}`}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(event.occurredAt)}</p>
                  </div>
                ))}
                {data.recentEvents.length === 0 ? <p className="text-sm text-slate-500">Chưa có hoạt động gần đây.</p> : null}
              </div>
            </div>
          </div>
        </AdminSection>
      </div>

      <AdminSection title="Theo dõi học viên" action={<span className="text-sm text-slate-500">{learners.length} học viên</span>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>Địa bàn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Khóa hiện tại</TableHead>
              <TableHead>Bài đang dừng</TableHead>
              <TableHead>Tiến độ</TableHead>
              <TableHead>Hoạt động cuối</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {learners.slice(0, 20).map((learner) => {
              const course = primaryCourse(learner);

              return (
                <TableRow key={learner.userId}>
                  <TableCell className="min-w-[220px]">
                    <p className="font-semibold text-slate-950">{learner.fullName}</p>
                    <p className="text-xs text-slate-500">{learner.username} - {learner.phoneNumber}</p>
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    <p>{learner.province || "-"}</p>
                    <p className="text-xs text-slate-500">{learner.group || "-"}</p>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge status={learner.status} />
                  </TableCell>
                  <TableCell className="min-w-[240px]">{course?.courseTitle ?? "-"}</TableCell>
                  <TableCell className="min-w-[220px]">
                    <p>{course?.currentLessonTitle ?? "-"}</p>
                    {course?.currentLessonType ? (
                      <p className="text-xs text-slate-500">{humanizeEnum(course.currentLessonType)}</p>
                    ) : null}
                    {course?.lastPositionSeconds ? (
                      <p className="text-xs text-slate-400">Dừng ở {formatClock(course.lastPositionSeconds)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <AdminProgressRow label="Hoàn thành" value={course?.overallCompletionPercent ?? 0} />
                  </TableCell>
                  <TableCell className="min-w-[150px]">{formatDateTime(learner.lastActivityAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {learners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Không có học viên phù hợp với bộ lọc.
          </div>
        ) : null}
      </AdminSection>
    </div>
  );
}
