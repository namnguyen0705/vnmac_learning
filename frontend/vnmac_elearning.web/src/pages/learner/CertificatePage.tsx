import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, CalendarDays, Download, ExternalLink, Share2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { getLearnerCertificates } from "../../shared/api/learner";
import { formatDateTime } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { resolveBrandAsset, useBrandingSettings } from "../../shared/ui/branding";
import { LearnerPageHeader, LearnerPanel, LearnerStatusBadge, OfficialLogo, OfficialPartnerMarks } from "../../shared/ui/learner-ui";
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
              <Button asChild className="mt-6 rounded-2xl bg-[#163b7b] text-white hover:bg-[#0f2e63] hover:text-white">
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
        <LearnerPanel className="overflow-hidden bg-[#f4f8ff]">
          <LearnerPageHeader
            eyebrow="Chứng nhận hoàn thành khóa học"
            title="Chứng chỉ của học viên"
            description="Mẫu chứng nhận theo giao diện chính thức, có mã chứng chỉ và thông tin xác thực."
          />
          <div className="p-5 sm:p-8">
            <CertificatePreview
              certificateId={certificate.certificateId}
              courseTitle={selectedItem.courseTitle}
              issuedDate={certificate.issuedDate}
              learnerName={session?.user.fullName ?? ""}
              learnerMeta={[session?.user.group, session?.user.province].filter(Boolean).join(", ")}
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
              <Button asChild className="rounded-2xl bg-[#163b7b] text-white hover:bg-[#0f2e63] hover:text-white">
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
  learnerMeta,
}: {
  certificateId: string;
  courseTitle: string;
  issuedDate: string;
  learnerName: string;
  learnerMeta: string;
}) {
  const settings = useBrandingSettings();
  const templateUrl = resolveBrandAsset(settings.certificateTemplateUrl);
  const resolvedCourseTitle = settings.certificateCourseTitle || courseTitle;

  return (
    <div
      className={`official-certificate-frame mx-auto ${templateUrl ? "has-template" : ""}`}
      style={{
        backgroundImage: templateUrl ? `url(${templateUrl})` : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="official-certificate-line-art" aria-hidden="true" />
      <span className="official-certificate-corner top-left" aria-hidden="true" />
      <span className="official-certificate-corner top-right" aria-hidden="true" />
      <span className="official-certificate-corner bottom-left" aria-hidden="true" />
      <span className="official-certificate-corner bottom-right" aria-hidden="true" />

      <div className="official-certificate-header">
        <OfficialLogo />
        <OfficialPartnerMarks />
      </div>

      <div className="official-certificate-body">
        <p className="official-certificate-project">
          DỰ ÁN GIÁO DỤC NGUY CƠ BOM MÌN VẬT NỔ
          <br />
          VÀ THAY ĐỔI HÀNH VI XÃ HỘI CHO CỘNG TÁC VIÊN CỘNG ĐỒNG
        </p>

        <div className="official-certificate-title">
          <span />
          <strong>{settings.certificateTitle || "CHUNG NHAN"}</strong>
          <span />
        </div>

        <h2>Học viên {learnerName}</h2>
        {learnerMeta ? <p className="official-certificate-meta">{learnerMeta}</p> : null}
        <p className="official-certificate-completed">Đã hoàn thành khóa học trực tuyến</p>
        <h3>{resolvedCourseTitle}</h3>
      </div>

      <div className="official-certificate-footer">
        <div className="official-certificate-fact">
          <CalendarDays className="size-5" />
          <div>
            <span>Ngày hoàn thành</span>
            <strong>{formatDateTime(issuedDate)}</strong>
          </div>
        </div>
        <div className="official-certificate-shield" aria-hidden="true">
          <ShieldCheck className="size-16" />
        </div>
        <div className="official-certificate-fact">
          <Award className="size-5" />
          <div>
            <span>Số chứng nhận</span>
            <strong>{certificateId}</strong>
          </div>
        </div>
      </div>

      <div className="official-certificate-seal" aria-hidden="true" />
      <div className="official-certificate-wave" aria-hidden="true" />
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
