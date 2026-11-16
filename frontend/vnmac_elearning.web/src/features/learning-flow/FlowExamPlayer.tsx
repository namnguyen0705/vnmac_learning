import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { FlowAction, FlowSession } from "./types";
import { FlowAudioButton } from "./FlowAudioButton";
import { useAuth } from "@/app/auth";
import { CompletionCertificate } from "./CompletionCertificate";

export function FlowExamPlayer({ data, busy, onAction, reload }: { data: FlowSession; busy: boolean; onAction: (a: FlowAction) => Promise<boolean>; reload: () => Promise<void> }) {
  const exam = data.exam!;
  const { session } = useAuth();
  const storageKey = `exam-draft:${session?.user.id}:${data.id}:${exam.deadline}`;
  const [draft, setDraft] = useState<{ id: string; code: string } | null>(() => { try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; } });
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(storageKey) || "null"); setDraft(value && typeof value.id === "string" && typeof value.code === "string" ? value : null); }
    catch { setDraft(null); }
  }, [storageKey]);
  useEffect(() => { if (exam.submitted) { try { localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ } } }, [exam.submitted, storageKey]);
  const [offset, setOffset] = useState(() => data.serverTime ? Date.parse(data.serverTime) - Date.now() : 0);
  useEffect(() => { if (data.serverTime) setOffset(Date.parse(data.serverTime) - Date.now()); }, [data.serverTime]);
  const [now, setNow] = useState(Date.now());
  const [review, setReview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [resultIndex, setResultIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const remaining = Math.max(0, Math.ceil((Date.parse(exam.deadline) - now - offset) / 1000));
  const saveChoice = async (code: string) => {
    const value = { id: data.item.id, code }; setDraft(value);
    try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* In-memory draft remains. */ }
    if (await onAction({ action: "answer", codes: [code] })) { setDraft(null); try { localStorage.removeItem(storageKey); } catch { /* In-memory state is saved. */ } }
  };
  const retryDraft = async () => {
    if (!draft) return;
    if (draft.id !== data.item.id) {
      const index = exam.questions.findIndex(q => q.id === draft.id);
      if (index < 0 || !await onAction({ action: "navigate", targetIndex: index })) return;
    }
    if (await onAction({ action: "answer", codes: [draft.code] })) { setDraft(null); try { localStorage.removeItem(storageKey); } catch { /* Already saved. */ } }
  };
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!exam.submitted && remaining === 0 && !busy) void reload();
  }, [exam.submitted, remaining, busy, reload]);
  const count = exam.questions.filter(q => q.codes.length).length;
  const q = exam.questions[exam.submitted ? resultIndex : data.itemIndex];
  const navigate = async (index: number) => { if (!draft && await onAction({ action: "navigate", targetIndex: index })) setReview(false); };
  if (exam.submitted) return <section className="flow-card flow-exam">
    <h1>{exam.passed ? "Đạt yêu cầu" : "Chưa đạt yêu cầu"}</h1>
    <p className="flow-exam-score">Đúng {exam.correctCount}/15 câu · {Math.round(100 * (exam.correctCount ?? 0) / 15)}%</p>
    {draft && <p>Một lựa chọn chưa lưu trước khi lượt kiểm tra kết thúc không được tính vào kết quả. Bảng xem lại hiển thị các câu trả lời hệ thống đã ghi nhận.</p>}
    <p>{exam.passed ? "Chúc mừng bạn đã đạt bài kiểm tra cuối khóa!" : "Cần đúng ít nhất 12/15 câu. Hãy xem lại những câu chưa đúng rồi làm lại nhé."}</p>
    <div className="flow-exam-controls"><Button variant="outline" onClick={() => setShowAnswers(v => !v)}>{showAnswers ? "VỀ KẾT QUẢ" : "XEM LẠI KẾT QUẢ"}</Button>
      {!exam.passed && <Button disabled={busy} onClick={() => { void onAction({ action: "retry" }).then(ok => { if (ok) { setReview(false); setShowAnswers(false); setConfirm(false); } }); }}>LÀM LẠI</Button>}
      {exam.passed && data.policy === "exam" && <Button disabled={busy} onClick={() => void onAction({ action: "advance" })}>HOÀN THÀNH KHÓA HỌC</Button>}
      {exam.passed && data.stepId === "complete" && !data.completed && <Button disabled={busy} onClick={() => void onAction({ action: "advance" })}>XÁC NHẬN HOÀN THÀNH</Button>}
      {data.completed && <Button asChild><Link to={data.nextUrl}>XEM LẠI KHÓA HỌC</Link></Button>}
      {!exam.passed && <Button asChild variant="outline"><Link to={`/app/courses/${data.courseId}`}>XEM LẠI BÀI HỌC</Link></Button>}
    </div>
    {showAnswers && <div className="flow-exam-review">
      <nav aria-label="Chọn câu xem lại" className="flow-exam-grid">{exam.questions.map((item, i) => <button key={item.id} aria-current={i === resultIndex ? "step" : undefined} onClick={() => setResultIndex(i)}>{i + 1}. {item.correct ? "✓ Đúng" : "× Chưa đúng"}</button>)}</nav>
      <h2>Câu {resultIndex + 1}/15</h2><p>{q.title}</p>
      <p>Bạn chọn: {q.codes.length ? q.options.filter(o => q.codes.includes(o.code)).map(o => `${o.code}. ${o.label}`).join("; ") : "Chưa trả lời"}</p>
      <p>Đáp án đúng: {q.options.filter(o => q.correctCodes?.includes(o.code)).map(o => `${o.code}. ${o.label}`).join("; ")}</p>
      <p>{q.explanation}</p><FlowAudioButton url={q.feedbackAudioUrl} label="Nghe giải thích" />
    </div>}
    {data.completed && <CompletionCertificate courseId={data.courseId} />}
  </section>;
  return <section className="flow-card flow-exam">
    <h1>Bài kiểm tra cuối khóa</h1>
    <div className="flow-exam-status"><span>Đã trả lời: {count}/15 câu</span><strong role="timer" aria-label="Thời gian còn lại">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</strong></div>
    {review ? <><h2>Kiểm tra lại trước khi nộp</h2><p>Chưa trả lời: {15 - count} câu.</p>
      <nav aria-label="Chọn câu để sửa" className="flow-exam-grid">{exam.questions.map((item, i) => <button disabled={busy || remaining === 0} key={item.id} onClick={() => void navigate(i)}>{i + 1}. {item.codes.length ? "✓ Đã trả lời" : "Chưa trả lời"}</button>)}</nav>
      <div className="flow-exam-controls"><Button variant="outline" disabled={busy || !!draft} onClick={() => { const firstUnanswered = exam.questions.findIndex(item => !item.codes.length); void navigate(firstUnanswered < 0 ? data.itemIndex : firstUnanswered); }}>TIẾP TỤC LÀM BÀI</Button><Button disabled={busy || remaining === 0 || !!draft} onClick={() => setConfirm(true)}>NỘP BÀI</Button></div>
    </> : <><h2>Câu {data.itemIndex + 1}/15</h2><p>{q.title}</p><FlowAudioButton url={q.audioUrl} label="Nghe câu hỏi" />
      <fieldset className="flow-options" disabled={busy || remaining === 0}><legend>Chọn một đáp án. Có thể sửa trước khi nộp.</legend>{q.options.map(o => <label key={o.code} className={(draft?.id === q.id ? draft.code === o.code : q.codes.includes(o.code)) ? "selected" : ""}><input type="radio" name={q.id} checked={draft?.id === q.id ? draft.code === o.code : q.codes.includes(o.code)} onChange={() => void saveChoice(o.code)} /><span>{o.code}. {o.label}</span><FlowAudioButton url={o.audioUrl} label={`Nghe lựa chọn ${o.code}`} /></label>)}</fieldset>
      <div className="flow-exam-controls"><Button variant="outline" disabled={busy || data.itemIndex === 0 || remaining === 0} onClick={() => void navigate(data.itemIndex - 1)}>CÂU TRƯỚC</Button><Button disabled={busy || remaining === 0} onClick={() => data.itemIndex === 14 ? setReview(true) : void navigate(data.itemIndex + 1)}>{data.itemIndex === 14 ? "KIỂM TRA LẠI" : "CÂU TIẾP THEO"}</Button><Button variant="outline" onClick={() => setReview(true)}>KIỂM TRA LẠI</Button></div>
    </>}
    <p role="status">{busy ? "Đang lưu…" : remaining === 0 ? "Đã hết thời gian. Đang tải kết quả các câu đã lưu…" : draft ? "Lựa chọn mới chưa được hệ thống ghi nhận. Hãy thử lưu lại trước khi chuyển câu hoặc nộp bài." : "Các lựa chọn hiển thị đã được hệ thống ghi nhận."}</p>
    {draft && !busy && remaining > 0 && <Button onClick={() => void retryDraft()}>THỬ LƯU LẠI</Button>}
    {confirm && <div className="flow-exam-confirm" role="dialog" aria-modal="true" aria-labelledby="exam-confirm-title"><div><h2 id="exam-confirm-title">Xác nhận nộp bài</h2><p>Đã trả lời {count}/15 câu. {count < 15 && "Câu chưa trả lời được tính là chưa đúng."} Sau khi nộp, bạn không thể sửa lượt này.</p><div className="flow-exam-controls"><Button autoFocus variant="outline" disabled={busy} onClick={() => setConfirm(false)}>QUAY LẠI</Button><Button disabled={busy || remaining === 0 || !!draft} onClick={() => void onAction({ action: "submit" }).then(ok => { if (ok) setConfirm(false); })}>XÁC NHẬN NỘP BÀI</Button></div></div></div>}
  </section>;
}
