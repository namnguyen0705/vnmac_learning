import { useParams } from "react-router-dom";
import { useAuth } from "@/app/auth";
import { findQuiz } from "@/shared/lib/course";
import { useLearnerCourse } from "@/shared/lib/useLearnerCourse";
import { FlowPlayer } from "@/features/learning-flow/FlowPlayer";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";

export function QuizPage() {
  const { courseId = "", quizId = "" } = useParams();
  const { session } = useAuth();
  const course = useLearnerCourse(session?.user.id ?? "", courseId);
  if (course.isLoading) return <LoadingBlock label="Đang tải bài kiểm tra..." />;
  const quiz = course.data && findQuiz(course.data, quizId);
  if (!quiz && course.isFetching) return <LoadingBlock label="Đang tải bài kiểm tra..." />;
  if (!quiz) return <MessageBanner tone="error">Không tìm thấy bài kiểm tra trong phần học.</MessageBanner>;
  return <FlowPlayer key={quiz.assessmentLessonId} lessonId={quiz.assessmentLessonId} />;
}
