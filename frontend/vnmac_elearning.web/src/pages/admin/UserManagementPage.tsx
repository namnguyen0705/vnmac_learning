import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/app/auth";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { UsersPage } from "./UsersPage";
import { RolesPage } from "./RolesPage";

export function UserManagementPage() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const canUsers = session?.user.role === "Admin" || session?.user.permissions.includes("users.view");
  const canRoles = session?.user.role === "Admin" || session?.user.permissions.includes("roles.view");
  const tab = params.get("tab") === "roles" || (!params.has("tab") && !canUsers) ? "roles" : "users";

  return (
    <div className="admin-user-management">
      <nav className="admin-user-tabs" aria-label="Người dùng và vai trò">
        {canUsers && <Link to="/admin/users" aria-current={tab === "users" ? "page" : undefined}><Users size={16} />Người dùng</Link>}
        {canRoles && <Link to="/admin/users?tab=roles" aria-current={tab === "roles" ? "page" : undefined}><ShieldCheck size={16} />Vai trò & phân quyền</Link>}
      </nav>
      {tab === "roles" ? (canRoles ? <RolesPage /> : <MessageBanner tone="warning">Bạn không có quyền xem vai trò.</MessageBanner>) :
        (canUsers ? <UsersPage /> : <MessageBanner tone="warning">Bạn không có quyền xem người dùng.</MessageBanner>)}
    </div>
  );
}
