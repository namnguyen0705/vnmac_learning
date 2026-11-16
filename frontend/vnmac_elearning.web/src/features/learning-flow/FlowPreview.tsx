import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLessonContent } from "@/shared/api/admin";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { FlowScreen } from "./FlowPlayer";
import { PartOneIntroduction } from "./PartOneIntroduction";
import type { FlowAction, FlowAnswer, FlowSession } from "./types";

// Preview uses admin-only data and local state; it never calls learner progress endpoints.
export function FlowPreview({ lessonId }: { lessonId: string }) {
  const query = useQuery({ queryKey: ["admin-lesson-content", lessonId], queryFn: () => getLessonContent(lessonId) });
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<FlowAnswer | null>(null);
  const [enteredAt, setEnteredAt] = useState(new Date().toISOString());
  const [position, setPosition] = useState(0);
  const [introDismissed, setIntroDismissed] = useState(false);
  const entries = query.data?.flow?.filter(step => !step.isHidden).flatMap(step => step.items.filter(item => !item.isHidden).map((item, itemIndex) => ({ step, item, itemIndex }))) ?? [];
  if (query.isLoading) return <LoadingBlock label="Đang tải bản xem trước..." />;
  if (query.isError || !entries.length) return <MessageBanner tone="error">Chưa có nội dung Phần 1 để xem trước.</MessageBanner>;
  const active = entries[Math.min(index, entries.length - 1)];
  const data: FlowSession = {
    id: lessonId, title: "Xem trước", courseId: "", revision: 0, completed: false, reviewing: false,
    progressPercent: 0, steps: [], stepId: active.step.id, stepTitle: active.step.title, policy: active.step.policy,
    autoAdvance: active.step.autoAdvance,
    itemIndex: active.itemIndex, itemCount: active.step.items.length, item: active.item, answer, blockedReason: active.item.reviewNote?.trim()
      || (active.item.requiresAudio && !active.item.audioUrl?.trim())
      || (active.item.requiresImage && !active.item.imageUrl?.trim())
      || active.item.options.some(o => o.requiresImage && !o.imageUrl?.trim())
      || (active.item.kind === "video" && (!active.item.videoUrl?.trim() || active.item.durationSeconds <= 1))
      ? "Nội dung này chưa sẵn sàng. Vui lòng quay lại sau."
      : "",
    quizFinished: false, correctCount: answer?.correct ? 1 : 0, answeredCount: answer ? 1 : 0, enteredAt, lastPosition: position, watchedSeconds: position, nextUrl: "", nextLabel: ""
  };
  const go = (next: number) => { setIndex(next); setAnswer(null); setPosition(0); setEnteredAt(new Date().toISOString()); };
  const act = async (action: FlowAction) => {
    if (action.action === "watch") setPosition(action.positionSeconds ?? 0);
    if (action.action === "answer") {
      const codes = active.item.kind === "hotspot" ? active.item.options.filter(o => {
        const x = action.x ?? -100, y = action.y ?? -100;
        if (!o.polygon || o.polygon.length < 3) return Math.abs(x - o.x) <= o.width / 2 && Math.abs(y - o.y) <= o.height / 2;
        let inside = false;
        for (let i = 0, j = o.polygon.length - 1; i < o.polygon.length; j = i++) {
          const a = o.polygon[i], b = o.polygon[j];
          if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        return inside;
      }).map(o => o.code) : action.codes ?? [];
      const expected = active.item.correctCodes ?? [];
      const correct = active.item.kind === "sort" ? codes.join("|") === expected.join("|") : codes.length === expected.length && expected.every(c => codes.includes(c));
      setAnswer({ codes, correct, feedback: (correct ? active.item.correctFeedback : active.item.wrongFeedback) ?? (correct ? "Chính xác!" : "Chưa chính xác.") });
    }
    if (action.action === "advance" && index + 1 < entries.length) go(index + 1);
    return true;
  };
  return <div className="learning-flow">
    <MessageBanner tone="info">Chế độ xem trước dành cho quản trị viên. Các thao tác không ghi vào tiến độ học viên.</MessageBanner>
    <label className="block my-4">Chọn màn hình để xem <select className="w-full border rounded-lg p-3" value={index} onChange={e => go(Number(e.target.value))}>{entries.map((e, i) => <option key={e.item.id} value={i}>{e.step.title} — {e.item.title}</option>)}</select></label>
    {!introDismissed && active.item.id === "l1-start-intro"
      ? <PartOneIntroduction onStart={() => setIntroDismissed(true)} />
      : <FlowScreen key={active.item.id} data={data} busy={false} onAction={act} />}
  </div>;
}
