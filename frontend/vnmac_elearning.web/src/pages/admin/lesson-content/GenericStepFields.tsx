import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./FormFields";
import type { StepFieldsProps } from "./StepFieldTypes";

export function GenericStepFields({ step, onStepChange }: StepFieldsProps) {
  const update = (patch: Parameters<typeof onStepChange>[1]) => onStepChange(step.key, patch);

  return (
    <div className="admin-step-form">
      <div className="admin-content-grid two">
        <Field label="Ti?u ?? m?n h?nh">
          <Input value={step.title} onChange={(event) => update({ title: event.target.value })} />
        </Field>
        <Field label="D?ng ph? / h??ng d?n ng?n">
          <Input value={step.subtitle} onChange={(event) => update({ subtitle: event.target.value })} />
        </Field>
      </div>
      <Field label="N?i dung ch?nh">
        <Textarea value={step.body} onChange={(event) => update({ body: event.target.value })} />
      </Field>
    </div>
  );
}
