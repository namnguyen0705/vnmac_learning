import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AtSign,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../app/auth";
import { OfficialPartnerMarks } from "@/shared/ui/learner-ui";
import { getProvinceOptions, registerRequest } from "../shared/api/auth";
import { ApiError } from "../shared/api/client";
import { LoadingBlock } from "../shared/ui/LoadingBlock";
import { MessageBanner } from "../shared/ui/MessageBanner";
import "./introduction.css";
import "./public-auth.css";
import "./public-auth-blue.css";

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

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

function TurnstileCaptcha({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let widgetId = "";
    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-vnmac-turnstile]');
    if (window.turnstile) render();
    else if (existing) existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.vnmacTurnstile = "true";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onToken("");
    };
  }, [onToken, siteKey]);

  return siteKey ? <div ref={containerRef} /> : null;
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(defaultRegisterForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRequired = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim());
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


  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRegisterMessage(null);
    setIsSubmitting(true);

    try {
      const response = await login({
        username: username.trim(),
        password,
        captchaToken: captchaToken || undefined,
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
        captchaToken: captchaToken || undefined,
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
    <div className="introduction-page public-auth-page public-interior-page public-auth-blue">
        <main className="public-account-main">
        <div className="public-auth-layout">
        <aside className="public-auth-illustration" aria-label="Học an toàn, hành động đúng">
          <div className="public-auth-project">
            <Link to="/" aria-label="Trang chủ RAPPORT"><strong>RAPPORT PROJECT</strong></Link>
            <p>Dự án giáo dục phòng tránh tai nạn bom mìn vật nổ<br />và thay đổi hành vi xã hội</p>
          </div>
          <div className="public-auth-slogan"><p>Học an toàn - Hành động đúng</p><strong>Để bảo vệ mình và cộng đồng</strong><span /></div>
        </aside>
        <section className="public-auth-card" aria-label={mode === "login" ? "Đăng nhập học viên" : "Đăng ký học viên"}>
          <div className="public-auth-partners"><OfficialPartnerMarks /></div>
          <div className="public-auth-card-body">
            <div className="auth-card-copy">
              <h1 className="public-auth-title">
                {mode === "login" ? "Chào mừng bạn quay trở lại" : "Tạo tài khoản học viên"}
              </h1>
              <p className="auth-card-subtitle">
                {mode === "login" ? "Hãy đăng nhập để bắt đầu tiến trình học tập" : "Điền thông tin để tạo tài khoản học viên"}
              </p>
            </div>

            {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
            {registerMessage ? <MessageBanner tone="success">{registerMessage}</MessageBanner> : null}

            {mode === "login" ? (
              <form className="public-auth-form" onSubmit={handleLogin}>
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

                <Link className="auth-forgot-link" to="/contact">Quên mật khẩu?</Link>

                <TurnstileCaptcha onToken={setCaptchaToken} />

                <button className="auth-submit-button" disabled={isSubmitting || (captchaRequired && !captchaToken)} type="submit">
                  <LockKeyhole />
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </form>
            ) : (
              <form className="public-auth-form public-auth-register-form" onSubmit={handleRegister}>
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

                <TurnstileCaptcha onToken={setCaptchaToken} />

                <button className="auth-submit-button" disabled={isSubmitting || (captchaRequired && !captchaToken)} type="submit">
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
                  setCaptchaToken("");
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
      </main>
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
      <span className="public-auth-field-label">{placeholder}</span>
      <Icon className="auth-input-icon" />
      <input
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={placeholder}
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
    <div className="auth-input-shell auth-select-shell">
      <span className="public-auth-field-label">{placeholder}</span>
      <Icon className="auth-input-icon" />
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="auth-select-trigger" aria-label={placeholder}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="auth-province-select-content" position="popper" sideOffset={8}>
          {options.map((option) => <SelectItem className="auth-province-select-item" key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

