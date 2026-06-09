import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Share2 } from "lucide-react";
import { useAuth } from "../../app/auth";
import { getLearnerCertificates } from "../../shared/api/learner";
import { formatDateTime } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import {
  LearnerPanel,
  LearnerScreenTitle,
  LearnerStatusBadge,
} from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";

export function CertificatePage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";

  const query = useQuery({
    queryKey: ["learner", userId, "certificates"],
    queryFn: () => getLearnerCertificates(userId),
    enabled: Boolean(userId),
  });

  if (query.isLoading) {
    return <LoadingBlock label="Đang tải chứng chỉ..." />;
  }

  if (query.isError || !query.data) {
    return <MessageBanner tone="error">Không tải được thông tin chứng chỉ.</MessageBanner>;
  }

  const items = query.data.certificates;

  return (
    <div className="grid gap-6">
      <LearnerScreenTitle index={4} title="Chứng chỉ của tôi" />

      {items.length === 0 ? (
        <LearnerPanel className="p-6">
          <MessageBanner tone="info">
            Bạn chưa có chứng chỉ nào. Hãy hoàn thành khóa học và bài kiểm tra để được cấp chứng chỉ.
          </MessageBanner>
        </LearnerPanel>
      ) : (
        <div className="grid gap-6">
          {items.map((item) => (
            <LearnerPanel className="overflow-hidden p-6" key={item.courseId}>
              <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
                <div className="grid gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-[1.45rem] font-semibold text-slate-950">{item.courseTitle}</h3>
                      <p className="text-sm leading-7 text-slate-600">
                        {item.certificate
                          ? "Khóa học đã đủ điều kiện và chứng chỉ đã được phát hành để xác thực trực tuyến."
                          : "Khóa học chưa đủ điều kiện cấp chứng chỉ. Hoàn thành các yêu cầu còn thiếu để tiếp tục."}
                      </p>
                    </div>
                    <LearnerStatusBadge tone={item.certificate ? "success" : "warning"}>
                      {item.certificate ? "Đã cấp" : "Chưa cấp"}
                    </LearnerStatusBadge>
                  </div>

                  {item.certificate ? (
                    <div className="grid gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-5 text-sm text-emerald-900">
                      <p className="font-semibold">Chứng chỉ đã sẵn sàng</p>
                      <p>
                        Học viên {session?.user.fullName} đã hoàn thành khóa học với kết quả đạt yêu cầu và có thể tải
                        hoặc chia sẻ chứng chỉ này.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-base font-semibold text-slate-950">Điều kiện còn thiếu</h4>
                      <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                        {item.outstandingRequirements.map((requirement) => (
                          <li key={requirement}>• {requirement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="rounded-2xl" variant="outline">
                      <Link to={`/app/courses/${item.courseId}`}>Về trang khóa học</Link>
                    </Button>
                    {item.certificate ? (
                      <Button asChild className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]">
                        <Link to={`/verify-certificate/${item.certificate.certificateId}`}>Xác thực chứng chỉ</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#efddba] bg-[linear-gradient(180deg,#fffef9_0%,#fff9ef_100%)] p-8 shadow-[inset_0_0_0_1px_rgba(241,211,162,0.45)]">
                  {item.certificate ? (
                    <div className="mx-auto grid max-w-[640px] gap-6 text-center text-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Trung tâm Hành động Bom mìn Quốc gia Việt Nam
                      </p>

                      <div className="grid gap-3">
                        <h4 className="text-[2.35rem] font-semibold tracking-[0.06em] text-[#163b7b]">CHỨNG CHỈ</h4>
                        <p className="text-lg">Hoàn thành khóa học</p>
                      </div>

                      <div className="grid gap-2">
                        <p className="text-[1.45rem] font-semibold">{item.courseTitle}</p>
                        <p className="text-lg">Cấp cho học viên</p>
                        <p className="text-[2rem] font-semibold tracking-[-0.03em]">{session?.user.fullName}</p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <p>Đã hoàn thành khóa học với kết quả đạt yêu cầu.</p>
                        <p>Ngày cấp: {formatDateTime(item.certificate.issuedDate)}</p>
                        <p>Mã chứng chỉ: {item.certificate.certificateId}</p>
                      </div>

                      <div className="grid items-end gap-6 sm:grid-cols-[1fr_auto]">
                        <div className="text-left text-sm text-slate-500">
                          <p>Giám đốc Trung tâm</p>
                          <div className="mt-6 h-12 w-36 border-b border-slate-300" />
                        </div>
                        <div className="grid place-items-center gap-2 rounded-[24px] border border-slate-200 bg-white p-4">
                          <QrCode className="size-20 text-slate-800" />
                          <span className="text-xs text-slate-500">Quét mã để xác thực</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3">
                        <Button className="rounded-2xl" type="button" variant="outline">
                          <Download className="mr-2 size-4" />
                          Tải xuống PDF
                        </Button>
                        <Button className="rounded-2xl" type="button" variant="outline">
                          <Share2 className="mr-2 size-4" />
                          Chia sẻ
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-[360px] place-items-center text-center text-slate-500">
                      Chứng chỉ sẽ hiển thị tại đây sau khi bạn hoàn thành toàn bộ điều kiện bắt buộc của khóa học.
                    </div>
                  )}
                </div>
              </div>
            </LearnerPanel>
          ))}
        </div>
      )}
    </div>
  );
}
