import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, CalendarDays, Download, ExternalLink, QrCode, Share2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { getLearnerCertificates } from "../../shared/api/learner";
import { formatDateTime } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerPanel, LearnerStatusBadge } from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";

export function CertificatePage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["learner", userId, "certificates"],
    queryFn: () => getLearnerCertificates(userId),
    enabled: Boolean(userId),
  });

  const issuedCertificates = useMemo(
    () => query.data?.certificates.filter((item) => item.certificate) ?? [],
    [query.data?.certificates],
  );

  const selectedItem =
    issuedCertificates.find((item) => item.certificate?.certificateId === selectedCertificateId) ??
    issuedCertificates[0] ??
    null;
  const certificate = selectedItem?.certificate ?? null;

  if (query.isLoading) {
    return <LoadingBlock label="Đang tải chứng chỉ..." />;
  }

  if (query.isError || !query.data) {
    return <MessageBanner tone="error">Không tải được danh sách chứng chỉ.</MessageBanner>;
  }

  if (!selectedItem || !certificate) {
    return (
      <div className="grid gap-6">
        <LearnerPanel className="overflow-hidden">
          <div className="grid min-h-[420px] place-items-center bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_100%)] p-8 text-center">
            <div className="max-w-xl">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-[#163b7b] shadow-sm">
                <Award className="size-8" />
              </div>
              <h1 className="mt-6 text-[2rem] font-semibold text-slate-950">Chưa có chứng chỉ</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Hoàn thành khóa học và đạt yêu cầu bài kiểm tra để chứng chỉ xuất hiện tại đây.
              </p>
              <Button asChild className="mt-6 rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]">
                <Link to="/app/courses">Xem khóa học</Link>
              </Button>
            </div>
          </div>
        </LearnerPanel>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <LearnerPanel className="overflow-hidden bg-[#fffaf0]">
          <div className="p-5 sm:p-8">
            <CertificatePreview
              certificateId={certificate.certificateId}
              courseTitle={selectedItem.courseTitle}
              issuedDate={certificate.issuedDate}
              learnerName={session?.user.fullName ?? ""}
            />
          </div>
        </LearnerPanel>

        <div className="grid gap-6">
          <LearnerPanel className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#163b7b]">Chứng chỉ của tôi</p>
                <h1 className="mt-2 text-[1.7rem] font-semibold leading-tight text-slate-950">{selectedItem.courseTitle}</h1>
              </div>
              <LearnerStatusBadge tone="success">Đã cấp</LearnerStatusBadge>
            </div>

            <div className="mt-6 grid gap-3">
              <InfoLine icon={Award} label="Học viên" value={session?.user.fullName ?? ""} />
              <InfoLine icon={CalendarDays} label="Ngày cấp" value={formatDateTime(certificate.issuedDate)} />
              <InfoLine icon={ShieldCheck} label="Mã chứng chỉ" value={certificate.certificateId} />
            </div>

            <div className="mt-6 grid gap-3">
              <Button asChild className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]">
                <Link to={`/verify-certificate/${certificate.certificateId}`}>
                  <ExternalLink className="size-4" />
                  Xác thực chứng chỉ
                </Link>
              </Button>
              <Button asChild className="rounded-2xl" variant="outline">
                <Link to={`/app/courses/${selectedItem.courseId}`}>Xem khóa học</Link>
              </Button>
            </div>
          </LearnerPanel>

          <LearnerPanel className="p-6">
            <h2 className="font-semibold text-slate-950">Tệp chứng chỉ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tải xuống hoặc chia sẻ đường dẫn xác thực chứng chỉ khi cần nộp minh chứng hoàn thành khóa học.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button className="rounded-2xl" type="button" variant="outline">
                <Download className="size-4" />
                Tải PDF
              </Button>
              <Button className="rounded-2xl" type="button" variant="outline">
                <Share2 className="size-4" />
                Chia sẻ
              </Button>
            </div>
          </LearnerPanel>
        </div>
      </section>

      {issuedCertificates.length > 1 ? (
        <LearnerPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">Chứng chỉ khác</h2>
            <span className="text-sm text-slate-500">{issuedCertificates.length} chứng chỉ</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {issuedCertificates.map((item) => {
              const itemCertificate = item.certificate!;
              const isSelected = itemCertificate.certificateId === certificate.certificateId;
              return (
                <button
                  className={`rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected ? "border-[#163b7b] bg-[#f2f7ff]" : "border-slate-200 bg-white"
                  }`}
                  key={itemCertificate.certificateId}
                  type="button"
                  onClick={() => setSelectedCertificateId(itemCertificate.certificateId)}
                >
                  <p className="line-clamp-2 font-semibold text-slate-950">{item.courseTitle}</p>
                  <p className="mt-2 text-sm text-slate-500">{formatDateTime(itemCertificate.issuedDate)}</p>
                </button>
              );
            })}
          </div>
        </LearnerPanel>
      ) : null}
    </div>
  );
}

function CertificatePreview({
  certificateId,
  courseTitle,
  issuedDate,
  learnerName,
}: {
  certificateId: string;
  courseTitle: string;
  issuedDate: string;
  learnerName: string;
}) {
  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-[#e6c98f] bg-[#fffdf7] p-7 text-center shadow-[0_22px_60px_rgba(126,87,30,0.12)] sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Trung tâm Hành động Bom mìn Quốc gia Việt Nam
      </p>
      <h2 className="mt-8 text-[2.4rem] font-semibold tracking-[0.08em] text-[#163b7b] sm:text-[3rem]">CHỨNG CHỈ</h2>
      <p className="mt-3 text-sm text-slate-600">Hoàn thành khóa học</p>
      <p className="mx-auto mt-8 max-w-2xl text-xl font-semibold leading-relaxed text-slate-950">{courseTitle}</p>
      <p className="mt-6 text-sm text-slate-600">Cấp cho học viên</p>
      <p className="mt-2 text-[1.85rem] font-semibold text-slate-950">{learnerName}</p>
      <p className="mt-6 text-sm text-slate-600">Đã hoàn thành khóa học với kết quả đạt yêu cầu.</p>

      <div className="mt-9 grid items-end gap-6 sm:grid-cols-[1fr_auto]">
        <div className="text-left text-sm text-slate-500">
          <p>Ngày cấp: {formatDateTime(issuedDate)}</p>
          <p className="mt-2">Mã chứng chỉ: {certificateId}</p>
          <p className="mt-8">Giám đốc Trung tâm</p>
          <div className="mt-8 h-px w-44 bg-slate-300" />
        </div>
        <div className="grid place-items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <QrCode className="size-20 text-slate-800" />
          <span className="text-xs text-slate-500">Quét mã để xác thực</span>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <Icon className="mt-0.5 size-4 text-[#163b7b]" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 break-words font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}
