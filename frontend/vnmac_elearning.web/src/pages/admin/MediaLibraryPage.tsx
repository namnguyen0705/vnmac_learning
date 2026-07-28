import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminModal, AdminPageHeader, AdminSection } from "@/shared/ui/admin-kit";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import {
  createMediaLibraryItem,
  deleteMediaLibraryItem,
  getMediaLibrary,
  updateMediaLibraryItem,
  uploadAdminMedia,
} from "@/shared/api/admin";
import type { MediaLibraryItem } from "@/shared/types/api";
import { Download, Eye, FileImage, FileText, Film, Pencil, Plus, Search, Trash2 } from "lucide-react";

const allowedExtensions = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,.m4v";

interface LibraryForm {
  file: File | null;
  cover: File | null;
  title: string;
  description: string;
  category: string;
  tags: string;
  isPublished: boolean;
  sortOrder: number;
}

const emptyForm: LibraryForm = {
  file: null,
  cover: null,
  title: "",
  description: "",
  category: "",
  tags: "",
  isPublished: true,
  sortOrder: 0,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}

function formatBytes(value: number) {
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function getKind(item: MediaLibraryItem) {
  if (item.contentType.startsWith("image/")) return "image";
  if (item.contentType.startsWith("video/")) return "video";
  return "document";
}

function getKindLabel(item: MediaLibraryItem) {
  const kind = getKind(item);
  return kind === "image" ? "Hình ảnh" : kind === "video" ? "Video" : "Tài liệu";
}

function getIcon(item: MediaLibraryItem) {
  const kind = getKind(item);
  return kind === "image" ? FileImage : kind === "video" ? Film : FileText;
}

async function createImageThumbnail(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 270;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể tạo thumbnail.");
  const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể tạo thumbnail.")), "image/jpeg", 0.78),
  );
  return new File([blob], `thumb-${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}

export function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<MediaLibraryItem | null>(null);
  const [editing, setEditing] = useState<MediaLibraryItem | null>(null);
  const [form, setForm] = useState<LibraryForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  const query = useQuery({ queryKey: ["admin-media-library"], queryFn: getMediaLibrary });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-media-library"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tags = form.tags.split(",").map((item) => item.trim()).filter(Boolean);
      if (editing?.id) {
        let thumbnailUrl = editing.thumbnailUrl;
        if (form.cover) thumbnailUrl = (await uploadAdminMedia(form.cover, "poster")).url;
        return updateMediaLibraryItem(editing.id, {
          title: form.title,
          description: form.description,
          thumbnailUrl,
          category: form.category,
          tags,
          isPublished: form.isPublished,
          sortOrder: form.sortOrder,
        });
      }
      if (!form.file) throw new Error("Hãy chọn file tài liệu.");
      const uploaded = await uploadAdminMedia(form.file, "document");
      let thumbnailUrl = "";
      if (form.file.type.startsWith("image/")) {
        thumbnailUrl = (await uploadAdminMedia(await createImageThumbnail(form.file), "poster")).url;
      } else if (form.cover) {
        thumbnailUrl = (await uploadAdminMedia(form.cover, "poster")).url;
      }
      return createMediaLibraryItem({
        fileName: uploaded.fileName,
        originalFileName: uploaded.originalFileName,
        fileUrl: uploaded.url,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
        title: form.title || form.file.name.replace(/\.[^.]+$/, ""),
        description: form.description,
        thumbnailUrl,
        category: form.category,
        tags,
        isPublished: form.isPublished,
        sortOrder: form.sortOrder,
      });
    },
    onSuccess: async () => {
      setError("");
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await refresh();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Không thể lưu tài liệu."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMediaLibraryItem,
    onSuccess: refresh,
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Không thể xóa tài liệu."),
  });

  const items = query.data ?? [];
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return items.filter((item) =>
      (scope === "all" || (scope === "content" && item.isInUse) || (scope === "public" && item.isPublic)) &&
      (!keyword || `${item.title} ${item.fileName} ${item.category} ${item.tags.join(" ")}`.toLocaleLowerCase("vi").includes(keyword)),
    );
  }, [items, scope, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(item: MediaLibraryItem) {
    setEditing(item);
    setForm({
      file: null,
      cover: null,
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags.join(", "),
      isPublished: item.isPublished,
      sortOrder: item.sortOrder,
    });
    setFormOpen(true);
  }

  if (query.isLoading) return <LoadingBlock label="Đang tải thư viện tài liệu..." />;
  if (query.isError) return <MessageBanner tone="error">Không tải được thư viện tài liệu.</MessageBanner>;

  return (
    <div className="grid gap-4">
      <AdminPageHeader
        breadcrumbs={["Quản trị", "Nội dung", "Tài liệu"]}
        title="Thư viện tài liệu"
        actions={<Button onClick={openCreate}><Plus className="size-4" />Thêm tài liệu học viên</Button>}
      />
      {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}

      <AdminSection action={<Badge variant="secondary">{filtered.length} file</Badge>} title="Kho tài liệu">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-11" placeholder="Tìm tên, danh mục, từ khóa..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tài liệu</SelectItem>
                <SelectItem value="content">Tài nguyên nội dung</SelectItem>
                <SelectItem value="public">Thư viện học viên</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const Icon = getIcon(item);
              return (
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white" key={item.fileName}>
                  <div className="relative aspect-video bg-slate-100">
                    {item.thumbnailUrl ? (
                      <img alt="" className="size-full object-cover" loading="lazy" src={item.thumbnailUrl} />
                    ) : getKind(item) === "image" ? (
                      <img alt="" className="size-full object-cover" loading="lazy" src={item.url} />
                    ) : (
                      <div className="grid size-full place-items-center text-slate-400"><Icon className="size-12" /></div>
                    )}
                    <Badge className="absolute left-3 top-3">{getKindLabel(item)}</Badge>
                    {item.isPublic ? <Badge className="absolute right-3 top-3" variant={item.isPublished ? "secondary" : "outline"}>{item.isPublished ? "Đang hiển thị" : "Đang ẩn"}</Badge> : null}
                  </div>
                  <div className="grid gap-3 p-4">
                    <div>
                      <h2 className="line-clamp-2 font-semibold text-slate-950">{item.title || item.fileName}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || item.originalFileName}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.category ? <Badge variant="outline">{item.category}</Badge> : null}
                      {item.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}
                      {item.isInUse ? <Badge variant="outline">Dùng tại {item.usages.length} vị trí</Badge> : null}
                    </div>
                    {item.usages.slice(0, 2).map((usage) => (
                      <a className="truncate text-xs text-blue-700 hover:underline" href={usage.adminUrl} key={`${usage.sourceId}-${usage.field}`}>
                        {usage.field}: {usage.sourceTitle}
                      </a>
                    ))}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-500">{formatBytes(item.sizeBytes)}</span>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => setPreview(item)}><Eye className="size-4" /></Button>
                        {item.id ? <Button size="icon" variant="outline" onClick={() => openEdit(item)}><Pencil className="size-4" /></Button> : null}
                        <Button asChild size="icon" variant="outline"><a download href={item.url}><Download className="size-4" /></a></Button>
                        <Button
                          disabled={item.isInUse}
                          size="icon"
                          title={item.isInUse ? "Tài liệu đang được sử dụng, không thể xóa." : "Xóa"}
                          variant="destructive"
                          onClick={() => window.confirm(`Xóa “${item.title || item.fileName}”?`) && deleteMutation.mutate(item.fileName)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </AdminSection>

      <AdminModal
        actions={<><Button variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button><Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Đang lưu..." : "Lưu tài liệu"}</Button></>}
        className="max-w-3xl"
        onClose={() => setFormOpen(false)}
        open={formOpen}
        title={editing ? "Cập nhật tài liệu" : "Thêm tài liệu học viên"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {!editing ? (
            <div className="md:col-span-2"><Field label="File tài liệu"><Input accept={allowedExtensions} type="file" onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setForm((current) => ({ ...current, file, title: current.title || file?.name.replace(/\.[^.]+$/, "") || "" }));
            }} /></Field></div>
          ) : null}
          <div className="md:col-span-2"><Field label="Tên hiển thị"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field></div>
          <div className="md:col-span-2"><Field label="Mô tả"><Textarea className="min-h-24" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field></div>
          <Field label="Danh mục"><Input placeholder="Ví dụ: Hướng dẫn an toàn" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></Field>
          <Field label="Từ khóa"><Input placeholder="bom mìn, EORE, hướng dẫn" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} /></Field>
          <Field label="Thứ tự hiển thị"><Input min={0} type="number" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} /></Field>
          <Field label="Ảnh đại diện tùy chỉnh"><Input accept="image/*" type="file" onChange={(event) => setForm((current) => ({ ...current, cover: event.target.files?.[0] ?? null }))} /></Field>
          <label className="flex items-center gap-3 md:col-span-2"><Checkbox checked={form.isPublished} onCheckedChange={(value) => setForm((current) => ({ ...current, isPublished: value === true }))} />Hiển thị trong thư viện học viên</label>
          {form.file?.type.startsWith("image/") ? <p className="text-xs text-emerald-700 md:col-span-2">Ảnh sẽ được tự động tạo thumbnail 480 × 270 px để tải danh sách nhanh hơn.</p> : null}
        </div>
      </AdminModal>

      <AdminModal actions={<Button variant="outline" onClick={() => setPreview(null)}>Đóng</Button>} className="max-w-5xl" onClose={() => setPreview(null)} open={Boolean(preview)} title={preview?.title || "Xem tài liệu"}>
        {preview ? <MediaPreview item={preview} /> : null}
      </AdminModal>
    </div>
  );
}

function MediaPreview({ item }: { item: MediaLibraryItem }) {
  if (item.contentType.startsWith("image/")) return <img alt={item.title} className="mx-auto max-h-[70vh] max-w-full object-contain" src={item.url} />;
  if (item.contentType.startsWith("video/")) return <video className="max-h-[70vh] w-full bg-black" controls src={item.url} />;
  if (item.contentType === "application/pdf") return <iframe className="h-[70vh] w-full border-0" src={item.url} title={item.title} />;
  return <div className="grid min-h-72 place-items-center bg-slate-50 p-8 text-center"><Button asChild><a download href={item.url}><Download className="size-4" />Tải tài liệu để đọc</a></Button></div>;
}
