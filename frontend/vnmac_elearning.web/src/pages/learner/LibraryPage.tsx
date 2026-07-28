import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Download,
  Eye,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminModal } from "@/shared/ui/admin-kit";
import { LearnerPanel } from "@/shared/ui/learner-ui";
import { getPublicMediaLibrary } from "@/shared/api/learner";
import type { MediaLibraryItem } from "@/shared/types/api";

type LibraryFilter = "all" | "document" | "image" | "video";

const FILTERS: Array<{ value: LibraryFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "document", label: "Tài liệu" },
  { value: "image", label: "Hình ảnh" },
  { value: "video", label: "Video" },
];

function getKind(item: MediaLibraryItem): Exclude<LibraryFilter, "all"> {
  if (item.contentType.startsWith("image/")) return "image";
  if (item.contentType.startsWith("video/")) return "video";
  return "document";
}

function getKindLabel(item: MediaLibraryItem) {
  if (item.contentType.startsWith("image/")) return "Hình ảnh";
  if (item.contentType.startsWith("video/")) return "Video";
  if (item.contentType === "application/pdf") return "PDF";
  return "Tài liệu";
}

function getIcon(item: MediaLibraryItem) {
  if (item.contentType.startsWith("image/")) return FileImage;
  if (item.contentType.startsWith("video/")) return Film;
  return FileText;
}

function formatFileSize(size: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function LibraryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [previewItem, setPreviewItem] = useState<MediaLibraryItem | null>(null);
  const query = useQuery({
    queryKey: ["learner-media-library"],
    queryFn: getPublicMediaLibrary,
    retry: 1,
  });

  const sourceItems = query.data ?? [];
  const items = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return sourceItems.filter((item) => {
      const matchesFilter = filter === "all" || getKind(item) === filter;
      const searchable = [
        item.title,
        item.description,
        item.category,
        ...(item.tags ?? []),
      ].join(" ").toLocaleLowerCase("vi");
      return matchesFilter && (!keyword || searchable.includes(keyword));
    });
  }, [filter, search, sourceItems]);

  const categoryCount = new Set(sourceItems.map((item) => item.category).filter(Boolean)).size;

  return (
    <div className="grid gap-6 pb-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#0d3b78] text-white shadow-[0_20px_55px_rgba(15,52,105,0.18)]">
        <div className="absolute -right-16 -top-24 size-80 rounded-full bg-cyan-300/15 blur-2xl" />
        <div className="absolute bottom-0 right-[18%] size-48 translate-y-1/2 rounded-full bg-emerald-300/15 blur-xl" />
        <div className="relative grid gap-8 px-7 py-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10 lg:py-10">
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-100">
              <Sparkles className="size-4 text-amber-300" />
              Kho học liệu dành cho bạn
            </div>
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              Thư viện tài liệu học tập
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
              Tài liệu hướng dẫn, hình ảnh và video thực hành được chọn lọc để bạn dễ dàng
              tra cứu trong suốt quá trình học.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat value={sourceItems.length} label="Tài liệu" icon={BookOpen} />
            <Stat value={categoryCount} label="Danh mục" icon={FolderOpen} />
            <Stat
              value={sourceItems.filter((item) => getKind(item) === "video").length}
              label="Video"
              icon={Film}
              className="col-span-2 sm:col-span-1"
            />
          </div>
        </div>
      </section>

      <LearnerPanel className="p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 text-base shadow-none focus-visible:bg-white"
              placeholder="Tìm theo tên, danh mục hoặc từ khóa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {FILTERS.map((item) => (
              <Button
                className="shrink-0 rounded-xl"
                key={item.value}
                variant={filter === item.value ? "default" : "outline"}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </LearnerPanel>

      {query.isLoading ? (
        <LibrarySkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : items.length ? (
        <>
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Tài liệu dành cho bạn</h2>
              <p className="mt-1 text-sm text-slate-500">
                Hiển thị {items.length} trong tổng số {sourceItems.length} tài liệu
              </p>
            </div>
          </div>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {items.map((item) => (
              <LibraryCard item={item} key={item.id ?? item.fileName} onPreview={setPreviewItem} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState hasSearch={Boolean(search.trim()) || filter !== "all"} onReset={() => {
          setSearch("");
          setFilter("all");
        }} />
      )}

      <AdminModal
        actions={
          previewItem ? (
            <>
              <Button variant="outline" onClick={() => setPreviewItem(null)}>Đóng</Button>
              <Button asChild>
                <a download href={previewItem.url}><Download className="size-4" />Tải xuống</a>
              </Button>
            </>
          ) : null
        }
        className="max-w-5xl"
        onClose={() => setPreviewItem(null)}
        open={Boolean(previewItem)}
        title={previewItem?.title ?? "Xem tài liệu"}
      >
        {previewItem ? <LearnerMediaPreview item={previewItem} /> : null}
      </AdminModal>
    </div>
  );
}

function Stat({
  value,
  label,
  icon: Icon,
  className = "",
}: {
  value: number;
  label: string;
  icon: typeof BookOpen;
  className?: string;
}) {
  return (
    <div className={`min-w-28 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm ${className}`}>
      <Icon className="mb-2 size-5 text-cyan-200" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-blue-100">{label}</p>
    </div>
  );
}

function LibraryCard({
  item,
  onPreview,
}: {
  item: MediaLibraryItem;
  onPreview: (item: MediaLibraryItem) => void;
}) {
  const Icon = getIcon(item);
  return (
    <LearnerPanel className="group flex min-h-[310px] flex-col overflow-hidden border-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,52,105,0.14)]">
      <button className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 text-left" onClick={() => onPreview(item)}>
        {item.thumbnailUrl ? (
          <img
            alt={item.title}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={item.thumbnailUrl}
          />
        ) : (
          <div className="grid size-full place-items-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
              <Icon className="size-8" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent opacity-70" />
        <Badge className="absolute left-3 top-3 border-0 bg-white/90 text-slate-800 shadow-sm hover:bg-white">
          {getKindLabel(item)}
        </Badge>
        <span className="absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-white/90 text-blue-700 opacity-0 shadow-lg transition group-hover:opacity-100">
          <Eye className="size-4" />
        </span>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
            {item.category || "Tài liệu học tập"}
          </p>
          {formatFileSize(item.sizeBytes) ? (
            <span className="text-xs text-slate-400">{formatFileSize(item.sizeBytes)}</span>
          ) : null}
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-5 text-slate-950">{item.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">
          {item.description || "Tài liệu tham khảo hỗ trợ nội dung học tập."}
        </p>
        {(item.tags ?? []).length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600" key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex gap-2 pt-4">
          <Button className="h-9 flex-1 rounded-lg px-3 text-xs" onClick={() => onPreview(item)}>
            <Eye className="size-3.5" />Xem
          </Button>
          <Button asChild className="size-9 rounded-lg" size="icon" variant="outline">
            <a download href={item.url} aria-label={`Tải ${item.title}`}><Download className="size-4" /></a>
          </Button>
        </div>
      </div>
    </LearnerPanel>
  );
}

function LibrarySkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {[1, 2, 3, 4, 5].map((item) => (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" key={item}>
          <div className="aspect-video animate-pulse bg-slate-100" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <LearnerPanel className="overflow-hidden p-10 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <RefreshCw className="size-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-slate-950">Chưa thể tải thư viện</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        Kết nối đến kho tài liệu đang gián đoạn. Bạn có thể thử tải lại mà không cần rời khỏi trang.
      </p>
      <Button className="mt-5 rounded-xl" onClick={onRetry}><RefreshCw className="size-4" />Tải lại</Button>
    </LearnerPanel>
  );
}

function EmptyState({ hasSearch, onReset }: { hasSearch: boolean; onReset: () => void }) {
  return (
    <LearnerPanel className="border-dashed p-12 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
        <FolderOpen className="size-8" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-slate-950">
        {hasSearch ? "Không tìm thấy tài liệu phù hợp" : "Thư viện đang được cập nhật"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {hasSearch
          ? "Hãy thử từ khóa khác hoặc xem lại toàn bộ kho tài liệu."
          : "Tài liệu mới sẽ xuất hiện tại đây sau khi được quản trị viên phát hành."}
      </p>
      {hasSearch ? <Button className="mt-5 rounded-xl" variant="outline" onClick={onReset}>Xóa bộ lọc</Button> : null}
    </LearnerPanel>
  );
}

function LearnerMediaPreview({ item }: { item: MediaLibraryItem }) {
  if (item.contentType.startsWith("image/")) {
    return <img alt={item.title} className="mx-auto max-h-[70vh] max-w-full rounded-xl object-contain" src={item.url} />;
  }
  if (item.contentType.startsWith("video/")) {
    return <video className="max-h-[70vh] w-full rounded-xl bg-black" controls src={item.url} />;
  }
  if (item.contentType === "application/pdf") {
    return <iframe className="h-[70vh] w-full rounded-xl border-0" src={item.url} title={item.title} />;
  }
  return (
    <div className="grid min-h-72 place-items-center rounded-xl bg-slate-50 p-8 text-center">
      <div>
        <FileText className="mx-auto size-14 text-blue-700" />
        <p className="mt-4 font-semibold text-slate-900">Tài liệu này cần ứng dụng tương ứng để mở.</p>
        <p className="mt-2 text-sm text-slate-500">Tải file xuống thiết bị để tiếp tục xem nội dung.</p>
        <Button asChild className="mt-5 rounded-xl"><a download href={item.url}><Download className="size-4" />Tải tài liệu</a></Button>
      </div>
    </div>
  );
}
