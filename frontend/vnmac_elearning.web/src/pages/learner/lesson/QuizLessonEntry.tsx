import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileQuestion } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import type { CourseQuiz } from "../../../shared/types/api";

export function QuizLessonEntry({ courseId, quiz }: { courseId: string; quiz?: CourseQuiz | null }) {
  return (
    <LearnerPanel className="official-quiz-lesson-entry">
      <FileQuestion className="size-12" />
      <div>
        <h1>Bài kiểm tra cuối khóa</h1>
        <p>Bạn sẽ làm bài kiểm tra để hoàn thành khóa học. Hãy chọn câu trả lời đúng nhất.</p>
        <Button asChild className="official-blue-button mt-5">
          <Link to={quiz ? `/app/courses/${courseId}/quizzes/${quiz.id}` : `/app/courses/${courseId}`}>
            Bắt đầu
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </LearnerPanel>
  );
}
