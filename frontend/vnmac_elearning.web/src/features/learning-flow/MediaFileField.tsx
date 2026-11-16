import { useId, useRef, useState } from "react";
import { CheckCircle2, File, LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MediaFileField({ label, value, accept, hint, disabled, onUrlChange, onSelect }: {
  label: string;
  value: string;
  accept: string;
  hint: string;
  disabled: boolean;
  onUrlChange: (value: string) => void;
  onSelect: (file: File) => Promise<boolean>;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  let savedName = value.split(/[?#]/)[0].split("/").pop() || "";
  try { savedName = decodeURIComponent(savedName); } catch { /* Keep the original filename if its URL is malformed. */ }
  const name = selectedName || savedName;

  return <div className="flow-media-field">
    <label htmlFor={`${id}-url`}>{label}</label>
    <input id={`${id}-url`} value={value} placeholder="Dán đường dẫn tệp nếu đã có" onChange={event => { setSelectedName(""); setFailed(false); onUrlChange(event.target.value); }} />
    <div className={`flow-file-picker${failed ? " is-error" : ""}`}>
      <input ref={input} className="flow-file-input" type="file" accept={accept} disabled={disabled || busy} aria-label={`Chọn tệp ${label.toLowerCase()}`} onChange={async event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setSelectedName(file.name); setBusy(true); setFailed(false);
        try { setFailed(!await onSelect(file)); }
        catch { setFailed(true); }
        finally { setBusy(false); }
      }} />
      <Button className="flow-file-button" type="button" variant="outline" disabled={disabled || busy} onClick={() => input.current?.click()} aria-describedby={`${id}-hint`}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {busy ? "Đang tải lên..." : name ? "Đổi tệp" : "Chọn tệp từ máy"}
      </Button>
      <div className="flow-file-info" role="status" aria-live="polite">
        <div className="flow-file-name">{name && (value && !failed && !busy ? <CheckCircle2 aria-hidden="true" /> : <File aria-hidden="true" />)}<span title={name}>{name || "Chưa chọn tệp"}</span></div>
        <small id={`${id}-hint`}>{failed ? "Tải lên chưa thành công. Hãy chọn lại tệp để thử lại." : busy ? "Đang tải tệp lên hệ thống, vui lòng đợi." : hint}</small>
      </div>
    </div>
  </div>;
}
