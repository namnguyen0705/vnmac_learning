import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminDonut,
  AdminMetricCard,
  AdminPageHeader,
  AdminProgressRow,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { getAnalytics } from "../../shared/api/admin";
import { formatMinutes } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import { BarChart3, Clock3, Download, Search, ShieldAlert, Users } from "lucide-react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)));
}

export function AnalyticsPage() {
  const [province, setProvince] = useState("");
  const [group, setGroup] = useState("");

  const query = useQuery({
    queryKey: ["admin", "analytics", { province, group }],
    queryFn: () => getAnalytics({ province: province || undefined, group: group || undefined }),
  });

  if (query.isLoading) {
    return <LoadingBlock label="Đang tải báo cáo phân tích..." />;
  }

  if (query.isError || !query.data) {
    return <MessageBanner tone="error">Không tải được dữ liệu phân tích.</MessageBanner>;
  }

  const data = query.data;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        actions={
          <Button className="rounded-2xl" variant="outline">
            <Download className="size-4" />
            Xuất báo cáo
          </Button>
        }
        subtitle="Tổng hợp tiến độ hoàn thành, tỷ lệ đạt, tỷ lệ bỏ bài và các điểm nghẽn học tập."
        title="Báo cáo và Phân tích"
      />

      <AdminSection title="Bộ lọc báo cáo">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-2xl border-slate-200 pl-10"
              placeholder="Lọc theo tỉnh..."
              value={province}
              onChange={(event) => setProvince(event.target.value)}
            />
          </div>
          <Input
            className="h-11 rounded-2xl border-slate-200"
            placeholder="Lọc theo nhóm đối tượng..."
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          />
          <Button className="h-11 rounded-2xl" variant="outline" onClick={() => {
            setProvince("");
            setGroup("");
          }}>
            Đặt lại
          </Button>
        </div>
      </AdminSection>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard accent="blue" delta="+12,5%" icon={<Users className="size-8" />} label="Tổng học viên" value={formatNumber(data.totalLearners)} />
        <AdminMetricCard accent="green" delta="+6,7%" icon={<BarChart3 className="size-8" />} label="Tỷ lệ hoàn thành" value={`${data.completionRatePercent.toFixed(1)}%`} />
        <AdminMetricCard accent="amber" delta="+5,2%" icon={<ShieldAlert className="size-8" />} label="Tỷ lệ pass" value={`${data.passRatePercent.toFixed(1)}%`} />
        <AdminMetricCard accent="violet" delta="+8,3%" icon={<Clock3 className="size-8" />} label="Thời gian học TB" value={formatMinutes(data.averageStudyTimeMinutes)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="grid gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection subtitle="Nhiều lỗi sai nhất trong bài kiểm tra và đánh giá." title="Top bài học khó">
              <div className="space-y-4">
                {data.topDifficultLessons.map((item, index) => (
                  <AdminProgressRow
                    colorClassName="bg-amber-500"
                    key={item.id}
                    label={`${index + 1}. ${item.title}`}
                    value={24 + index * 5.2}
                  />
                ))}
              </div>
            </AdminSection>

            <AdminSection subtitle="Học viên dừng lại nhiều nhất." title="Tỷ lệ bỏ bài">
              <div className="space-y-4">
                {data.dropOffLessons.map((item, index) => (
                  <AdminProgressRow
                    colorClassName={index % 2 === 0 ? "bg-rose-500" : "bg-cyan-500"}
                    key={item.id}
                    label={item.title}
                    value={12 + index * 6.4}
                  />
                ))}
              </div>
            </AdminSection>
          </div>

          <AdminSection subtitle="Tập học viên trong bộ lọc hiện tại." title="Chi tiết người học">
            <div className="overflow-hidden rounded-[28px] border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Tỉnh</TableHead>
                    <TableHead>Nhóm</TableHead>
                    <TableHead>Tiến độ</TableHead>
                    <TableHead>Kết quả</TableHead>
                    <TableHead>Điểm dừng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.learners.map((item) => (
                    <TableRow key={item.userId}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{item.fullName}</p>
                          <p className="text-xs text-slate-500">{item.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.province}</TableCell>
                      <TableCell>{item.group}</TableCell>
                      <TableCell>{item.completionPercent}%</TableCell>
                      <TableCell>
                        <AdminStatusBadge status={item.passed ? "Đạt" : "Chưa đạt"} />
                      </TableCell>
                      <TableCell>{item.stalledAtLessonId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AdminSection>
        </div>

        <div className="grid gap-6">
          <AdminSection subtitle="Đạt / chưa đạt trong quiz cuối." title="Tỷ lệ đạt">
            <AdminDonut label="Tỷ lệ đạt" sublabel="Tỷ lệ đạt trong bộ lọc hiện tại." value={data.passRatePercent} />
          </AdminSection>

          <AdminSection subtitle="Tóm tắt nhanh bộ lọc phân tích hiện tại." title="Ghi chú báo cáo">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                Tổng học viên trong bộ lọc: <span className="font-semibold text-slate-900">{formatNumber(data.totalLearners)}</span>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                Thời gian học trung bình: <span className="font-semibold text-slate-900">{formatMinutes(data.averageStudyTimeMinutes)}</span>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                Tỷ lệ hoàn thành: <span className="font-semibold text-slate-900">{data.completionRatePercent.toFixed(1)}%</span>
              </div>
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  );
}
