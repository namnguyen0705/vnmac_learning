import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/auth";
import { getLearnerCourseCatalog, getLearnerLearningResults } from "@/shared/api/learner";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { LearnerPanel, LearnerProgressBar } from "@/shared/ui/learner-ui";
import { BookOpen, ClipboardCheck, Clock3, ArrowRight, CheckCircle2 } from "lucide-react";
import { LearningCompanion } from "@/shared/ui/LearningCompanion";
import { Button } from "@/components/ui/button";

export function LearningResultsPage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const query = useQuery({ queryKey: ["learner", userId, "catalog"], queryFn: () => getLearnerCourseCatalog(userId), enabled: !!userId });
  if (query.isLoading) return <LoadingBlock label="Đang tải kết quả học tập..." />;
  if (query.isError) return <MessageBanner tone="error">Không tải được kết quả học tập.</MessageBanner>;
  const courses = query.data?.courses.filter(course => course.isEnrolled) ?? [];
  return <div className="grid gap-4"><h1 className="text-2xl font-bold">Kết quả học tập</h1>{!courses.length && <LearnerPanel className="p-5"><LearningCompanion><strong>Cùng bắt đầu hành trình học nhé!</strong><p>Kết quả sẽ xuất hiện sau khi bạn bắt đầu học.</p></LearningCompanion><Button asChild><Link to="/app/courses">Khám phá bài học<ArrowRight size={16} /></Link></Button></LearnerPanel>}{courses.map(course => <CourseResult key={course.courseId} userId={userId} courseId={course.courseId} />)}</div>;
}
function CourseResult({ userId, courseId }: { userId: string; courseId: string }) {
  const query = useQuery({ queryKey: ["learner", userId, "learning-results", courseId], queryFn: () => getLearnerLearningResults(userId, courseId), refetchOnMount: "always" });
  if (query.isLoading) return <LoadingBlock label="Đang tải kết quả phần học..." />;
  if (!query.data) return <MessageBanner tone="error">Không tải được kết quả phần học.</MessageBanner>;
  const result = query.data;
  const complete = result.overallCompletionPercent >= 100;
  const nextLesson = result.nextLessonId;
  const nextUrl = nextLesson ? `/app/courses/${courseId}/lessons/${nextLesson}` : result.nextQuizId ? `/app/courses/${courseId}/quizzes/${result.nextQuizId}` : "/app/courses";
  const nextTitle = result.nextLessonTitle ?? result.nextQuizTitle;
  return <LearnerPanel className="results-course-card">
    <div className="results-course-heading"><div><span className="results-eyebrow">HÀNH TRÌNH HỌC TẬP</span><h2>{result.courseTitle}</h2></div><span className={`results-status${complete ? " is-complete" : ""}`}>{complete && <CheckCircle2 size={15} />}{complete ? "Đã hoàn thành" : result.overallCompletionPercent > 0 ? "Đang học" : "Chưa bắt đầu"}</span></div>
    <div className="results-overview">
      <div className="results-progress"><span className="results-percent">{result.overallCompletionPercent}<small>%</small></span><p>Tiến độ chung</p><LearnerProgressBar label="Bài học và bài kiểm tra" value={result.overallCompletionPercent} /></div>
      <LearningCompanion celebration={complete} pose={complete ? "celebrate" : "encourage"}><strong>{complete ? "Bạn đã hoàn thành hành trình này!" : result.completedLessons > 0 ? "Bạn đang tiến bộ từng bước!" : "Mỗi bài học là một bước tiến!"}</strong><p>{complete ? "Bạn có thể xem lại các bài để củng cố kiến thức bất cứ lúc nào." : `Đã hoàn thành ${result.completedLessons}/${result.totalLessons} bài học. Cùng tiếp tục nội dung đang mở nhé.`}</p></LearningCompanion>
    </div>
    {result.certificateIssued && <MessageBanner tone="success">Bạn đã được cấp chứng chỉ hoàn thành phần học.</MessageBanner>}
    <div className="results-stats">
      <div className="results-stat"><span className="results-stat-icon"><BookOpen size={21} /></span><div><p>Bài học hoàn thành</p><strong>{result.completedLessons}<small> / {result.totalLessons} bài</small></strong></div></div>
      <div className="results-stat"><span className="results-stat-icon is-green"><ClipboardCheck size={21} /></span><div><p>Kiểm tra cuối phần</p><strong>{result.passedQuizzes}<small> / {result.totalQuizzes} đã đạt</small></strong></div></div>
      <div className="results-stat"><span className="results-stat-icon is-amber"><Clock3 size={21} /></span><div><p>Thời gian học</p><strong>{result.studyTimeMinutes}<small> phút</small></strong></div></div>
    </div>
    <div className="results-next"><div><strong>{complete ? "Ôn lại kiến thức" : "Bước tiếp theo"}</strong><p>{complete ? "Xem lại nội dung và những điều cần ghi nhớ." : nextTitle ?? "Chọn nội dung đang mở trong danh sách bài học."}</p></div><Button asChild><Link to={complete ? "/app/courses" : nextUrl}>{complete ? "Xem lại bài học" : "Tiếp tục học"}<ArrowRight size={16} /></Link></Button></div>
  </LearnerPanel>;
}
