import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartColumn, GraduationCap, MailCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "../app/auth";
import { registerRequest } from "../shared/api/auth";
import { ApiError } from "../shared/api/client";
import { LoadingBlock } from "../shared/ui/LoadingBlock";
import { MessageBanner } from "../shared/ui/MessageBanner";

type PageMode = "login" | "register";

interface RegisterFormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  province: string;
  group: string;
  username: string;
  password: string;
}

const defaultRegisterForm: RegisterFormState = {
  fullName: "",
  email: "",
  phoneNumber: "",
  province: "",
  group: "",
  username: "",
  password: "",
};

export function LoginPage() {
  const { isInitializing, session, login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<PageMode>("login");
  const [username, setUsername] = useState("learner01");
  const [password, setPassword] = useState("Vnmac@123");
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(defaultRegisterForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [verificationPath, setVerificationPath] = useState<string | null>(null);

  if (isInitializing) {
    return (
      <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-6 py-10">
        <LoadingBlock label="Đang phục hồi phiên đăng nhập..." />
      </div>
    );
  }

  if (session) {
    return <Navigate to={session.user.role === "Learner" ? "/app/dashboard" : "/admin"} replace />;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRegisterMessage(null);
    setIsSubmitting(true);

    try {
      const response = await login({
        username: username.trim(),
        password,
        captchaToken: "demo-pass",
      });

      navigate(response.user.role === "Learner" ? "/app/dashboard" : "/admin", {
        replace: true,
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Đăng nhập thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRegisterMessage(null);
    setVerificationPath(null);
    setIsSubmitting(true);

    try {
      const response = await registerRequest({
        ...registerForm,
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        phoneNumber: registerForm.phoneNumber.trim(),
        province: registerForm.province.trim(),
        group: registerForm.group.trim(),
        fullName: registerForm.fullName.trim(),
        password: registerForm.password,
        captchaToken: "demo-pass",
      });

      setRegisterMessage(response.message);
      setVerificationPath(response.verificationPath);
      setMode("register");
      setRegisterForm(defaultRegisterForm);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Đăng ký thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateRegisterForm(field: keyof RegisterFormState, value: string) {
    setRegisterForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-6 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_440px]">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-white to-slate-50">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                VNMAC eLearning
              </Badge>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
                Hệ thống đào tạo trực tuyến kết hợp LMS và SCORM
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Người học có thể tự đăng ký tài khoản bằng email và xác thực trước khi đăng nhập.
                Tài khoản do quản trị viên cấp từ nội bộ có thể được kích hoạt dùng ngay.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-slate-200 shadow-none">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Nền tảng</p>
                  <p className="text-xl font-semibold text-slate-950">LMS</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Dashboard, tiến độ, quiz, chứng chỉ và analytics.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-none">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Nội dung</p>
                  <p className="text-xl font-semibold text-slate-950">SCORM</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Launch session, runtime tracking và player wrapper.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-none">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tài khoản</p>
                  <p className="text-xl font-semibold text-slate-950">Xác thực email</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Người dùng ngoài phải xác thực email trước khi vào hệ thống.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-none">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Bảo mật</p>
                  <p className="text-xl font-semibold text-slate-950">JWT</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Username, password, access token và refresh token.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge className="gap-1" variant="secondary">
                <ShieldCheck className="size-3.5" />
                JWT + Refresh Token
              </Badge>
              <Badge className="gap-1" variant="secondary">
                <MailCheck className="size-3.5" />
                Email Verification
              </Badge>
              <Badge className="gap-1" variant="secondary">
                <GraduationCap className="size-3.5" />
                LMS + SCORM
              </Badge>
              <Badge className="gap-1" variant="secondary">
                <ChartColumn className="size-3.5" />
                Analytics
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={mode === "login" ? "default" : "outline"}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Đăng nhập
              </Button>
              <Button
                type="button"
                variant={mode === "register" ? "default" : "outline"}
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Đăng ký
              </Button>
            </div>
            <div>
              <CardTitle>{mode === "login" ? "Vào hệ thống" : "Tạo tài khoản học viên"}</CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Đăng nhập bằng tài khoản đã được cấp hoặc đã xác thực email."
                  : "Tài khoản ngoài hệ thống sẽ cần xác thực email trước khi đăng nhập."}
              </CardDescription>
            </div>
          </CardHeader>

          {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
          {registerMessage ? <MessageBanner tone="success">{registerMessage}</MessageBanner> : null}

          <CardContent className="space-y-6 pt-0">
            {mode === "login" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    autoComplete="current-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button className="w-full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="register-full-name">Họ và tên</Label>
                    <Input
                      id="register-full-name"
                      value={registerForm.fullName}
                      onChange={(event) => updateRegisterForm("fullName", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(event) => updateRegisterForm("email", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Số điện thoại</Label>
                    <Input
                      id="register-phone"
                      value={registerForm.phoneNumber}
                      onChange={(event) => updateRegisterForm("phoneNumber", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-province">Tỉnh / thành</Label>
                    <Input
                      id="register-province"
                      value={registerForm.province}
                      onChange={(event) => updateRegisterForm("province", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-group">Nhóm đối tượng</Label>
                    <Input
                      id="register-group"
                      value={registerForm.group}
                      onChange={(event) => updateRegisterForm("group", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      autoComplete="username"
                      value={registerForm.username}
                      onChange={(event) => updateRegisterForm("username", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      autoComplete="new-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(event) => updateRegisterForm("password", event.target.value)}
                    />
                  </div>
                </div>

                <Button className="w-full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
                </Button>
              </form>
            )}

            {verificationPath ? (
              <Card className="border-emerald-200 bg-emerald-50 shadow-none">
                <CardContent className="space-y-3 p-4 text-sm leading-6 text-emerald-950">
                  <p>
                    Bản demo hiện trả về liên kết xác thực trực tiếp để mô phỏng email gửi đến người dùng.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(verificationPath)}
                  >
                    Mở liên kết xác thực email
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-slate-200 bg-slate-50 shadow-none">
              <CardContent className="p-4 text-sm leading-6 text-slate-700">
                Tài khoản seed để demo: <code>admin</code>, <code>content</code>, <code>viewer</code>,{" "}
                <code>learner01</code> - password: <code>Vnmac@123</code>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
