import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteLessonContent, getAdminCourses, getAdminLessonCatalog, getLessonContent, updateLessonContent, updateLessonMetadata, uploadAdminMedia } from "@/shared/api/admin";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import type { LessonContent, LessonDifficulty, LessonPublicationStatus } from "@/shared/types/api";
import { ArrowLeft, Layers3, MessageSquareText, RefreshCcw, Save, Trash2 } from "lucide-react";
import {
  LessonDetailPanel,
  StepEditor,
  createEmptyContent,
  normalizeSteps,
  stepIcons,
  type ContentTabKey,
  type StepKey,
  type StepPatch,
  type UploadSlot,
} from "./lesson-content/LessonContentPageParts";

export function LessonContentPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTabKey, setActiveTabKey] = useState<ContentTabKey>("details");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [lessonMeta, setLessonMeta] = useState({
    courseId: "",
    sectionId: "",
    title: "",
    order: 1,
    durationMinutes: 5,
    difficulty: "Basic" as LessonDifficulty,
    publicationStatus: "Draft" as LessonPublicationStatus,
  });

  const catalogQuery = useQuery({
    queryKey: ["admin-lesson-catalog", "content-page"],
    queryFn: () => getAdminLessonCatalog({ page: 1, pageSize: 50 }),
  });

  const lesson = useMemo(
    () => catalogQuery.data?.items.find((item) => item.lessonId === lessonId),
    [catalogQuery.data?.items, lessonId],
  );

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses", "lesson-content"],
    queryFn: getAdminCourses,
  });

  const selectedCourse = coursesQuery.data?.find((course) => course.id === lessonMeta.courseId);

  useEffect(() => {
    if (!lesson) return;
    setLessonMeta({
      courseId: lesson.courseId,
      sectionId: lesson.sectionId,
      title: lesson.title,
      order: lesson.order,
      durationMinutes: lesson.durationMinutes,
      difficulty: lesson.difficulty,
      publicationStatus: lesson.publicationStatus,
    });
  }, [lesson]);

  const [content, setContent] = useState<LessonContent>(() => createEmptyContent(lesson));

  const contentQuery = useQuery({
    enabled: Boolean(lessonId),
    queryKey: ["admin-lesson-content", lessonId],
    queryFn: () => getLessonContent(lessonId),
  });

  useEffect(() => {
    if (contentQuery.data) {
      setContent({
        ...contentQuery.data,
        steps: normalizeSteps(contentQuery.data.steps),
        quiz: contentQuery.data.quiz ?? createEmptyContent(lesson).quiz,
        completion: contentQuery.data.completion ?? createEmptyContent(lesson).completion,
      });
    }
  }, [contentQuery.data, lesson]);

  useEffect(() => {
    if (!contentQuery.data && lesson) {
      setContent(createEmptyContent(lesson));
    }
  }, [contentQuery.data, lesson]);

  const saveMutation = useMutation({
    mutationFn: async (payload: LessonContent) => {
      if (!lesson) throw new Error("Không tìm thấy bài học.");
      await updateLessonMetadata(lessonId, {
        ...lessonMeta,
        statusLabel: lessonMeta.publicationStatus === "Published" ? "Đã xuất bản" : lessonMeta.publicationStatus === "Archived" ? "Đã lưu trữ" : "Bản nháp",
        topic: selectedCourse?.sections.find((section) => section.id === lessonMeta.sectionId)?.title ?? lesson.topic,
      });
      return updateLessonContent(lessonId, { ...payload, steps: normalizeSteps(payload.steps) });
    },
    onSuccess: (savedContent) => {
      setContent({ ...savedContent, steps: normalizeSteps(savedContent.steps) });
      void queryClient.invalidateQueries({ queryKey: ["admin-lesson-content", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-lesson-catalog"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLessonContent(lessonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-lesson-content", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-lesson-catalog"] });
      navigate("/admin/lessons");
    },
  });

  const steps = normalizeSteps(content.steps);
  const activeStep = activeTabKey === "details" ? undefined : steps.find((step) => step.key === activeTabKey) ?? steps[0];
  const isBusy = contentQuery.isLoading || saveMutation.isPending || deleteMutation.isPending;

  const patchStep = (stepKey: string, patch: StepPatch) => {
    setContent((current) => ({
      ...current,
      steps: normalizeSteps(current.steps).map((step) => (step.key === stepKey ? { ...step, ...patch } : step)),
    }));
  };

  const resetDefaultSteps = () => {
    setContent((current) => ({ ...current, steps: normalizeSteps(undefined) }));
    setActiveTabKey("intro");
  };

  const handleUpload = async (stepKey: string, slot: UploadSlot, file: File) => {
    setUploadError("");
    setUploadingKey(`${stepKey}-${slot}`);
    try {
      const uploadType = slot === "video" ? "video" : slot === "caption" ? "caption" : "image";
      const media = await uploadAdminMedia(file, uploadType);
      if (slot === "caption") {
        patchStep(stepKey, { captionUrl: media.url });
      } else if (slot === "poster") {
        patchStep(stepKey, { posterUrl: media.url });
      } else if (slot === "objective") {
        patchStep(stepKey, { objectiveImageUrl: media.url });
      } else {
        patchStep(stepKey, { mediaUrl: media.url, mediaType: slot === "video" ? "video" : "image" });
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload file chưa thành công.");
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <div className="admin-lesson-content-page">
      <section className="admin-content-page-heading">
        <div>
          <Link to="/admin/lessons">
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Link>
          <h1>{lesson?.title ?? "Quản lý nội dung bài học"}</h1>
          <p>{lesson?.topic || lesson?.sectionTitle || "Thiết kế 6 màn học, media và nội dung hiển thị cho learner"}</p>
        </div>
        <div className="admin-content-page-actions">
          <Button disabled={isBusy} onClick={resetDefaultSteps} type="button" variant="outline">
            <RefreshCcw className="size-4" />
            Khôi phục 6 bước
          </Button>
          <Button disabled={isBusy} onClick={() => navigate("/admin/lessons")} type="button" variant="outline">
            Hủy
          </Button>
          <Button className="admin-primary-button" disabled={isBusy} onClick={() => saveMutation.mutate(content)} type="button">
            <Save className="size-4" />
            Lưu bài học
          </Button>
        </div>
      </section>

      {contentQuery.isLoading ? <LoadingBlock label="Đang tải nội dung bài học..." /> : null}
      {contentQuery.isError ? <MessageBanner tone="error">Không tải được nội dung bài học.</MessageBanner> : null}
      {saveMutation.isSuccess ? <MessageBanner tone="success">Đã lưu nội dung bài học.</MessageBanner> : null}
      {saveMutation.isError ? <MessageBanner tone="error">Lưu nội dung bài học chưa thành công.</MessageBanner> : null}
      {deleteMutation.isError ? <MessageBanner tone="error">Xóa nội dung bài học chưa thành công.</MessageBanner> : null}
      {uploadError ? <MessageBanner tone="error">{uploadError}</MessageBanner> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">Thông tin và phần học</h2>
          <p className="mt-1 text-sm text-slate-500">Có thể chuyển bài học sang phần khác rồi bấm “Lưu bài học”.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="grid gap-2 xl:col-span-2">
            <Label>Tên bài học</Label>
            <Input value={lessonMeta.title} onChange={(event) => setLessonMeta((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="grid gap-2 xl:col-span-2">
            <Label>Chủ đề</Label>
            <Select
              value={lessonMeta.courseId}
              onValueChange={(courseId) => {
                const course = coursesQuery.data?.find((item) => item.id === courseId);
                setLessonMeta((current) => ({ ...current, courseId, sectionId: course?.sections[0]?.id ?? "" }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Chọn chủ đề" /></SelectTrigger>
              <SelectContent>
                {(coursesQuery.data ?? []).map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2 xl:col-span-2">
            <Label>Phần học</Label>
            <Select value={lessonMeta.sectionId} onValueChange={(sectionId) => setLessonMeta((current) => ({ ...current, sectionId }))}>
              <SelectTrigger><SelectValue placeholder="Chọn phần học" /></SelectTrigger>
              <SelectContent>
                {(selectedCourse?.sections ?? []).map((section) => <SelectItem key={section.id} value={section.id}>{section.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <Label>Thứ tự</Label>
            <Input min={1} type="number" value={lessonMeta.order} onChange={(event) => setLessonMeta((current) => ({ ...current, order: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2">
            <Label>Thời lượng</Label>
            <Input min={1} type="number" value={lessonMeta.durationMinutes} onChange={(event) => setLessonMeta((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 xl:col-span-2">
            <Label>Độ khó</Label>
            <Select value={lessonMeta.difficulty} onValueChange={(difficulty) => setLessonMeta((current) => ({ ...current, difficulty: difficulty as LessonDifficulty }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Basic">Cơ bản</SelectItem>
                <SelectItem value="Intermediate">Trung bình</SelectItem>
                <SelectItem value="Advanced">Nâng cao</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2 xl:col-span-2">
            <Label>Trạng thái</Label>
            <Select value={lessonMeta.publicationStatus} onValueChange={(publicationStatus) => setLessonMeta((current) => ({ ...current, publicationStatus: publicationStatus as LessonPublicationStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Bản nháp</SelectItem>
                <SelectItem value="Published">Đã xuất bản</SelectItem>
                <SelectItem value="Archived">Lưu trữ</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

      <section className="admin-content-tabs-shell">
        <nav className="admin-content-tabs admin-step-tabs" aria-label="Chi tiết và 6 bước bài học">
          <button className={activeTabKey === "details" ? "is-active" : undefined} onClick={() => setActiveTabKey("details")} type="button">
            <MessageSquareText className="size-4" />
            <span>Chi tiết</span>
            Tổng quan
          </button>
          {steps.map((step) => {
            const key = step.key as StepKey;
            const Icon = stepIcons[key] ?? Layers3;
            return (
              <button
                className={activeTabKey === step.key ? "is-active" : undefined}
                key={step.key}
                onClick={() => setActiveTabKey(key)}
                type="button"
              >
                <Icon className="size-4" />
                <span>Bước {step.order}</span>
                {step.label}
              </button>
            );
          })}
        </nav>

        <div className="admin-content-tab-panel">
          {activeTabKey === "details" ? (
            <LessonDetailPanel content={content} lesson={lesson} onContentChange={setContent} />
          ) : activeStep ? (
            <StepEditor
              content={content}
              lesson={lesson}
              onContentChange={setContent}
              onStepChange={patchStep}
              onUpload={handleUpload}
              step={activeStep}
              uploadingKey={uploadingKey}
            />
          ) : null}
        </div>
      </section>

      <section className="admin-content-danger-zone">
        <div>
          <strong>Xóa nội dung chi tiết</strong>
          <span>Thao tác này làm trống nội dung chi tiết của bài học, không xóa bài học và không xóa 50 câu cuối khóa.</span>
        </div>
        <Button
          disabled={isBusy}
          onClick={() => {
            if (window.confirm("Xóa nội dung chi tiết của bài học này?")) {
              deleteMutation.mutate();
            }
          }}
          type="button"
          variant="outline"
        >
          <Trash2 className="size-4" />
          Xóa content
        </Button>
      </section>
    </div>
  );
}
