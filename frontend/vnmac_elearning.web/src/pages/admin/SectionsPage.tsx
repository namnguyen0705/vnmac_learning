import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Settings2 } from "lucide-react";
import { getAdminCourses, createSection, updateSection } from "@/shared/api/admin";
import { AdminModal, AdminPageHeader } from "@/shared/ui/admin-kit";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseSection } from "@/shared/types/api";

export function SectionsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "courses"], queryFn: getAdminCourses });
  const [courseId, setCourseId] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", order: 1, isHidden: false });
  const course = query.data?.find(c => c.id === courseId) ?? query.data?.[0];
  const save = useMutation({ mutationFn: () => {
    if (!course) throw new Error("Chưa chọn chủ đề.");
    return editing ? updateSection(course.id, editing, form) : createSection(course.id, form);
  }, onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ["admin", "courses"] });
    await client.invalidateQueries({ queryKey: ["admin-lesson-catalog"] });
    setOpen(false);
  } });
  const edit = (section?: CourseSection) => {
    setEditing(section?.id ?? null);
    setForm(section ? { title: section.title, description: section.description, order: section.order, isHidden: section.isHidden ?? false } : { title: "", description: "", order: (course?.sections.length ?? 0) + 1, isHidden: false });
    save.reset(); setOpen(true);
  };
  if (query.isLoading) return <LoadingBlock label="Đang tải phần học..." />;
  if (query.isError) return <MessageBanner tone="error">Không tải được phần học.</MessageBanner>;
  return <div className="grid gap-3">
    <AdminPageHeader title="Quản lý Phần học" breadcrumbs={["Quản lý nội dung", "Phần học"]} actions={<Button disabled={!course} onClick={() => edit()}><Plus size={16} />Thêm phần học</Button>} />
    <label className="grid gap-1 max-w-xl">Chủ đề<select className="h-9 rounded-md border border-slate-200 px-3" value={course?.id ?? ""} onChange={e => setCourseId(e.target.value)}>{query.data?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
    <p className="text-slate-500">Chủ đề → Phần học → Bài học → Đầu mục → Màn hình. Thứ tự bên dưới cũng là thứ tự phía học viên.</p>
    {course?.sections.slice().sort((a,b) => a.order-b.order).map(section => <section className="rounded-lg border border-slate-200" key={section.id}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div><strong>{section.order}. {section.title}</strong><span className={`ml-3 ${section.isHidden ? "text-amber-700" : "text-emerald-700"}`}>{section.isHidden ? "Đang ẩn" : "Hiển thị"}</span>{section.description && <p className="text-slate-500">{section.description}</p>}</div>
        <Button variant="outline" size="sm" onClick={() => edit(section)}><Pencil size={15} />Thiết lập</Button>
      </header>
      <ol className="divide-y divide-slate-100 px-3">{section.lessons.slice().sort((a,b)=>a.order-b.order).map(lesson => <li key={lesson.id} className="flex items-center justify-between gap-3 py-2">
        <div><span className="mr-2 text-slate-500">{lesson.order}.</span>{lesson.title}<span className="ml-3 text-slate-500">{lesson.publicationStatus === "Published" ? "Hiển thị" : "Ẩn · " + (lesson.publicationStatus === "Draft" ? "Bản nháp" : "Lưu trữ")}</span></div>
        <Button asChild size="sm" variant="ghost"><Link to={`/admin/lessons/${lesson.id}/content?panel=lesson`}><Settings2 size={15} />Thứ tự & hiển thị</Link></Button>
      </li>)}</ol>
      {!section.lessons.length && <p className="p-3 text-slate-500">Chưa có bài học. <Link className="text-blue-700 underline" to="/admin/lessons">Thêm bài học</Link></p>}
    </section>)}
    {!course?.sections.length && <MessageBanner tone="info">Chưa có phần học. Thêm phần học để bắt đầu sắp xếp bài học.</MessageBanner>}
    <AdminModal open={open} title={editing ? "Thiết lập Phần học" : "Thêm Phần học"} onClose={() => setOpen(false)}>
      <div className="grid gap-3">
        <label className="grid gap-1">Tên phần học<Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></label>
        <label className="grid gap-1">Mô tả<Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></label>
        <label className="grid gap-1">Thứ tự<Input type="number" min={1} value={form.order} onChange={e=>setForm({...form,order:Number(e.target.value)})} /></label>
        <label className="flex gap-2 items-center"><input type="checkbox" checked={!form.isHidden} onChange={e=>setForm({...form,isHidden:!e.target.checked})} />Hiển thị phần học cho học viên</label>
        <p className="text-slate-500">Ẩn phần học sẽ ẩn cả bài học và bài kiểm tra thuộc phần đó. Đổi thứ tự sẽ tự dịch chuyển các phần còn lại.</p>
        {save.isError && <MessageBanner tone="error">{save.error.message}</MessageBanner>}
        <Button disabled={!form.title.trim() || !Number.isInteger(form.order) || form.order < 1 || save.isPending} onClick={()=>save.mutate()}>{save.isPending ? "Đang lưu…" : "Lưu phần học"}</Button>
      </div>
    </AdminModal>
  </div>;
}
