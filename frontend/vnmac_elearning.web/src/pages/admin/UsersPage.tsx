import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminCourseThumb,
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminPagination,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { assignUserRole, createAdminUser, getAdminUserAccounts, getRoles, updateAdminUser } from "../../shared/api/admin";
import type {
  AdminUserRow,
  CourseEnrollmentStatus,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from "../../shared/types/api";
import { ApiError } from "../../shared/api/client";
import { getProvinceOptions } from "../../shared/api/auth";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  CircleAlert,
  Clock3,
  Eye,
  Lock,
  MailCheck,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  Unlock,
  UserCheck,
  Users,
} from "lucide-react";

type LearnerFilter = "all" | "new" | "inactive" | "locked" | "certified";

const pageSize = 10;

const emptyCreateForm: CreateAdminUserRequest = {
  username: "",
  password: "",
  email: "",
  fullName: "",
  phoneNumber: "",
  role: "Learner",
  province: "",
  group: "",
  markEmailAsVerified: true,
  isLocked: false,
};

const filterLabels: Record<LearnerFilter, string> = {
  all: "Tất cả người dùng",
  new: "Mới đăng ký",
  inactive: "Chưa kích hoạt",
  locked: "Bị khóa",
  certified: "Có chứng chỉ",
};

const enrollmentLabels: Record<CourseEnrollmentStatus, string> = {
  Enrolled: "Đã đăng ký",
  InProgress: "Đang học",
  Completed: "Hoàn thành",
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

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} giờ ${remainingMinutes} phút` : `${hours} giờ`;
}

function isNewLearner(user: AdminUserRow) {
  const createdAt = new Date(user.createdAt).getTime();
  if (Number.isNaN(createdAt)) {
    return false;
  }

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt <= sevenDays;
}

function buildUpdatePayload(user: AdminUserRow, overrides: Partial<UpdateAdminUserRequest> = {}): UpdateAdminUserRequest {
  return {
    username: user.username,
    password: null,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
    roleId: user.roleId,
    province: user.province,
    group: user.group,
    isEmailVerified: user.isEmailVerified,
    isLocked: user.isLocked,
    ...overrides,
  };
}

function learnerStatus(user: AdminUserRow) {
  if (user.isLocked) {
    return "Bị khóa";
  }

  if (!user.isEmailVerified) {
    return "Chưa kích hoạt";
  }

  return "Đang hoạt động";
}

function matchesKeyword(user: AdminUserRow, keyword: string) {
  if (!keyword) {
    return true;
  }

  const value = keyword.toLowerCase();
  return (
    user.fullName.toLowerCase().includes(value) ||
    user.username.toLowerCase().includes(value) ||
    user.email.toLowerCase().includes(value) ||
    user.phoneNumber.toLowerCase().includes(value) ||
    user.province.toLowerCase().includes(value) ||
    user.group.toLowerCase().includes(value) ||
    user.enrollments.some((item) => item.courseTitle.toLowerCase().includes(value))
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("all");
  const [group, setGroup] = useState("all");
  const provinceCatalogQuery = useQuery({
    queryKey: ["public", "provinces"],
    queryFn: getProvinceOptions,
  });
  const [filter, setFilter] = useState<LearnerFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedLearner, setSelectedLearner] = useState<AdminUserRow | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState<UpdateAdminUserRequest | null>(null);
  const [resetUser, setResetUser] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminUserRequest>(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: getRoles,
  });

  const learnersQuery = useQuery({
    queryKey: ["admin", "user-accounts", { province, group }],
    queryFn: () =>
      getAdminUserAccounts({
        province: province !== "all" ? province : undefined,
        group: group !== "all" ? group : undefined,
      }),
  });

  const lockMutation = useMutation({
    mutationFn: ({ learner, isLocked }: { learner: AdminUserRow; isLocked: boolean }) =>
      updateAdminUser(learner.userId, buildUpdatePayload(learner, { isLocked })),
    onSuccess: async (updatedLearner) => {
      setSelectedLearner((current) => (current?.userId === updatedLearner.userId ? updatedLearner : current));
      await queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateAdminUserRequest }) =>
      updateAdminUser(userId, payload),
    onSuccess: async (updatedUser) => {
      setSelectedLearner((current) => (current?.userId === updatedUser.userId ? updatedUser : current));
      setEditingUser(null);
      setEditForm(null);
      setUpdateError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["public", "provinces"] });
    },
    onError: (cause) => {
      setUpdateError(cause instanceof ApiError ? cause.message : "Không thể cập nhật tài khoản.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ user, password }: { user: AdminUserRow; password: string }) =>
      updateAdminUser(user.userId, buildUpdatePayload(user, { password })),
    onSuccess: async (updatedUser) => {
      setSelectedLearner((current) => (current?.userId === updatedUser.userId ? updatedUser : current));
      setResetUser(null);
      setNewPassword("");
      setUpdateError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] });
    },
    onError: (cause) => {
      setUpdateError(cause instanceof ApiError ? cause.message : "Không thể đặt lại mật khẩu.");
    },
  });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCreateForm(emptyCreateForm);
      setCreateError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] });
    },
    onError: (cause) => {
      setCreateError(cause instanceof ApiError ? cause.message : "Không thể tạo người dùng.");
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => assignUserRole(userId, roleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });

  const learners = learnersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];

  const provinceOptions = useMemo(
    () => provinceCatalogQuery.data ?? [],
    [provinceCatalogQuery.data],
  );
  const groupOptions = useMemo(
    () => Array.from(new Set(learners.map((item) => item.group).filter(Boolean))).sort(),
    [learners],
  );

  const stats = useMemo(() => {
    const inactive = learners.filter((item) => !item.isEmailVerified);
    const newInactive = inactive.filter(isNewLearner);

    return {
      total: learners.length,
      newInactive: newInactive.length,
      inactive: inactive.length,
      locked: learners.filter((item) => item.isLocked).length,
      certified: learners.filter((item) => item.certificateCount > 0).length,
    };
  }, [learners]);

  const filteredLearners = useMemo(() => {
    const keyword = search.trim();
    return learners.filter((item) => {
      if (selectedRoleId !== "all" && item.roleId !== selectedRoleId) {
        return false;
      }

      if (!matchesKeyword(item, keyword)) {
        return false;
      }

      if (filter === "new") {
        return isNewLearner(item) && !item.isEmailVerified;
      }

      if (filter === "inactive") {
        return !item.isEmailVerified;
      }

      if (filter === "locked") {
        return item.isLocked;
      }

      if (filter === "certified") {
        return item.certificateCount > 0;
      }

      return true;
    });
  }, [filter, learners, search, selectedRoleId]);

  const totalPages = Math.max(1, Math.ceil(filteredLearners.length / pageSize));
  const pagedLearners = filteredLearners.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, group, province, search, selectedRoleId]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function toggleLock(learner: AdminUserRow) {
    lockMutation.mutate({ learner, isLocked: !learner.isLocked });
  }

  function openEdit(user: AdminUserRow) {
    setEditingUser(user);
    setEditForm(buildUpdatePayload(user));
    setUpdateError(null);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Quản trị", "Người dùng"]}
        title="Quản lý người dùng"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            Tạo người dùng
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard icon={<Users className="size-5" />} label="Tổng người dùng" value={stats.total.toString()} />
        <AdminMetricCard
          accent="amber"
          icon={<CircleAlert className="size-5" />}
          label="Mới chưa kích hoạt"
          value={stats.newInactive.toString()}
        />
        <AdminMetricCard
          accent="violet"
          icon={<MailCheck className="size-5" />}
          label="Chưa kích hoạt"
          value={stats.inactive.toString()}
        />
        <AdminMetricCard
          accent="amber"
          icon={<ShieldOff className="size-5" />}
          label="Bị khóa"
          value={stats.locked.toString()}
        />
        <AdminMetricCard
          accent="green"
          icon={<Award className="size-5" />}
          label="Có chứng chỉ"
          value={stats.certified.toString()}
        />
      </div>

      <AdminSection
        title="Danh sách người dùng"
        action={
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {filteredLearners.length} người dùng
          </Badge>
        }
        contentClassName="space-y-4"
      >
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          <Button
            size="sm"
            type="button"
            variant={selectedRoleId === "all" ? "default" : "outline"}
            onClick={() => setSelectedRoleId("all")}
          >
            Tất cả <Badge className="ml-1" variant="outline">{learners.length}</Badge>
          </Button>
          {roles.map((role) => (
            <Button
              key={role.id}
              size="sm"
              type="button"
              variant={selectedRoleId === role.id ? "default" : "outline"}
              onClick={() => setSelectedRoleId(role.id)}
            >
              {role.name} <Badge className="ml-1" variant="outline">{role.userCount}</Badge>
            </Button>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-2xl pl-9"
              placeholder="Tìm theo tên, tài khoản, email, số điện thoại, chủ đề..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Select value={filter} onValueChange={(value) => setFilter(value as LearnerFilter)}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(filterLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Tỉnh/Thành phố" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả địa bàn</SelectItem>
              {provinceOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Nhóm học viên" />
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
        </div>

        {learnersQuery.isLoading || rolesQuery.isLoading ? <LoadingBlock label="Đang tải danh sách người dùng..." /> : null}

        {learnersQuery.isError || rolesQuery.isError ? (
          <MessageBanner tone="error">
            Không tải được người dùng. Vui lòng thử lại hoặc kiểm tra API quản trị.
          </MessageBanner>
        ) : null}

        {!learnersQuery.isLoading && !rolesQuery.isLoading && !learnersQuery.isError && !rolesQuery.isError ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Địa bàn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Chứng chỉ</TableHead>
                  <TableHead>Lần đăng nhập gần nhất</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLearners.map((learner) => (
                  <TableRow key={learner.userId} className="align-top">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-full bg-blue-50 font-semibold text-blue-700">
                          {learner.fullName
                            .split(" ")
                            .filter(Boolean)
                            .slice(-2)
                            .map((item) => item[0])
                            .join("")
                            .toUpperCase() || "HV"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{learner.fullName}</p>
                          <p className="text-xs text-slate-500">@{learner.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-900">{learner.phoneNumber}</p>
                        <p className="text-xs text-slate-500">{learner.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-slate-900">{learner.province || "Chưa có"}</p>
                        <p className="text-xs text-slate-500">{learner.group || "Chưa phân nhóm"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <AdminStatusBadge status={learnerStatus(learner)} />
                        {isNewLearner(learner) ? <Badge variant="outline">Mới đăng ký</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-52">
                      <Select
                        value={learner.roleId}
                        disabled={roleMutation.isPending}
                        onValueChange={(roleId) => roleMutation.mutate({ userId: learner.userId, roleId })}
                      >
                        <SelectTrigger className="h-9 rounded-xl">
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {learner.role === "Learner" ? <div className="min-w-36 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{learner.enrollments.length} chủ đề</span>
                          <span className="font-semibold text-slate-900">{learner.completionPercent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${Math.min(100, Math.max(0, learner.completionPercent))}%` }}
                          />
                        </div>
                      </div> : <span className="text-sm text-slate-400">Không áp dụng</span>}
                    </TableCell>
                    <TableCell>
                      {learner.role === "Learner" ? <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Award className="size-4 text-emerald-600" />
                        {learner.certificateCount}
                      </div> : <span className="text-sm text-slate-400">Không áp dụng</span>}
                    </TableCell>
                    <TableCell>{formatDateTime(learner.lastLogin)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          className="h-9 rounded-2xl"
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedLearner(learner)}
                        >
                          <Eye className="mr-2 size-4" />
                          Chi tiết
                        </Button>
                        <Button
                          className="h-9 rounded-2xl"
                          disabled={lockMutation.isPending}
                          size="sm"
                          type="button"
                          variant={learner.isLocked ? "outline" : "destructive"}
                          onClick={() => toggleLock(learner)}
                        >
                          {learner.isLocked ? <Unlock className="mr-2 size-4" /> : <Lock className="mr-2 size-4" />}
                          {learner.isLocked ? "Mở khóa" : "Khóa"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {pagedLearners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="py-10 text-center text-sm text-slate-500">
                        Không có người dùng phù hợp với bộ lọc hiện tại.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              totalItems={filteredLearners.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </AdminSection>

      <AdminModal
        open={isCreateOpen}
        title="Tạo tài khoản học viên"
        description="Quản trị viên có thể tạo và kích hoạt tài khoản để bàn giao trực tiếp cho học viên."
        onClose={() => {
          if (!createMutation.isPending) {
            setIsCreateOpen(false);
            setCreateError(null);
          }
        }}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => {
                setCreateError(null);
                createMutation.mutate({
                  ...createForm,
                  username: createForm.username.trim(),
                  email: createForm.email.trim(),
                  fullName: createForm.fullName.trim(),
                  phoneNumber: createForm.phoneNumber.trim(),
                  province: createForm.province.trim(),
                  group: createForm.group.trim(),
                });
              }}
            >
              {createMutation.isPending ? "Đang tạo..." : "Tạo tài khoản"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError ? <MessageBanner tone="error">{createError}</MessageBanner> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <CreateField label="Họ và tên" value={createForm.fullName} onChange={(value) => setCreateForm((current) => ({ ...current, fullName: value }))} />
            <CreateField label="Email" type="email" value={createForm.email} onChange={(value) => setCreateForm((current) => ({ ...current, email: value }))} />
            <CreateField label="Số điện thoại" value={createForm.phoneNumber} onChange={(value) => setCreateForm((current) => ({ ...current, phoneNumber: value }))} />
            <CreateField label="Tên đăng nhập" value={createForm.username} onChange={(value) => setCreateForm((current) => ({ ...current, username: value }))} />
            <CreateField label="Mật khẩu ban đầu" type="password" value={createForm.password} onChange={(value) => setCreateForm((current) => ({ ...current, password: value }))} />
            <CreateSelectField
              label="Tỉnh/Thành phố"
              options={provinceCatalogQuery.data ?? []}
              value={createForm.province}
              onChange={(value) => setCreateForm((current) => ({ ...current, province: value }))}
            />
            <CreateField label="Đối tượng" value={createForm.group} onChange={(value) => setCreateForm((current) => ({ ...current, group: value }))} />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              className="mt-1 size-4"
              type="checkbox"
              checked={createForm.markEmailAsVerified}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, markEmailAsVerified: event.target.checked }))
              }
            />
            <span>
              <span className="block font-medium text-slate-950">Kích hoạt tài khoản ngay</span>
              <span className="mt-1 block text-sm text-slate-500">
                Tài khoản do quản trị viên bàn giao có thể đăng nhập ngay mà không cần xác nhận email.
              </span>
            </span>
          </label>
        </div>
      </AdminModal>

      <AdminModal
        className="max-w-6xl"
        open={Boolean(selectedLearner)}
        title={selectedLearner ? `Chi tiết học viên: ${selectedLearner.fullName}` : "Chi tiết học viên"}
        description="Thông tin tài khoản, chủ đề đã đăng ký, tiến độ học tập và chứng chỉ đã cấp."
        actions={
          selectedLearner ? (
            <>
              <Button type="button" variant="outline" onClick={() => openEdit(selectedLearner)}>
                <Pencil className="mr-2 size-4" /> Chỉnh sửa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetUser(selectedLearner);
                  setNewPassword("");
                  setUpdateError(null);
                }}
              >
                <KeyRound className="mr-2 size-4" /> Reset mật khẩu
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelectedLearner(null)}>
                Đóng
              </Button>
              <Button
                disabled={lockMutation.isPending}
                type="button"
                variant={selectedLearner.isLocked ? "outline" : "destructive"}
                onClick={() => toggleLock(selectedLearner)}
              >
                {selectedLearner.isLocked ? <Unlock className="mr-2 size-4" /> : <Lock className="mr-2 size-4" />}
                {selectedLearner.isLocked ? "Mở khóa học viên" : "Khóa học viên"}
              </Button>
            </>
          ) : null
        }
        onClose={() => setSelectedLearner(null)}
      >
        {selectedLearner ? <LearnerDetail learner={selectedLearner} /> : null}
      </AdminModal>

      <AdminModal
        className="max-w-3xl"
        open={Boolean(editingUser && editForm)}
        title={editingUser ? `Chỉnh sửa tài khoản: ${editingUser.fullName}` : "Chỉnh sửa tài khoản"}
        description="Cập nhật thông tin đăng nhập, liên hệ, địa bàn, đối tượng và trạng thái tài khoản."
        onClose={() => {
          setEditingUser(null);
          setEditForm(null);
          setUpdateError(null);
        }}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => { setEditingUser(null); setEditForm(null); }}>
              Hủy
            </Button>
            <Button
              disabled={!editingUser || !editForm || updateMutation.isPending}
              type="button"
              onClick={() => {
                if (editingUser && editForm) {
                  updateMutation.mutate({ userId: editingUser.userId, payload: { ...editForm, password: null } });
                }
              }}
            >
              {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </>
        }
      >
        {editForm ? (
          <div className="space-y-4">
            {updateError ? <MessageBanner tone="error">{updateError}</MessageBanner> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <CreateField label="Họ và tên" value={editForm.fullName} onChange={(value) => setEditForm((current) => current ? ({ ...current, fullName: value }) : current)} />
              <CreateField label="Tên đăng nhập" value={editForm.username} onChange={(value) => setEditForm((current) => current ? ({ ...current, username: value }) : current)} />
              <CreateField label="Email" type="email" value={editForm.email} onChange={(value) => setEditForm((current) => current ? ({ ...current, email: value }) : current)} />
              <CreateField label="Số điện thoại" value={editForm.phoneNumber} onChange={(value) => setEditForm((current) => current ? ({ ...current, phoneNumber: value }) : current)} />
              <CreateSelectField label="Tỉnh/Thành phố" options={provinceCatalogQuery.data ?? []} value={editForm.province} onChange={(value) => setEditForm((current) => current ? ({ ...current, province: value }) : current)} />
              <CreateField label="Đối tượng" value={editForm.group} onChange={(value) => setEditForm((current) => current ? ({ ...current, group: value }) : current)} />
              <CreateSelectField
                label="Vai trò"
                options={roles.map((role) => role.id)}
                optionLabels={Object.fromEntries(roles.map((role) => [role.id, role.name]))}
                value={editForm.roleId ?? ""}
                onChange={(roleId) => {
                  const role = roles.find((item) => item.id === roleId);
                  setEditForm((current) => current ? ({
                    ...current,
                    roleId,
                    role: role?.code === "learner" ? "Learner" : current.role,
                  }) : current);
                }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={editForm.isEmailVerified} onChange={(event) => setEditForm((current) => current ? ({ ...current, isEmailVerified: event.target.checked }) : current)} />
                Email đã xác nhận
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={editForm.isLocked} onChange={(event) => setEditForm((current) => current ? ({ ...current, isLocked: event.target.checked }) : current)} />
                Khóa tài khoản
              </label>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        className="max-w-lg"
        open={Boolean(resetUser)}
        title="Đặt lại mật khẩu"
        description={resetUser ? `Tạo mật khẩu mới cho ${resetUser.fullName} (@${resetUser.username}).` : undefined}
        onClose={() => { setResetUser(null); setNewPassword(""); setUpdateError(null); }}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => { setResetUser(null); setNewPassword(""); }}>Hủy</Button>
            <Button
              disabled={!resetUser || newPassword.trim().length < 8 || resetPasswordMutation.isPending}
              type="button"
              onClick={() => resetUser && resetPasswordMutation.mutate({ user: resetUser, password: newPassword.trim() })}
            >
              {resetPasswordMutation.isPending ? "Đang đặt lại..." : "Xác nhận reset"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {updateError ? <MessageBanner tone="error">{updateError}</MessageBanner> : null}
          <CreateField label="Mật khẩu mới (tối thiểu 8 ký tự)" type="password" value={newPassword} onChange={setNewPassword} />
          <p className="text-sm text-slate-500">Mật khẩu cũ sẽ mất hiệu lực ngay sau khi xác nhận.</p>
        </div>
      </AdminModal>
    </div>
  );
}

function CreateField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <Input
        className="h-11 rounded-2xl"
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CreateSelectField({
  label,
  options,
  optionLabels,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  optionLabels?: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <Select required value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder={`Chọn ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{optionLabels?.[option] ?? option}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function LearnerDetail({ learner }: { learner: AdminUserRow }) {
  const issuedCertificates = learner.enrollments.filter((item) => item.certificateIssued);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-start gap-4">
            <div className="grid size-16 place-items-center rounded-3xl bg-blue-600 text-xl font-semibold text-white">
              {learner.fullName
                .split(" ")
                .filter(Boolean)
                .slice(-2)
                .map((item) => item[0])
                .join("")
                .toUpperCase() || "HV"}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-950">{learner.fullName}</h3>
              <p className="text-sm text-slate-500">@{learner.username}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <AdminStatusBadge status={learnerStatus(learner)} />
                {isNewLearner(learner) ? <Badge variant="outline">Mới đăng ký</Badge> : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <DetailLine label="Email" value={learner.email} />
            <DetailLine label="Số điện thoại" value={learner.phoneNumber} />
            <DetailLine label="Tỉnh/Thành phố" value={learner.province || "Chưa có"} />
            <DetailLine label="Nhóm học viên" value={learner.group || "Chưa phân nhóm"} />
            <DetailLine label="Ngày đăng ký" value={formatDateTime(learner.createdAt)} />
            <DetailLine label="Lần đăng nhập gần nhất" value={formatDateTime(learner.lastLogin)} />
            <DetailLine label="Xác thực email" value={learner.isEmailVerified ? "Đã kích hoạt" : "Chưa kích hoạt"} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryTile icon={<BookOpenCheck className="size-5" />} label="Chủ đề đã đăng ký" value={learner.enrollments.length} />
          <SummaryTile icon={<UserCheck className="size-5" />} label="Tiến độ trung bình" value={`${learner.completionPercent}%`} />
          <SummaryTile icon={<Award className="size-5" />} label="Chứng chỉ đã có" value={learner.certificateCount} />
          <SummaryTile icon={<Clock3 className="size-5" />} label="Thời gian học" value={formatMinutes(learner.studyTimeMinutes)} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-950">Chủ đề đã đăng ký</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {learner.enrollments.map((enrollment, index) => (
            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(260px,1fr)_360px]" key={enrollment.courseId}>
              <div className="flex gap-4">
                <AdminCourseThumb title={enrollment.courseTitle} index={index} className="h-16 w-16 rounded-3xl" />
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-950">{enrollment.courseTitle}</h4>
                    <AdminStatusBadge status={enrollmentLabels[enrollment.enrollmentStatus]} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {enrollment.nextLessonId ? <span>Bài tiếp theo: {enrollment.nextLessonId}</span> : null}
                    {enrollment.nextQuizId ? <span>Bài kiểm tra: {enrollment.nextQuizId}</span> : null}
                    {enrollment.certificateIssued ? <span>Chứng chỉ: {enrollment.certificateId}</span> : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <ProgressLine label="Nội dung" value={enrollment.contentCompletionPercent} color="bg-blue-600" />
                <ProgressLine label="Bài kiểm tra" value={enrollment.quizCompletionPercent} color="bg-emerald-600" />
                <ProgressLine label="Toàn chủ đề" value={enrollment.overallCompletionPercent} color="bg-amber-500" />
              </div>
            </div>
          ))}

          {learner.enrollments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Học viên chưa đăng ký chủ đề nào.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-950">Chứng chỉ đã cấp</h3>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {issuedCertificates.map((certificate) => (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4" key={certificate.certificateId}>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Award className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{certificate.courseTitle}</p>
                  <p className="mt-1 text-sm text-slate-600">Mã chứng chỉ: {certificate.certificateId}</p>
                </div>
              </div>
            </div>
          ))}

          {issuedCertificates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
              Học viên chưa có chứng chỉ nào.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 grid size-11 place-items-center rounded-full bg-blue-50 text-blue-700">{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ProgressLine({ label, value, color }: { label: string; value: number; color: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-950">{safeValue}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
