import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadAdminMedia } from "@/shared/api/admin";
import type { LessonContentDragAnswer, LessonContentDragQuestion, LessonContentStep } from "@/shared/types/api";
import { X } from "lucide-react";
import { blueprintByKey, createActivityAnswer, createActivityQuestion, normalizeDragQuestionsForEditor } from "./contentModel";
import { Field, UploadBox } from "./FormFields";

export function ActivityDragDropEditor({
  step,
  onChange,
}: {
  step: LessonContentStep;
  onChange: (dragQuestions: LessonContentDragQuestion[]) => void;
}) {
  const [uploadingAnswerId, setUploadingAnswerId] = useState<string | null>(null);
  const questions = step.dragQuestions?.length ? step.dragQuestions : normalizeDragQuestionsForEditor(step, blueprintByKey.get("activity"));

  const emit = (nextQuestions: LessonContentDragQuestion[]) => {
    onChange(
      nextQuestions.map((question, questionIndex) => ({
        ...question,
        order: questionIndex + 1,
        answers: question.answers.map((answer, answerIndex) => ({
          ...answer,
          order: answerIndex + 1,
        })),
      })),
    );
  };

  const updateQuestion = (questionId: string, patch: Partial<LessonContentDragQuestion>) => {
    emit(questions.map((question) => (question.id === questionId ? { ...question, ...patch } : question)));
  };

  const removeQuestion = (questionId: string) => {
    emit(questions.filter((question) => question.id !== questionId));
  };

  const updateAnswer = (questionId: string, answerId: string, patch: Partial<LessonContentDragAnswer>) => {
    emit(
      questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              answers: question.answers.map((answer) => (answer.id === answerId ? { ...answer, ...patch } : answer)),
            }
          : question,
      ),
    );
  };

  const addAnswer = (questionId: string) => {
    emit(
      questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              answers: [...question.answers, createActivityAnswer(question.answers.length + 1)],
            }
          : question,
      ),
    );
  };

  const removeAnswer = (questionId: string, answerId: string) => {
    emit(
      questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              answers: question.answers.filter((answer) => answer.id !== answerId),
            }
          : question,
      ),
    );
  };

  const uploadAnswerImage = async (questionId: string, answer: LessonContentDragAnswer, file: File) => {
    setUploadingAnswerId(answer.id);
    try {
      const media = await uploadAdminMedia(file, "image");
      updateAnswer(questionId, answer.id, {
        imageUrl: media.url,
        imageAlt: answer.imageAlt || answer.label || file.name,
      });
    } finally {
      setUploadingAnswerId(null);
    }
  };

  return (
    <div className="admin-activity-builder">
      <div className="admin-activity-builder-head">
        <div>
          <strong>Bộ câu hỏi kéo - thả</strong>
          <span>{questions.length} câu hỏi / {questions.reduce((total, question) => total + question.answers.length, 0)} đáp án</span>
        </div>
        <Button type="button" variant="outline" onClick={() => emit([...questions, createActivityQuestion(questions.length + 1)])}>
          Thêm câu hỏi
        </Button>
      </div>

      <div className="admin-activity-question-list">
        {questions.map((question, questionIndex) => (
          <div className={`admin-activity-question-card ${question.tone || "blue"}`} key={question.id}>
            <div className="admin-activity-question-head">
              <strong>Câu hỏi / vùng thả {questionIndex + 1}</strong>
              <button disabled={questions.length <= 1} type="button" onClick={() => removeQuestion(question.id)}>
                <X className="size-4" />
              </button>
            </div>

            <div className="admin-content-grid two">
              <Field label="Tên câu hỏi / vùng thả">
                <Input value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} />
              </Field>
              <Field label="Màu nhấn">
                <select value={question.tone || "blue"} onChange={(event) => updateQuestion(question.id, { tone: event.target.value })}>
                  <option value="red">Đỏ - nguy hiểm</option>
                  <option value="amber">Vàng - không chắc</option>
                  <option value="green">Xanh - an toàn</option>
                  <option value="blue">Xanh dương - thông tin</option>
                </select>
              </Field>
            </div>

            <Field label="Diễn giải câu hỏi">
              <Textarea value={question.description} onChange={(event) => updateQuestion(question.id, { description: event.target.value })} />
            </Field>

            <div className="admin-activity-answer-head">
              <strong>Đáp án đúng cho câu hỏi này</strong>
              <Button type="button" variant="outline" onClick={() => addAnswer(question.id)}>
                Thêm đáp án
              </Button>
            </div>

            <div className="admin-activity-answer-list">
              {question.answers.map((answer, answerIndex) => (
                <div className="admin-activity-answer-card" key={answer.id}>
                  <div className="admin-activity-answer-preview">
                    {answer.imageUrl ? (
                      <img alt={answer.imageAlt || answer.label || `Đáp án ${answerIndex + 1}`} src={answer.imageUrl} />
                    ) : (
                      <span>Ảnh đáp án</span>
                    )}
                  </div>
                  <div className="admin-activity-answer-fields">
                    <div className="admin-activity-answer-title">
                      <strong>Đáp án {answerIndex + 1}</strong>
                      <button disabled={question.answers.length <= 1} type="button" onClick={() => removeAnswer(question.id, answer.id)}>
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="admin-content-grid two">
                      <Field label="Nội dung đáp án">
                        <Input value={answer.label} onChange={(event) => updateAnswer(question.id, answer.id, { label: event.target.value })} />
                      </Field>
                      <Field label="Mô tả ảnh">
                        <Input value={answer.imageAlt} onChange={(event) => updateAnswer(question.id, answer.id, { imageAlt: event.target.value })} />
                      </Field>
                    </div>
                    <Field label="Diễn giải / phản hồi riêng">
                      <Input value={answer.description} onChange={(event) => updateAnswer(question.id, answer.id, { description: event.target.value })} />
                    </Field>
                    <div className="admin-content-grid two">
                      <UploadBox
                        accept="image/png,image/jpeg,image/webp"
                        disabled={Boolean(uploadingAnswerId)}
                        label="Upload ảnh đáp án"
                        loading={uploadingAnswerId === answer.id}
                        onChange={(file) => uploadAnswerImage(question.id, answer, file)}
                      />
                      <Field label="URL ảnh đáp án">
                        <Input value={answer.imageUrl} onChange={(event) => updateAnswer(question.id, answer.id, { imageUrl: event.target.value })} />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
