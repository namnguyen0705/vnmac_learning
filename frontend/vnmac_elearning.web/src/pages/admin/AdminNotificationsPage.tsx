import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Megaphone, Plus, RefreshCw, Search, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createAdminNotification,
  getAdminNotifications,
  getAdminUserAccounts,
} from "@/shared/api/admin";
import { formatDateTime } from "@/shared/lib/format";
import {
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminPagination,
  AdminSection,
} from "@/shared/ui/admin-kit";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import type {
  CreateAdminNotificationRequest,
  NotificationAudience,
  NotificationType,
} from "@/shared/types/api";

const pageSize = 20;

const audienceLabels: Record<NotificationAudience, string> = {
  Learner: "Học viên",
  Admin: "Quản trị",
};

const typeLabels: Record<NotificationType, string> = {
  LearnerRegistered: "Học viên đăng ký",
  CourseEnrolled: "Đăng ký chủ đề",
  CourseCompleted: "Hoàn thành chủ đề",
  SystemAnnouncement: "Thông báo hệ thống",
  LearningReminder: "Nhắc học tập",
};

const notificationTypes: NotificationType[] = [
  "SystemAnnouncement",
  "LearningReminder",
  "LearnerRegistered",
  "CourseEnrolled",
  "CourseCompleted",
];

function emptyForm(): CreateAdminNotificationRequest {
  return {
    audience: "Learner",
    type: "SystemAnnouncement",
    title: "",
    message: "",
    linkUrl: "",
    recipientUserIds: [],
  };
}

export function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("all");
  const [type, setType] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateAdminNotificationRequest>(emptyForm);
  const [useSpecificLearners, setUseSpecificLearners] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["admin", "notifications", { search, audience, type, unreadOnly, page }],
    queryFn: () => getAdminNotifications({ search, audience, type, unreadOnly, page, pageSize }),
  });

  const learnersQuery = useQuery({
    queryKey: ["admin", "user-accounts", { role: "Learner", source: "notifications" }],
    queryFn: () => getAdminUserAccounts({ role: "Learner" }),
    enabled: isCreateOpen,
  });

  const createMutation = useMutation({
    mutationFn: createAdminNotification,
    onSuccess: async () => {
      setIsCreateOpen(false);
      setForm(emptyForm());
      setUseSpecificLearners(false);
      await queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "me"] });
    },
  });

  const learners = learnersQuery.data ?? [];
  const selectedLearners = useMemo(
    () => new Set(form.recipientUserIds),
    [form.recipientUserIds],
  );

  function resetFilters() {
    setSearch("");
    setAudience("all");
    setType("all");
    setUnreadOnly(false);
    setPage(1);
  }

  function toggleLearner(userId: string) {
    setForm((current) => {
      const next = new Set(current.recipientUserIds);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }

      return { ...current, recipientUserIds: Array.from(next) };
    });
  }

  function submitNotification() {
    createMutation.mutate({
      ...form,
      recipientUserIds: form.audience === "Learner" && useSpecificLearners ? form.recipientUserIds : [],
    });
  }

  const data = notificationsQuery.data;

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        actions={
          <>
            <Button className="gap-2" type="button" variant="outline" onClick={() => notificationsQuery.refetch()}>
              <RefreshCw className="size-4" />
              Làm mới
            </Button>
            <Button className="gap-2" type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" />
              Tạo thông báo
            </Button>
          </>
        }
        breadcrumbs={["Trang chủ", "Quản lý nội dung", "Quản lý thông báo"]}
        title="Quản lý thông báo"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard icon={<Bell className="size-5" />} label="Tổng thông báo" value={(data?.totalItems ?? 0).toString()} />
        <AdminMetricCard accent="amber" icon={<CheckCheck className="size-5" />} label="Chưa đọc" value={(data?.unreadCount ?? 0).toString()} />
        <AdminMetricCard accent="green" icon={<Users className="size-5" />} label="Gửi học viên" value={(data?.learnerAudienceCount ?? 0).toString()} />
        <AdminMetricCard accent="violet" icon={<Megaphone className="size-5" />} label="Gửi quản trị" value={(data?.adminAudienceCount ?? 0).toString()} />
      </section>

      <AdminSection title="Bộ lọc thông báo">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_220px_160px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tiêu đề, nội dung, người tạo..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <Select
            value={audience}
            onValueChange={(value) => {
              setAudience(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Đối tượng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả đối tượng</SelectItem>
              <SelectItem value="Learner">Học viên</SelectItem>
              <SelectItem value="Admin">Quản trị</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Loại thông báo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {notificationTypes.map((item) => (
                <SelectItem key={item} value={item}>
                  {typeLabels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <input
              checked={unreadOnly}
              className="size-4"
              type="checkbox"
              onChange={(event) => {
                setUnreadOnly(event.target.checked);
                setPage(1);
              }}
            />
            Chưa đọc
          </label>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Xóa lọc
          </Button>
        </div>
      </AdminSection>

      <AdminSection
        title="Danh sách thông báo"
        action={<span className="text-sm text-slate-500">{data?.totalItems ?? 0} bản ghi</span>}
      >
        {notificationsQuery.isLoading ? <LoadingBlock label="Đang tải thông báo..." /> : null}
        {notificationsQuery.isError ? <MessageBanner tone="error">Không tải được danh sách thông báo.</MessageBanner> : null}
        {data ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Liên kết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-[150px]">{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell className="min-w-[320px]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{item.title}</p>
                          <Badge variant="outline">{typeLabels[item.type]}</Badge>
                        </div>
                        <p className="line-clamp-2 text-sm text-slate-600">{item.message}</p>
                        {item.actorName ? <p className="text-xs text-slate-400">Tạo bởi {item.actorName}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.audience === "Learner" ? "success" : "secondary"}>
                        {audienceLabels[item.audience]}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      {item.audience === "Admin" ? "Nhóm quản trị" : item.recipientName || item.recipientUserId || "Học viên"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isRead ? "outline" : "warning"}>{item.isRead ? "Đã đọc" : "Chưa đọc"}</Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px] text-sm text-blue-700">{item.linkUrl || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Chưa có thông báo phù hợp với bộ lọc.
              </div>
            ) : null}
            <AdminPagination page={data.page} pageSize={data.pageSize} totalItems={data.totalItems} onPageChange={setPage} />
          </>
        ) : null}
      </AdminSection>

      <AdminModal
        open={isCreateOpen}
        title="Tạo thông báo mới"
        description="Thông báo gửi tới nhóm quản trị hoặc học viên. Nếu không chọn học viên cụ thể, hệ thống sẽ gửi cho toàn bộ học viên."
        onClose={() => {
          setIsCreateOpen(false);
          setForm(emptyForm());
          setUseSpecificLearners(false);
        }}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              className="gap-2"
              disabled={createMutation.isPending || !form.title.trim() || !form.message.trim()}
              type="button"
              onClick={submitNotification}
            >
              <Send className="size-4" />
              Gửi thông báo
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          {createMutation.isError ? <MessageBanner tone="error">Không gửi được thông báo. Vui lòng kiểm tra lại nội dung.</MessageBanner> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Đối tượng
              <Select
                value={form.audience}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, audience: value as NotificationAudience, recipientUserIds: [] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Learner">Học viên</SelectItem>
                  <SelectItem value="Admin">Nhóm quản trị</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Loại thông báo
              <Select
                value={form.type}
                onValueChange={(value) => setForm((current) => ({ ...current, type: value as NotificationType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SystemAnnouncement">Thông báo hệ thống</SelectItem>
                  <SelectItem value="LearningReminder">Nhắc học tập</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tiêu đề
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Nội dung
            <textarea
              className="min-h-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-emerald-600/25"
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Liên kết khi bấm thông báo
            <Input
              placeholder={form.audience === "Learner" ? "/app/dashboard" : "/admin/system-logs"}
              value={form.linkUrl}
              onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))}
            />
          </label>

          {form.audience === "Learner" ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  checked={useSpecificLearners}
                  className="size-4"
                  type="checkbox"
                  onChange={(event) => {
                    setUseSpecificLearners(event.target.checked);
                    if (!event.target.checked) {
                      setForm((current) => ({ ...current, recipientUserIds: [] }));
                    }
                  }}
                />
                Chọn học viên cụ thể
              </label>
              {useSpecificLearners ? (
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl bg-white p-2">
                  {learnersQuery.isLoading ? <p className="p-3 text-sm text-slate-500">Đang tải học viên...</p> : null}
                  {learners.map((learner) => (
                    <label
                      className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                      key={learner.userId}
                    >
                      <input
                        checked={selectedLearners.has(learner.userId)}
                        className="mt-1 size-4"
                        type="checkbox"
                        onChange={() => toggleLearner(learner.userId)}
                      />
                      <span>
                        <strong className="block text-slate-950">{learner.fullName}</strong>
                        <span className="text-xs text-slate-500">
                          {learner.username} - {learner.province || "Chưa có địa bàn"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Thông báo sẽ được gửi cho toàn bộ học viên hiện có.</p>
              )}
            </div>
          ) : null}
        </div>
      </AdminModal>
    </div>
  );
}
