import { useParams } from "react-router-dom";
import { FlowEditor } from "@/features/learning-flow/FlowEditor";
export function LessonContentPage() {
  const { lessonId = "" } = useParams();
  return <FlowEditor key={lessonId} lessonId={lessonId} />;
}
