import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../app/auth";
import { getProvinceOptions, registerRequest } from "../shared/api/auth";
import { ApiError } from "../shared/api/client";
import { LoadingBlock } from "../shared/ui/LoadingBlock";
import { MessageBanner } from "../shared/ui/MessageBanner";
import { resolveBrandAsset, useBrandingSettings } from "../shared/ui/branding";

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
  const branding = useBrandingSettings();
  const navigate = useNavigate();
  const [mode, setMode] = useState<PageMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(defaultRegisterForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const provinceQuery = useQuery({
    queryKey: ["public", "provinces"],
    queryFn: getProvinceOptions,
  });

  if (isInitializing) {
    return (
      <div className="auth-page-root">
        <LoadingBlock label="Đang phục hồi phiên đăng nhập..." />
      </div>
    );
  }

  if (session) {
    return <Navigate to={session.user.hasAdminAccess ? "/admin" : "/app/dashboard"} replace />;
  }

  const loginLogo = resolveBrandAsset(branding.loginLogoUrl || branding.projectLogoUrl);

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

      navigate(response.user.hasAdminAccess ? "/admin" : "/app/dashboard", {
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
    <main
      className="auth-page-root auth-official-shell"
      style={{
        backgroundImage: branding.loginBackgroundImageUrl
          ? `url(${resolveBrandAsset(branding.loginBackgroundImageUrl)})`
          : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="auth-login-stage">
        <ProjectPanel />

        <section className="auth-main-area" aria-label="Đăng nhập học viên">
          <div className="auth-mobile-project-brand" aria-hidden="true">
            {loginLogo ? <img alt={branding.headerTitle} className="auth-mobile-project-logo-image" src={loginLogo} /> : null}
            <div className={cn("auth-mobile-project-mark", loginLogo && "hidden")}>
              <span />
              <i />
              <i />
              <i />
            </div>
            <p>
              <strong>{branding.headerTitle}</strong>
              <span>{branding.headerSubtitle}</span>
              <span>Dự án giáo dục nguy cơ bom mìn vật nổ</span>
            </p>
          </div>
          <PartnerLogoRow />

          <div className="auth-card">
            <div className="auth-mobile-illustration" aria-hidden="true">
              <div className="auth-mobile-plant" />
              <div className="auth-mobile-laptop">
                <div className="auth-mobile-screen">
                  <GraduationCap size={46} />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="auth-mobile-shield">
                <Check size={34} />
              </div>
            </div>
            <div className="auth-card-copy">
              <p className="auth-card-title">
                {mode === "login" ? "Chào mừng bạn quay trở lại" : "Đăng ký tài khoản"}
              </p>
              <p className="auth-card-subtitle">
                {mode === "login" ? "Hãy đăng nhập để bắt đầu tiến trình học tập" : "Điền thông tin để tạo tài khoản học viên"}
              </p>
            </div>

            {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
            {registerMessage ? <MessageBanner tone="success">{registerMessage}</MessageBanner> : null}

            {mode === "login" ? (
              <form className="auth-form-official" onSubmit={handleLogin}>
                <AuthInput
                  autoComplete="username"
                  icon={User}
                  placeholder="Số điện thoại / Email"
                  value={username}
                  onChange={setUsername}
                />

                <AuthInput
                  autoComplete="current-password"
                  icon={LockKeyhole}
                  placeholder="Mật khẩu"
                  rightSlot={
                    <button
                      className="auth-input-action"
                      type="button"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  }
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                />

                <button className="auth-forgot-link" type="button">
                  Quên mật khẩu?
                </button>

                <button className="auth-submit-button" disabled={isSubmitting} type="submit">
                  <LockKeyhole />
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </form>
            ) : (
              <form className="auth-form-official auth-register-form" onSubmit={handleRegister}>
                <AuthInput icon={User} placeholder="Họ và tên" value={registerForm.fullName} onChange={(value) => updateRegisterForm("fullName", value)} />
                <AuthInput icon={Mail} placeholder="Email" type="email" value={registerForm.email} onChange={(value) => updateRegisterForm("email", value)} />
                <AuthInput icon={Phone} placeholder="Số điện thoại" value={registerForm.phoneNumber} onChange={(value) => updateRegisterForm("phoneNumber", value)} />
                <AuthSelect
                  icon={MapPin}
                  placeholder="Tỉnh/Thành phố"
                  options={provinceQuery.data ?? []}
                  value={registerForm.province}
                  onChange={(value) => updateRegisterForm("province", value)}
                />
                <AuthInput icon={Users} placeholder="Đối tượng (ví dụ: Cán bộ xã/phường)" value={registerForm.group} onChange={(value) => updateRegisterForm("group", value)} />
                <AuthInput icon={AtSign} placeholder="Tên đăng nhập" autoComplete="username" value={registerForm.username} onChange={(value) => updateRegisterForm("username", value)} />
                <AuthInput icon={LockKeyhole} placeholder="Mật khẩu" autoComplete="new-password" type="password" value={registerForm.password} onChange={(value) => updateRegisterForm("password", value)} />

                <button className="auth-submit-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
                </button>
              </form>
            )}

            <p className="auth-register-copy">
              {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                  setRegisterMessage(null);
                }}
              >
                {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </div>
        </section>
      </div>

      <p className="auth-copyright">© 2024 RAPPOT Project. All rights reserved.</p>
    </main>
  );
}

function ProjectPanel() {
  const settings = useBrandingSettings();
  const loginLogo = resolveBrandAsset(settings.loginLogoUrl || settings.projectLogoUrl);

  return (
    <aside className="auth-project-panel" aria-label="RAPPOT Project">
      <div className="auth-project-pattern" />
      {loginLogo ? <img alt={settings.headerTitle} className="auth-project-logo-image" src={loginLogo} /> : null}
      <div className={cn("auth-project-logo", loginLogo && "hidden")} aria-hidden="true">
        <div className="auth-house-roof" />
        <div className="auth-house-people">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="auth-project-name">
        <strong>{settings.headerTitle}</strong>
        <span>{settings.headerSubtitle}</span>
        <span>Dự án giáo dục nguy cơ bom mìn vật nổ và thay đổi hành vi xã hội cho công tác viện cộng đồng</span>
      </div>

      <div className="auth-illustration" aria-hidden="true">
        <div className="auth-plant">
          <span />
          <span />
          <span />
        </div>
        <div className="auth-laptop">
          <div className="auth-laptop-screen">
            <GraduationCap />
            <span />
            <span />
          </div>
          <div className="auth-laptop-base" />
        </div>
        <div className="auth-shield">
          <ShieldCheck />
        </div>
      </div>

      <div className="auth-project-slogan">
        <p>Học an toàn - Hành động đúng</p>
        <strong>Để bảo vệ mình và cộng đồng</strong>
      </div>
    </aside>
  );
}

function PartnerLogoRow() {
  const settings = useBrandingSettings();
  const vnmacLogo = resolveBrandAsset(settings.vnmacLogoUrl);
  const vietnamFlag = resolveBrandAsset(settings.vietnamFlagUrl);
  const usFlag = resolveBrandAsset(settings.usFlagUrl);
  const crsLogo = resolveBrandAsset(settings.crsLogoUrl);

  return (
    <div className="auth-partner-row" aria-label="Đối tác dự án">
      {vnmacLogo ? <img alt="VNMAC" className="auth-partner-image" src={vnmacLogo} /> : null}
      <div className={cn("auth-vnmac-logo", vnmacLogo && "hidden")}>
        <strong>VNMAC</strong>
        <span>Vietnam National<br />Mine Action Centre</span>
      </div>
      {vietnamFlag ? <img alt="Viet Nam" className="auth-flag-image" src={vietnamFlag} /> : null}
      <div className={cn("auth-flag auth-flag-vn", vietnamFlag && "hidden")} aria-label="Việt Nam">
        <span>★</span>
      </div>
      {usFlag ? <img alt="United States" className="auth-flag-image" src={usFlag} /> : null}
      <div className={cn("auth-flag auth-flag-us", usFlag && "hidden")} aria-label="United States">
        <span />
      </div>
      {crsLogo ? <img alt="CRS" className="auth-partner-image" src={crsLogo} /> : null}
      <div className={cn("auth-crs-logo", crsLogo && "hidden")}>
        <span>CRS</span>
        <small>Catholic Relief Services</small>
      </div>
    </div>
  );
}

function AuthInput({
  autoComplete,
  icon: Icon,
  placeholder,
  rightSlot,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  icon: LucideIcon;
  placeholder: string;
  rightSlot?: ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="auth-input-shell">
      <Icon className="auth-input-icon" />
      <input
        autoComplete={autoComplete}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {rightSlot}
    </label>
  );
}

function AuthSelect({
  icon: Icon,
  placeholder,
  options,
  value,
  onChange,
}: {
  icon: LucideIcon;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="auth-input-shell">
      <Icon className="auth-input-icon" />
      <select
        className="min-w-0 flex-1 appearance-none bg-transparent text-slate-700 outline-none"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
