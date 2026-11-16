import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAdminSupportTickets, updateSupportTicket } from "@/shared/api/support";
import { getAdminUserAccounts } from "@/shared/api/admin";
import { resolveApiUrl } from "@/shared/api/client";
import { AdminMetricCard, AdminModal, AdminPageHeader, AdminSection } from "@/shared/ui/admin-kit";
import type { SupportTicket, SupportTicketCategory, SupportTicketStatus } from "@/shared/types/api";

const labels: Record<SupportTicketStatus, string> = { New: "Mới", InProgress: "Đang xử lý", WaitingForLearner: "Chờ học viên", Resolved: "Hoàn thành", Closed: "Đã đóng" };
const categories: Record<SupportTicketCategory, string> = { Account: "Tài khoản", CourseContent: "Nội dung khóa học", LearningProgress: "Tiến độ học", Quiz: "Bài kiểm tra", Certificate: "Khác", Other: "Khác" };

export function AdminSupportPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<SupportTicket>();
  const [editStatus, setEditStatus] = useState<SupportTicketStatus>("New"); const [assignee, setAssignee] = useState(""); const [response, setResponse] = useState("");
  const query = useQuery({ queryKey: ["admin", "support", { search, status, category }], queryFn: () => getAdminSupportTickets({ search, status, category, pageSize: 50 }) });
  const users = useQuery({ queryKey: ["admin", "support-users"], queryFn: () => getAdminUserAccounts({}) });
  const mutation = useMutation({ mutationFn: () => updateSupportTicket(selected!.id, { status: editStatus, assignedUserId: assignee || undefined, adminResponse: response }), onSuccess: async () => { setSelected(undefined); await client.invalidateQueries({ queryKey: ["admin", "support"] }); } });
  const open = (ticket: SupportTicket) => { setSelected(ticket); setEditStatus(ticket.status); setAssignee(ticket.assignedUserId ?? ""); setResponse(ticket.adminResponse ?? ""); };
  const data = query.data;
  return <div className="grid gap-3">
    <AdminPageHeader breadcrumbs={["Trang chủ", "Vận hành", "Yêu cầu hỗ trợ"]} title="Quản lý yêu cầu hỗ trợ" />
    <section className="grid gap-3 md:grid-cols-4">
      <AdminMetricCard icon={<LifeBuoy className="size-5" />} label="Yêu cầu mới" value={String(data?.newCount ?? 0)} />
      <AdminMetricCard accent="amber" icon={<LifeBuoy className="size-5" />} label="Đang xử lý" value={String(data?.inProgressCount ?? 0)} />
      <AdminMetricCard accent="violet" icon={<LifeBuoy className="size-5" />} label="Quá 24 giờ" value={String(data?.overdueCount ?? 0)} />
      <AdminMetricCard accent="green" icon={<LifeBuoy className="size-5" />} label="Hoàn thành" value={String(data?.resolvedCount ?? 0)} />
    </section>
    <AdminSection title="Danh sách yêu cầu">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input className="pl-9" placeholder="Tìm mã, tiêu đề, nội dung..." value={search} onChange={e => setSearch(e.target.value)} /></label>
        <select className="rounded-xl border px-3" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(labels).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select>
        <select className="rounded-xl border px-3" value={category} onChange={e => setCategory(e.target.value)}><option value="all">Tất cả nhóm</option>{Object.entries(categories).filter(([key]) => key !== "Certificate").map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Mã</th><th>Học viên</th><th>Tiêu đề</th><th>Nhóm</th><th>Trạng thái</th><th>Phụ trách</th><th></th></tr></thead><tbody>
        {data?.items.map(ticket => <tr className="border-b" key={ticket.id}><td className="p-3 font-semibold">{ticket.code}</td><td>{ticket.learnerName}<div className="text-xs text-slate-500">{ticket.phoneNumber}</div></td><td>{ticket.subject}</td><td>{categories[ticket.category]}</td><td>{labels[ticket.status]}</td><td>{ticket.assignedUserName ?? "Chưa phân công"}</td><td><Button size="sm" variant="outline" onClick={() => open(ticket)}>Xử lý</Button></td></tr>)}
      </tbody></table></div>
    </AdminSection>
    <AdminModal open={Boolean(selected)} title={selected ? `${selected.code} · ${selected.subject}` : "Yêu cầu hỗ trợ"} onClose={() => setSelected(undefined)} actions={<><Button variant="outline" onClick={() => setSelected(undefined)}>Hủy</Button><Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>Lưu xử lý</Button></>}>
      {selected ? <div className="grid gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-4"><p><strong>Học viên:</strong> {selected.learnerName} · {selected.phoneNumber}</p><p><strong>Nhóm/Tỉnh:</strong> {selected.group} · {selected.province}</p><p className="mt-3 whitespace-pre-wrap">{selected.description}</p>{selected.attachmentUrl ? <a className="mt-2 inline-block text-blue-700 underline" href={resolveApiUrl(selected.attachmentUrl)} target="_blank" rel="noreferrer">Xem ảnh đính kèm</a> : null}</div>
        <label>Trạng thái<select className="mt-1 h-11 w-full rounded-xl border px-3" value={editStatus} onChange={e => setEditStatus(e.target.value as SupportTicketStatus)}>{Object.entries(labels).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
        <label>Người xử lý<select className="mt-1 h-11 w-full rounded-xl border px-3" value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Chưa phân công</option>{users.data?.filter(u => u.role !== "Learner").map(u => <option value={u.userId} key={u.userId}>{u.fullName}</option>)}</select></label>
        <label>Phản hồi cho học viên<Textarea className="mt-1 min-h-32" value={response} onChange={e => setResponse(e.target.value)} /></label>
        {mutation.isError ? <p className="text-red-600">{mutation.error.message}</p> : null}
      </div> : null}
    </AdminModal>
  </div>;
}
