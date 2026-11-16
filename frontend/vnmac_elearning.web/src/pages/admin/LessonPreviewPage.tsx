import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LessonPage } from "../learner/LessonPage";

export function LessonPreviewPage() {
  const { lessonId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const embedded = searchParams.get("embedded") === "1";

  return (
    <div className="min-h-screen bg-[#f3f7fb]">
      {!embedded ? <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/lessons"><ArrowLeft className="size-4" />Quay lại danh sách</Link>
            </Button>
            <div>
              <p className="flex items-center gap-2 font-semibold text-slate-950"><Eye className="size-4 text-blue-600" />Xem trước bài học</p>
              <p className="text-xs text-slate-500">Mô phỏng giao diện học viên; không ghi nhận tiến độ hoặc kết quả.</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to={`/admin/lessons/${lessonId}/content`}><Pencil className="size-4" />Chỉnh sửa nội dung</Link>
          </Button>
        </div>
      </header> : null}
      <main className={embedded ? "mx-auto max-w-[1500px] p-3" : "mx-auto max-w-[1500px] px-4 py-3 sm:px-6"}>
        <LessonPage previewMode />
      </main>
    </div>
  );
}
