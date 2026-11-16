import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAdminCourses } from "@/shared/api/admin";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { Pencil, Search } from "lucide-react";
import { AdminPagination, AdminPageHeader } from "@/shared/ui/admin-kit";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { contentIssues, flowKindLabels } from "./contentReadiness";

export function FlowContentIndex({ quizzes = false }: { quizzes?: boolean }) {
  const query = useQuery({ queryKey: ["admin", "courses"], queryFn: getAdminCourses });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  if (query.isLoading) return <LoadingBlock label="Đang tải cấu trúc bài học..." />;
  if (query.isError) return <MessageBanner tone="error">Không tải được cấu trúc bài học.</MessageBanner>;
  const rows = (query.data ?? []).flatMap(course => course.sections.flatMap(section => section.lessons.filter(lesson => lesson.publicationStatus !== "Archived").flatMap(lesson =>
    (lesson.content?.flow ?? []).flatMap(step => quizzes
      ? ["quiz", "exam"].includes(step.policy) ? [{ id: `${lesson.id}-${step.id}`, lessonId: lesson.id, itemId: step.items[0]?.id, title: step.title, lesson: lesson.title, count: step.drawRules?.reduce((sum, rule) => sum + rule.count, 0) ?? step.items.filter(item => !item.isHidden).length, status: section.isHidden || step.isHidden || lesson.publicationStatus !== "Published" ? "Đang ẩn" : step.policy === "exam" ? "Hiển thị · 20 phút · đạt từ 12/15 câu" : "Hiển thị · đạt 5/5 · làm lại cả lượt", pending: step.items.some(item => contentIssues(item).length > 0) }] : []
      : step.items.filter(item => ["choice", "classify", "sort", "hotspot", "match", "group"].includes(item.kind)).map(item => ({ id: item.id, lessonId: lesson.id, itemId: item.id, title: item.title, lesson: lesson.title, count: item.options.length, status: `${section.isHidden || step.isHidden || item.isHidden || lesson.publicationStatus !== "Published" ? "Ẩn" : "Hiển thị"} · ${flowKindLabels[item.kind]}`, pending: contentIssues(item).length > 0 }))
    ))));
  const filtered = rows.filter(row => `${row.title} ${row.lesson}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  return <div className="admin-lessons-page"><AdminPageHeader title={quizzes ? "Quản lý bài kiểm tra" : "Quản lý câu hỏi"} breadcrumbs={["Quản trị", quizzes ? "Bài kiểm tra" : "Câu hỏi"]} /><p className="text-slate-600">{quizzes ? "Các bộ kiểm tra cuối bài và cuối phần lấy trực tiếp từ cấu trúc bài học." : "Câu hỏi thực hành và kiểm tra lấy trực tiếp từ cấu trúc bài học."} Chỉnh sửa tại màn biên tập để giữ đúng đáp án và tiến độ.</p><section className="admin-lesson-table-card"><div className="admin-lesson-filters"><div className="admin-lesson-search"><Search className="size-4" /><Input aria-label="Tìm nội dung" placeholder="Tìm tên bài hoặc câu hỏi…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div><span className="text-sm text-slate-500">{filtered.length} kết quả</span></div><div className="admin-lessons-table-wrap"><table className="admin-lessons-table"><thead><tr className="bg-slate-50"><th className="p-3">#</th><th className="p-3">{quizzes ? "Bộ kiểm tra" : "Câu hỏi"}</th><th className="p-3">Bài học</th><th className="p-3">{quizzes ? "Số câu" : "Lựa chọn"}</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead><tbody>{filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row, index) => <tr key={row.id} className="border-t"><td className="p-3">{(currentPage - 1) * pageSize + index + 1}</td><td className="p-3">{row.title}</td><td className="p-3">{row.lesson}</td><td className="p-3">{row.count}</td><td className="p-3"><p>{row.status}</p>{row.pending && <span className="text-amber-700">Cần bổ sung / duyệt</span>}</td><td className="p-3"><div className="admin-table-actions"><Button asChild variant="outline" size="icon"><Link title="Biên tập" aria-label={`Biên tập ${row.title}`} to={`/admin/lessons/${row.lessonId}/content?item=${encodeURIComponent(row.itemId ?? "")}`}><Pencil className="size-4" /></Link></Button></div></td></tr>)}</tbody></table>{!filtered.length && <p className="p-5 text-slate-500">Chưa có nội dung phù hợp.</p>}</div><AdminPagination page={currentPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} /></section></div>;
}
