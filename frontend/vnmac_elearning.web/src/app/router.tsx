import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { AdminLayout } from "./layouts/AdminLayout";
import { LearnerLayout } from "./layouts/LearnerLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { LoginPage } from "../pages/LoginPage";
import { IntroductionPage } from "../pages/IntroductionPage";
import { ContactPage } from "../pages/ContactPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage";
import { AdminNotificationsPage } from "../pages/admin/AdminNotificationsPage";
import { AdminSupportPage } from "../pages/admin/AdminSupportPage";
import { AnalyticsPage } from "../pages/admin/AnalyticsPage";
import { CoursesPage } from "../pages/admin/CoursesPage";
import { LearningStatsPage } from "../pages/admin/LearningStatsPage";
import { LessonContentPage } from "../pages/admin/LessonContentPage";
import { LessonsPage } from "../pages/admin/LessonsPage";
import { LessonPreviewPage } from "../pages/admin/LessonPreviewPage";
import { MediaLibraryPage } from "../pages/admin/MediaLibraryPage";
import { QuestionBankPage } from "../pages/admin/QuestionBankPage";
import { QuizzesPage } from "../pages/admin/QuizzesPage";
import { SettingsPage } from "../pages/admin/SettingsPage";
import { SystemLogsPage } from "../pages/admin/SystemLogsPage";
import { UserManagementPage } from "../pages/admin/UserManagementPage";
import { SectionsPage } from "../pages/admin/SectionsPage";
import { CourseCatalogPage } from "../pages/learner/CourseCatalogPage";
import { DashboardPage } from "../pages/learner/DashboardPage";
import { LessonPage } from "../pages/learner/LessonPage";
import { LearningResultsPage } from "../pages/learner/LearningResultsPage";
import { LibraryPage } from "../pages/learner/LibraryPage";
import { ProfilePage } from "../pages/learner/ProfilePage";
import { QuizPage } from "../pages/learner/QuizPage";
import { SupportPage } from "../pages/learner/SupportPage";
import { LoadingBlock } from "../shared/ui/LoadingBlock";
import { MascotFigure } from "../shared/ui/LearningCompanion";

const learnerRoles = ["Learner"] as const;
const adminRoles = ["Admin", "ContentManager", "DataViewer"] as const;

function HomeRedirect() {
  const { isInitializing, session } = useAuth();

  if (isInitializing) {
    return <LoadingBlock label="Đang khởi tạo phiên đăng nhập..." />;
  }

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  if (!session.user.hasAdminAccess) {
    return <Navigate replace to="/app/dashboard" />;
  }

  return <Navigate replace to="/admin" />;
}

function ProtectedOutlet({
  allowedRoles,
  portal,
}: {
  allowedRoles?: readonly string[];
  portal?: "learner" | "admin";
}) {
  const { isInitializing, session } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <LoadingBlock label="Đang xác minh phiên đăng nhập..." />;
  }

  if (!session) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  const portalDenied =
    (portal === "admin" && !session.user.hasAdminAccess) ||
    (portal === "learner" && session.user.hasAdminAccess);
  if (portalDenied || (allowedRoles && !allowedRoles.includes(session.user.role))) {
    const fallback = session.user.role === "Learner" ? "/app/dashboard" : "/admin";
    return <Navigate replace to={fallback} />;
  }

  return <Outlet />;
}

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f8fbff_0%,#f1f6fb_100%)] px-6">
      <div className="grid max-w-xl gap-4 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <h2 className="text-[1.6rem] font-semibold text-slate-950">Không tìm thấy trang</h2>
        <p className="text-sm leading-7 text-slate-600">
          Đường dẫn hiện tại không tồn tại hoặc bạn không có quyền truy cập nội dung này.
        </p>
      </div>
    </div>
  );
}

function LegacyLessonsRedirect() {
  const location = useLocation();
  return <Navigate replace to={`/admin/lessons${location.search}`} />;
}

const router = createBrowserRouter([
  {
    element: <><Outlet /><MascotFigure pose="welcome" className="public-corner-mascot" /></>,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: "/", element: <IntroductionPage /> },
          { path: "/contact", element: <ContactPage /> },
          { path: "/login", element: <LoginPage /> },
        ],
      },
      { path: "/verify-email", element: <VerifyEmailPage /> },
    ],
  },
  {
    element: <ProtectedOutlet portal="learner" allowedRoles={learnerRoles} />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <LearnerLayout />,
        children: [
          {
            path: "/app/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/app/courses",
            element: <CourseCatalogPage />,
          },
          {
            path: "/app/courses/:courseId",
            element: <Navigate replace to="/app/courses" />,
          },
          {
            path: "/app/courses/:courseId/lessons/:lessonId",
            element: <LessonPage />,
          },
          {
            path: "/app/courses/:courseId/quizzes/:quizId",
            element: <QuizPage />,
          },
          {
            path: "/app/results",
            element: <LearningResultsPage />,
          },
          {
            path: "/app/certificate",
            element: <Navigate replace to="/app/results" />,
          },
          {
            path: "/app/library",
            element: <LibraryPage />,
          },
          {
            path: "/app/support",
            element: <SupportPage />,
          },
          {
            path: "/app/profile",
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedOutlet portal="admin" allowedRoles={adminRoles} />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/admin/lessons/:lessonId/preview",
        element: <LessonPreviewPage />,
      },
      {
        path: "/admin/courses/:courseId/lessons/:lessonId/preview",
        element: <LessonPreviewPage />,
      },
      {
        element: <AdminLayout />,
        children: [
          { path: "/admin/profile", element: <ProfilePage /> },
          { path: "/admin/sections", element: <SectionsPage /> },
          {
            path: "/admin",
            element: <AdminOverviewPage />,
          },
          {
            path: "/admin/users",
            element: <UserManagementPage />,
          },
          {
            path: "/admin/reports",
            element: <AnalyticsPage />,
          },
          {
            path: "/admin/analytics",
            element: <Navigate replace to="/admin/reports" />,
          },
          {
            path: "/admin/tracking",
            element: <LearningStatsPage />,
          },
          {
            path: "/admin/notifications",
            element: <AdminNotificationsPage />,
          },
          {
            path: "/admin/support",
            element: <AdminSupportPage />,
          },
          {
            path: "/admin/roles",
            element: <Navigate replace to="/admin/users?tab=roles" />,
          },
          {
            path: "/admin/certificates",
            element: <Navigate replace to="/admin/reports" />,
          },
          {
            path: "/admin/settings",
            element: <SettingsPage />,
          },
          {
            path: "/admin/system-logs",
            element: <SystemLogsPage />,
          },
          {
            element: <ProtectedOutlet portal="admin" />,
            children: [
              {
                path: "/admin/courses",
                element: <CoursesPage />,
              },
              {
                path: "/admin/lessons",
                element: <LessonsPage />,
              },
              {
                path: "/admin/lessons/:lessonId/content",
                element: <LessonContentPage />,
              },
              {
                path: "/admin/quizzes",
                element: <QuizzesPage />,
              },
              {
                path: "/admin/materials",
                element: <MediaLibraryPage />,
              },
              {
                path: "/admin/lessons/new",
                element: <LegacyLessonsRedirect />,
              },
              {
                path: "/admin/lessons/:lessonId",
                element: <LegacyLessonsRedirect />,
              },
              {
                path: "/admin/questions",
                element: <QuestionBankPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
