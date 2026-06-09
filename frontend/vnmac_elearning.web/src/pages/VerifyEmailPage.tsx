import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import { verifyEmailRequest } from "../shared/api/auth";
import { ApiError } from "../shared/api/client";
import { LoadingBlock } from "../shared/ui/LoadingBlock";
import { MessageBanner } from "../shared/ui/MessageBanner";

type VerifyState = "loading" | "success" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Đang xác thực email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Không tìm thấy token xác thực email.");
      return;
    }

    verifyEmailRequest({ token })
      .then((response) => {
        setStatus("success");
        setMessage(response.message);
      })
      .catch((cause) => {
        setStatus("error");
        setMessage(cause instanceof ApiError ? cause.message : "Xác thực email thất bại.");
      });
  }, [token]);

  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-6 py-10">
      <Card className="w-full max-w-xl border-slate-200">
        <CardHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="size-6" />
          </div>
          <div>
            <CardTitle>Xác thực email</CardTitle>
            <CardDescription>Hoàn tất bước xác thực trước khi đăng nhập vào hệ thống.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? <LoadingBlock label={message} /> : null}
          {status === "success" ? <MessageBanner tone="success">{message}</MessageBanner> : null}
          {status === "error" ? <MessageBanner tone="error">{message}</MessageBanner> : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/login">Quay lại đăng nhập</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
