import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyCertificate } from "../shared/api/learner";
import { formatDateTime } from "../shared/lib/format";
import { LoadingBlock } from "../shared/ui/LoadingBlock";
import { MessageBanner } from "../shared/ui/MessageBanner";

export function CertificateVerifyPage() {
  const { certificateId = "" } = useParams();
  const query = useQuery({
    queryKey: ["certificate", "verify", certificateId],
    queryFn: () => verifyCertificate(certificateId),
    enabled: Boolean(certificateId),
    retry: false,
  });

  if (query.isLoading) {
    return <LoadingBlock label="Dang xac thuc chung nhan..." />;
  }

  if (query.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6 py-10">
        <Card className="mx-auto max-w-3xl border-slate-200">
          <CardContent className="space-y-4 p-6">
            <MessageBanner tone="error">Khong the xac thuc chung nhan nay.</MessageBanner>
            <Button asChild variant="outline">
              <Link to="/login">Quay ve dang nhap</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = query.data;
  if (!data) {
    return null;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6 py-10">
      <Card className="mx-auto max-w-3xl border-slate-200">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">Certificate Verify</Badge>
            <CardTitle>{data.isValid ? "Chung nhan hop le" : "Chung nhan khong hop le"}</CardTitle>
            <CardDescription>{data.message}</CardDescription>
          </div>
          <Badge variant={data.isValid ? "success" : "danger"}>
            {data.isValid ? "Hop le" : "Khong hop le"}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-slate-200 shadow-none">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hoc vien</p>
                <p className="font-semibold text-slate-950">{data.learnerName ?? "Khong ro"}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ma chung nhan</p>
                <p className="font-semibold text-slate-950">{data.certificateId ?? certificateId}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ngay cap</p>
                <p className="font-semibold text-slate-950">{formatDateTime(data.issuedDate)}</p>
              </CardContent>
            </Card>
          </div>

          <Button asChild variant="outline">
            <Link to="/login">Quay ve he thong</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
