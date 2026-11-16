import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, EyeOff, Video, ImageOff, VolumeX, CircleHelp, Clock3, AlertCircle, Settings2, FileText, Images, ListChecks, MapPin, ArrowDownUp, Code2, Eye, Save, Plus, Trash2, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/shared/api/client";
import { getLessonContent, updateLessonContent, uploadAdminMedia } from "@/shared/api/admin";
import { Button } from "@/components/ui/button";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import type { LessonContent } from "@/shared/types/api";
import type { FlowItem, FlowOption, FlowStep } from "./types";
import { FlowLessonSettings } from "./FlowLessonSettings";
import { MediaFileField } from "./MediaFileField";
import { contentIssues, flowKindLabels, type EditorTab, type IssueKind } from "./contentReadiness";
import { flowEditorHtml } from "./richText";
import "./flow.css";

function moveTo<T>(values: T[], from: number, to: number): T[] { const next = [...values]; const [value] = next.splice(from, 1); next.splice(to, 0, value); return next; }

const issueIcons = { video: Video, image: ImageOff, audio: VolumeX, answer: CircleHelp, review: Clock3, content: AlertCircle };
const kindIcons = { text: FileText, gallery: Images, video: Video, choice: CircleHelp, classify: ListChecks, sort: ArrowDownUp, hotspot: MapPin, match: ListChecks, group: ListChecks };
const tabs: { id: EditorTab; label: string }[] = [{ id: "content", label: "Nội dung" }, { id: "narration", label: "Lời dẫn / lời bình" }, { id: "media", label: "Tệp đính kèm" }, { id: "answers", label: "Đáp án" }, { id: "settings", label: "Thiết lập & duyệt" }];
const filters: { id: "all" | "pending" | IssueKind; label: string }[] = [{ id: "all", label: "Tất cả" }, { id: "pending", label: "Cần bổ sung" }, { id: "video", label: "Thiếu video" }, { id: "image", label: "Thiếu ảnh" }, { id: "audio", label: "Thiếu lời đọc" }, { id: "answer", label: "Thiếu đáp án" }, { id: "review", label: "Chờ duyệt" }];
export function FlowEditor({ lessonId }: { lessonId: string }) {
  const client = useQueryClient();
  const [searchParams] = useSearchParams();
  const linkedItem = searchParams.get("item") ?? "";
  const query = useQuery({ queryKey: ["admin-lesson-content", lessonId], queryFn: () => getLessonContent(lessonId) });
  const [content, setContent] = useState<LessonContent | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [raw, setRaw] = useState("");
  const [selection, setSelection] = useState(linkedItem);
  const [tab, setTab] = useState<EditorTab>("content");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [adding, setAdding] = useState(false);
  const [newKind, setNewKind] = useState<FlowItem["kind"]>("text");
  const [newTarget, setNewTarget] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => { if (searchParams.get("panel") === "lesson") setSelection("lesson-settings"); }, [searchParams]);
  useEffect(() => { if (linkedItem) { setSelection(linkedItem); setTab("answers"); } }, [linkedItem]);
  useEffect(() => { if (query.data && !dirty) setContent(query.data); }, [query.data, dirty]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const save = useMutation({ mutationFn: (payload: LessonContent) => updateLessonContent(lessonId, payload), onSuccess: saved => { client.setQueryData(["admin-lesson-content", lessonId], saved); setContent(saved); setDirty(false); void client.invalidateQueries({ queryKey: ["admin-lesson-content", lessonId] }); void client.invalidateQueries({ queryKey: ["admin", "courses"] }); void client.invalidateQueries({ queryKey: ["courses"] }); } });
  const change = (update: (flow: FlowStep[]) => FlowStep[]) => { setDirty(true); setContent(current => current ? { ...current, flow: update(current.flow ?? []) } : current); };
  const patch = (id: string, value: Partial<FlowItem>) => change(flow => flow.map(step => ({ ...step, items: step.items.map(item => item.id === id ? { ...item, ...value } : item) })));
  const openAdvanced = () => {
    setSelection("advanced");
    setRaw(JSON.stringify(flow, (key, value) => key === "productionNotes" ? undefined : value, 2));
  };
  const applyAdvanced = (updated: FlowStep[]) => change(current => {
    const notesById = new Map(current.flatMap(step => step.items.map(item => [item.id, item.productionNotes] as const)));
    return updated.map(step => ({
      ...step,
      items: step.items.map(item => ({ ...item, productionNotes: notesById.get(item.id) })),
    }));
  });
  const patchStep = (id: string, value: Partial<FlowStep>) => change(flow => flow.map(step => step.id === id ? { ...step, ...value } : step));
  const option = (id: string, code: string, value: Partial<FlowOption>) => change(flow => flow.map(step => ({ ...step, items: step.items.map(item => item.id === id ? { ...item, options: item.options.map(o => o.code === code ? { ...o, ...value } : o) } : item) })));
  const uploadImage = useCallback(async (file: File) => {
    setUploading(true); setError("");
    try { return (await uploadAdminMedia(file, "image")).url; }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được ảnh."); throw e; }
    finally { setUploading(false); }
  }, []);
  const upload = async (file: File, type: "image" | "video" | "caption" | "audio", apply: (url: string) => void) => {
    setUploading(true); setError("");
    try { apply((await uploadAdminMedia(file, type)).url); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được tệp."); return false; }
    finally { setUploading(false); }
  };
  if (query.isLoading || !content) return query.isError ? <MessageBanner tone="error">Không tải được nội dung.</MessageBanner> : <LoadingBlock label="Đang tải nội dung..." />;
  const flow = content.flow ?? [], all = flow.flatMap(step => step.items);
  const selectedStep = flow.find(step => `step:${step.id}` === selection);
  const selectedItem = all.find(item => item.id === selection) ?? (!selectedStep && !(["advanced", "lesson-settings"].includes(selection)) ? all[0] : undefined);
  const issues = selectedItem ? contentIssues(selectedItem) : [];
  const parent = flow.find(step => step.items.some(item => item.id === selectedItem?.id));
  const addItem = () => {
    const title = newTitle.trim();
    if (!title) { setError("Nhập tên màn hình mới."); return; }
    const question = ["choice", "classify", "sort", "hotspot"].includes(newKind);
    const options: FlowOption[] = question ? ["A", "B"].map((code, index) => ({ code, label: `Lựa chọn ${code}`, imageUrl: "", requiresImage: false, x: 25 + index * 50, y: 50, width: 20, height: 20, polygon: [] })) : [];
    const item: FlowItem = { id: `item-${crypto.randomUUID()}`, kind: newKind, title, body: "", narration: "", imageUrl: "", requiresImage: ["gallery", "hotspot"].includes(newKind), audioUrl: "", requiresAudio: false, videoUrl: "", captionUrl: "", durationSeconds: 0, multiple: false, options, correctCodes: newKind === "sort" ? options.map(o => o.code) : [], reviewNote: "Nội dung mới — cần biên soạn và duyệt trước khi phát hành.", correctFeedback: "", wrongFeedback: "" };
    if (newTarget === "new-step") {
      const step: FlowStep = { id: `step-${crypto.randomUUID()}`, title, policy: "practice", shuffleOnRetry: false, items: [item] };
      change(current => [...current, step]);
    } else {
      if (!flow.some(step => step.id === newTarget)) { setError("Chọn phần để thêm màn hình."); return; }
      change(current => current.map(step => step.id === newTarget ? { ...step, items: [...step.items, item] } : step));
      setCollapsed(current => current.filter(id => id !== newTarget));
    }
    setSelection(item.id); setTab("content"); setFilter("all"); setSearch(""); setAdding(false); setError("");
  };
  const removeSelected = () => {
    if (selectedItem && parent) {
      if (parent.items.length === 1) { setError("Phần cần ít nhất một màn hình. Chọn tên phần để xóa cả phần hoặc thêm màn hình khác trước."); return; }
      if (!window.confirm(`Xóa màn hình “${selectedItem.title}”? Thay đổi chỉ có hiệu lực khi bấm Lưu.`)) return;
      const next = parent.items.find(item => item.id !== selectedItem.id)!;
      change(current => current.map(step => step.id === parent.id ? { ...step, items: step.items.filter(item => item.id !== selectedItem.id) } : step));
      setSelection(next.id); setTab("content"); setError("");
    } else if (selectedStep) {
      if (flow.length === 1) { setError("Bài học cần ít nhất một phần."); return; }
      if (!window.confirm(`Xóa phần “${selectedStep.title}” và ${selectedStep.items.length} màn hình bên trong? Thay đổi chỉ có hiệu lực khi bấm Lưu.`)) return;
      const next = flow.find(step => step.id !== selectedStep.id)!;
      change(current => current.filter(step => step.id !== selectedStep.id)); setSelection(`step:${next.id}`); setError("");
    }
  };
  const matchesFilter = (item: FlowItem, value = filter) => value === "all" || (value === "pending" ? contentIssues(item).length > 0 : contentIssues(item).some(issue => issue.kind === value));
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const matches = (item: FlowItem) => matchesFilter(item) && normalize(`${item.title} ${item.id}`).includes(normalize(search));
  const disabled = uploading || save.isPending;
  const media = (item: FlowItem, key: "imageUrl" | "videoUrl" | "captionUrl" | "audioUrl", label: string, type: "image" | "video" | "caption" | "audio", accept: string, hint: string) => <MediaFileField label={label} value={item[key]} accept={accept} hint={hint} disabled={disabled} onUrlChange={url => patch(item.id, { [key]: url })} onSelect={file => upload(file, type, url => patch(item.id, { [key]: url }))} />;
  return <div className="flow-editor flow-editor--split">
    <div className="fe-top fe-top--compact">
      <Link className="fe-back" to="/admin/lessons" aria-label="Về danh sách bài học" title="Danh sách bài học">←</Link>
      <h1 title={`${flow.length} phần · ${all.length} màn hình`}>Biên tập bài học</h1>
      <select className="fe-filter-select" aria-label="Lọc tình trạng nội dung" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>{filters.map(value => <option key={value.id} value={value.id}>{value.label} ({all.filter(item => matchesFilter(item, value.id)).length})</option>)}</select>
      <div className="fe-actions"><button title="Thông tin bài học" aria-label="Thông tin bài học" onClick={() => setSelection("lesson-settings")}><Settings2 size={18} /></button><span role="status">{uploading ? "Đang tải…" : dirty ? "● Chưa lưu" : save.isSuccess ? "Đã lưu" : ""}</span><Button asChild variant="outline"><Link to={`/admin/lessons/${lessonId}/preview`} title="Xem trước bản đã lưu" aria-label="Xem trước"><Eye size={17} />Xem trước</Link></Button><Button title="Lưu nội dung" aria-label="Lưu nội dung" disabled={!dirty || disabled} onClick={() => { setError(""); save.mutate(content); }}><Save size={17} />{save.isPending ? "Đang lưu…" : "Lưu"}</Button></div>
    </div>
    {(error || save.isError) && <MessageBanner tone="error">{error || save.error?.message}</MessageBanner>}
    <div className="fe-workspace">
      <aside className="fe-tree" aria-label="Cấu trúc bài học"><div className="fe-tree-heading"><div className="fe-tree-tools"><input aria-label="Tìm màn hình" placeholder="Tìm tên hoặc mã màn hình…" value={search} onChange={e => setSearch(e.target.value)} /><button type="button" title="Thêm màn hình hoặc phần" aria-label="Thêm màn hình hoặc phần" disabled={disabled} onClick={() => { setAdding(current => !current); setNewTarget(selectedStep?.id ?? parent?.id ?? flow[0]?.id ?? "new-step"); setNewTitle(""); }}>{adding ? <X size={18} /> : <Plus size={18} />}</button></div>{adding && <div className="fe-add-form"><label>Thêm vào<select value={newTarget} onChange={e => setNewTarget(e.target.value)}>{flow.map(step => <option key={step.id} value={step.id}>{step.title}</option>)}<option value="new-step">＋ Phần mới</option></select></label><label>{newTarget === "new-step" ? "Tên phần và màn hình đầu tiên" : "Tên màn hình"}<input value={newTitle} onChange={e => setNewTitle(e.target.value)} /></label><label>Loại màn hình<select value={newKind} onChange={e => setNewKind(e.target.value as FlowItem["kind"])}>{Object.entries(flowKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label><Button disabled={disabled} onClick={addItem}><Plus size={16} />Thêm</Button></div>}</div><div className="fe-tree-scroll">
        {!all.some(matches) && <p className="fe-empty">Không có màn hình phù hợp bộ lọc.</p>}
        {flow.map((step, s) => { const items = step.items.filter(matches); if (!items.length) return null; const open = !collapsed.includes(step.id) || !!search || filter !== "all"; return <section key={step.id} className="fe-group"><div className="fe-group-heading"><button aria-label={`${open ? "Thu gọn" : "Mở"} phần ${step.title}`} aria-expanded={open} onClick={() => setCollapsed(current => current.includes(step.id) ? current.filter(id => id !== step.id) : [...current, step.id])}>{open ? "▾" : "▸"}</button><button className={selectedStep?.id === step.id ? "selected" : ""} onClick={() => setSelection(`step:${step.id}`)} title="Chỉnh sửa tên phần và cơ chế đánh giá"><strong>{s + 1}. {step.title}{step.isHidden && <span title="Đang ẩn với học viên"> · Ẩn</span>}</strong><Settings2 size={15} aria-hidden="true" /></button></div>{open && <div className="fe-group-children" role="group" aria-label={`Các màn hình trong ${step.title}`}>{items.map(item => { const pending = contentIssues(item), KindIcon = kindIcons[item.kind]; return <button key={item.id} className={`fe-item ${selectedItem?.id === item.id ? "selected" : ""}`} aria-current={selectedItem?.id === item.id ? "true" : undefined} title={`${item.title} — ${pending.length ? pending.map(issue => issue.label).join(", ") : "Đủ thông tin bắt buộc"}`} onClick={() => { setSelection(item.id); setTab("content"); }}><KindIcon className="fe-kind-icon" size={16} aria-label={flowKindLabels[item.kind]} /><span className="fe-item-copy"><strong>{step.items.indexOf(item) + 1}. {item.title || "Chưa có tiêu đề"}</strong></span><span className="fe-status-icons">{(step.isHidden || item.isHidden) && <EyeOff size={16} aria-label="Ẩn với học viên" />}{pending.length ? pending.map((issue, i) => { const Icon = issueIcons[issue.kind]; return <span key={i} className={`fe-status-icon ${issue.kind}`} title={issue.label} aria-label={issue.label}><Icon size={16} /></span>; }) : <CheckCircle2 size={16} className="fe-ready-icon" aria-label="Đủ thông tin bắt buộc" />}</span></button>; })}</div>}</section>; })}
      </div><button className="fe-advanced" onClick={openAdvanced} title="Cấu trúc JSON & bảo trì" aria-label="Cấu trúc JSON & bảo trì"><Code2 size={17} /></button></aside>
      <section className="fe-detail" aria-label="Chi tiết chỉnh sửa">
        {selection === "lesson-settings" && <FlowLessonSettings lessonId={lessonId} />}
        {!flow.length && selection !== "lesson-settings" && <div className="p-5"><h2>Chưa có cấu trúc bài học</h2><p>Thêm phần đầu tiên để bắt đầu biên tập theo cấu trúc Phần học 1.</p><Button onClick={() => { setAdding(true); setNewTarget("new-step"); }}>Thêm phần đầu tiên</Button></div>}
        {selectedItem && <><header className="fe-current-item"><strong title={selectedItem.title}>{selectedItem.title || "Chưa có tiêu đề"}</strong>{issues.length > 0 && <div className="fe-current-warnings">{issues.map((issue, i) => { const Icon = issueIcons[issue.kind]; return <button key={i} className={`fe-badge ${issue.kind}`} title={issue.detail} onClick={() => setTab(issue.tab)}><Icon size={14} />{issue.label}</button>; })}</div>}<button className="fe-delete" title="Xóa màn hình" aria-label="Xóa màn hình" disabled={disabled} onClick={removeSelected}><Trash2 size={17} /></button></header><div className="fe-tabs" role="tablist" aria-label="Các phần chỉnh sửa">{tabs.filter(t => t.id !== "answers" || selectedItem.options.length || ["choice", "classify", "sort", "hotspot"].includes(selectedItem.kind)).map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}{issues.some(issue => issue.tab === t.id) && <span aria-label="Cần bổ sung"> ●</span>}</button>)}</div>
          <div className="fe-detail-scroll" key={`${selectedItem.id}-${tab}`} role="tabpanel" aria-label={tabs.find(t => t.id === tab)?.label}><fieldset disabled={save.isPending}>
            {issues.filter(issue => issue.tab === tab).map((issue, i) => <p key={i} className="fe-notice"><strong>{issue.label}: </strong>{issue.detail}</p>)}
            {tab === "settings" && selectedItem.productionNotes?.trim() && <details>
              <summary className="cursor-pointer font-medium">Kịch bản và ghi chú bàn giao</summary>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">{selectedItem.productionNotes}</p>
            </details>}
            {tab === "content" && <><label>Tiêu đề hoặc câu hỏi<input value={selectedItem.title} onChange={e => patch(selectedItem.id, { title: e.target.value })} /></label><RichTextEditor compact height={390} ariaLabel="Soạn nội dung hiển thị" disabled={save.isPending} value={flowEditorHtml(selectedItem.body)} onChange={body => patch(selectedItem.id, { body })} onUploadImage={uploadImage} /></>}
            {tab === "narration" && <RichTextEditor compact height={420} ariaLabel="Soạn lời dẫn và lời bình" disabled={save.isPending} value={flowEditorHtml(selectedItem.narration)} onChange={narration => patch(selectedItem.id, { narration })} onUploadImage={uploadImage} />}
            {tab === "media" && <>{selectedItem.kind === "video" && <div className="fe-media-card"><h3>Video bài học</h3>{media(selectedItem, "videoUrl", "Video", "video", ".mp4,.webm", "MP4 hoặc WebM · Tối đa 2 GB")}{media(selectedItem, "captionUrl", "Phụ đề", "caption", ".vtt", "Phụ đề VTT · Tối đa 5 MB")}</div>}<div className="fe-media-card"><h3>Ảnh minh họa</h3>{media(selectedItem, "imageUrl", "Ảnh", "image", ".jpg,.jpeg,.png,.webp", "JPG, PNG hoặc WebP · Tối đa 20 MB")}<label className="fe-check"><input type="checkbox" checked={selectedItem.requiresImage} onChange={e => patch(selectedItem.id, { requiresImage: e.target.checked })} />Bắt buộc có ảnh để chuyển tiếp</label></div><div className="fe-media-card"><h3>Âm thanh lời đọc</h3><label>Âm thanh giải thích<input value={selectedItem.feedbackAudioUrl ?? ""} onChange={e => patch(selectedItem.id, { feedbackAudioUrl: e.target.value })} /></label>{media(selectedItem, "audioUrl", "File lời đọc", "audio", ".mp3,.wav,.ogg,.m4a", "MP3, WAV, OGG hoặc M4A · Tối đa 100 MB")}<label className="fe-check"><input type="checkbox" checked={selectedItem.requiresAudio ?? false} onChange={e => patch(selectedItem.id, { requiresAudio: e.target.checked })} />Bắt buộc có file lời đọc</label></div></>}
            {tab === "answers" && <>{selectedItem.leftItems && <><p>Các mục bên trái. Đáp án dùng mã trái:mã phải, ví dụ 1:C,2:A.</p>{selectedItem.leftItems.map(left => <label key={left.code}>{left.code}<input value={left.label} onChange={e => patch(selectedItem.id, { leftItems: selectedItem.leftItems?.map(l => l.code === left.code ? { ...l, label: e.target.value } : l) })} /></label>)}</>}<label className="fe-check"><input type="checkbox" checked={selectedItem.multiple} onChange={e => patch(selectedItem.id, { multiple: e.target.checked })} />Cho phép chọn nhiều đáp án</label><label>{selectedItem.kind === "sort" ? "Thứ tự mã đúng" : "Mã đáp án đúng"} (cách nhau dấu phẩy)<input value={(selectedItem.correctCodes ?? []).join(",")} onChange={e => patch(selectedItem.id, { correctCodes: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} /></label>{selectedItem.options.map(o => <div key={o.code} className="fe-media-card"><h3>Lựa chọn {o.code}</h3><label>Thứ tự hiển thị<select value={selectedItem.options.indexOf(o)} onChange={e => patch(selectedItem.id, { options: moveTo(selectedItem.options, selectedItem.options.indexOf(o), Number(e.target.value)) })}>{selectedItem.options.map((value, index) => <option key={value.code} value={index}>{index + 1}</option>)}</select></label><label>Nội dung<input value={o.label} onChange={e => option(selectedItem.id, o.code, { label: e.target.value })} /></label><MediaFileField label="Ảnh lựa chọn" value={o.imageUrl ?? ""} accept=".jpg,.jpeg,.png,.webp" hint="JPG, PNG hoặc WebP · Tối đa 20 MB" disabled={disabled} onUrlChange={url => option(selectedItem.id, o.code, { imageUrl: url })} onSelect={file => upload(file, "image", url => option(selectedItem.id, o.code, { imageUrl: url }))} /><label className="fe-check"><input type="checkbox" checked={o.requiresImage ?? false} onChange={e => option(selectedItem.id, o.code, { requiresImage: e.target.checked })} />Bắt buộc có ảnh lựa chọn</label>{selectedItem.kind === "hotspot" && <div className="fe-coordinates">{(["x", "y", "width", "height"] as const).map(key => <label key={key}>{key} (%)<input type="number" min="0" max="100" value={o[key]} onChange={e => option(selectedItem.id, o.code, { [key]: Number(e.target.value) })} /></label>)}</div>}</div>)}<label>Âm thanh từng lựa chọn</label>{selectedItem.options.map(o => <label key={o.code}>{o.code}<input value={o.audioUrl ?? ""} onChange={e => option(selectedItem.id, o.code, { audioUrl: e.target.value })} /></label>)}{selectedItem.feedbackByCode && Object.entries(selectedItem.feedbackByCode).map(([code, value]) => <label key={code}>Phản hồi khi chọn {code}<textarea value={value} onChange={e => patch(selectedItem.id, { feedbackByCode: { ...selectedItem.feedbackByCode, [code]: e.target.value } })} /></label>)}<label>Phản hồi đúng<textarea value={selectedItem.correctFeedback ?? ""} onChange={e => patch(selectedItem.id, { correctFeedback: e.target.value })} /></label><label>Phản hồi sai<textarea value={selectedItem.wrongFeedback ?? ""} onChange={e => patch(selectedItem.id, { wrongFeedback: e.target.value })} /></label></>}
            {tab === "settings" && <><label>Thứ tự màn hình trong đầu mục<select value={parent?.items.indexOf(selectedItem)} onChange={e => change(current => current.map(step => step.id === parent?.id ? { ...step, items: moveTo(step.items, step.items.indexOf(selectedItem), Number(e.target.value)) } : step))}>{parent?.items.map((i, index) => <option key={i.id} value={index}>{index + 1}</option>)}</select></label><label className="fe-check"><input type="checkbox" checked={!selectedItem.isHidden} onChange={e => patch(selectedItem.id, { isHidden: !e.target.checked })} />Hiển thị cho học viên</label><p className="fe-help">Thay đổi thứ tự hoặc ẩn/hiện cần phát hành lại và đặt lại tiến độ nếu đã có học viên học bài này.</p><label>Thời lượng bắt buộc (giây)<input type="number" min="0" max="3600" step="0.1" value={selectedItem.durationSeconds} onChange={e => patch(selectedItem.id, { durationSeconds: Number(e.target.value) })} /></label><label>Ghi chú chờ duyệt<textarea rows={6} value={selectedItem.reviewNote ?? ""} onChange={e => patch(selectedItem.id, { reviewNote: e.target.value })} /></label><p className="fe-help">Chỉ xóa ghi chú sau khi nội dung, đáp án và tài sản đã được duyệt. Nhãn đủ thông tin kiểm tra các trường bắt buộc, không thay thế việc duyệt chuyên môn.</p></>}
          </fieldset></div></>}
        {selectedStep && <><header className="fe-detail-heading"><small>Thiết lập đầu mục</small><div className="fe-step-title"><h2>{selectedStep.title}</h2><button className="fe-delete" title="Xóa phần và các màn hình" aria-label="Xóa phần và các màn hình" disabled={disabled} onClick={removeSelected}><Trash2 size={17} /></button></div></header><div className="fe-detail-scroll"><fieldset disabled={save.isPending}><label>Thứ tự đầu mục<select value={flow.indexOf(selectedStep)} onChange={e => change(current => moveTo(current, current.indexOf(selectedStep), Number(e.target.value)))}>{flow.map((step, index) => <option key={step.id} value={index}>{index + 1}</option>)}</select></label><label className="fe-check"><input type="checkbox" checked={!selectedStep.isHidden} onChange={e => patchStep(selectedStep.id, { isHidden: !e.target.checked })} />Hiển thị đầu mục và các màn hình cho học viên</label><p className="fe-help">Đổi thứ tự hoặc ẩn/hiện chỉ có hiệu lực sau khi lưu. Bài đã có người học cần đặt lại tiến độ trước khi dùng cấu trúc mới.</p><label>Tên đầu mục<input value={selectedStep.title} onChange={e => patchStep(selectedStep.id, { title: e.target.value })} /></label><label>Cơ chế đánh giá<select value={selectedStep.policy} onChange={e => patchStep(selectedStep.id, { policy: e.target.value })}><option value="practice">Phải đúng từng lượt mới tiếp</option><option value="answered">Trả lời đủ các lượt</option><option value="quiz">Kiểm tra cuối bài, đạt 100%</option><option value="exam">Cuối khóa, 15 câu trong 20 phút</option></select></label>{selectedStep.policy === "quiz" && <label className="fe-check"><input type="checkbox" checked={selectedStep.shuffleOnRetry} onChange={e => patchStep(selectedStep.id, { shuffleOnRetry: e.target.checked })} />Đổi thứ tự đủ bộ câu hỏi khi làm lại</label>}</fieldset></div></>}
        {selection === "advanced" && <><header className="fe-detail-heading"><small>Nâng cao</small><h2>Cấu trúc & bảo trì</h2></header><div className="fe-detail-scroll"><p>Giữ mã phần và màn hình duy nhất. Vùng nhấn có thể dùng polygon với các điểm x, y theo phần trăm ảnh. Máy chủ kiểm tra cấu trúc khi lưu.</p><textarea aria-label="Cấu trúc JSON" className="fe-json" value={raw} disabled={save.isPending} onChange={e => setRaw(e.target.value)} /><Button disabled={disabled} onClick={() => { try { const value = JSON.parse(raw) as FlowStep[]; if (!Array.isArray(value) || !value.length || value.some(step => !step.id || typeof step.title !== "string" || !Array.isArray(step.items) || step.items.some(item => !item.id || !flowKindLabels[item.kind] || typeof item.title !== "string" || !Array.isArray(item.options)))) throw new Error("Cấu trúc phần hoặc màn hình không hợp lệ."); applyAdvanced(value); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "JSON không hợp lệ."); } }}>Áp dụng vào bản đang sửa</Button><hr /><h3>Phát hành bản nội dung mới</h3><p>Thay đổi đáp án, cấu trúc hoặc tài sản cần đặt lại tiến độ trước khi phát hành cho bài đã có người học.</p><Button variant="outline" disabled={dirty || disabled} onClick={async () => { if (!window.confirm("Đặt lại toàn bộ tiến độ và lượt làm bài của tất cả học viên trong khóa học này? Tài khoản và nội dung được giữ lại.")) return; try { await apiRequest(`/api/admin/lessons/${lessonId}/flow/reset-progress`, { method: "POST" }); setError(""); window.alert("Đã đặt lại tiến độ khóa học."); } catch (e) { setError(e instanceof Error ? e.message : "Không đặt lại được tiến độ."); } }}>Đặt lại tiến độ khóa học</Button></div></>}
      </section>
    </div>
  </div>;
}


