import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSystemLogs } from "@/shared/api/admin";
import { formatDateTime } from "@/shared/lib/format";
import { AdminPageHeader, AdminPagination, AdminSection } from "@/shared/ui/admin-kit";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";

const pageSize = 20;

export function SystemLogsPage() {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin", "system-logs", search, module, action, page],
    queryFn: () => getSystemLogs({ search, module, action, page, pageSize }),
  });

  const modules = useMemo(() => query.data?.modules ?? [], [query.data?.modules]);
  const actions = useMemo(() => query.data?.actions ?? [], [query.data?.actions]);

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        breadcrumbs={["Trang chủ", "Cài đặt hệ thống", "Nhật ký hệ thống"]}
        title="Nhật ký hệ thống"
        actions={
          <Button className="gap-2" type="button" variant="outline" onClick={() => query.refetch()}>
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
        }
      />

      <AdminSection title="Bộ lọc nhật ký">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Tìm theo người dùng, nội dung, mã đối tượng..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={module} onChange={(event) => { setModule(event.target.value); setPage(1); }}>
            <option value="all">Tất cả module</option>
            {modules.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
            <option value="all">Tất cả hành động</option>
            {actions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button type="button" onClick={() => { setSearch(""); setModule("all"); setAction("all"); setPage(1); }}>
            Xóa lọc
          </Button>
        </div>
      </AdminSection>

      <AdminSection title="Hoạt động tác động hệ thống" action={<span className="text-sm text-slate-500">{query.data?.totalItems ?? 0} bản ghi</span>}>
        {query.isLoading ? <LoadingBlock label="Đang tải nhật ký..." /> : null}
        {query.isError ? <MessageBanner tone="error">Không tải được nhật ký hệ thống.</MessageBanner> : null}
        {query.data ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Nội dung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-[150px]">{formatDateTime(item.occurredAt)}</TableCell>
                    <TableCell className="min-w-[180px]">
                      <p className="font-semibold text-slate-900">{item.actorName}</p>
                      <p className="text-xs text-slate-500">{item.actorUserId || "system"}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        <Activity className="size-3" />
                        {item.module}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{item.action}</TableCell>
                    <TableCell className="min-w-[170px]">
                      <p>{item.entityType}</p>
                      <p className="text-xs text-slate-500">{item.entityId}</p>
                    </TableCell>
                    <TableCell className="min-w-[260px]">{item.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AdminPagination page={query.data.page} pageSize={query.data.pageSize} totalItems={query.data.totalItems} onPageChange={setPage} />
          </>
        ) : null}
      </AdminSection>
    </div>
  );
}
