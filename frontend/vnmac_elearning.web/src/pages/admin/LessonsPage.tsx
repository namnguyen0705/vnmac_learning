import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminIconButton,
  AdminModal,
  AdminPagination,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { createLesson, deleteLesson, getAdminCourses, getQuestions, updateLesson } from "../../shared/api/admin";
import { flattenLessons } from "../../shared/lib/course";
import { humanizeEnum, splitMultiline, toMultiline } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type {
  AdminQuestion,
  CourseLesson,
  CourseStatus,
  LessonType,
  ScormPackage,
  ScormSco,
  ScormScoRequest,
  ScormVersion,
  UpsertLessonRequest,
  VideoContent,
} from "../../shared/types/api";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  FileQuestion,
  ListChecks,
  MonitorPlay,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

interface LessonFormState {
  courseId: string;
  sectionId: string;
  title: string;
  type: LessonType;
  order: number;
  durationMinutes: number;
  statusLabel: string;
  videoIntro: string;
  videoUrl: string;
  videoPosterUrl: string;
  videoCaptionsUrl: string;
  videoObjectives: string;
  videoCheckpoints: string;
  videoTranscriptHighlight: string;
  assessmentIntro: string;
  retryHint: string;
  passScore: number;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
  scormVersion: ScormVersion;
  scormIdentifier: string;
  scormTitle: string;
  scormEntryPath: string;
  scormLaunchScoId: string;
  scormManifestVersion: string;
  scos: ScormScoRequest[];
}

interface EnrichedLesson extends CourseLesson {
  courseTitle: string;
  courseStatus: CourseStatus;
  sectionTitle: string;
  questionCount: number;
  scoCount: number;
}

function createEmptySco(index: number): ScormScoRequest {
  return {
    id: `sco-${index}`,
    identifier: `sco-${index}`,
    title: "",
    launchPath: "",
    itemType: "Sco",
    order: index,
    masteryScore: 100,
  };
}

function createEmptyLessonForm(): LessonFormState {
  return {
    courseId: "",
    sectionId: "",
    title: "",
    type: "Video",
    order: 1,
    durationMinutes: 10,
    statusLabel: "Đang soạn thảo",
    videoIntro: "",
    videoUrl: "",
    videoPosterUrl: "",
    videoCaptionsUrl: "",
    videoObjectives: "",
    videoCheckpoints: "",
    videoTranscriptHighlight: "",
    assessmentIntro: "",
    retryHint: "",
    passScore: 100,
    randomizeQuestionOrder: true,
    randomizeOptionOrder: true,
    scormVersion: "Scorm12",
    scormIdentifier: "",
    scormTitle: "",
    scormEntryPath: "",
    scormLaunchScoId: "",
    scormManifestVersion: "",
    scos: [createEmptySco(1)],
  };
}

function mapScos(scos?: ScormSco[] | null): ScormScoRequest[] {
  if (!scos?.length) {
    return [createEmptySco(1)];
  }

  return scos.map((sco, index) => ({
    id: sco.id,
    identifier: sco.identifier,
    title: sco.title,
    launchPath: sco.launchPath,
    itemType: sco.itemType,
    order: sco.order || index + 1,
    masteryScore: sco.masteryScore ?? 100,
  }));
}

function mapLessonToForm(lesson: CourseLesson): LessonFormState {
  return {
    courseId: lesson.courseId,
    sectionId: lesson.sectionId,
    title: lesson.title,
    type: lesson.type,
    order: lesson.order,
    durationMinutes: lesson.durationMinutes,
    statusLabel: lesson.statusLabel,
    videoIntro: lesson.videoContent?.intro ?? "",
    videoUrl: lesson.videoContent?.videoUrl ?? "",
    videoPosterUrl: lesson.videoContent?.posterUrl ?? "",
    videoCaptionsUrl: lesson.videoContent?.captionsUrl ?? "",
    videoObjectives: toMultiline(lesson.videoContent?.objectives ?? []),
    videoCheckpoints: toMultiline(lesson.videoContent?.checkpoints ?? []),
    videoTranscriptHighlight: lesson.videoContent?.transcriptHighlight ?? "",
    assessmentIntro: lesson.assessment?.intro ?? "",
    retryHint: lesson.assessment?.retryHint ?? "",
    passScore: lesson.assessment?.passScore ?? 100,
    randomizeQuestionOrder: lesson.assessment?.randomizeQuestionOrder ?? true,
    randomizeOptionOrder: lesson.assessment?.randomizeOptionOrder ?? true,
    scormVersion: lesson.scormPackage?.version ?? "Scorm12",
    scormIdentifier: lesson.scormPackage?.identifier ?? "",
    scormTitle: lesson.scormPackage?.title ?? "",
    scormEntryPath: lesson.scormPackage?.entryPath ?? "",
    scormLaunchScoId: lesson.scormPackage?.launchScoId ?? "",
    scormManifestVersion: lesson.scormPackage?.manifestVersion ?? "",
    scos: mapScos(lesson.scormPackage?.scos),
  };
}

function buildVideoContent(form: LessonFormState): VideoContent | null {
  if (form.type !== "Video") {
    return null;
  }

  return {
    intro: form.videoIntro,
    videoUrl: form.videoUrl,
    posterUrl: form.videoPosterUrl || null,
    captionsUrl: form.videoCaptionsUrl || null,
    objectives: splitMultiline(form.videoObjectives),
    checkpoints: splitMultiline(form.videoCheckpoints),
    transcriptHighlight: form.videoTranscriptHighlight,
  };
}

function buildScormPackage(form: LessonFormState): ScormPackage | null {
  if (form.type !== "Scorm") {
    return null;
  }

  return {
    id: "",
    version: form.scormVersion,
    identifier: form.scormIdentifier,
    title: form.scormTitle,
    entryPath: form.scormEntryPath,
    launchScoId: form.scormLaunchScoId || null,
    manifestVersion: form.scormManifestVersion || null,
    scos: form.scos.map((sco, index) => ({
      ...sco,
      order: index + 1,
    })),
  };
}

function buildLessonPayload(form: LessonFormState): UpsertLessonRequest {
  return {
    courseId: form.courseId,
    sectionId: form.sectionId,
    title: form.title,
    type: form.type,
    order: Number(form.order),
    durationMinutes: Number(form.durationMinutes),
    statusLabel: form.statusLabel,
    videoContent: buildVideoContent(form),
    assessment:
      form.type === "Interactive"
        ? {
            intro: form.assessmentIntro,
            retryHint: form.retryHint,
            passScore: Number(form.passScore),
            randomizeQuestionOrder: form.randomizeQuestionOrder,
            randomizeOptionOrder: form.randomizeOptionOrder,
          }
        : null,
    scormPackage: buildScormPackage(form),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)));
}

function getLessonGroupKey(lesson: EnrichedLesson) {
  return `${lesson.courseId}::${lesson.sectionId}`;
}

function getLessonIcon(type: LessonType) {
  if (type === "Video") {
    return PlayCircle;
  }
  if (type === "Scorm") {
    return MonitorPlay;
  }
  return ListChecks;
}

function getLessonContentSummary(lesson: EnrichedLesson) {
  if (lesson.type === "Video") {
    return lesson.videoContent?.videoUrl ? "Đã gắn tài nguyên video" : "Chưa gắn tài nguyên video";
  }

  if (lesson.type === "Scorm") {
    return `${lesson.scoCount} SCO trong gói`;
  }

  return `${lesson.questionCount} câu hỏi`;
}

function CompactStat({
  label,
  value,
  helper,
  icon,
  accentClassName,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: ReactNode;
  accentClassName: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-3.5 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <div className={`grid size-9 place-items-center rounded-2xl ${accentClassName}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-[1.65rem] font-semibold leading-none text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
      {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
    </div>
  );
}

function getQuestionPreviewSummary(question: AdminQuestion) {
  if (question.type === "DragDrop") {
    return `${question.dragItems.length} mục kéo • ${question.dragTargets.length} đích thả`;
  }

  if (question.type === "Hotspot") {
    return `${question.hotspotTargets.length} vùng chạm`;
  }

  return `${question.options.length} đáp án`;
}

export function LessonsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState(searchParams.get("courseId") ?? "all");
  const [typeFilter, setTypeFilter] = useState<LessonType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Published" | "Draft">("all");
  const [page, setPage] = useState(1);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<LessonFormState>(createEmptyLessonForm);

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: getAdminCourses,
  });

  const questionsQuery = useQuery({
    queryKey: ["admin", "questions", "all"],
    queryFn: () => getQuestions(),
  });

  const allCourses = coursesQuery.data ?? [];
  const allLessons = useMemo<EnrichedLesson[]>(
    () =>
      allCourses.flatMap((course) =>
        course.sections.flatMap((section) =>
          flattenLessons({
            ...course,
            sections: course.sections.filter((item) => item.id === section.id),
          }).map((lesson) => ({
            ...lesson,
            courseTitle: course.title,
            courseStatus: course.status,
            sectionTitle: section.title,
            questionCount: lesson.assessment?.questionCount ?? 0,
            scoCount: lesson.scormPackage?.scos.length ?? 0,
          })),
        ),
      ),
    [allCourses],
  );

  const questionsByLessonId = useMemo(() => {
    const grouped = new Map<string, AdminQuestion[]>();
    for (const question of questionsQuery.data ?? []) {
      const bucket = grouped.get(question.lessonId);
      if (bucket) {
        bucket.push(question);
      } else {
        grouped.set(question.lessonId, [question]);
      }
    }

    for (const value of grouped.values()) {
      value.sort((left, right) => left.order - right.order);
    }

    return grouped;
  }, [questionsQuery.data]);

  const filteredLessons = useMemo(() => {
    return allLessons.filter((lesson) => {
      if (courseFilter !== "all" && lesson.courseId !== courseFilter) {
        return false;
      }

      if (typeFilter !== "all" && lesson.type !== typeFilter) {
        return false;
      }

      if (statusFilter !== "all" && lesson.courseStatus !== statusFilter) {
        return false;
      }

      if (search.trim()) {
        const keyword = search.trim().toLowerCase();
        if (
          !lesson.title.toLowerCase().includes(keyword) &&
          !lesson.courseTitle.toLowerCase().includes(keyword) &&
          !lesson.sectionTitle.toLowerCase().includes(keyword)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allLessons, courseFilter, search, statusFilter, typeFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / pageSize));
  const pagedLessons = useMemo(
    () => filteredLessons.slice((page - 1) * pageSize, page * pageSize),
    [filteredLessons, page],
  );

  useEffect(() => {
    setPage(1);
  }, [courseFilter, search, statusFilter, typeFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeCourse = allCourses.find((course) => course.id === form.courseId) ?? null;
  const activeSections = activeCourse?.sections ?? [];

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = buildLessonPayload(form);
      if (editingLessonId) {
        return updateLesson(editingLessonId, payload);
      }
      return createLesson(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions", "all"] });
      setIsModalOpen(false);
      setEditingLessonId(null);
      setForm(createEmptyLessonForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (lessonId: string) => deleteLesson(lessonId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions", "all"] });
    },
  });

  const totalLessons = filteredLessons.length;
  const totalQuestions = filteredLessons.reduce((total, lesson) => total + lesson.questionCount, 0);
  const videoCount = filteredLessons.filter((lesson) => lesson.type === "Video").length;
  const interactiveCount = filteredLessons.filter((lesson) => lesson.type === "Interactive").length;
  const lessonsWithoutQuestions = filteredLessons.filter(
    (lesson) => lesson.type === "Interactive" && lesson.questionCount === 0,
  ).length;
  const scormCount = filteredLessons.filter((lesson) => lesson.type === "Scorm").length;

  function openCreateModal() {
    const presetCourseId = courseFilter !== "all" ? courseFilter : allCourses[0]?.id ?? "";
    const presetSections = allCourses.find((course) => course.id === presetCourseId)?.sections ?? [];
    setEditingLessonId(null);
    setForm({
      ...createEmptyLessonForm(),
      courseId: presetCourseId,
      sectionId: presetSections[0]?.id ?? "",
      type: typeFilter !== "all" ? typeFilter : "Video",
    });
    setIsModalOpen(true);
  }

  function openEditModal(lesson: EnrichedLesson) {
    setEditingLessonId(lesson.id);
    setForm(mapLessonToForm(lesson));
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingLessonId(null);
    setForm(createEmptyLessonForm());
  }

  function toggleExpanded(lessonId: string) {
    setExpandedLessonId((current) => (current === lessonId ? null : lessonId));
  }

  if (coursesQuery.isLoading) {
    return <LoadingBlock label="Đang tải danh sách bài học..." />;
  }

  if (coursesQuery.isError || !coursesQuery.data) {
    return <MessageBanner tone="error">Không tải được danh sách bài học.</MessageBanner>;
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        <CompactStat
          accentClassName="bg-blue-50 text-blue-600"
          helper="Tổng số bài học theo bộ lọc hiện tại."
          icon={<ListChecks className="size-5" />}
          label="Bài học"
          value={formatNumber(totalLessons)}
        />
        <CompactStat
          accentClassName="bg-amber-50 text-amber-600"
          helper="Tổng số câu hỏi nằm trong các bài học đang hiển thị."
          icon={<FileQuestion className="size-5" />}
          label="Câu hỏi"
          value={formatNumber(totalQuestions)}
        />
        <CompactStat
          accentClassName="bg-emerald-50 text-emerald-600"
          helper="Các bài tương tác cần theo dõi nội dung câu hỏi."
          icon={<CircleHelp className="size-5" />}
          label="Bài có câu hỏi"
          value={formatNumber(interactiveCount)}
        />
        <CompactStat
          accentClassName="bg-rose-50 text-rose-600"
          helper="Bài tương tác chưa có câu hỏi."
          icon={<ShieldCheck className="size-5" />}
          label="Chưa có câu hỏi"
          value={formatNumber(lessonsWithoutQuestions)}
        />
        <CompactStat
          accentClassName="bg-violet-50 text-violet-600"
          helper={`${formatNumber(videoCount)} video • ${formatNumber(scormCount)} SCORM`}
          icon={<MonitorPlay className="size-5" />}
          label="Tài nguyên"
          value={formatNumber(videoCount + scormCount)}
        />
      </section>

      <AdminSection
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{filteredLessons.length} bài học</Badge>
            <Button className="h-8 px-3 text-xs" type="button" onClick={openCreateModal}>
              <Plus className="size-3.5" />
              Thêm bài học
            </Button>
          </div>
        }
        subtitle="Thu gọn bộ lọc và hiển thị cả lớp thông tin câu hỏi ngay trong danh sách, chỉ mở ngân hàng câu hỏi khi cần chỉnh sâu."
        title="Danh sách bài học"
      >
        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_220px_220px_180px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 rounded-2xl border-slate-200 pl-11"
                placeholder="Tìm bài học, khóa học, phần học..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-10 rounded-2xl">
                <SelectValue placeholder="Tất cả khóa học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả khóa học</SelectItem>
                {allCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as LessonType | "all")}>
              <SelectTrigger className="h-10 rounded-2xl">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Interactive">Tương tác</SelectItem>
                <SelectItem value="Scorm">SCORM</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "Published" | "Draft")}>
              <SelectTrigger className="h-10 rounded-2xl">
                <SelectValue placeholder="Trạng thái khóa học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="Published">Đăng mở</SelectItem>
                <SelectItem value="Draft">Bản nháp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bài học</TableHead>
                  <TableHead>Khóa học / phần học</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Câu hỏi</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLessons.map((lesson, index) => {
                  const Icon = getLessonIcon(lesson.type);
                  const isExpanded = expandedLessonId === lesson.id;
                  const questionPreview = questionsByLessonId.get(lesson.id) ?? [];
                  const canManageQuestions = lesson.type === "Interactive";
                  const previousLesson = pagedLessons[index - 1];
                  const showGroupHeader = !previousLesson || getLessonGroupKey(previousLesson) !== getLessonGroupKey(lesson);

                  return (
                    <Fragment key={lesson.id}>
                      {showGroupHeader ? (
                        <TableRow className="bg-slate-50">
                          <TableCell className="px-5 py-3" colSpan={7}>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                <Badge className="px-2 py-0.5 text-[11px]" variant="secondary">
                                  Khóa học
                                </Badge>
                                <span className="font-semibold text-slate-950">{lesson.courseTitle}</span>
                                <span className="text-slate-300">/</span>
                                <Badge className="px-2 py-0.5 text-[11px]" variant="outline">
                                  Phần học
                                </Badge>
                                <span className="font-medium text-slate-700">{lesson.sectionTitle}</span>
                              </div>
                              <p className="text-xs text-slate-500">Nhóm theo khóa học và phần học.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                      <TableRow key={lesson.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <button
                              aria-label={isExpanded ? "Thu gọn chi tiết bài học" : "Mở chi tiết bài học"}
                              className="mt-1 rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                              onClick={() => toggleExpanded(lesson.id)}
                              type="button"
                            >
                              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                            <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              <Icon className="size-5" />
                            </span>
                            <div>
                              <p className="font-semibold text-slate-950">{lesson.title}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {lesson.courseTitle} / {lesson.sectionTitle}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge variant="outline">Thứ tự {lesson.order}</Badge>
                                <Badge variant="secondary">{lesson.durationMinutes} phút</Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="px-2 py-0.5 text-[11px]" variant="secondary">
                                Khóa học
                              </Badge>
                              <p className="font-semibold text-slate-900">{lesson.courseTitle}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="px-2 py-0.5 text-[11px]" variant="outline">
                                Phần học
                              </Badge>
                              <p className="text-sm font-medium text-slate-700">{lesson.sectionTitle}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{humanizeEnum(lesson.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950">{formatNumber(lesson.questionCount)}</p>
                            <p className="text-xs text-slate-500">
                              {canManageQuestions ? "Câu hỏi trong bài" : "Không áp dụng"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getLessonContentSummary(lesson)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <AdminStatusBadge status={lesson.statusLabel} />
                            <AdminStatusBadge status={lesson.courseStatus === "Published" ? "Đăng mở" : "Bản nháp"} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
  <AdminIconButton
    icon={<Eye className="size-4" />}
    label={isExpanded ? "Ẩn chi tiết bài học" : "Xem chi tiết bài học"}
    variant="outline"
    onClick={() => toggleExpanded(lesson.id)}
  />
  <AdminIconButton
    icon={<Pencil className="size-4" />}
    label={`Sửa bài học ${lesson.title}`}
    variant="ghost"
    onClick={() => openEditModal(lesson)}
  />
  <AdminIconButton
    icon={<Trash2 className="size-4" />}
    label={`Xóa bài học ${lesson.title}`}
    variant="destructive"
    onClick={() => {
      if (window.confirm(`Xóa bài học "${lesson.title}"?`)) {
        deleteMutation.mutate(lesson.id);
      }
    }}
  />
</div>
                        </TableCell>
                      </TableRow>

                      {isExpanded ? (
                        <TableRow key={`${lesson.id}-expanded`} className="bg-slate-50/70">
                          <TableCell className="p-0" colSpan={7}>
                            <div className="border-t border-slate-100 px-5 py-5">
                              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                                <div className="space-y-4">
                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                      <p className="text-sm text-slate-500">Khóa học</p>
                                      <p className="mt-1 font-semibold text-slate-950">{lesson.courseTitle}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                      <p className="text-sm text-slate-500">Phần học</p>
                                      <p className="mt-1 font-semibold text-slate-950">{lesson.sectionTitle}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                      <p className="text-sm text-slate-500">Loại bài</p>
                                      <p className="mt-1 font-semibold text-slate-950">{humanizeEnum(lesson.type)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                      <p className="text-sm text-slate-500">Thời lượng</p>
                                      <p className="mt-1 font-semibold text-slate-950">{lesson.durationMinutes} phút</p>
                                    </div>
                                  </div>

                                  {lesson.type === "Interactive" ? (
                                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                          <p className="font-semibold text-slate-950">Câu hỏi trong bài học</p>
                                          <p className="text-sm text-slate-500">
                                            Xem nhanh cấu trúc câu hỏi ngay tại đây, chỉ mở trang Câu hỏi khi cần chỉnh sâu.
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <Badge variant="secondary">{lesson.questionCount} câu hỏi</Badge>
                                          <Badge variant="outline">
                                            {lesson.assessment?.passScore ?? 100}% điều kiện đạt
                                          </Badge>
                                        </div>
                                      </div>

                                      <div className="mt-3 space-y-2">
                                        {questionsQuery.isError ? (
                                          <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                                            Không tải được danh sách câu hỏi xem trước.
                                          </div>
                                        ) : questionPreview.length ? (
                                          questionPreview.slice(0, 4).map((question) => (
                                            <div
                                              className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 md:flex-row md:items-center md:justify-between"
                                              key={question.id}
                                            >
                                              <div className="space-y-1">
                                                <p className="font-medium text-slate-900">
                                                  Câu {question.order}: {question.prompt}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                  {humanizeEnum(question.type)} • {getQuestionPreviewSummary(question)}
                                                </p>
                                              </div>
                                              <Badge variant="outline">{humanizeEnum(question.type)}</Badge>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                                            Bài học này chưa có câu hỏi nào.
                                          </div>
                                        )}

                                        {questionPreview.length > 4 ? (
                                          <p className="text-sm text-slate-500">
                                            Còn {questionPreview.length - 4} câu hỏi khác. Mở trang Câu hỏi để xem toàn bộ.
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : null}

                                  {lesson.type === "Video" ? (
                                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                                      <p className="font-semibold text-slate-950">Thông tin video</p>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                          <p className="text-sm text-slate-500">Video URL</p>
                                          <p className="mt-1 text-sm font-medium text-slate-900">
                                            {lesson.videoContent?.videoUrl || "Chưa gắn"}
                                          </p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                          <p className="text-sm text-slate-500">Phụ đề</p>
                                          <p className="mt-1 text-sm font-medium text-slate-900">
                                            {lesson.videoContent?.captionsUrl ? "Đã gắn phụ đề" : "Chưa có phụ đề"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}

                                  {lesson.type === "Scorm" ? (
                                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                                      <p className="font-semibold text-slate-950">Gói SCORM</p>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                          <p className="text-sm text-slate-500">Tên gói</p>
                                          <p className="mt-1 text-sm font-medium text-slate-900">
                                            {lesson.scormPackage?.title || "Chưa cấu hình"}
                                          </p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                          <p className="text-sm text-slate-500">SCO</p>
                                          <p className="mt-1 text-sm font-medium text-slate-900">
                                            {lesson.scoCount} SCO
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
                                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Hành động nhanh
                                  </p>
                                  <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl bg-white px-4 py-3">
                                      <p className="text-sm text-slate-500">Nội dung hiện có</p>
                                      <p className="mt-1 font-semibold text-slate-950">{getLessonContentSummary(lesson)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white px-4 py-3">
                                      <p className="text-sm text-slate-500">Trạng thái hiển thị</p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <AdminStatusBadge status={lesson.statusLabel} />
                                        <AdminStatusBadge status={lesson.courseStatus === "Published" ? "Đăng mở" : "Bản nháp"} />
                                      </div>
                                    </div>
                                  </div>

                                  {canManageQuestions ? (
                                    <div className="mt-5 grid gap-2">
                                      <Button asChild className="rounded-2xl" size="sm" variant="outline">
                                        <Link to={`/admin/questions?lessonId=${lesson.id}`}>Quản lý toàn bộ câu hỏi</Link>
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            <AdminPagination page={page} pageSize={pageSize} totalItems={filteredLessons.length} onPageChange={setPage} />
          </div>
        </div>
      </AdminSection>

      <AdminModal
        actions={
          <>
            <Button className="rounded-2xl" type="button" variant="outline" onClick={closeModal}>
              Đóng
            </Button>
            <Button className="rounded-2xl" disabled={upsertMutation.isPending} type="button" onClick={() => upsertMutation.mutate()}>
              {upsertMutation.isPending ? "Đang lưu..." : editingLessonId ? "Cập nhật bài học" : "Thêm bài học"}
            </Button>
          </>
        }
        className="max-w-6xl"
        description="Thông tin bài học được sửa ngay trong hộp thoại, nhưng danh sách vẫn cho xem đủ ngữ cảnh về khóa học và câu hỏi."
        onClose={closeModal}
        open={isModalOpen}
        title={editingLessonId ? "Cập nhật bài học" : "Thêm bài học"}
      >
        <div className="grid gap-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <Field label="Tiêu đề bài học">
              <Input
                className="rounded-2xl"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </Field>
            <Field label="Thời lượng (phút)">
              <Input
                className="rounded-2xl"
                min={1}
                type="number"
                value={form.durationMinutes}
                onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
              />
            </Field>
            <Field label="Thứ tự">
              <Input
                className="rounded-2xl"
                min={1}
                type="number"
                value={form.order}
                onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) }))}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Khóa học">
              <Select
                value={form.courseId}
                onValueChange={(value) => {
                  const sections = allCourses.find((course) => course.id === value)?.sections ?? [];
                  setForm((current) => ({
                    ...current,
                    courseId: value,
                    sectionId: sections[0]?.id ?? "",
                  }));
                }}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Chọn khóa học" />
                </SelectTrigger>
                <SelectContent>
                  {allCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phần học">
              <Select value={form.sectionId} onValueChange={(value) => setForm((current) => ({ ...current, sectionId: value }))}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Chọn phần học" />
                </SelectTrigger>
                <SelectContent>
                  {activeSections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Loại bài học">
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as LessonType }))}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Interactive">Tương tác</SelectItem>
                  <SelectItem value="Scorm">SCORM</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Trạng thái hiển thị">
              <Input
                className="rounded-2xl"
                value={form.statusLabel}
                onChange={(event) => setForm((current) => ({ ...current, statusLabel: event.target.value }))}
              />
            </Field>
          </div>

          {form.type === "Video" ? (
            <AdminSection subtitle="Tài nguyên và siêu dữ liệu cho bài học video." title="Nội dung video">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Video URL">
                  <Input
                    className="rounded-2xl"
                    placeholder="https://.../lesson.mp4"
                    value={form.videoUrl}
                    onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                  />
                </Field>
                <Field label="Poster URL">
                  <Input
                    className="rounded-2xl"
                    placeholder="https://.../poster.jpg"
                    value={form.videoPosterUrl}
                    onChange={(event) => setForm((current) => ({ ...current, videoPosterUrl: event.target.value }))}
                  />
                </Field>
                <Field label="Captions URL">
                  <Input
                    className="rounded-2xl"
                    placeholder="https://.../captions.vtt"
                    value={form.videoCaptionsUrl}
                    onChange={(event) => setForm((current) => ({ ...current, videoCaptionsUrl: event.target.value }))}
                  />
                </Field>
                <Field label="Điểm nhấn transcript">
                  <Input
                    className="rounded-2xl"
                    value={form.videoTranscriptHighlight}
                    onChange={(event) => setForm((current) => ({ ...current, videoTranscriptHighlight: event.target.value }))}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Mô tả / giới thiệu">
                    <Textarea
                      className="min-h-28 rounded-2xl"
                      value={form.videoIntro}
                      onChange={(event) => setForm((current) => ({ ...current, videoIntro: event.target.value }))}
                    />
                  </Field>
                </div>
                <Field description="Mỗi dòng là một mục tiêu." label="Mục tiêu">
                  <Textarea
                    className="min-h-24 rounded-2xl"
                    value={form.videoObjectives}
                    onChange={(event) => setForm((current) => ({ ...current, videoObjectives: event.target.value }))}
                  />
                </Field>
                <Field description="Mỗi dòng là một điểm kiểm tra." label="Điểm kiểm tra">
                  <Textarea
                    className="min-h-24 rounded-2xl"
                    value={form.videoCheckpoints}
                    onChange={(event) => setForm((current) => ({ ...current, videoCheckpoints: event.target.value }))}
                  />
                </Field>
              </div>
            </AdminSection>
          ) : null}

          {form.type === "Interactive" ? (
            <AdminSection subtitle="Siêu dữ liệu dùng cho bộ máy câu hỏi và điều kiện đạt." title="Thiết lập đánh giá">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Giới thiệu phần đánh giá">
                  <Textarea
                    className="min-h-24 rounded-2xl"
                    value={form.assessmentIntro}
                    onChange={(event) => setForm((current) => ({ ...current, assessmentIntro: event.target.value }))}
                  />
                </Field>
                <Field label="Gợi ý làm lại">
                  <Textarea
                    className="min-h-24 rounded-2xl"
                    value={form.retryHint}
                    onChange={(event) => setForm((current) => ({ ...current, retryHint: event.target.value }))}
                  />
                </Field>
                <Field label="Điểm đạt (%)">
                  <Input
                    className="rounded-2xl"
                    max={100}
                    min={0}
                    type="number"
                    value={form.passScore}
                    onChange={(event) => setForm((current) => ({ ...current, passScore: Number(event.target.value) }))}
                  />
                </Field>
                <div className="grid gap-3 rounded-[24px] border border-slate-200 px-4 py-4">
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <Checkbox
                      checked={form.randomizeQuestionOrder}
                      onCheckedChange={(value) => setForm((current) => ({ ...current, randomizeQuestionOrder: value === true }))}
                    />
                    Trộn câu hỏi
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <Checkbox
                      checked={form.randomizeOptionOrder}
                      onCheckedChange={(value) => setForm((current) => ({ ...current, randomizeOptionOrder: value === true }))}
                    />
                    Trộn thứ tự đáp án
                  </label>
                </div>
              </div>
            </AdminSection>
          ) : null}

          {form.type === "Scorm" ? (
            <AdminSection subtitle="Thông tin gói và SCO cho bài học SCORM." title="Gói SCORM">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Phiên bản">
                  <Select value={form.scormVersion} onValueChange={(value) => setForm((current) => ({ ...current, scormVersion: value as ScormVersion }))}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Chọn phiên bản" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scorm12">SCORM 1.2</SelectItem>
                      <SelectItem value="Scorm2004">SCORM 2004</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Mã định danh">
                  <Input
                    className="rounded-2xl"
                    value={form.scormIdentifier}
                    onChange={(event) => setForm((current) => ({ ...current, scormIdentifier: event.target.value }))}
                  />
                </Field>
                <Field label="Tên gói">
                  <Input
                    className="rounded-2xl"
                    value={form.scormTitle}
                    onChange={(event) => setForm((current) => ({ ...current, scormTitle: event.target.value }))}
                  />
                </Field>
                <Field label="Đường dẫn mở đầu">
                  <Input
                    className="rounded-2xl"
                    value={form.scormEntryPath}
                    onChange={(event) => setForm((current) => ({ ...current, scormEntryPath: event.target.value }))}
                  />
                </Field>
                <Field label="SCO mở mặc định">
                  <Input
                    className="rounded-2xl"
                    value={form.scormLaunchScoId}
                    onChange={(event) => setForm((current) => ({ ...current, scormLaunchScoId: event.target.value }))}
                  />
                </Field>
                <Field label="Phiên bản manifest">
                  <Input
                    className="rounded-2xl"
                    value={form.scormManifestVersion}
                    onChange={(event) => setForm((current) => ({ ...current, scormManifestVersion: event.target.value }))}
                  />
                </Field>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">Danh sách SCO</p>
                    <p className="text-sm text-slate-500">Quản lý các đơn vị mở trong gói ngay trong hộp thoại này.</p>
                  </div>
                  <Button
                    className="rounded-2xl"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        scos: [...current.scos, createEmptySco(current.scos.length + 1)],
                      }))
                    }
                  >
                    <Plus className="size-4" />
                    Thêm SCO
                  </Button>
                </div>
                <div className="space-y-4 p-5">
                  {form.scos.map((sco, index) => (
                    <div className="rounded-[24px] border border-slate-200 p-4" key={`${sco.id}-${index}`}>
                      <div className="mb-4 flex items-center justify-between">
                        <Badge variant="secondary">SCO #{index + 1}</Badge>
                        <Button
                          className="rounded-xl text-rose-600 hover:text-rose-700"
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              scos: current.scos.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="ID">
                          <Input
                            className="rounded-2xl"
                            value={sco.id}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                scos: current.scos.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, id: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <Field label="Mã định danh">
                          <Input
                            className="rounded-2xl"
                            value={sco.identifier}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                scos: current.scos.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, identifier: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <Field label="Tiêu đề">
                          <Input
                            className="rounded-2xl"
                            value={sco.title}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                scos: current.scos.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, title: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <Field label="Đường dẫn mở">
                          <Input
                            className="rounded-2xl"
                            value={sco.launchPath}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                scos: current.scos.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, launchPath: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <Field label="Loại">
                          <Select
                            value={sco.itemType}
                            onValueChange={(value) =>
                              setForm((current) => ({
                                ...current,
                                scos: current.scos.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, itemType: value as ScormScoRequest["itemType"] } : item,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sco">SCO</SelectItem>
                              <SelectItem value="Asset">Tài nguyên</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Điểm đạt mastery">
                          <Input
                            className="rounded-2xl"
                            max={100}
                            min={0}
                            type="number"
                            value={sco.masteryScore ?? 100}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                scos: current.scos.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, masteryScore: Number(event.target.value) } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AdminSection>
          ) : null}
        </div>
      </AdminModal>
    </div>
  );
}

