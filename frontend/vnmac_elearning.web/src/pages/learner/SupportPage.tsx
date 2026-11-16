import { LearningCompanion } from "@/shared/ui/LearningCompanion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  FileQuestion,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import { LearnerPanel } from "../../shared/ui/learner-ui";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupportTicket, getMySupportTickets, getSupportInfo } from "@/shared/api/support";
import { resolveApiUrl } from "@/shared/api/client";
import type { SupportTicketCategory, SupportTicketStatus } from "@/shared/types/api";

export function SupportPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("Account");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const ticketsQuery = useQuery({ queryKey: ["support", "mine"], queryFn: getMySupportTickets });
  const supportInfoQuery = useQuery({ queryKey: ["support", "info"], queryFn: getSupportInfo });
  const supportInfo = supportInfoQuery.data;
  const contactItems = supportInfo ? [
    { icon: Mail, label: "Email hỗ trợ", value: supportInfo.email, description: supportInfo.workingHours },
    { icon: Phone, label: "Tổng đài", value: supportInfo.phone, description: supportInfo.workingHours },
    { icon: ShieldCheck, label: "Đơn vị vận hành", value: supportInfo.operatorName, description: "Tiếp nhận và xử lý yêu cầu học viên" },
  ].filter((item) => item.value) : [];
  const createMutation = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: async () => {
      setSubject(""); setDescription(""); setAttachment(undefined);
      await queryClient.invalidateQueries({ queryKey: ["support", "mine"] });
    },
  });

  return (
    <div className="grid gap-7">
      <LearningCompanion pose="encourage"><strong>Bạn cần mình hướng dẫn?</strong><p>Xem các hướng dẫn bên dưới. Nếu vẫn cần trợ giúp, hãy gửi yêu cầu để quản trị viên hỗ trợ.</p></LearningCompanion>
      <LearnerPanel className="overflow-hidden">
        <div className="relative min-h-[360px] bg-[linear-gradient(135deg,#f8fafc_0%,#edf6ff_55%,#fff7e6_100%)] p-7 sm:p-10">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#163b7b] shadow-sm">
              <LifeBuoy className="size-3.5" />
              Hỗ trợ học viên
            </div>
            <h1 className="mt-5 text-[2.35rem] font-semibold leading-tight text-slate-950 sm:text-[3rem]">
              Cần hỗ trợ tài khoản, khóa học hoặc kết quả học tập?
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700">
              Gửi yêu cầu kèm thông tin học viên để bộ phận vận hành kiểm tra nhanh hơn. Các vấn đề về đăng nhập,
              tiến độ học, bài kiểm tra và kết quả học tập đều được tiếp nhận tại đây.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SupportMetric icon={Clock3} label="Thời gian phản hồi" value="Theo trạng thái yêu cầu" />
            <SupportMetric icon={CheckCircle2} label="Thông tin đi kèm" value="Họ tên, số điện thoại, mô tả lỗi" />
            <SupportMetric icon={FileQuestion} label="Nhóm vấn đề" value="Tài khoản, bài học, kết quả" />
          </div>
        </div>
      </LearnerPanel>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LearnerPanel className="p-6">
          <h2 className="text-[1.35rem] font-semibold text-slate-950">Gửi yêu cầu hỗ trợ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Thông tin học viên đang đăng nhập sẽ được dùng để đối chiếu khi xử lý yêu cầu.
          </p>

          <div className="mt-5 grid gap-4">
            <Input className="h-11 rounded-2xl border-slate-200" placeholder="Tiêu đề yêu cầu" value={subject} onChange={(event) => setSubject(event.target.value)} />
            <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#163b7b]" value={category} onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}>
              <option value="Account">Tài khoản đăng nhập</option>
              <option value="CourseContent">Nội dung khóa học</option>
              <option value="LearningProgress">Tiến độ học tập</option>
              <option value="Quiz">Bài kiểm tra</option>
              <option value="Other">Khác</option>
            </select>
            <Textarea
              className="min-h-[160px] rounded-2xl border-slate-200"
              placeholder="Mô tả vấn đề bạn cần hỗ trợ..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <label className="cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              <input accept="image/jpeg,image/png,image/webp" className="hidden" type="file" onChange={(event) => setAttachment(event.target.files?.[0])} />
              {attachment ? `Đã chọn: ${attachment.name}` : "Đính kèm ảnh chụp màn hình (JPG, PNG, WebP; tối đa 5 MB)."}
            </label>
            {createMutation.isError ? <p className="text-sm text-red-600">{createMutation.error.message}</p> : null}
            {createMutation.isSuccess ? <p className="text-sm text-emerald-700">Yêu cầu đã được gửi thành công.</p> : null}
            <Button disabled={createMutation.isPending || subject.trim().length < 5 || description.trim().length < 10} className="w-fit rounded-2xl bg-[#163b7b] px-5 text-white hover:bg-[#0f2e63] hover:text-white" type="button" onClick={() => createMutation.mutate({ subject, category, description, attachment })}>
              <Send className="size-4" />
              Gửi yêu cầu
            </Button>
          </div>
        </LearnerPanel>

        <div className="grid gap-6">
          <LearnerPanel className="p-6">
            <h2 className="text-[1.25rem] font-semibold text-slate-950">Thông tin học viên</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <InfoLine label="Họ tên" value={session?.user.fullName ?? ""} />
              <InfoLine label="Số điện thoại" value={session?.user.phoneNumber ?? ""} />
              <InfoLine label="Nhóm" value={session?.user.group ?? ""} />
              <InfoLine label="Tỉnh/thành" value={session?.user.province ?? ""} />
            </div>
          </LearnerPanel>

          <LearnerPanel className="p-6">
            <h2 className="text-[1.25rem] font-semibold text-slate-950">Kênh liên hệ</h2>
            <div className="mt-5 grid gap-3">
              {contactItems.map((item) => (
                <ContactCard {...item} key={item.label} />
              ))}
            </div>
          </LearnerPanel>
        </div>
      </section>

      <LearnerPanel className="p-6">
        <h2 className="text-[1.25rem] font-semibold text-slate-950">Yêu cầu của tôi</h2>
        <div className="mt-5 grid gap-3">
          {ticketsQuery.data?.map((ticket) => (
            <article className="rounded-2xl border border-slate-200 p-4" key={ticket.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">{ticket.code} · {ticket.subject}</p>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#163b7b]">{statusLabels[ticket.status]}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{ticket.description}</p>
              {ticket.attachmentUrl ? <a className="mt-2 inline-block text-sm text-blue-700 underline" href={resolveApiUrl(ticket.attachmentUrl)} target="_blank" rel="noreferrer">Xem ảnh đính kèm</a> : null}
              {ticket.adminResponse ? <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><strong>Phản hồi:</strong> {ticket.adminResponse}</div> : null}
            </article>
          ))}
          {!ticketsQuery.isLoading && !ticketsQuery.data?.length ? <p className="text-sm text-slate-500">Bạn chưa có yêu cầu hỗ trợ nào.</p> : null}
        </div>
      </LearnerPanel>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LearnerPanel className="p-6">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Câu hỏi thường gặp</h2>
          <div className="mt-5 grid gap-3">
            {(supportInfo?.faqs ?? []).map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4" key={item.question}>
                <div className="flex items-start gap-3">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-[#163b7b]" />
                  <div>
                    <p className="font-semibold text-slate-950">{item.question}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </LearnerPanel>

        <LearnerPanel className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#eaf3ff] text-[#163b7b]">
              <MessageCircle className="size-6" />
            </div>
            <div>
              <h2 className="text-[1.25rem] font-semibold text-slate-950">Cần phản hồi trực tiếp?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gọi tổng đài hoặc gửi email kèm ảnh chụp màn hình lỗi. Với lỗi tiến độ học, hãy ghi rõ tên khóa học và bài học gặp vấn đề.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {supportInfo?.phone ? <Button asChild className="justify-start rounded-2xl" variant="outline"><a href={`tel:${supportInfo.phone}`}><Phone className="size-4" />{supportInfo.phone}</a></Button> : <p className="text-slate-500">Chưa cấu hình số điện thoại</p>}
            {supportInfo?.email ? <Button asChild className="justify-start rounded-2xl" variant="outline"><a href={`mailto:${supportInfo.email}`}><Mail className="size-4" />{supportInfo.email}</a></Button> : <p className="text-slate-500">Chưa cấu hình email</p>}
            <Button asChild className="justify-start rounded-2xl" variant="outline"><Link to="/app/courses"><BookOpen className="size-4" />Xem lộ trình học tập</Link></Button>
          </div>
        </LearnerPanel>
      </section>
    </div>
  );
}

const statusLabels: Record<SupportTicketStatus, string> = {
  New: "Mới", InProgress: "Đang xử lý", WaitingForLearner: "Chờ học viên", Resolved: "Đã hoàn thành", Closed: "Đã đóng",
};

function SupportMetric({ icon: Icon, label, value }: { icon: typeof LifeBuoy; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
      <Icon className="size-5 text-[#163b7b]" />
      <p className="mt-3 text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ContactCard({ icon: Icon, label, value, description }: { icon: typeof Mail; label: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Icon className="size-5 text-[#163b7b]" />
      <p className="mt-3 text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}
