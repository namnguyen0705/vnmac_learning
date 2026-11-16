import { useParams } from "react-router-dom";
import { FlowPlayer } from "@/features/learning-flow/FlowPlayer";
import { FlowPreview } from "@/features/learning-flow/FlowPreview";

export function LessonPage({ previewMode = false }: { previewMode?: boolean }) {
  const { lessonId = "" } = useParams();
  return previewMode ? <FlowPreview lessonId={lessonId} /> : <FlowPlayer key={lessonId} lessonId={lessonId} />;
}
