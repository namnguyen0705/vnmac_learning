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

const faqs = [
  {
    question: "Tôi không đăng nhập được thì làm gì?",
    answer: "Gửi họ tên, số điện thoại đã đăng ký và ảnh chụp lỗi để bộ phận hỗ trợ kiểm tra tài khoản.",
  },
  {
    question: "Khi nào tôi nhận được chứng chỉ?",
    answer: "Chứng chỉ được cấp sau khi bạn hoàn thành nội dung khóa học và đạt yêu cầu bài kiểm tra cuối khóa.",
  },
  {
    question: "Video bị dừng giữa chừng có mất tiến độ không?",
    answer: "Hệ thống tự lưu phần trăm xem và vị trí video gần nhất để bạn tiếp tục học ở lần sau.",
  },
  {
    question: "Tôi cần sửa thông tin cá nhân thì liên hệ ai?",
    answer: "Gửi yêu cầu hỗ trợ kèm thông tin cần điều chỉnh. Bộ phận vận hành sẽ xác minh trước khi cập nhật.",
  },
];

const contactItems = [
  { icon: Mail, label: "Email hỗ trợ", value: "support@vnmac-elearning.vn", description: "Phản hồi trong giờ hành chính" },
  { icon: Phone, label: "Tổng đài", value: "1900 6868", description: "08:00 - 17:00, thứ 2 đến thứ 6" },
  {
    icon: ShieldCheck,
    label: "Đơn vị vận hành",
    value: "Trung tâm Hành động Bom mìn Quốc gia Việt Nam",
    description: "Tiếp nhận và xử lý yêu cầu học viên",
  },
];

export function SupportPage() {
  const { session } = useAuth();

  return (
    <div className="grid gap-7">
      <LearnerPanel className="overflow-hidden">
        <div className="relative min-h-[360px] bg-[linear-gradient(135deg,#f8fafc_0%,#edf6ff_55%,#fff7e6_100%)] p-7 sm:p-10">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#163b7b] shadow-sm">
              <LifeBuoy className="size-3.5" />
              Hỗ trợ học viên
            </div>
            <h1 className="mt-5 text-[2.35rem] font-semibold leading-tight text-slate-950 sm:text-[3rem]">
              Cần hỗ trợ tài khoản, khóa học hoặc chứng chỉ?
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700">
              Gửi yêu cầu kèm thông tin học viên để bộ phận vận hành kiểm tra nhanh hơn. Các vấn đề về đăng nhập,
              tiến độ học, bài kiểm tra và chứng chỉ đều được tiếp nhận tại đây.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SupportMetric icon={Clock3} label="Thời gian phản hồi" value="Trong 24 giờ làm việc" />
            <SupportMetric icon={CheckCircle2} label="Thông tin đi kèm" value="Họ tên, số điện thoại, ảnh lỗi" />
            <SupportMetric icon={FileQuestion} label="Nhóm vấn đề" value="Tài khoản, bài học, chứng chỉ" />
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
            <Input className="h-11 rounded-2xl border-slate-200" placeholder="Tiêu đề yêu cầu" />
            <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#163b7b]">
              <option>Tài khoản đăng nhập</option>
              <option>Nội dung khóa học</option>
              <option>Tiến độ học tập</option>
              <option>Bài kiểm tra</option>
              <option>Chứng chỉ</option>
            </select>
            <Textarea
              className="min-h-[160px] rounded-2xl border-slate-200"
              placeholder="Mô tả vấn đề bạn cần hỗ trợ..."
            />
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              Đính kèm ảnh chụp màn hình hoặc mô tả mã lỗi nếu có.
            </div>
            <Button className="w-fit rounded-2xl bg-[#163b7b] px-5 hover:bg-[#0f2e63]" type="button">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LearnerPanel className="p-6">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Câu hỏi thường gặp</h2>
          <div className="mt-5 grid gap-3">
            {faqs.map((item) => (
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
            <Button className="justify-start rounded-2xl" type="button" variant="outline">
              <Phone className="size-4" />
              1900 6868
            </Button>
            <Button className="justify-start rounded-2xl" type="button" variant="outline">
              <Mail className="size-4" />
              support@vnmac-elearning.vn
            </Button>
            <Button className="justify-start rounded-2xl" type="button" variant="outline">
              <BookOpen className="size-4" />
              Xem hướng dẫn học tập
            </Button>
          </div>
        </LearnerPanel>
      </section>
    </div>
  );
}

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
