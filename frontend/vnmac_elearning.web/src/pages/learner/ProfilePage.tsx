import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  Camera,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../app/auth";
import { changeCurrentUserPassword, updateCurrentUserProfile } from "../../shared/api/auth";
import { getLearnerDashboard } from "../../shared/api/learner";
import { formatMinutes } from "../../shared/lib/format";
import { useAuthStore } from "../../shared/stores/auth-store";
import { LearnerPanel } from "../../shared/ui/learner-ui";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import { ProvinceSelect } from "../../shared/ui/ProvinceSelect";

export function ProfilePage() {
  const { session, logout } = useAuth();
  const userId = session?.user.id ?? "";
  const queryClient = useQueryClient();
  const syncUser = useAuthStore((state) => state.syncUser);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isPasswordEditorOpen, setIsPasswordEditorOpen] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileForm, setProfileForm] = useState({
    fullName: session?.user.fullName ?? "",
    phoneNumber: session?.user.phoneNumber ?? "",
    province: session?.user.province ?? "",
    group: session?.user.group ?? "",
    avatarUrl: session?.user.avatarUrl ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const dashboardQuery = useQuery({
    queryKey: ["learner", userId, "dashboard"],
    queryFn: () => getLearnerDashboard(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    const user = dashboardQuery.data?.user;
    if (!user) return;
    setProfileForm({
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      province: user.province,
      group: user.group,
      avatarUrl: user.avatarUrl ?? "",
    });
  }, [dashboardQuery.data?.user]);

  const profileMutation = useMutation({
    mutationFn: updateCurrentUserProfile,
    onSuccess: async (updatedUser) => {
      syncUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["learner", userId, "dashboard"] });
    },
    onError: (error: Error) => setProfileMessage(error.message),
  });

  const passwordMutation = useMutation({
    mutationFn: changeCurrentUserPassword,
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("");
      setIsPasswordEditorOpen(false);
    },
    onError: (error: Error) => setPasswordMessage(error.message),
  });

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileMessage("");
    profileMutation.mutate(profileForm, {
      onSuccess: () => setIsProfileEditorOpen(false),
    });
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setProfileMessage("Ảnh phải là JPG, PNG hoặc WEBP và không quá 2 MB.");
      return;
    }

    setProfileMessage("Đang cập nhật ảnh đại diện...");
    resizeAvatar(file)
      .then((avatarUrl) => {
        const nextProfile = { ...profileForm, avatarUrl };
        setProfileForm(nextProfile);
        profileMutation.mutate(nextProfile, {
          onSuccess: () => setProfileMessage("Đã cập nhật ảnh đại diện."),
        });
      })
      .catch((error: Error) => setProfileMessage(error.message));
  };

  if (!session) return null;
  if (dashboardQuery.isLoading) return <LoadingBlock label="Đang tải hồ sơ học viên..." />;
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <MessageBanner tone="error">Không tải được hồ sơ học viên.</MessageBanner>;
  }

  const { user } = dashboardQuery.data;

  return (
    <div className="grid gap-7">
      <section className="grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
        <LearnerPanel className="overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#163b7b_0%,#0f2e63_100%)] p-6 text-white">
            <div className="relative size-20">
              <button
                aria-label="Xem ảnh đại diện"
                className="block size-20 overflow-hidden rounded-3xl text-left transition hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-white/70"
                disabled={!profileForm.avatarUrl}
                type="button"
                onClick={() => setIsAvatarPreviewOpen(true)}
              >
                {profileForm.avatarUrl ? (
                  <img alt={user.fullName} className="size-20 object-cover" src={profileForm.avatarUrl} />
                ) : (
                  <span className="grid size-20 place-items-center bg-white/15 text-2xl font-bold">
                    {getInitials(user.fullName)}
                  </span>
                )}
              </button>
              <button
                aria-label="Thay ảnh đại diện"
                className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full border-2 border-white bg-[#0d58b3] text-white shadow"
                disabled={profileMutation.isPending}
                type="button"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="size-4" />
              </button>
              <input ref={avatarInputRef} accept="image/jpeg,image/png,image/webp" className="hidden" type="file" onChange={selectAvatar} />
            </div>
            <h1 className="mt-5 text-[2rem] font-semibold leading-tight">{user.fullName}</h1>
            <p className="mt-2 text-sm text-white/75">{user.group}</p>
            {profileMessage ? <p className="mt-3 text-xs leading-5 text-white/80">{profileMessage}</p> : null}
          </div>
          <div className="grid gap-3 p-6">
            <ProfileInfo icon={Phone} label="Số điện thoại" value={user.phoneNumber} />
            <ProfileInfo icon={MapPin} label="Tỉnh/thành" value={user.province} />
            <ProfileInfo icon={ShieldCheck} label="Vai trò" value={user.role === "Learner" ? "Học viên" : user.role} />
            <ProfileInfo icon={Mail} label="Email" value={user.email || "Chưa cập nhật"} />
          </div>
        </LearnerPanel>

        <div className="grid content-start gap-6">
          <LearnerPanel className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#163b7b]">Hồ sơ học viên</p>
                <h2 className="mt-2 text-[1.8rem] font-semibold text-slate-950">Thông tin học tập của bạn</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Quản lý thông tin cá nhân và theo dõi kết quả học tập của bạn.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setIsProfileEditorOpen(true)}>
                  <Pencil className="size-4" /> Chỉnh sửa hồ sơ
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsPasswordEditorOpen(true)}>
                  <KeyRound className="size-4" /> Đổi mật khẩu
                </Button>
              </div>
            </div>
            <div className="mt-5 inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              {user.isEmailVerified ? "Đã xác thực email" : "Chưa xác thực email"}
            </div>
          </LearnerPanel>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={GraduationCap} label="Khóa đã đăng ký" value={dashboardQuery.data.totalEnrolledCourses} />
            <Metric icon={BookOpenCheck} label="Khóa hoàn thành" value={dashboardQuery.data.totalCompletedCourses} />
            <Metric icon={Award} label="Chứng chỉ" value={dashboardQuery.data.totalCertificates} />
            <Metric icon={CalendarDays} label="Thời gian học" value={formatMinutes(dashboardQuery.data.totalStudyTimeMinutes)} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <LearnerPanel className="p-6 xl:col-span-2">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Khóa học gần đây</h2>
          <div className="mt-5 grid gap-3">
            {dashboardQuery.data.courses.length ? dashboardQuery.data.courses.slice(0, 4).map((course) => (
              <Link className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#163b7b]/40 hover:shadow-md" key={course.courseId} to={`/app/courses/${course.courseId}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {course.completedLessons}/{course.totalLessons} bài học - {course.passedQuizzes}/{course.totalQuizzes} bài kiểm tra
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#163b7b]">{course.overallCompletionPercent}%</span>
                </div>
              </Link>
            )) : <MessageBanner tone="info">Bạn chưa đăng ký khóa học nào.</MessageBanner>}
          </div>
        </LearnerPanel>

        <LearnerPanel className="p-6">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Liên kết nhanh</h2>
          <div className="mt-5 grid gap-3">
            <QuickLink to="/app/courses" icon={GraduationCap}>Khóa học của tôi</QuickLink>
            <QuickLink to="/app/certificate" icon={Award}>Chứng chỉ</QuickLink>
            <QuickLink to="/app/support" icon={LifeBuoy}>Hỗ trợ học viên</QuickLink>
            <Button className="profile-logout-button justify-start rounded-2xl" type="button" variant="outline" onClick={logout}>
              <LogOut className="size-4" /> Đăng xuất
            </Button>
          </div>
        </LearnerPanel>
      </section>

      {isProfileEditorOpen ? (
        <ProfileDialog icon={UserRound} title="Chỉnh sửa hồ sơ" onClose={() => setIsProfileEditorOpen(false)}>
          <form className="grid gap-4" onSubmit={submitProfile}>
            <ProfileField label="Họ và tên" value={profileForm.fullName} onChange={(value) => setProfileForm((current) => ({ ...current, fullName: value }))} />
            <ProfileField label="Số điện thoại" value={profileForm.phoneNumber} onChange={(value) => setProfileForm((current) => ({ ...current, phoneNumber: value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tỉnh/Thành phố
                <ProvinceSelect value={profileForm.province} onChange={(value) => setProfileForm((current) => ({ ...current, province: value }))} />
              </label>
              <ProfileField label="Nhóm/đơn vị" value={profileForm.group} onChange={(value) => setProfileForm((current) => ({ ...current, group: value }))} />
            </div>
            {profileMessage ? <p className="text-sm text-[#163b7b]">{profileMessage}</p> : null}
            <DialogActions pending={profileMutation.isPending} pendingText="Đang lưu..." submitText="Lưu thay đổi" onCancel={() => setIsProfileEditorOpen(false)} />
          </form>
        </ProfileDialog>
      ) : null}

      {isPasswordEditorOpen ? (
        <ProfileDialog icon={KeyRound} title="Đổi mật khẩu" onClose={() => setIsPasswordEditorOpen(false)}>
          <form className="grid gap-4" onSubmit={submitPassword}>
            <ProfileField label="Mật khẩu hiện tại" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} />
            <ProfileField label="Mật khẩu mới" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} />
            <ProfileField label="Nhập lại mật khẩu mới" type="password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} />
            <p className="text-xs leading-5 text-slate-500">Mật khẩu mới cần có ít nhất 8 ký tự.</p>
            {passwordMessage ? <p className="text-sm text-red-600">{passwordMessage}</p> : null}
            <DialogActions pending={passwordMutation.isPending} pendingText="Đang đổi..." submitText="Đổi mật khẩu" onCancel={() => setIsPasswordEditorOpen(false)} />
          </form>
        </ProfileDialog>
      ) : null}

      {isAvatarPreviewOpen && profileForm.avatarUrl ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/80 p-5 backdrop-blur-sm"
          role="dialog"
          aria-label="Xem ảnh đại diện"
          aria-modal="true"
          onClick={() => setIsAvatarPreviewOpen(false)}
        >
          <button
            aria-label="Đóng ảnh"
            className="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            type="button"
            onClick={() => setIsAvatarPreviewOpen(false)}
          >
            <X className="size-6" />
          </button>
          <img
            alt={`Ảnh đại diện của ${user.fullName}`}
            className="max-h-[85vh] max-w-[min(90vw,900px)] rounded-2xl object-contain shadow-2xl"
            src={profileForm.avatarUrl}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProfileDialog({ children, icon: Icon, onClose, title }: { children: ReactNode; icon: typeof UserRound; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#163b7b]"><Icon className="size-5" /></span>
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          </div>
          <button aria-label="Đóng" className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100" type="button" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogActions({ onCancel, pending, pendingText, submitText }: { onCancel: () => void; pending: boolean; pendingText: string; submitText: string }) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
      <Button disabled={pending} type="submit"><Save className="size-4" />{pending ? pendingText : submitText}</Button>
    </div>
  );
}

function ProfileInfo({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
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

function ProfileField({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: "text" | "password"; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-950 outline-none focus:border-[#0d58b3] focus:ring-2 focus:ring-blue-100" required type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: number | string }) {
  return <LearnerPanel className="p-5"><Icon className="size-5 text-[#163b7b]" /><p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></LearnerPanel>;
}

function QuickLink({ children, icon: Icon, to }: { children: ReactNode; icon: typeof GraduationCap; to: string }) {
  return <Button asChild className="justify-start rounded-2xl" variant="outline"><Link to={to}><Icon className="size-4" />{children}</Link></Button>;
}

function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Không thể xử lý ảnh đại diện."));
        return;
      }
      context.drawImage(image, (image.naturalWidth - cropSize) / 2, (image.naturalHeight - cropSize) / 2, cropSize, cropSize, 0, 0, 512, 512);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không đọc được ảnh đã chọn."));
    };
    image.src = objectUrl;
  });
}

function getInitials(fullName: string) {
  return fullName.split(" ").filter(Boolean).slice(-2).map((item) => item[0]?.toUpperCase() ?? "").join("");
}
