import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, ListField } from "./FormFields";
import type { StepFieldsProps } from "./StepFieldTypes";

export function CompleteStepFields({ content, step, onContentChange, onStepChange }: StepFieldsProps) {
  const update = (patch: Parameters<typeof onStepChange>[1]) => onStepChange(step.key, patch);
  return (
        <div className="admin-step-form">
          <div className="admin-content-section-title">
            <strong>Nội dung màn hoàn thành</strong>
            <span>Các trường này được learner dùng trực tiếp ở Bước 6: thẻ chúc mừng, ghi chú kết quả, nút thao tác và thẻ kết quả bên phải.</span>
          </div>
          <div className="admin-content-grid two">
            <Field label="Tiêu đề màn hình">
              <Input value={step.title} onChange={(event) => update({ title: event.target.value })} placeholder="Hoàn thành" />
            </Field>
            <Field label="Lời chúc mừng">
              <Input value={step.subtitle} onChange={(event) => update({ subtitle: event.target.value })} placeholder="Chúc mừng!" />
            </Field>
          </div>
          <Field label="Dòng mô tả dưới lời chúc">
            <Textarea
              value={step.body}
              onChange={(event) => update({ body: event.target.value })}
              placeholder="Bạn đã hoàn thành Bài 1.1 - Nhận diện vật nổ"
            />
          </Field>
          <ListField label="Ghi chú trong khung trắng" value={step.points} onChange={(points) => update({ points })} />
          <div className="admin-content-grid two">
            <Field label="Nút học lại">
              <Input
                value={step.tips[0] ?? ""}
                onChange={(event) => update({ tips: [event.target.value, step.tips[1] ?? "", step.tips[2] ?? ""].filter(Boolean) })}
                placeholder="Học lại bài học"
              />
            </Field>
            <Field label="Nút xem lại">
              <Input value={step.secondaryActionLabel} onChange={(event) => update({ secondaryActionLabel: event.target.value })} />
            </Field>
          </div>
          <div className="admin-content-grid two">
            <Field label="Nút tiếp theo">
              <Input value={step.primaryActionLabel} onChange={(event) => update({ primaryActionLabel: event.target.value })} />
            </Field>
            <Field label="Trạng thái kết quả">
              <Input value={step.alertText} onChange={(event) => update({ alertText: event.target.value })} placeholder="Đạt yêu cầu" />
            </Field>
          </div>
          <div className="admin-content-grid two">
            <Field label="Tiêu đề thẻ kết quả">
              <Input
                value={step.explanationTitle}
                onChange={(event) => update({ explanationTitle: event.target.value })}
                placeholder="Kết quả bài học"
              />
            </Field>
            <Field label="Mô tả thẻ kết quả">
              <Input
                value={step.explanation}
                onChange={(event) => update({ explanation: event.target.value })}
                placeholder="Hiển thị điểm số, trạng thái và tiến độ chủ đề."
              />
            </Field>
          </div>
          <div className="admin-content-grid two">
            <Field label="Tiêu đề completion chung">
              <Input
                value={content.completion.title}
                onChange={(event) => onContentChange((current) => ({ ...current, completion: { ...current.completion, title: event.target.value } }))}
              />
            </Field>
            <Field label="Nút tiếp theo completion chung">
              <Input
                value={content.completion.nextActionLabel}
                onChange={(event) =>
                  onContentChange((current) => ({ ...current, completion: { ...current.completion, nextActionLabel: event.target.value } }))
                }
              />
            </Field>
          </div>
          <Field label="Nội dung completion chung">
            <Textarea
              value={content.completion.message}
              onChange={(event) => onContentChange((current) => ({ ...current, completion: { ...current.completion, message: event.target.value } }))}
            />
          </Field>
        </div>
      );
}
