import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminProgressRow,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { getTracking, getTrackingExportUrl } from "../../shared/api/admin";
import { clampPercent, formatDateTime, humanizeEnum } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import { ProvinceSelect } from "../../shared/ui/ProvinceSelect";
import type { TrackingCourseProgress, TrackingLearnerRow, TrackingLessonProgress } from "../../shared/types/api";
import { Activity, AlertTriangle, BookOpenCheck, Clock3, Download, Eye, FilterX, PlayCircle, Search, Users } from "lucide-react";

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang học" },
  { value: "stalled", label: "Mắc kẹt" },
  { value: "completed", label: "Hoàn thành" },
  { value: "not-started", label: "Chưa bắt đầu" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)));
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function findPrimaryCourse(learner: TrackingLearnerRow) {
  return (
    learner.courses.find((course) => course.overallCompletionPercent > 0 && course.overallCompletionPercent < 100) ??
    learner.courses[0] ??
    null
  );
}

function getLessonSignal(lesson: TrackingLessonProgress) {
  if (lesson.type === "Video") {
    return `${lesson.watchPercent}% - ${formatClock(lesson.lastPositionSeconds)}`;
  }

  if (lesson.type === "Interactive") {
    return `${lesson.interactionAttempts} lần làm`;
  }

  return `${lesson.scormAttempts} lần mở - ${lesson.scormTotalTimeSeconds}s`;
}

export function TrackingPage() {
  const [courseId, setCourseId] = useState("all");
  const [province, setProvince] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "tracking", { courseId, province, group, status }],
    queryFn: () =>
      getTracking({
        courseId: courseId === "all" ? undefined : courseId,
        province: province || undefined,
        group: group || undefined,
        status,
      }),
  });

  const learners = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = query.data?.learners ?? [];
    if (!keyword) {
      return rows;
    }

    return rows.filter((item) =>
      [item.fullName, item.username, item.phoneNumber, item.province, item.group]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [query.data?.learners, search]);

  const selectedLearner = learners.find((item) => item.userId === selectedLearnerId) ?? null;

  if (query.isLoading) {
    return <LoadingBlock label="Đang tải tracking học viên..." />;
  }

  if (query.isError || !query.data) {
    return <MessageBanner tone="error">Không tải được dữ liệu tracking.</MessageBanner>;
  }

  const data = query.data;
  const exportUrl = getTrackingExportUrl({
    courseId: courseId === "all" ? undefined : courseId,
    province: province || undefined,
    group: group || undefined,
    status,
  });

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        actions={
          <>
            <Button asChild className="rounded-2xl" variant="outline">
              <a href={exportUrl}>
                <Download className="size-4" />
                Xuất báo cáo
              </a>
            </Button>
            <Button
              className="rounded-2xl"
              type="button"
              variant="outline"
              onClick={() => {
                setCourseId("all");
                setProvince("");
                setGroup("");
                setStatus("all");
                setSearch("");
              }}
            >
              <FilterX className="size-4" />
              Đặt lại
            </Button>
          </>
        }
        breadcrumbs={["Quản trị", "Tracking"]}
        title="Tracking học viên"
      />

      <AdminSection title="">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_180px]">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Chọn chủ đề" />
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
          <div className="hidden"><Input
            className="h-11 rounded-2xl border-slate-200"
            placeholder="Tỉnh/thành"
            value={province}
            onChange={(event) => setProvince(event.target.value)}
          /></div>
          <ProvinceSelect allowAll value={province} onChange={setProvince} />
          <Input
            className="h-11 rounded-2xl border-slate-200"
            placeholder="Nhóm học viên"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminSection>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard accent="blue" icon={<Users className="size-8" />} label="Học viên" value={formatNumber(data.overview.totalLearners)} />
        <AdminMetricCard accent="green" icon={<Activity className="size-8" />} label="Đang học" value={formatNumber(data.overview.activeLearners)} />
        <AdminMetricCard accent="amber" icon={<AlertTriangle className="size-8" />} label="Mắc kẹt" value={formatNumber(data.overview.stalledLearners)} />
        <AdminMetricCard accent="violet" icon={<BookOpenCheck className="size-8" />} label="Khóa hoàn thành" value={formatNumber(data.overview.completedCourses)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminSection title="Chủ đề đăng ký nhiều">
          <div className="grid gap-4">
            {data.courseSummaries.slice(0, 6).map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" key={item.courseId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.courseTitle}</p>
                    <p className="text-xs text-slate-500">
                      {item.activeLearners} đang học - {item.completedLearners} hoàn thành
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.enrolledLearners} HV
                  </span>
                </div>
                <div className="mt-3">
                  <AdminProgressRow colorClassName="bg-blue-500" label="Tiến độ TB" value={item.averageCompletionPercent} />
                </div>
              </div>
            ))}
            {data.courseSummaries.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu chủ đề.</p> : null}
          </div>
        </AdminSection>

        <AdminSection title="Bài học được học nhiều">
          <div className="grid gap-4">
            {data.lessonSummaries.slice(0, 6).map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" key={item.lessonId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.courseTitle} - {humanizeEnum(item.type)}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.startedLearners} HV
                  </span>
                </div>
                <div className="mt-3">
                  <AdminProgressRow colorClassName="bg-emerald-500" label="Hoàn thành TB" value={item.averageProgressPercent} />
                </div>
              </div>
            ))}
            {data.lessonSummaries.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu bài học.</p> : null}
          </div>
        </AdminSection>

        <AdminSection title="Video được xem nhiều">
          <div className="grid gap-4">
            {data.videoSummaries.slice(0, 6).map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" key={item.lessonId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      Bỏ giữa: {item.dropOffLearners} - dừng TB {formatClock(item.averageStopPositionSeconds)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.startedLearners} HV
                  </span>
                </div>
                <div className="mt-3">
                  <AdminProgressRow colorClassName="bg-cyan-500" label="Watch TB" value={item.averageWatchPercent} />
                </div>
              </div>
            ))}
            {data.videoSummaries.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu video.</p> : null}
          </div>
        </AdminSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminSection
          action={
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 rounded-2xl border-slate-200 pl-9"
                placeholder="Tìm học viên..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          }
          contentClassName="p-0"
          title="Học viên và tiến độ"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Khóa đang học</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Bài đang dừng</TableHead>
                  <TableHead>Video tại</TableHead>
                  <TableHead>Lần cuối</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.map((learner) => {
                  const primaryCourse = findPrimaryCourse(learner);
                  return (
                    <TableRow key={learner.userId}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-950">{learner.fullName}</p>
                          <p className="text-xs text-slate-500">{learner.username} - {learner.phoneNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[220px]">{primaryCourse?.courseTitle ?? "Chưa có khóa"}</TableCell>
                      <TableCell className="min-w-[150px]">
                        <AdminProgressRow
                          colorClassName="bg-emerald-500"
                          label={`${primaryCourse?.overallCompletionPercent ?? 0}%`}
                          value={primaryCourse?.overallCompletionPercent ?? 0}
                        />
                      </TableCell>
                      <TableCell className="min-w-[190px]">{primaryCourse?.currentLessonTitle ?? "Chưa xác định"}</TableCell>
                      <TableCell>{formatClock(primaryCourse?.lastPositionSeconds ?? 0)}</TableCell>
                      <TableCell className="min-w-[150px]">{formatDateTime(learner.lastActivityAt)}</TableCell>
                      <TableCell>
                        <AdminStatusBadge status={learner.status} />
                      </TableCell>
                      <TableCell>
                        <Button className="size-9 rounded-xl p-0" title="Xem chi tiết" type="button" variant="outline" onClick={() => setSelectedLearnerId(learner.userId)}>
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {learners.length === 0 ? (
            <div className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">
              Không có học viên phù hợp bộ lọc.
            </div>
          ) : null}
        </AdminSection>

        <div className="grid gap-6">
          <AdminSection title="Điểm nghẽn bài học">
            <div className="grid gap-4">
              {data.dropOffLessons.map((item) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" key={item.lessonId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.courseTitle}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {item.learnerCount} HV
                    </span>
                  </div>
                  <div className="mt-3">
                    <AdminProgressRow colorClassName="bg-amber-500" label="Watch TB" value={item.averageWatchPercent} />
                  </div>
                </div>
              ))}
              {data.dropOffLessons.length === 0 ? <p className="text-sm text-slate-500">Chưa có điểm nghẽn.</p> : null}
            </div>
          </AdminSection>

          <AdminSection title="Hoạt động gần đây">
            <div className="grid gap-3">
              {data.recentEvents.map((event) => (
                <div className="rounded-2xl border border-slate-200 px-4 py-3" key={event.id}>
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <Clock3 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{event.learnerName}</p>
                      <p className="text-xs leading-5 text-slate-500">{event.type} - {event.lessonTitle}</p>
                      <p className="text-xs leading-5 text-slate-500">{formatDateTime(event.occurredAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {data.recentEvents.length === 0 ? <p className="text-sm text-slate-500">Chưa có hoạt động.</p> : null}
            </div>
          </AdminSection>
        </div>
      </div>

      <LearnerTrackingModal learner={selectedLearner} onClose={() => setSelectedLearnerId(null)} />
    </div>
  );
}

function LearnerTrackingModal({ learner, onClose }: { learner: TrackingLearnerRow | null; onClose: () => void }) {
  return (
    <AdminModal
      className="max-w-6xl"
      open={Boolean(learner)}
      title={learner ? `Tracking: ${learner.fullName}` : "Tracking"}
      description={learner ? `${learner.username} - ${learner.province} - ${learner.group}` : undefined}
      onClose={onClose}
    >
      {learner ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-5">
            {learner.courses.map((course) => (
              <CourseTrackingBlock course={course} key={course.courseId} />
            ))}
          </div>

          <AdminSection title="Timeline">
            <div className="grid gap-3">
              {learner.timeline.map((event) => (
                <div className="rounded-2xl border border-slate-200 px-4 py-3" key={event.id}>
                  <p className="text-sm font-semibold text-slate-950">{event.type}</p>
                  <p className="mt-1 text-sm text-slate-600">{event.lessonTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.detail}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(event.occurredAt)}</p>
                </div>
              ))}
              {learner.timeline.length === 0 ? <p className="text-sm text-slate-500">Chưa có timeline.</p> : null}
            </div>
          </AdminSection>
        </div>
      ) : null}
    </AdminModal>
  );
}

function CourseTrackingBlock({ course }: { course: TrackingCourseProgress }) {
  return (
    <AdminSection
      title={course.courseTitle}
      action={<AdminStatusBadge status={`${course.overallCompletionPercent}%`} />}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <TrackingStat label="Tổng tiến độ" value={`${course.overallCompletionPercent}%`} />
          <TrackingStat label="Nội dung" value={`${course.contentCompletionPercent}%`} />
          <TrackingStat label="Quiz" value={`${course.quizCompletionPercent}%`} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Đang học đến</p>
              <p className="mt-1 font-semibold text-slate-950">{course.currentLessonTitle ?? "Chưa xác định"}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <PlayCircle className="size-4" />
              {formatClock(course.lastPositionSeconds)}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bài học</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Lần cuối</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.lessons.map((lesson) => (
                <TableRow key={lesson.lessonId}>
                  <TableCell className="min-w-[220px]">
                    <p className="font-semibold text-slate-950">{lesson.title}</p>
                    {lesson.scormLocation ? <p className="text-xs text-slate-500">SCORM location: {lesson.scormLocation}</p> : null}
                  </TableCell>
                  <TableCell>{humanizeEnum(lesson.type)}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={humanizeEnum(lesson.status)} />
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-700">{getLessonSignal(lesson)}</p>
                      {lesson.type === "Video" ? (
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${clampPercent(lesson.watchPercent)}%` }} />
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(lesson.lastWatchedAt ?? lesson.completionTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminSection>
  );
}

function TrackingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
