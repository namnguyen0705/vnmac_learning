import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth";
import { apiRequest } from "@/shared/api/client";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/components/ui/button";

interface CertificateState { eligible: boolean; issued: boolean; certificateId?: string; fullName: string; address: string; templateVersion: string; templateLabel: string }
export function CompletionCertificate({ courseId }: { courseId: string }) {
  const { session } = useAuth();
  const client = useQueryClient();
  const base = `/api/learning/learners/${encodeURIComponent(session?.user.id ?? "")}/courses/${encodeURIComponent(courseId)}/completion-certificate`;
  const [data, setData] = useState<CertificateState | null>(null);
  const [name, setName] = useState(""); const [address, setAddress] = useState("");
  const [open, setOpen] = useState(false); const [confirmed, setConfirmed] = useState(false);
  const [dialog, setDialog] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({}); const [documentUrl, setDocumentUrl] = useState(""); const [view, setView] = useState(false);
  const form = useRef<HTMLDivElement>(null); const issuing = useRef(false);
  const nameError = !name.trim() ? "Vui lòng nhập họ và tên." : name.trim().length > 120 || /[\x00-\x1f]/.test(name) ? "Họ và tên không quá 120 ký tự và không có ký tự điều khiển." : "";
  const addressError = !address.trim() ? "Vui lòng nhập địa chỉ." : address.trim().length > 300 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(address) ? "Địa chỉ không quá 300 ký tự và không có ký tự điều khiển." : "";
  const loadDocument = async () => { try { const svg = await apiRequest<string>(base + "/document"); setDocumentUrl(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))); } catch { setError("Chưa tải được chứng chỉ. Hãy thử lại."); } };
  useEffect(() => { let live = true; void apiRequest<CertificateState>(base).then(result => { if (live) { setData(result); setName(result.fullName); setAddress(result.address); } }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [base]);
  useEffect(() => { if (data?.issued) void loadDocument(); }, [data?.issued, base]);
  useEffect(() => () => { if (documentUrl) URL.revokeObjectURL(documentUrl); }, [documentUrl]);
  useEffect(() => { if (open) form.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [open]);
  const issue = async () => {
    if (issuing.current || !data || !confirmed || nameError || addressError) return;
    issuing.current = true; setBusy(true); setError("");
    try {
      const result = await apiRequest<CertificateState>(base, { method: "POST", body: { fullName: name, address, templateVersion: data.templateVersion, confirmed } });
      setData(result); setDialog(false);
      if (session) useAuthStore.getState().syncUser({ ...session.user, fullName: result.fullName });
      void client.invalidateQueries({ queryKey: ["learner", session?.user.id] });
    } catch (e) { setError(`Chưa cấp được chứng chỉ. Thông tin của bạn vẫn được giữ lại. ${e instanceof Error ? e.message : "Hãy nhấn THỬ LẠI."}`); setDialog(false); }
    finally { issuing.current = false; setBusy(false); }
  };
  if (!data) return <section className="flow-certificate"><p role="status">{error || "Đang kiểm tra điều kiện nhận chứng chỉ…"}</p>{error && <Button variant="outline" onClick={() => window.location.reload()}>TẢI LẠI</Button>}</section>;
  if (data.issued) return <section className="flow-certificate"><h2>Đã cấp chứng chỉ hoàn thành khóa học</h2><p>Mã chứng chỉ: {data.certificateId}</p><p>{data.templateLabel}. Thông tin trên bản đã cấp được lưu tại thời điểm xác nhận.</p>{error && <p role="alert">{error}</p>}<div className="flow-exam-controls"><Button disabled={!documentUrl} onClick={() => setView(v => !v)}>XEM CHỨNG CHỈ</Button>{documentUrl ? <Button asChild variant="outline"><a href={documentUrl} download={`${data.certificateId}.svg`}>TẢI CHỨNG CHỈ (SVG)</a></Button> : <Button variant="outline" onClick={() => void loadDocument()}>THỬ TẢI LẠI</Button>}</div>{view && documentUrl && <img className="flow-certificate-document" src={documentUrl} alt={`Chứng chỉ hoàn thành khóa học của ${data.fullName}`} />}</section>;
  if (!data.eligible) return <section className="flow-certificate"><p>Bạn cần hoàn thành các nội dung bắt buộc và đạt ít nhất 12/15 câu kiểm tra cuối khóa trước khi nhận chứng chỉ.</p></section>;
  return <section className="flow-certificate">
    <h2>Đủ điều kiện nhận chứng chỉ</h2><p>Chúc mừng bạn đã hoàn thành khóa học! Hãy kiểm tra thông tin cá nhân trước khi nhận chứng chỉ.</p>
    {!open && <Button onClick={() => setOpen(true)}>KIỂM TRA THÔNG TIN CÁ NHÂN</Button>}
    {open && <div ref={form}><h3>Kiểm tra thông tin cá nhân</h3><p>Thông tin có dấu * là bắt buộc. Bạn có thể sửa trực tiếp trong từng ô.</p><p>{data.templateLabel}: họ và tên, địa chỉ.</p>
      <label className="flow-certificate-field" htmlFor="certificate-name">Họ và tên *<input id="certificate-name" value={name} autoComplete="name" disabled={busy} aria-invalid={!!(touched.name && nameError)} aria-describedby={nameError && touched.name ? "certificate-name-error" : undefined} onBlur={() => setTouched(v => ({ ...v, name: true }))} onChange={e => { setName(e.target.value); setConfirmed(false); }} /></label>
      {touched.name && nameError && <p id="certificate-name-error" className="flow-certificate-error">{nameError}</p>}
      <label className="flow-certificate-field" htmlFor="certificate-address">Địa chỉ *<textarea id="certificate-address" rows={3} value={address} autoComplete="street-address" disabled={busy} aria-invalid={!!(touched.address && addressError)} aria-describedby={addressError && touched.address ? "certificate-address-error" : undefined} onBlur={() => setTouched(v => ({ ...v, address: true }))} onChange={e => { setAddress(e.target.value); setConfirmed(false); }} /></label>
      {touched.address && addressError && <p id="certificate-address-error" className="flow-certificate-error">{addressError}</p>}
      <label className="flow-certificate-confirm-check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />Tôi xác nhận các thông tin trên đã chính xác.</label>
      {error && <p role="alert">{error}</p>}<Button disabled={busy || !confirmed || !!nameError || !!addressError} onClick={() => setDialog(true)}>{busy ? "Đang cấp chứng chỉ…" : error ? "THỬ LẠI" : "NHẬN CHỨNG CHỈ"}</Button>
    </div>}
    {dialog && <div className="flow-exam-confirm" role="dialog" aria-modal="true" aria-labelledby="certificate-confirm-title"><div><h2 id="certificate-confirm-title">Xác nhận nhận chứng chỉ</h2><p>Chứng chỉ sẽ được cấp theo thông tin bạn vừa xác nhận. Bạn muốn tiếp tục?</p><p><strong>Họ và tên:</strong> {name}</p><p><strong>Địa chỉ:</strong> {address}</p><div className="flow-exam-controls"><Button autoFocus variant="outline" disabled={busy} onClick={() => setDialog(false)}>QUAY LẠI CHỈNH SỬA</Button><Button disabled={busy} onClick={() => void issue()}>{busy ? "Đang cấp chứng chỉ…" : "XÁC NHẬN NHẬN CHỨNG CHỈ"}</Button></div></div></div>}
  </section>;
}
