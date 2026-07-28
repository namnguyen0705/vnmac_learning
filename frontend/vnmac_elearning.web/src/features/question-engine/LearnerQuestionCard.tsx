import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import type {
  DragDropMatchSubmission,
  LearnerQuestionPayload,
  QuestionSubmissionRequest,
} from "../../shared/types/api";
import { humanizeEnum } from "../../shared/lib/format";

export interface QuestionDraftAnswer {
  selectedOptionCodes: string[];
  selectedHotspotCodes: string[];
  hotspotClicks: { x: number; y: number }[];
  matches: Record<string, string>;
}

export function createEmptyAnswer(): QuestionDraftAnswer {
  return {
    selectedOptionCodes: [],
    selectedHotspotCodes: [],
    hotspotClicks: [],
    matches: {},
  };
}

export function toSubmissionRequest(
  questionId: string,
  answer: QuestionDraftAnswer | undefined,
): QuestionSubmissionRequest {
  const draft = answer ?? createEmptyAnswer();
  const matches: DragDropMatchSubmission[] = Object.entries(draft.matches)
    .filter(([, targetCode]) => Boolean(targetCode))
    .map(([dragItemCode, dragTargetCode]) => ({
      dragItemCode,
      dragTargetCode,
    }));

  return {
    questionId,
    selectedOptionCodes: draft.selectedOptionCodes,
    selectedHotspotCodes: draft.selectedHotspotCodes,
    hotspotClicks: draft.hotspotClicks,
    matches,
  };
}

interface LearnerQuestionCardProps {
  question: LearnerQuestionPayload;
  answer?: QuestionDraftAnswer;
  disabled?: boolean;
  feedback?: { correct: boolean; explanation: string } | null;
  onChange: (answer: QuestionDraftAnswer) => void;
}

function updateSelection(list: string[], code: string, single = false) {
  if (single) {
    return [code];
  }

  return list.includes(code) ? list.filter((item) => item !== code) : [...list, code];
}

function getQuestionTypeLabel(question: LearnerQuestionPayload) {
  if (question.type === "DragDrop") return "Phân loại hành động";
  if (question.type === "Hotspot") return "Chọn vị trí";
  return humanizeEnum(question.type);
}

function getChoiceCountLabel(question: LearnerQuestionPayload, count: number) {
  if (question.type === "DragDrop") return `${count} hành động`;
  if (question.type === "Hotspot") return "1 điểm cần chọn";
  return `${count} lựa chọn`;
}

export function LearnerQuestionCard({
  question,
  answer,
  disabled = false,
  feedback,
  onChange,
}: LearnerQuestionCardProps) {
  const current = answer ?? createEmptyAnswer();
  const isChoiceQuestion =
    question.type === "TrueFalse" ||
    question.type === "MultipleChoice" ||
    question.type === "Scenario";
  const isSingleChoice = !question.allowMultipleAnswers;
  const choiceCount = question.options.length || question.hotspotTargets.length || question.dragItems.length;

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="gap-4 border-b border-slate-100 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{getQuestionTypeLabel(question)}</Badge>
              <Badge variant="secondary">{getChoiceCountLabel(question, choiceCount)}</Badge>
            </div>
            <CardTitle className="text-lg leading-tight">{question.prompt}</CardTitle>
            {question.statement ? <p className="text-sm leading-6 text-slate-600">{question.statement}</p> : null}
          </div>
          <Badge variant="outline">Câu {question.order}</Badge>
        </div>

        {question.scenarioTitle ? (
          <div className="border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{question.scenarioTitle}</p>
            {question.scenarioContext ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">{question.scenarioContext}</p>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {question.mediaTitle ? (
          <Alert variant="info">
            <MapPin className="size-4" />
            <AlertTitle>Bối cảnh câu hỏi</AlertTitle>
            <AlertDescription>{question.mediaTitle}</AlertDescription>
          </Alert>
        ) : null}

        {isChoiceQuestion ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((option) => {
              const selected = current.selectedOptionCodes.includes(option.code);
              return (
                <Button
                  className="h-auto min-h-12 justify-start whitespace-normal rounded-2xl px-4 py-3 text-left"
                  disabled={disabled}
                  key={option.code}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  onClick={() =>
                    onChange({
                      ...current,
                      selectedOptionCodes: updateSelection(
                        current.selectedOptionCodes,
                        option.code,
                        isSingleChoice,
                      ),
                    })
                  }
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span>{option.label}</span>
                    <Badge variant={selected ? "success" : "outline"}>{option.code}</Badge>
                  </span>
                </Button>
              );
            })}
          </div>
        ) : null}

        {question.type === "Hotspot" ? (
          <div className="space-y-4">
            <Alert variant="warning">
              <MapPin className="size-4" />
              <AlertTitle>Cách trả lời</AlertTitle>
              <AlertDescription>
                Quan sát ảnh và bấm trực tiếp vào vị trí bạn chọn. Vùng đáp án được ẩn cho đến khi chấm bài.
              </AlertDescription>
            </Alert>

            <div
              className="relative aspect-video min-h-80 cursor-crosshair overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(254,226,226,0.95)_0,_rgba(254,226,226,0.55)_18%,_rgba(254,249,195,0.45)_35%,_rgba(236,253,245,0.8)_58%,_rgba(255,255,255,1)_80%)]"
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={(event) => {
                if (disabled) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
                const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
                onChange({
                  ...current,
                  selectedHotspotCodes: [],
                  hotspotClicks: [{ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }],
                });
              }}
            >
              {question.mediaUrl ? (
                <img
                  alt={question.mediaTitle || question.prompt}
                  className="absolute inset-0 size-full object-contain"
                  src={question.mediaUrl}
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:32px_32px]" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    Sơ đồ khu vực
                  </div>
                  <div className="absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-dashed border-red-400 bg-red-50/90 text-center text-red-700 shadow-sm">
                    <AlertTriangle className="mb-1 size-7" />
                    <span className="px-2 text-xs font-bold">Vật nghi nguy hiểm</span>
                  </div>
                  <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
                    <ShieldCheck className="size-4" />
                    Càng xa tâm càng an toàn
                  </div>
                </>
              )}

              {current.hotspotClicks[0] ? (
                <span
                  className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.5)]"
                  style={{
                    left: `${current.hotspotClicks[0].x}%`,
                    top: `${current.hotspotClicks[0].y}%`,
                  }}
                />
              ) : null}
            </div>

            <p className="text-center text-sm text-slate-600">
              {current.hotspotClicks.length
                ? "Đã ghi nhận vị trí. Bấm vị trí khác trên ảnh nếu muốn thay đổi."
                : "Chưa chọn vị trí nào."}
            </p>
          </div>
        ) : null}

        {question.type === "DragDrop" ? (
          <div className="space-y-4">
            <Alert variant="info">
              <CheckCircle2 className="size-4" />
              <AlertTitle>Cách trả lời</AlertTitle>
              <AlertDescription>
                Với từng hành động, hãy chọn nhóm phù hợp: hành động an toàn hoặc hành động nguy hiểm.
              </AlertDescription>
            </Alert>
            <div className="grid gap-3 lg:grid-cols-2">
            {question.dragItems.map((item, index) => (
              <Card className="border-slate-200 shadow-none" key={item.code}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <Badge variant="outline">Hành động {index + 1}</Badge>
                  </div>

                  <Select
                    disabled={disabled}
                    value={current.matches[item.code] ?? ""}
                    onValueChange={(value) =>
                      onChange({
                        ...current,
                        matches: {
                          ...current.matches,
                          [item.code]: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhóm cho hành động này" />
                    </SelectTrigger>
                    <SelectContent>
                      {question.dragTargets.map((target) => (
                        <SelectItem key={target.code} value={target.code}>
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        ) : null}

        {feedback ? (
          <Alert variant={feedback.correct ? "success" : "warning"}>
            {feedback.correct ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
            <AlertTitle>{feedback.correct ? "Trả lời đúng" : "Cần làm lại"}</AlertTitle>
            <AlertDescription>{feedback.explanation}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
