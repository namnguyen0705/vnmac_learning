import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminSection } from "@/shared/ui/admin-kit";

interface AdminPlaceholderPageProps {
  title: string;
  subtitle: string;
  primaryActionLabel?: string;
}

export function AdminPlaceholderPage({
  title,
  subtitle,
  primaryActionLabel = "Tiếp tục cấu hình",
}: AdminPlaceholderPageProps) {
  return (
    <div className="grid gap-6">
      <AdminPageHeader
        actions={<Button className="rounded-2xl">{primaryActionLabel}</Button>}
        subtitle={subtitle}
        title={title}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <AdminSection
          subtitle="Màn hình này đã dùng chung admin shell và bộ component mới. Có thể mở rộng tiếp theo nghiệp vụ thực tế."
          title="Workspace đang được mở rộng"
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Khu vực này đã được đưa vào hệ thống admin mới để giữ giao diện nhất quán với các màn tổng quan, khóa học,
              bài học và học viên.
            </p>
            <p>
              Bước tiếp theo có thể là thêm CRUD chi tiết, dashboard tracking riêng, quy trình xác thực hoặc bộ lọc báo
              cáo nâng cao tùy theo ưu tiên tiếp theo của bạn.
            </p>
          </div>
        </AdminSection>

        <AdminSection subtitle="Các bước nên làm tiếp." title="Kế hoạch tiếp">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              1. Chốt nghiệp vụ chi tiết cho module này.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              2. Nối API/CRUD để thao tác dữ liệu thật.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              3. Hoàn thiện responsive và interaction.
            </div>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
