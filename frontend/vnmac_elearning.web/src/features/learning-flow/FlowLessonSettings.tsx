import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminCourses, updateLessonMetadata } from "@/shared/api/admin";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import type { LessonPublicationStatus } from "@/shared/types/api";

export function FlowLessonSettings({ lessonId }: { lessonId: string }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "courses"], queryFn: getAdminCourses });
  const parent = query.data?.flatMap(course => course.sections.flatMap(section => section.lessons.map(lesson => ({ course, section, lesson })))).find(row => row.lesson.id === lessonId);
  const [form, setForm] = useState({ sectionId: "", title: "", order: 1, durationMinutes: 1, publicationStatus: "Draft" as LessonPublicationStatus });
  useEffect(() => { if (parent) setForm({ sectionId: parent.section.id, title: parent.lesson.title, order: parent.lesson.order, durationMinutes: parent.lesson.durationMinutes, publicationStatus: parent.lesson.publicationStatus }); }, [parent?.lesson]);
  const save = useMutation({ mutationFn: () => {
    if (!parent) throw new Error("Không tìm thấy bài học.");
    return updateLessonMetadata(lessonId, { ...form, courseId: parent.course.id, sectionId: form.sectionId, topic: parent.course.sections.find(s => s.id === form.sectionId)?.title ?? parent.section.title, statusLabel: form.publicationStatus === "Published" ? "Đã xuất bản" : form.publicationStatus === "Draft" ? "Bản nháp" : "Đã lưu trữ" });
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: ["admin", "courses"] }); void client.invalidateQueries({ queryKey: ["admin-lesson-catalog"] }); } });
  if (query.isLoading) return <LoadingBlock label="Đang tải thông tin bài học..." />;
  if (!parent) return <MessageBanner tone="error">Không tìm thấy bài học.</MessageBanner>;
  return <div className="fe-detail-scroll"><h2>Thông tin bài học</h2><label>Phần học<select value={form.sectionId} onChange={e => setForm(current => ({ ...current, sectionId: e.target.value }))}>{parent.course.sections.slice().sort((a,b) => a.order-b.order).map(section => <option key={section.id} value={section.id}>{section.order}. {section.title}{section.isHidden ? " (đang ẩn)" : ""}</option>)}</select></label><label>Tên bài học<input value={form.title} onChange={e => setForm(current => ({ ...current, title: e.target.value }))} /></label><label>Thứ tự<input type="number" min={1} value={form.order} onChange={e => setForm(current => ({ ...current, order: Number(e.target.value) }))} /></label><label>Thời lượng dự kiến (phút)<input type="number" min={1} value={form.durationMinutes} onChange={e => setForm(current => ({ ...current, durationMinutes: Number(e.target.value) }))} /></label><label>Trạng thái<select value={form.publicationStatus} onChange={e => setForm(current => ({ ...current, publicationStatus: e.target.value as LessonPublicationStatus }))}><option value="Draft">Bản nháp</option><option value="Published">Đã xuất bản</option><option value="Archived">Đã lưu trữ</option></select></label>{save.isError && <MessageBanner tone="error">{save.error.message}</MessageBanner>}{save.isSuccess && <MessageBanner tone="success">Đã lưu thông tin bài học.</MessageBanner>}<Button disabled={!form.title.trim() || !Number.isInteger(form.order) || form.order < 1 || save.isPending} onClick={() => save.mutate()}>Lưu thông tin bài học</Button></div>;
}
