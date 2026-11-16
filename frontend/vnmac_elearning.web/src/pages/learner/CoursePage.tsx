import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  CirclePlay,
  BookOpen,
  FileText,
  ArrowRight,
  Lock,
  ScrollText,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import { enrollInCourse, getLearnerCourseCatalog, getLearnerCourseProgress } from "../../shared/api/learner";
import { useLearnerCourse } from "@/shared/lib/useLearnerCourse";
import {
  sortLessons,
  sortQuizzes,
  sortSections,
  toLessonSummaryMap,
  toQuizSummaryMap,
} from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import {
  LearnerProgressBar,
  LearnerStatusBadge,
} from "../../shared/ui/learner-ui";
import { LearningCompanion } from "@/shared/ui/LearningCompanion";
import { MessageBanner } from "../../shared/ui/MessageBanner";

export function CoursePage({ selectedCourseId }: { selectedCourseId?: string } = {}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { courseId: routeCourseId = "" } = useParams();
  const courseId = selectedCourseId ?? routeCourseId;
  const userId = session?.user.id ?? "";

  const courseQuery = useLearnerCourse(userId, courseId);

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  const catalogItem = catalogQuery.data?.courses.find((item) => item.courseId === courseId);
  const isEnrolled = Boolean(catalogItem?.isEnrolled);

  const progressQuery = useQuery({
    queryKey: ["learner", userId, "course-progress", courseId],
    queryFn: () => getLearnerCourseProgress(userId, courseId),
    enabled: Boolean(userId && courseId && isEnrolled),
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(userId, courseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["learner", userId, "catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["learner", userId, "dashboard"] }),
      ]);
    },
  });

  if (courseQuery.isLoading || catalogQuery.isLoading || (isEnrolled && progressQuery.isLoading)) {
    return <LoadingBlock label="Đang tải bài học..." />;
  }

  if (courseQuery.isError || catalogQuery.isError || !courseQuery.data || !catalogItem) {
    return <MessageBanner tone="error">Không tải được danh sách bài học.</MessageBanner>;
  }

  const course = courseQuery.data;

  const progress = progressQuery.data;
  if (isEnrolled && (progressQuery.isError || !progress)) return <MessageBanner tone="error">Không tải được tiến độ bài học.</MessageBanner>;
  const lessonMap = toLessonSummaryMap(progress?.lessons ?? []);
  const quizMap = toQuizSummaryMap(progress?.quizzes ?? []);
  const quizzes = [...course.quizzes, ...course.sections.flatMap(s => s.quizzes ?? [])];
  const contentLessonIds = new Set(course.sections.flatMap(s => s.lessons.filter(l => l.type !== "Quiz").map(l => l.id)));
  const completedCount = progress?.lessons.filter(l => contentLessonIds.has(l.lessonId) && l.status === "Completed").length ?? 0;
  const nextUrl = progress?.nextLessonId ? `/app/courses/${course.id}/lessons/${progress.nextLessonId}` : progress?.nextQuizId ? `/app/courses/${course.id}/quizzes/${progress.nextQuizId}` : undefined;
  return <div className="course-learning-home grid gap-4">
    <header className="course-learning-hero">
      <div className="course-learning-hero-copy">
      <p className="course-learning-intro-copy mb-1 text-sm font-medium text-blue-700">Bài học</p>
      <h1 className="text-2xl font-bold text-slate-950">{course.title}</h1>
      <p className="course-learning-intro-copy mt-2 text-sm leading-6 text-slate-600">{course.description}</p>
      <div className="course-learning-progress mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1 max-w-xl">
          <p className="mb-2 text-sm text-slate-600">{completedCount}/{catalogItem.totalLessons} bài học hoàn thành · {progress?.quizzes.filter(q => q.passed).length ?? 0}/{catalogItem.totalQuizzes} bài kiểm tra đạt</p>
          <LearnerProgressBar label="Tiến độ chung (bài học và bài kiểm tra)" value={progress?.overallCompletionPercent ?? 0} />
        </div>
        {!isEnrolled ? <Button disabled={enrollMutation.isPending} onClick={() => enrollMutation.mutate()}>{enrollMutation.isPending ? "Đang đăng ký..." : "Bắt đầu học"}</Button> : nextUrl ? <Button asChild><Link to={nextUrl}><CirclePlay size={16} />Tiếp tục học</Link></Button> : <LearnerStatusBadge tone="success">Đã hoàn thành</LearnerStatusBadge>}
      </div>
      {enrollMutation.isError && <MessageBanner tone="error">Chưa đăng ký được. Vui lòng thử lại.</MessageBanner>}
      </div>
      <div className="course-learning-art" aria-hidden="true"><div><span>Nhận biết</span><span>Tránh xa</span><span>Báo ngay</span><p>Chung tay phòng tránh tai nạn bom mìn, vật nổ.</p></div></div>
    </header>
    <div className="course-learning-workspace"><div className="grid content-start gap-3">
    <h2 className="text-lg font-bold text-slate-950">Lộ trình học của bạn</h2>
    <p className="course-learning-intro-copy text-sm text-slate-600">Học lần lượt từng bài để mở bài tiếp theo. Bài kiểm tra cuối phần mở sau khi hoàn thành các bài học.</p>
    {sortSections(course.sections).map(section => {
      const lessons = sortLessons(section.lessons);
      const entries = [...lessons.map(lesson => ({ id: lesson.id, title: lesson.title, lesson, quiz: lesson.type === "Quiz" ? quizzes.find(q => q.assessmentLessonId === lesson.id) : undefined })), ...sortQuizzes(section.quizzes).filter(q => !lessons.some(l => l.id === q.assessmentLessonId)).map(quiz => ({ id: quiz.id, title: quiz.title, lesson: undefined, quiz }))];
      return <section key={section.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-3"><h2 className="font-bold text-blue-950">{section.title}</h2>{section.description && <p className="mt-1 text-sm text-slate-600">{section.description}</p>}</div>
        <div className="divide-y divide-slate-100">{entries.map(entry => {
          const summary = entry.lesson ? lessonMap.get(entry.lesson.id) : undefined;
          const result = entry.quiz ? quizMap.get(entry.quiz.id) : undefined;
          const done = entry.quiz ? Boolean(result?.passed) : summary?.status === "Completed";
          const unlocked = isEnrolled && (done || (entry.quiz ? Boolean(result?.isUnlocked) : Boolean(summary?.isUnlocked)));
          const active = !done && (summary?.status === "InProgress" || progress?.nextLessonId === entry.id || !!entry.quiz && progress?.nextQuizId === entry.quiz.id);
          const label = done ? "Đã hoàn thành" : !isEnrolled ? "Chưa bắt đầu" : active ? "Đang học" : unlocked ? "Sẵn sàng" : "Chưa mở";
          const Icon = done ? CheckCircle2 : !unlocked ? Lock : entry.quiz ? ScrollText : CirclePlay;
          const href = entry.quiz ? `/app/courses/${course.id}/quizzes/${entry.quiz.id}` : `/app/courses/${course.id}/lessons/${entry.id}`;
          return <article key={entry.id} className={cn("course-learning-entry p-4", active && "bg-blue-50/50")} data-unlocked={unlocked}>
            <div className="course-learning-entry-row flex flex-wrap items-center gap-3">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", done ? "bg-emerald-50 text-emerald-700" : active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}><Icon size={18} /></span>
              <div className="course-learning-entry-copy min-w-[200px] flex-1"><h3 className="text-sm font-semibold text-slate-950">{entry.title}</h3><p className="mt-1 text-xs text-slate-500">{entry.quiz ? "Bài kiểm tra cuối phần" : `${entry.lesson?.outline?.length ?? 0} mục nội dung`}</p></div>
              <LearnerStatusBadge tone={done ? "success" : active ? "brand" : "neutral"}>{label}</LearnerStatusBadge>
              {unlocked && <Button asChild variant={done ? "outline" : "default"} size="sm"><Link to={href}>{done ? "Xem lại" : active ? "Tiếp tục" : "Vào học"}</Link></Button>}
            </div>
            {!!entry.lesson?.outline?.length && <details className="mt-3 pl-12 text-sm text-slate-600"><summary className="w-fit cursor-pointer text-blue-700">Xem nội dung bài học</summary><ol className="mt-2 grid gap-1.5">{entry.lesson.outline.map(item => <li key={item.id}>{item.order}. {item.title}</li>)}</ol></details>}
          </article>;
        })}</div>
      </section>;
    })}
    </div><aside className="course-learning-sidebar">
      <LearningCompanion pose="welcome"><strong>Mình cùng học nhé!</strong><p>Chọn bài đang mở để tiếp tục. Bạn luôn có thể xem lại những bài đã hoàn thành.</p></LearningCompanion>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center gap-2 font-semibold text-blue-950"><BookOpen size={18} />Học theo từng bước</div><ol className="grid gap-3 text-sm leading-6 text-slate-600"><li><strong className="text-slate-900">1. Học nội dung</strong><br />Xem và thực hiện các hoạt động trong mỗi bài.</li><li><strong className="text-slate-900">2. Kiểm tra kiến thức</strong><br />Hoàn thành bài kiểm tra để mở nội dung tiếp theo.</li><li><strong className="text-slate-900">3. Hoàn thành phần học</strong><br />Học đủ các bài và đạt bài kiểm tra cuối phần.</li></ol></section>
      <section className="rounded-xl border border-blue-100 bg-blue-50 p-4"><h2 className="flex items-center gap-2 font-semibold text-blue-950"><FileText size={18} />Tài liệu học tập</h2><p className="my-3 text-sm leading-6 text-slate-600">Xem tài liệu bổ trợ và ôn lại những nội dung cần ghi nhớ.</p><Button asChild variant="outline" size="sm"><Link to="/app/library">Mở thư viện<ArrowRight size={15} /></Link></Button></section>
    </aside></div>
  </div>;
}
