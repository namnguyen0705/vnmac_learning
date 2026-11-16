import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getPublishedCourses } from "@/shared/api/learner";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { CoursePage } from "./CoursePage";
import { useAuth } from "@/app/auth";

export function CourseCatalogPage() {
  const [params, setParams] = useSearchParams();
  const { session } = useAuth();
  const query = useQuery({ queryKey: ["courses", "published", session?.user.id ?? ""], queryFn: getPublishedCourses });
  if (query.isLoading) return <LoadingBlock label="Đang tải bài học..." />;
  if (query.isError) return <MessageBanner tone="error">Không tải được danh sách bài học.</MessageBanner>;
  const courses = query.data ?? [];
  if (!courses.length) return <MessageBanner tone="warning">Chưa có nội dung được xuất bản.</MessageBanner>;
  const selected = courses.find(c => c.id === params.get("course")) ?? courses[0];
  return <>{courses.length > 1 && <label className="mb-4 flex items-center gap-3 text-sm font-semibold">Chương trình học<select className="rounded-lg border bg-white p-2" value={selected.id} onChange={e => setParams({ course: e.target.value })}>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}<CoursePage key={selected.id} selectedCourseId={selected.id} /></>;
}
