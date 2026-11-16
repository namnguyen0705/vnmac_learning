import "./public-content-editor.css";
import { useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, ImagePlus, LayoutTemplate, Mail, Monitor, Play, Smartphone, Upload, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { FlowRichText } from "@/features/learning-flow/FlowRichText";
import { flowEditorHtml } from "@/features/learning-flow/richText";
import { uploadAdminMedia } from "@/shared/api/admin";
import { resolveApiUrl } from "@/shared/api/client";
import { getSupportInfo } from "@/shared/api/support";
import { parsePublicContent, type PublicContent, type PublicSection } from "@/shared/lib/publicContent";

type Area = "hero" | "video" | "contact" | number;
export function PublicContentEditor({ value, onChange, onBusyChange }: { value: string; onChange: (value: string) => void; onBusyChange: (busy: boolean) => void }) {
  const content = parsePublicContent(value);
  const latest = useRef(content); latest.current = content;
  const support = useQuery({ queryKey: ["support", "info"], queryFn: getSupportInfo });
  const [area, setArea] = useState<Area>("hero");
  const [mobile, setMobile] = useState(false);
  const [detail, setDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof PublicContent>(key: K, next: PublicContent[K]) => onChange(JSON.stringify({ ...latest.current, [key]: next }));
  const section = typeof area === "number" ? content.sections[area] : null;
  const setSection = (key: keyof PublicSection, text: string, index = area) => {
    set("sections", latest.current.sections.map((s, i) => i === index ? { ...s, [key]: text } : s));
  };
  const text = (key: keyof PublicContent) => String(content[key] ?? support.data?.[key as "email" | "phone" | "operatorName" | "workingHours"] ?? "");
  const field = (key: keyof PublicContent, label: string, multiline = false) => <Field label={label}>{multiline ? <Textarea rows={3} value={text(key)} onChange={e => set(key, e.target.value)} /> : <Input value={text(key)} onChange={e => set(key, e.target.value)} />}</Field>;
  async function upload(file: File, apply: (url: string) => void, video = false) {
    setUploading(true); onBusyChange(true); setError("");
    try { const media = await uploadAdminMedia(file, video ? "video" : "image"); apply(media.url); }
    catch { setError("Không tải được tệp. Vui lòng kiểm tra định dạng và thử lại."); }
    finally { setUploading(false); onBusyChange(false); }
  }
  const rich = (key: "preview" | "body", label: string) => section && <Field label={label}><RichTextEditor key={`${area}-${key}`} value={flowEditorHtml(section[key])} height={key === "body" ? 440 : 300} compact={key === "preview"} disabled={uploading} ariaLabel={label} onChange={v => setSection(key, v)} onUploadImage={async file => { const media = await uploadAdminMedia(file, "image"); return media.url; }} /></Field>;
  const asset = (url: string, apply: (url: string) => void, video = false) => <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
    {video ? <video className="aspect-video w-full rounded-lg bg-slate-900" controls preload="metadata" src={url ? resolveApiUrl(url) : `${import.meta.env.BASE_URL}media/introduction.mp4`} /> : url ? <img className="max-h-48 w-full rounded-lg object-cover" alt="Ảnh đang chọn" src={resolveApiUrl(url)} /> : <div className="flex items-center gap-2 text-sm text-slate-500"><ImagePlus size={22} />Đang sử dụng ảnh mặc định</div>}
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-3 py-3 text-sm font-semibold"><Upload size={16} />{uploading ? "Đang tải tệp…" : video ? "Chọn video từ máy tính" : "Chọn ảnh từ máy tính"}<input className="sr-only" disabled={uploading} type="file" accept={video ? "video/mp4,video/webm" : "image/*"} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file, apply, video); e.target.value = ""; }} /></label>
    <details><summary className="cursor-pointer text-xs text-slate-500">Sử dụng đường dẫn có sẵn</summary><Input className="mt-2" aria-label={video ? "Đường dẫn video" : "Đường dẫn ảnh"} value={url} onChange={e => apply(e.target.value)} /></details>
    {url && <Button variant="ghost" size="sm" type="button" onClick={() => apply("")}>Dùng lại tệp mặc định</Button>}
  </div>;
  const items = [{ id: "hero" as Area, label: "Ảnh bìa & lời chào", icon: LayoutTemplate }, ...content.sections.map((s, i) => ({ id: i as Area, label: s.label, icon: LayoutTemplate })), { id: "video" as Area, label: "Video mở đầu", icon: Play }, { id: "contact" as Area, label: "Trang liên hệ", icon: Mail }];
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold text-slate-900">Biên tập trang công khai</h2><p className="mt-1 text-sm text-slate-500">Chọn một khu vực để chỉnh sửa và xem trước. Lưu thay đổi để áp dụng.</p></div><a className="flex items-center gap-2 text-sm text-blue-700" href={area === "contact" ? "/contact" : "/"} target="_blank" rel="noreferrer">Mở trang hiện tại<ExternalLink size={15} /></a></div>
    {error && <p className="m-4 rounded-lg bg-red-50 p-3 text-red-700" role="alert">{error}</p>}
    <div className="grid items-start xl:grid-cols-[210px_minmax(0,1fr)]">
      <nav className="flex gap-2 overflow-auto border-b bg-slate-50 p-3 xl:flex-col xl:border-b-0" aria-label="Khu vực trang công khai">{items.map(item => <button type="button" key={item.id} onClick={() => { setArea(item.id); setDetail(false); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-left text-sm ${area === item.id ? "bg-blue-700 font-semibold text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}><item.icon size={16} /><span className="flex-1">{item.label}</span><ChevronRight size={14} /></button>)}</nav>
      <div className="grid min-w-0 items-start gap-5 p-4 2xl:grid-cols-2">
        <fieldset disabled={uploading} className="grid min-w-0 gap-5">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Đang chỉnh sửa</p><h3 className="mt-1 text-xl font-semibold">{items.find(i => i.id === area)?.label}</h3></div>
          {area === "hero" && <>{field("heroTitle", "Tiêu đề chính", true)}{field("heroDescription", "Lời giới thiệu", true)}<Field label="Ảnh bìa">{asset(content.heroImageUrl, url => set("heroImageUrl", url))}</Field></>}
          {section && <><Field label="Tên mục trên trang"><Input value={section.label} onChange={e => setSection("label", e.target.value)} /></Field><Field label="Tiêu đề nổi bật"><Input value={section.heading} onChange={e => setSection("heading", e.target.value)} /></Field>{rich("preview", "Nội dung hiển thị trên trang")}<Field label="Hình minh họa">{asset(section.imageUrl, url => setSection("imageUrl", url))}</Field><details className="rounded-xl border p-4" open={detail} onToggle={e => setDetail(e.currentTarget.open)}><summary className="cursor-pointer font-semibold">Bài viết đầy đủ</summary><div className="mt-4 grid gap-4"><Field label="Tiêu đề bài viết"><Input value={section.title} onChange={e => setSection("title", e.target.value)} /></Field>{rich("body", "Nội dung bài viết")}</div></details></>}
          {area === "video" && <><Toggle label="Hiển thị video khi truy cập lần đầu" description="Người xem có thể phát lại video từ trang giới thiệu." checked={content.videoEnabled} onChange={v => set("videoEnabled", v)} /><Toggle label="Yêu cầu xem hết trước khi đóng" description="Tắt để cho phép người xem bỏ qua video." checked={content.videoRequired} onChange={v => set("videoRequired", v)} />{asset(content.videoUrl, url => set("videoUrl", url), true)}</>}
          {area === "contact" && <>{field("contactTitle", "Tiêu đề trang")}{field("contactDescription", "Mô tả", true)}<div className="grid gap-4 sm:grid-cols-2">{field("email", "Email hỗ trợ")}{field("phone", "Điện thoại")}{field("operatorName", "Đơn vị vận hành")}{field("workingHours", "Thời gian hỗ trợ")}</div></>}
        </fieldset>
        <aside className="min-w-0 overflow-hidden rounded-xl border bg-slate-100 2xl:sticky 2xl:top-4"><div className="flex items-center justify-between border-b bg-white p-3"><span className="flex items-center gap-2 text-sm font-semibold"><Eye size={16} />Xem trước nội dung</span><div className="flex gap-1">{[{ value: false, icon: Monitor, label: "Máy tính" }, { value: true, icon: Smartphone, label: "Điện thoại" }].map(({ value, icon: Icon, label }) => <button type="button" key={label} aria-label={label} aria-pressed={mobile === value} className={`rounded p-2 ${mobile === value ? "bg-blue-100 text-blue-700" : "text-slate-500"}`} onClick={() => setMobile(value)}><Icon size={16} /></button>)}</div></div>
          <div className={`mx-auto overflow-hidden bg-white transition-all ${mobile ? "max-w-[360px]" : "w-full"}`}>
            <div className="border-b px-5 py-3 text-xs font-bold tracking-widest text-blue-900">RAPPORT PROJECT</div>
            {area === "hero" && <div className="relative min-h-80 bg-blue-50 p-6" style={{ backgroundImage: `linear-gradient(90deg,rgba(255,255,255,.94),rgba(255,255,255,.4)),url(${content.heroImageUrl ? resolveApiUrl(content.heroImageUrl) : `${import.meta.env.BASE_URL}media/rapport-hero-landscape.png`})`, backgroundSize: "cover", backgroundPosition: "center" }}><h1 className="whitespace-pre-line pt-8 text-3xl font-bold text-blue-950">{content.heroTitle}</h1><p className="mt-4 text-slate-700">{content.heroDescription}</p><span className="mt-6 inline-block rounded-lg bg-blue-700 px-4 py-3 text-sm text-white">Tham gia khóa học →</span></div>}
            {section && <article className="p-5"><p className="text-xs font-semibold uppercase text-blue-700">{section.label}</p><h2 className="my-4 text-2xl font-bold text-slate-900">{detail ? section.title : section.heading}</h2>{!detail && section.imageUrl && <img className="mb-4 w-full rounded-xl" src={resolveApiUrl(section.imageUrl)} alt={section.label} />}<FlowRichText className="public-editor-copy" value={detail ? section.body : section.preview} /><button type="button" className="mt-5 text-sm font-semibold text-blue-700" onClick={() => setDetail(!detail)}>{detail ? "← Quay lại bản tóm tắt" : "Đọc bài viết đầy đủ →"}</button></article>}
            {area === "video" && <div className="p-5"><h2 className="mb-3 text-xl font-semibold">Video chào mừng</h2><video className="aspect-video w-full rounded-xl bg-slate-900" controls preload="metadata" src={content.videoUrl ? resolveApiUrl(content.videoUrl) : `${import.meta.env.BASE_URL}media/introduction.mp4`} /><p className="mt-4 text-sm text-slate-500">{content.videoEnabled ? content.videoRequired ? "Hiển thị lần đầu · Xem hết để tiếp tục" : "Hiển thị lần đầu · Có thể bỏ qua" : "Đã tắt video mở đầu"}</p></div>}
            {area === "contact" && <div className="p-5"><div className="rounded-xl bg-blue-50 p-5"><h2 className="text-2xl font-bold text-blue-950">{content.contactTitle}</h2><p className="mt-3 text-slate-600">{content.contactDescription}</p></div><h3 className="mt-6 font-semibold">Kênh liên hệ</h3>{([ ["email", "Email hỗ trợ"], ["phone", "Điện thoại"], ["operatorName", "Đơn vị vận hành"], ["workingHours", "Thời gian hỗ trợ"] ] as const).map(([key, label]) => text(key) && <div className="mt-4 border-b pb-3" key={key}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-medium">{text(key)}</p></div>)}</div>}
          </div><p className="p-3 text-center text-xs text-slate-500">Bản xem trước nội dung chưa lưu</p>
        </aside>
      </div>
    </div>
  </div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="grid min-w-0 gap-2 text-sm"><span className="font-medium text-slate-700">{label}</span>{children}</div>; }
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-4 rounded-xl border p-4"><span className="flex-1"><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs text-slate-500">{description}</span></span><input className="size-5 accent-blue-700" type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /></label>; }
