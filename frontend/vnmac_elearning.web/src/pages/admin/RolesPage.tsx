import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
} from "@/shared/api/admin";
import { AdminModal, AdminPageHeader } from "@/shared/ui/admin-kit";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import type { RolePermissionRequest, RoleResponse, UpsertRoleRequest } from "@/shared/types/api";

const resources = [
  ["overview", "Tổng quan"],
  ["courses", "Quản lý chủ đề"],
  ["lessons", "Quản lý bài học"],
  ["questions", "Quản lý câu hỏi"],
  ["quizzes", "Quản lý bài kiểm tra"],
  ["materials", "Quản lý tài liệu"],
  ["notifications", "Quản lý thông báo"],
  ["users", "Quản lý người dùng"],
  ["roles", "Quản lý vai trò"],
  ["tracking", "Thống kê học tập"],
  ["reports", "Báo cáo hệ thống"],
  ["settings", "Cài đặt chung"],
  ["system-logs", "Nhật ký hệ thống"],
] as const;

const emptyPermissions = (): RolePermissionRequest[] =>
  resources.map(([resource]) => ({
    resource,
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  }));

const emptyForm = (): UpsertRoleRequest => ({
  code: "",
  name: "",
  description: "",
  permissions: emptyPermissions(),
});

export function RolesPage() {
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<UpsertRoleRequest>(emptyForm());

  const rolesQuery = useQuery({ queryKey: ["admin", "roles"], queryFn: getRoles });

  const saveMutation = useMutation({
    mutationFn: () => (editingRole ? updateRole(editingRole.id, form) : createRole(form)),
    onSuccess: async () => {
      setIsFormOpen(false);
      setEditingRole(null);
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "roles"] }),
  });
  const roles = rolesQuery.data ?? [];

  if (rolesQuery.isLoading) {
    return <LoadingBlock label="Đang tải cấu hình vai trò..." />;
  }

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        breadcrumbs={["Trang chủ", "Quản lý người dùng", "Quản lý vai trò"]}
        title="Quản lý vai trò"
        actions={
          <Button
            onClick={() => {
              setEditingRole(null);
              setForm(emptyForm());
              setIsFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Thêm vai trò
          </Button>
        }
      />

      {rolesQuery.isError ? (
        <MessageBanner tone="error">Không tải được dữ liệu vai trò.</MessageBanner>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" key={role.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <ShieldCheck className="size-5" />
              </div>
              <Badge variant="outline">{role.userCount} tài khoản</Badge>
            </div>
            <h3 className="mt-4 font-semibold text-slate-950">{role.name}</h3>
            <p className="mt-1 min-h-10 text-sm text-slate-500">{role.description}</p>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingRole(role);
                  setForm({
                    code: role.code,
                    name: role.name,
                    description: role.description,
                    permissions: resources.map(([resource]) =>
                      role.permissions.find((item) => item.resource === resource) ?? {
                        resource,
                        canView: false,
                        canCreate: false,
                        canUpdate: false,
                        canDelete: false,
                      },
                    ),
                  });
                  setIsFormOpen(true);
                }}
              >
                <Edit3 className="size-4" /> Sửa
              </Button>
              {!role.isSystem ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={role.userCount > 0 || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(role.id)}
                >
                  <Trash2 className="size-4" /> Xóa
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <AdminModal
        open={isFormOpen}
        title={editingRole ? `Chỉnh sửa vai trò: ${editingRole.name}` : "Thêm vai trò"}
        description="Chọn quyền xem, thêm, sửa, xóa cho từng menu trong khu vực quản trị."
        onClose={() => setIsFormOpen(false)}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Hủy</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu vai trò"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {saveMutation.isError ? <MessageBanner tone="error">Không thể lưu vai trò.</MessageBanner> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">Tên vai trò<Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="grid gap-2 text-sm font-medium">Mã vai trò<Input disabled={editingRole?.isSystem} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} /></label>
          </div>
          <label className="grid gap-2 text-sm font-medium">Mô tả<Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader><TableRow><TableHead>Menu</TableHead><TableHead>Xem</TableHead><TableHead>Thêm</TableHead><TableHead>Sửa</TableHead><TableHead>Xóa</TableHead></TableRow></TableHeader>
              <TableBody>
                {resources.map(([resource, label], index) => {
                  const permission = form.permissions[index];
                  return (
                    <TableRow key={resource}>
                      <TableCell className="font-medium">{label}</TableCell>
                      {(["canView", "canCreate", "canUpdate", "canDelete"] as const).map((field) => (
                        <TableCell key={field}>
                          <input
                            type="checkbox"
                            disabled={editingRole?.isAdmin}
                            checked={editingRole?.isAdmin ? true : permission[field]}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                permissions: current.permissions.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, [field]: event.target.checked } : item,
                                ),
                              }))
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
