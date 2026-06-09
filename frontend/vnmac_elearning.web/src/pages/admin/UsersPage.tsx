import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminCourseThumb,
  AdminIconButton,
  AdminMetricCard,
  AdminModal,
  AdminPagination,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUserAccounts,
  getAnalytics,
  updateAdminUser,
} from "../../shared/api/admin";
import type {
  AdminUserRow,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  UserRole,
} from "../../shared/types/api";
import { ApiError } from "../../shared/api/client";
import { formatMinutes } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import {
  GraduationCap,
  MailCheck,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

type VerificationFilter = "all" | "verified" | "pending";
type AccountFormMode = "create" | "edit";

interface AccountFormState {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  province: string;
  group: string;
  isEmailVerified: boolean;
}

const defaultFormState: AccountFormState = {
  username: "",
  password: "",
  email: "",
  fullName: "",
  phoneNumber: "",
  role: "Learner",
  province: "",
  group: "",
  isEmailVerified: true,
};

const roleOptions: UserRole[] = ["Learner", "Admin", "ContentManager", "DataViewer"];

const roleLabels: Record<UserRole, string> = {
  Learner: "Học viên",
  Admin: "Quản trị viên",
  ContentManager: "Quản lý nội dung",
  DataViewer: "Xem báo cáo",
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildEditForm(user: AdminUserRow): AccountFormState {
  return {
    username: user.username,
    password: "",
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
    province: user.province,
    group: user.group,
    isEmailVerified: user.isEmailVerified,
  };
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [province, setProvince] = useState("all");
  const [group, setGroup] = useState("all");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [verification, setVerification] = useState<VerificationFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formMode, setFormMode] = useState<AccountFormMode>("create");
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<AccountFormState>(defaultFormState);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["admin", "user-accounts", { province, group, role }],
    queryFn: () =>
      getAdminUserAccounts({
        province: province !== "all" ? province : undefined,
        group: group !== "all" ? group : undefined,
        role: role !== "all" ? role : undefined,
      }),
  });

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", { province, group }],
    queryFn: () =>
      getAnalytics({
        province: province !== "all" ? province : undefined,
        group: group !== "all" ? group : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdminUserRequest) => createAdminUser(payload),
    onSuccess: async () => {
      setFormOpen(false);
      setFormState(defaultFormState);
      setMutationError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] }),
      ]);
    },
    onError: (cause) => {
      setMutationError(cause instanceof ApiError ? cause.message : "Không thể tạo tài khoản.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateAdminUserRequest }) =>
      updateAdminUser(userId, payload),
    onSuccess: async () => {
      setFormOpen(false);
      setEditingUser(null);
      setFormState(defaultFormState);
      setMutationError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] }),
      ]);
    },
    onError: (cause) => {
      setMutationError(cause instanceof ApiError ? cause.message : "Không thể cập nhật tài khoản.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] }),
      ]);
    },
  });

  const accounts = accountsQuery.data ?? [];
  const analytics = analyticsQuery.data;

  const provinceOptions = useMemo(
    () => Array.from(new Set(accounts.map((item) => item.province).filter(Boolean))).sort(),
    [accounts],
  );
  const groupOptions = useMemo(
    () => Array.from(new Set(accounts.map((item) => item.group).filter(Boolean))).sort(),
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return accounts.filter((item) => {
      if (verification === "verified" && !item.isEmailVerified) {
        return false;
      }

      if (verification === "pending" && item.isEmailVerified) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
        item.fullName.toLowerCase().includes(keyword) ||
        item.username.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.phoneNumber.toLowerCase().includes(keyword) ||
        roleLabels[item.role].toLowerCase().includes(keyword) ||
        item.enrollments.some((enrollment) => enrollment.courseTitle.toLowerCase().includes(keyword))
      );
    });
  }, [accounts, search, verification]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const pagedAccounts = filteredAccounts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [group, province, role, search, verification]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function openCreateModal() {
    setFormMode("create");
    setEditingUser(null);
    setFormState(defaultFormState);
    setMutationError(null);
    setFormOpen(true);
  }

  function openEditModal(user: AdminUserRow) {
    setFormMode("edit");
    setEditingUser(user);
    setFormState(buildEditForm(user));
    setMutationError(null);
    setFormOpen(true);
  }

  function updateFormField<K extends keyof AccountFormState>(field: K, value: AccountFormState[K]) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationError(null);

    if (formMode === "create") {
      await createMutation.mutateAsync({
        username: formState.username.trim(),
        password: formState.password,
        email: formState.email.trim(),
        fullName: formState.fullName.trim(),
        phoneNumber: formState.phoneNumber.trim(),
        role: formState.role,
        province: formState.province.trim(),
        group: formState.group.trim(),
        markEmailAsVerified: formState.isEmailVerified,
      });
      return;
    }

    if (!editingUser) {
      return;
    }

    await updateMutation.mutateAsync({
      userId: editingUser.userId,
      payload: {
        username: formState.username.trim(),
        password: formState.password.trim() || undefined,
        email: formState.email.trim(),
        fullName: formState.fullName.trim(),
        phoneNumber: formState.phoneNumber.trim(),
        role: formState.role,
        province: formState.province.trim(),
        group: formState.group.trim(),
        isEmailVerified: formState.isEmailVerified,
      },
    });
  }

  async function handleDelete(user: AdminUserRow) {
    const confirmed = window.confirm(`Xóa tài khoản ${user.fullName} (${user.username})?`);
    if (!confirmed) {
      return;
    }

    await deleteMutation.mutateAsync(user.userId);
  }

  if (accountsQuery.isLoading || analyticsQuery.isLoading) {
    return <LoadingBlock label="Đang tải dữ liệu người dùng..." />;
  }

  if (accountsQuery.isError || analyticsQuery.isError || !analytics) {
    return <MessageBanner tone="error">Không tải được dữ liệu người dùng.</MessageBanner>;
  }

  const verifiedCount = filteredAccounts.filter((item) => item.isEmailVerified).length;
  const learnerCount = filteredAccounts.filter((item) => item.role === "Learner").length;
  const internalCount = filteredAccounts.filter((item) => item.createdByAdmin).length;

  return (
    <div className="grid gap-6">
      <AdminSection title="Bộ lọc tài khoản">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,180px))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tên, username, email, số điện thoại..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
            <SelectTrigger>
              <SelectValue placeholder="Tất cả vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              {roleOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {roleLabels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger>
              <SelectValue placeholder="Tất cả tỉnh / thành" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tỉnh / thành</SelectItem>
              {provinceOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Tất cả nhóm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhóm</SelectItem>
              {groupOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={verification} onValueChange={(value) => setVerification(value as VerificationFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái email" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="verified">Đã xác thực</SelectItem>
              <SelectItem value="pending">Chưa xác thực</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminSection>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          accent="blue"
          icon={<Users className="size-8" />}
          label="Tổng tài khoản"
          value={filteredAccounts.length.toLocaleString("vi-VN")}
        />
        <AdminMetricCard
          accent="green"
          icon={<MailCheck className="size-8" />}
          label="Đã xác thực email"
          value={verifiedCount.toLocaleString("vi-VN")}
        />
        <AdminMetricCard
          accent="amber"
          icon={<GraduationCap className="size-8" />}
          label="Học viên"
          value={learnerCount.toLocaleString("vi-VN")}
        />
        <AdminMetricCard
          accent="violet"
          icon={<UserCog className="size-8" />}
          label="Tạo từ admin"
          value={internalCount.toLocaleString("vi-VN")}
        />
      </section>

      <AdminSection
        title="Danh sách tài khoản"
        action={
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{filteredAccounts.length} tài khoản</Badge>
            <Button type="button" onClick={openCreateModal}>
              <Plus className="size-4" />
              Tạo user
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Liên hệ</TableHead>
                <TableHead>Xác thực email</TableHead>
                <TableHead>Khóa học / tiến độ</TableHead>
                <TableHead>Đăng nhập gần nhất</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAccounts.map((account, index) => (
                <TableRow key={account.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AdminCourseThumb className="size-11 rounded-full text-sm" index={index} title={account.fullName} />
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{account.fullName}</p>
                        <p className="text-xs text-slate-500">@{account.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={account.role === "Learner" ? "secondary" : "outline"}>
                        {roleLabels[account.role]}
                      </Badge>
                      {account.createdByAdmin ? (
                        <p className="text-xs text-slate-500">Cấp từ admin</p>
                      ) : (
                        <p className="text-xs text-slate-500">Tự đăng ký</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>{account.email}</p>
                      <p>{account.phoneNumber}</p>
                      <p>{account.province}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <AdminStatusBadge status={account.isEmailVerified ? "Đã xác thực" : "Chờ xác thực"} />
                      <p className="text-xs text-slate-500">
                        {account.isEmailVerified
                          ? `Lúc ${formatDateTime(account.emailVerifiedAt)}`
                          : "Chưa hoàn tất xác thực email"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {account.role !== "Learner" ? (
                      <p className="text-sm text-slate-500">Không áp dụng cho tài khoản quản trị.</p>
                    ) : account.enrollments.length === 0 ? (
                      <p className="text-sm text-slate-500">Chưa đăng ký khóa học nào.</p>
                    ) : (
                      <div className="space-y-3">
                        {account.enrollments.map((enrollment) => (
                          <div className="border border-slate-200 p-3" key={`${account.userId}-${enrollment.courseId}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-slate-900">{enrollment.courseTitle}</p>
                              <Badge variant={enrollment.certificateIssued ? "success" : "outline"}>
                                {enrollment.certificateIssued ? "Đã có chứng chỉ" : enrollment.enrollmentStatus}
                              </Badge>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-slate-500">
                              <p>Nội dung: {enrollment.contentCompletionPercent}%</p>
                              <p>Quiz: {enrollment.quizCompletionPercent}%</p>
                              <p>
                                {enrollment.quizUnlocked
                                  ? "Quiz đã mở cho học viên"
                                  : "Quiz chỉ mở khi hoàn thành 100% nội dung"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>{formatDateTime(account.lastLogin)}</p>
                      {account.role === "Learner" ? <p>{formatMinutes(account.studyTimeMinutes)}</p> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AdminIconButton
                        icon={<ShieldCheck className="size-4" />}
                        label="Chi tiết"
                        variant="outline"
                        onClick={() => setDetailUser(account)}
                      />
                      <AdminIconButton
                        icon={<Pencil className="size-4" />}
                        label="Sửa"
                        variant="outline"
                        onClick={() => openEditModal(account)}
                      />
                      <AdminIconButton
                        icon={<Trash2 className="size-4" />}
                        label="Xóa"
                        variant="destructive"
                        onClick={() => void handleDelete(account)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminPagination page={page} pageSize={pageSize} totalItems={filteredAccounts.length} onPageChange={setPage} />
        </div>
      </AdminSection>

      <AdminSection title="Tóm tắt báo cáo học viên">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tỷ lệ hoàn thành</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.completionRatePercent}%</p>
          </div>
          <div className="border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tỷ lệ đạt quiz</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.passRatePercent}%</p>
          </div>
          <div className="border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Thời gian học trung bình</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {formatMinutes(analytics.averageStudyTimeMinutes)}
            </p>
          </div>
        </div>
      </AdminSection>

      <AdminModal
        open={formOpen}
        title={formMode === "create" ? "Tạo user nội bộ" : "Cập nhật tài khoản"}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
          setFormState(defaultFormState);
          setMutationError(null);
        }}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditingUser(null);
                setFormState(defaultFormState);
                setMutationError(null);
              }}
            >
              Hủy
            </Button>
            <Button
              form="admin-user-form"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {formMode === "create"
                ? createMutation.isPending
                  ? "Đang tạo..."
                  : "Tạo user"
                : updateMutation.isPending
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
            </Button>
          </>
        }
      >
        {mutationError ? <MessageBanner tone="error">{mutationError}</MessageBanner> : null}
        <form className="grid gap-4 md:grid-cols-2" id="admin-user-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="user-full-name">Họ và tên</Label>
            <Input
              id="user-full-name"
              value={formState.fullName}
              onChange={(event) => updateFormField("fullName", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-username">Username</Label>
            <Input
              id="user-username"
              value={formState.username}
              onChange={(event) => updateFormField("username", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={formState.email}
              onChange={(event) => updateFormField("email", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-phone">Số điện thoại</Label>
            <Input
              id="user-phone"
              value={formState.phoneNumber}
              onChange={(event) => updateFormField("phoneNumber", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">Vai trò</Label>
            <Select value={formState.role} onValueChange={(value) => updateFormField("role", value as UserRole)}>
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {roleLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-verified">Trạng thái email</Label>
            <Select
              value={formState.isEmailVerified ? "verified" : "pending"}
              onValueChange={(value) => updateFormField("isEmailVerified", value === "verified")}
            >
              <SelectTrigger id="user-verified">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Đã xác thực</SelectItem>
                <SelectItem value="pending">Chưa xác thực</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-province">Tỉnh / thành</Label>
            <Input
              id="user-province"
              value={formState.province}
              onChange={(event) => updateFormField("province", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-group">Nhóm đối tượng</Label>
            <Input
              id="user-group"
              value={formState.group}
              onChange={(event) => updateFormField("group", event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="user-password">
              {formMode === "create" ? "Password" : "Password mới (để trống nếu không đổi)"}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={formState.password}
              onChange={(event) => updateFormField("password", event.target.value)}
            />
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(detailUser)}
        title="Chi tiết tài khoản"
        onClose={() => setDetailUser(null)}
        actions={
          <Button type="button" variant="outline" onClick={() => setDetailUser(null)}>
            Đóng
          </Button>
        }
      >
        {detailUser ? (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Thông tin tài khoản</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p><span className="font-medium text-slate-900">Họ tên:</span> {detailUser.fullName}</p>
                  <p><span className="font-medium text-slate-900">Username:</span> {detailUser.username}</p>
                  <p><span className="font-medium text-slate-900">Email:</span> {detailUser.email}</p>
                  <p><span className="font-medium text-slate-900">Số điện thoại:</span> {detailUser.phoneNumber}</p>
                  <p><span className="font-medium text-slate-900">Vai trò:</span> {roleLabels[detailUser.role]}</p>
                </div>
              </div>

              <div className="border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Trạng thái</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p><span className="font-medium text-slate-900">Xác thực email:</span> {detailUser.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"}</p>
                  <p><span className="font-medium text-slate-900">Nguồn tạo:</span> {detailUser.createdByAdmin ? "Admin cấp nội bộ" : "Người dùng tự đăng ký"}</p>
                  <p><span className="font-medium text-slate-900">Tạo lúc:</span> {formatDateTime(detailUser.createdAt)}</p>
                  <p><span className="font-medium text-slate-900">Đăng nhập gần nhất:</span> {formatDateTime(detailUser.lastLogin)}</p>
                </div>
              </div>
            </div>

            {detailUser.role === "Learner" ? (
              <div className="border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Khóa học đã đăng ký</p>
                <div className="mt-4 grid gap-3">
                  {detailUser.enrollments.length === 0 ? (
                    <p className="text-sm text-slate-500">Học viên này chưa được gán khóa học nào.</p>
                  ) : (
                    detailUser.enrollments.map((enrollment) => (
                      <div className="border border-slate-200 p-3" key={`${detailUser.userId}-${enrollment.courseId}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{enrollment.courseTitle}</p>
                          <Badge variant={enrollment.certificateIssued ? "success" : "outline"}>
                            {enrollment.certificateIssued ? "Đã cấp chứng chỉ" : enrollment.enrollmentStatus}
                          </Badge>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-slate-500">
                          <p>Nội dung: {enrollment.contentCompletionPercent}%</p>
                          <p>Quiz: {enrollment.quizCompletionPercent}%</p>
                          <p>Tổng tiến độ: {enrollment.overallCompletionPercent}%</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
