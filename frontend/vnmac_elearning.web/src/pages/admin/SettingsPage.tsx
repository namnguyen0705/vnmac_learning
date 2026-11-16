import { PublicContentEditor } from "./PublicContentEditor";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, ImageUp, LayoutTemplate, Loader2, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSystemSettings, updateSystemSettings, uploadAdminMedia } from "@/shared/api/admin";
import { resolveBrandAsset } from "@/shared/ui/branding";
import { AdminPageHeader } from "@/shared/ui/admin-kit";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import type { UpdateSystemSettingsRequest } from "@/shared/types/api";
import { defaultHomeContent, parseHomeContent, type HomeContent } from "@/shared/lib/homeContent";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";

const emptySettings: UpdateSystemSettingsRequest = {
  siteTitle: "RAPPORT Project",
  headerTitle: "RAPPORT PROJECT",
  headerSubtitle: "DỰ ÁN GIÁO DỤC NGUY CƠ BOM MÌN VẬT NỔ VÀ THAY ĐỔI HÀNH VI XÃ HỘI",
  projectLogoUrl: "",
  loginLogoUrl: "",
  vnmacLogoUrl: "",
  vietnamFlagUrl: "",
  usFlagUrl: "",
  crsLogoUrl: "",
  headerBackgroundColor: "#ffffff",
  headerBackgroundImageUrl: "",
  loginBackgroundImageUrl: "",
  certificateTemplateUrl: "",
  certificateTitle: "CHỨNG NHẬN",
  certificateCourseTitle: "GIÁO DỤC NGUY CƠ BOM MÌN, VẬT NỔ VÀ THAY ĐỔI HÀNH VI XÃ HỘI",
  publicContentJson: "{}",
  homeContentJson: JSON.stringify(defaultHomeContent),
};

type SettingKey = keyof UpdateSystemSettingsRequest;
type SettingsTab = "identity" | "media" | "home" | "public";

const tabs: { id: SettingsTab; label: string; description: string; icon: typeof Palette }[] = [
  { id: "public", label: "Trang công khai", description: "Giới thiệu, liên hệ và video mở đầu", icon: Home },
  { id: "identity", label: "Nhận diện", description: "Tên dự án, nội dung và màu sắc", icon: Palette },
  { id: "media", label: "Logo & hình nền", description: "Quản lý toàn bộ tài sản hình ảnh", icon: ImageUp },
  { id: "home", label: "Trang chủ", description: "Nội dung các khối dành cho học viên", icon: Home },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateSystemSettingsRequest>(emptySettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("identity");
  const [publicUploading, setPublicUploading] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<SettingKey | null>(null);

  const query = useQuery({ queryKey: ["admin", "settings"], queryFn: getSystemSettings });
  useEffect(() => {
    if (query.data) {
      const { updatedAt: _updatedAt, updatedByUserId: _updatedByUserId, ...settings } = query.data;
      setForm(settings);
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateSystemSettingsRequest) => updateSystemSettings({ ...payload, homeContentJson: JSON.stringify(parseHomeContent(payload.homeContentJson)) }),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "settings"], data);
      queryClient.invalidateQueries({ queryKey: ["system-settings-public"] });
      queryClient.invalidateQueries({ queryKey: ["support", "info"] });
    },
  });

  const setField = (key: SettingKey, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const homeContent = parseHomeContent(form.homeContentJson);
  const setHomeContent = (next: HomeContent) => setField("homeContentJson", JSON.stringify(next));
  const setHomeField = <K extends keyof HomeContent>(key: K, value: HomeContent[K]) =>
    setHomeContent({ ...homeContent, [key]: value });

  async function handleUpload(key: SettingKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingKey(key);
    try {
      const result = await uploadAdminMedia(file, "image");
      setField(key, result.url);
    } finally {
      event.target.value = "";
      setUploadingKey(null);
    }
  }

  return (
    <div className="grid gap-3 pb-24">
      <AdminPageHeader
        breadcrumbs={["Trang chủ", "Cài đặt hệ thống", "Cài đặt chung"]}
        title="Cài đặt giao diện"
      />

      {mutation.isError ? <MessageBanner tone="error">Không lưu được cài đặt. Vui lòng kiểm tra lại.</MessageBanner> : null}
      {mutation.isSuccess ? <MessageBanner tone="success">Đã cập nhật giao diện hệ thống.</MessageBanner> : null}

      <div className="grid gap-3 lg:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-blue-600 bg-blue-50 shadow-[0_10px_30px_rgba(37,99,235,0.10)]"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Icon className="size-5" />
              </span>
              <span>
                <strong className="block text-sm text-slate-950">{tab.label}</strong>
                <small className="mt-1 block text-slate-500">{tab.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "public" && <PublicContentEditor value={form.publicContentJson} onChange={value => setField("publicContentJson", value)} onBusyChange={setPublicUploading} />}
      {query.isError && <MessageBanner tone="error">Không tải được cài đặt. Vui lòng tải lại trang.</MessageBanner>}
      {activeTab === "identity" ? (
        <SettingsWorkspace
          formPanel={
            <>
              <PanelHeading title="Thông tin hiển thị" description="Các nội dung xuất hiện trên thanh đầu trang và tiêu đề trình duyệt." />
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Tên hệ thống" value={form.siteTitle} onChange={(value) => setField("siteTitle", value)} />
                <TextField label="Tên dự án trên header" value={form.headerTitle} onChange={(value) => setField("headerTitle", value)} />
                <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                  Mô tả dự án
                  <Textarea className="min-h-28 resize-none" value={form.headerSubtitle} onChange={(event) => setField("headerSubtitle", event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Màu nền header
                  <div className="flex gap-3">
                    <input
                      aria-label="Chọn màu nền header"
                      className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                      type="color"
                      value={form.headerBackgroundColor || "#ffffff"}
                      onChange={(event) => setField("headerBackgroundColor", event.target.value)}
                    />
                    <Input value={form.headerBackgroundColor} onChange={(event) => setField("headerBackgroundColor", event.target.value)} />
                  </div>
                </label>
              </div>
            </>
          }
          previewPanel={<HeaderPreview form={form} />}
          previewTitle="Xem trước trực tiếp"
        />
      ) : null}

      {activeTab === "media" ? (
        <SettingsWorkspace
          formPanel={
            <>
              <PanelHeading title="Tài sản hình ảnh" description="Ảnh mới được xem trước ngay; thay đổi chỉ có hiệu lực sau khi lưu." />
              <div className="grid gap-3 md:grid-cols-2">
                <AssetField label="Logo dự án" settingKey="projectLogoUrl" value={form.projectLogoUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} />
                <AssetField label="Logo đăng nhập" settingKey="loginLogoUrl" value={form.loginLogoUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} />
                <AssetField label="Logo VNMAC" settingKey="vnmacLogoUrl" value={form.vnmacLogoUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} />
                <AssetField label="Logo CRS" settingKey="crsLogoUrl" value={form.crsLogoUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} />
                <AssetField label="Cờ Việt Nam" settingKey="vietnamFlagUrl" value={form.vietnamFlagUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} />
                <AssetField label="Cờ Hoa Kỳ" settingKey="usFlagUrl" value={form.usFlagUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} />
                <AssetField label="Ảnh nền header" settingKey="headerBackgroundImageUrl" value={form.headerBackgroundImageUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} wide />
                <AssetField label="Ảnh nền đăng nhập" settingKey="loginBackgroundImageUrl" value={form.loginBackgroundImageUrl} uploadingKey={uploadingKey} onChange={setField} onUpload={handleUpload} wide />
              </div>
            </>
          }
          previewPanel={<HeaderPreview form={form} />}
          previewTitle="Kiểm tra bộ nhận diện"
        />
      ) : null}

      {activeTab === "home" ? (
        <SettingsWorkspace
          formPanel={
            <>
              <PanelHeading title="Nội dung trang chủ" description="Mỗi dòng trong ô danh sách sẽ hiển thị thành một ý. Có thể dùng {lessonCount}, {quizCount} và {passScore} trong phần tổng quan." />
              <div className="grid gap-4">
                <SettingsGroup title="Khối chào mừng">
                  <TextField label="Tiêu đề" value={homeContent.welcomeTitle} onChange={(value) => setHomeField("welcomeTitle", value)} />
                  <HomeRichTextEditor label="Nội dung chào mừng (để trống sẽ dùng mô tả khóa học)" value={homeContent.welcomeBodyHtml} onChange={(value) => setHomeField("welcomeBodyHtml", value)} />
                </SettingsGroup>
                <SettingsGroup title="Tổng quan khóa học">
                  <TextField label="Tiêu đề khối" value={homeContent.overviewTitle} onChange={(value) => setHomeField("overviewTitle", value)} />
                  <HomeRichTextEditor label="Nội dung khối" value={homeContent.overviewBodyHtml} onChange={(value) => setHomeField("overviewBodyHtml", value)} />
                </SettingsGroup>
                <SettingsGroup title="Mục đích khóa học">
                  <TextField label="Tiêu đề khối" value={homeContent.objectivesTitle} onChange={(value) => setHomeField("objectivesTitle", value)} />
                  <HomeRichTextEditor label="Nội dung khối" value={homeContent.objectivesBodyHtml} onChange={(value) => setHomeField("objectivesBodyHtml", value)} />
                </SettingsGroup>
                <SettingsGroup title="Nhiệm vụ của bạn">
                  <TextField label="Tiêu đề khối" value={homeContent.tasksTitle} onChange={(value) => setHomeField("tasksTitle", value)} />
                  <HomeRichTextEditor label="Nội dung khối" value={homeContent.tasksBodyHtml} onChange={(value) => setHomeField("tasksBodyHtml", value)} />
                  <HomeRichTextEditor label="Thông báo cuối khối" value={homeContent.taskWarningHtml} onChange={(value) => setHomeField("taskWarningHtml", value)} compact />
                </SettingsGroup>
                <SettingsGroup title="Sau khi học xong">
                  <TextField label="Tiêu đề khối" value={homeContent.outcomesTitle} onChange={(value) => setHomeField("outcomesTitle", value)} />
                  <HomeRichTextEditor label="Nội dung khối" value={homeContent.outcomesBodyHtml} onChange={(value) => setHomeField("outcomesBodyHtml", value)} />
                </SettingsGroup>
              </div>
            </>
          }
          previewPanel={<HomeContentPreview content={homeContent} />}
          previewTitle="Xem trước nội dung trang chủ"
        />
      ) : null}


      <div className="settings-save-bar fixed bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center justify-end gap-3">
          <span className="hidden text-sm text-slate-500 md:block">Các thay đổi chưa được áp dụng cho đến khi bạn lưu.</span>
          <Button
            className="gap-2 bg-blue-700 px-6 text-white hover:bg-blue-800"
            disabled={mutation.isPending || query.isPending || query.isError || publicUploading || uploadingKey !== null}
            type="button"
            onClick={() => mutation.mutate(form)}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsWorkspace({ formPanel, previewPanel, previewTitle }: { formPanel: ReactNode; previewPanel: ReactNode; previewTitle: string }) {
  return (
    <div className="grid items-start gap-3 2xl:grid-cols-[minmax(0,1.05fr)_minmax(520px,0.95fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">{formPanel}</section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm 2xl:sticky 2xl:top-4">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-4">
          <LayoutTemplate className="size-5 text-blue-700" />
          <h2 className="font-semibold text-slate-950">{previewTitle}</h2>
        </div>
        <div className="p-4">{previewPanel}</div>
      </section>
    </div>
  );
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 border-b border-slate-100 pb-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function HeaderPreview({ form }: { form: UpdateSystemSettingsRequest }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className="flex min-h-28 items-center justify-between gap-4 px-6 py-3"
        style={{
          backgroundColor: form.headerBackgroundColor || "#ffffff",
          backgroundImage: form.headerBackgroundImageUrl ? `url(${resolveBrandAsset(form.headerBackgroundImageUrl)})` : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <PreviewImage src={form.projectLogoUrl} fallback="RP" className="size-14" />
          <div className="min-w-0">
            <strong className="block text-sm text-blue-900">{form.headerTitle || "Tên dự án"}</strong>
            <p className="mt-1 max-w-72 text-[11px] leading-4 text-blue-800">{form.headerSubtitle || "Mô tả dự án"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <PreviewImage src={form.vnmacLogoUrl} fallback="VNMAC" className="h-12 w-20" />
          <PreviewImage src={form.vietnamFlagUrl} fallback="VN" className="h-8 w-11" />
          <PreviewImage src={form.usFlagUrl} fallback="US" className="h-8 w-11" />
          <PreviewImage src={form.crsLogoUrl} fallback="CRS" className="h-12 w-16" />
        </div>
      </div>
      <div className="grid min-h-48 place-items-center bg-[linear-gradient(135deg,#f8fafc,#eef4ff)] p-8 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">{form.siteTitle}</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Nội dung trang của hệ thống</h3>
          <p className="mt-2 text-sm text-slate-500">Bản xem trước giúp kiểm tra tỷ lệ logo, màu nền và khả năng đọc.</p>
        </div>
      </div>
    </div>
  );
}

function PreviewImage({ src, fallback, className }: { src: string; fallback: string; className: string }) {
  return src ? (
    <img alt={fallback} className={`${className} rounded-lg object-contain`} src={resolveBrandAsset(src)} />
  ) : (
    <span className={`${className} grid place-items-center rounded-lg border border-dashed border-slate-300 bg-white/80 text-[10px] font-semibold text-slate-500`}>{fallback}</span>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <Input className="h-11 rounded-xl" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-2 text-sm font-semibold text-blue-900">{title}</legend>
      {children}
    </fieldset>
  );
}

function HomeRichTextEditor({ label, value, onChange, compact = false }: { label: string; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <div className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <RichTextEditor
        height={compact ? 220 : 300}
        value={value}
        onChange={onChange}
        onUploadImage={async (file) => {
          const media = await uploadAdminMedia(file, "image");
          return media.url;
        }}
      />
    </div>
  );
}

function HomeContentPreview({ content }: { content: HomeContent }) {
  const cards = [
    { title: content.overviewTitle, html: content.overviewBodyHtml },
    { title: content.objectivesTitle, html: content.objectivesBodyHtml },
    { title: content.tasksTitle, html: content.tasksBodyHtml },
    { title: content.outcomesTitle, html: content.outcomesBodyHtml },
  ];
  return (
    <div className="rounded-2xl bg-blue-50 p-4">
      <div className="mb-4 rounded-xl bg-gradient-to-r from-blue-700 to-sky-400 p-4 text-white">
        <h3 className="text-xl font-bold">{content.welcomeTitle}</h3>
        {content.welcomeBodyHtml ? <div className="official-home-rich-content mt-2 text-sm text-blue-50" dangerouslySetInnerHTML={{ __html: content.welcomeBodyHtml }} /> : <p className="mt-2 text-sm text-blue-50">Mô tả khóa học sẽ hiển thị tại đây.</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4" key={card.title}>
            <h4 className="border-b border-slate-100 pb-2 font-semibold text-blue-900">{card.title}</h4>
            <div className="official-home-rich-content mt-3 text-xs leading-5 text-slate-600" dangerouslySetInnerHTML={{ __html: card.html || "<p>Chưa nhập nội dung.</p>" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetField({
  label,
  settingKey,
  value,
  uploadingKey,
  onChange,
  onUpload,
  wide = false,
}: {
  label: string;
  settingKey: SettingKey;
  value: string;
  uploadingKey: SettingKey | null;
  onChange: (key: SettingKey, value: string) => void;
  onUpload: (key: SettingKey, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  wide?: boolean;
}) {
  const isUploading = uploadingKey === settingKey;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <PreviewImage src={value} fallback="Ảnh" className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{value || "Chưa chọn tệp"}</p>
        </div>
        <Button className="relative shrink-0 gap-2" disabled={isUploading} size="sm" type="button" variant="outline">
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
          Chọn ảnh
          <input accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" disabled={isUploading} type="file" onChange={(event) => void onUpload(settingKey, event)} />
        </Button>
      </div>
      <Input className="h-9 rounded-xl bg-white text-xs" placeholder="Hoặc nhập URL ảnh" value={value} onChange={(event) => onChange(settingKey, event.target.value)} />
    </div>
  );
}

