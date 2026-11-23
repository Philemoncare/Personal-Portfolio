import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { ContentProvider } from "@/app/ContentProvider";
import { SiteSettingsProvider } from "@/app/SiteSettingsProvider";
import { ThemeProvider } from "@/app/ThemeProvider";
import { AuthProvider } from "@/auth/AuthProvider";
import { InlineLoading } from "@/components/ui/states";
import { AdminLayout, AdminRoute } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import HomePage from "@/pages/HomePage";

const WorkPage = lazy(() => import("@/pages/WorkPage"));
const ProjectDetailPage = lazy(() => import("@/pages/ProjectDetailPage"));
const CaseStudyPage = lazy(() => import("@/pages/CaseStudyPage"));
const DataLabPage = lazy(() => import("@/pages/DataLabPage"));
const DataProjectDetailPage = lazy(() => import("@/pages/DataProjectDetailPage"));
const BuildLabPage = lazy(() => import("@/pages/BuildLabPage"));
const LeadershipPage = lazy(() => import("@/pages/LeadershipPage"));
const LeadershipDetailPage = lazy(() => import("@/pages/LeadershipDetailPage"));
const ExperiencePage = lazy(() => import("@/pages/ExperiencePage"));
const ExperienceDetailPage = lazy(() => import("@/pages/ExperienceDetailPage"));
const ArticlesPage = lazy(() => import("@/pages/ArticlesPage"));
const ArticleDetailPage = lazy(() => import("@/pages/ArticleDetailPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const NowPage = lazy(() => import("@/pages/NowPage"));
const TimelinePage = lazy(() => import("@/pages/TimelinePage"));
const ResumePage = lazy(() => import("@/pages/ResumePage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const ArcadePage = lazy(() => import("@/pages/ArcadePage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const AdminLoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const VerifyOtpPage = lazy(() => import("@/pages/auth/VerifyOtpPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const ChangePasswordPage = lazy(() => import("@/pages/auth/ChangePasswordPage"));
const AdminAccountPage = lazy(() => import("@/pages/admin/AdminAccountPage"));
const AdminSecurityPage = lazy(() => import("@/pages/admin/AdminSecurityPage"));
const AdminSecuritySessionsPage = lazy(
  () => import("@/pages/admin/AdminSecuritySessionsPage"),
);
const AdminMediaPage = lazy(() => import("@/pages/admin/AdminMediaPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminProfilePage = lazy(() => import("@/pages/admin/AdminProfilePage"));
const AdminNowPage = lazy(() => import("@/pages/admin/AdminNowPage"));
const AdminTimelinePage = lazy(() => import("@/pages/admin/AdminTimelinePage"));
const AdminResumePage = lazy(() => import("@/pages/admin/AdminResumePage"));
const AdminMessagesPage = lazy(() => import("@/pages/admin/AdminMessagesPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminProjectsPage = lazy(() => import("@/pages/admin/AdminProjectsPage"));
const AdminProjectEditorPage = lazy(() => import("@/pages/admin/AdminProjectEditorPage"));
const AdminGitHubIntegrationPage = lazy(
  () => import("@/pages/admin/AdminGitHubIntegrationPage"),
);
const AdminGitHubRepositoriesPage = lazy(
  () => import("@/pages/admin/AdminGitHubRepositoriesPage"),
);
const AdminGitHubRepositoryPage = lazy(
  () => import("@/pages/admin/AdminGitHubRepositoryPage"),
);
const AdminProjectPreviewPage = lazy(
  () => import("@/pages/admin/AdminProjectPreviewPage"),
);
const AdminCaseStudiesPage = lazy(() => import("@/pages/admin/AdminCaseStudiesPage"));
const AdminCaseStudyEditorPage = lazy(
  () => import("@/pages/admin/AdminCaseStudyEditorPage"),
);
const AdminDataProjectsPage = lazy(
  () => import("@/pages/admin/AdminDataProjectsPage"),
);
const AdminDataEditorPage = lazy(() => import("@/pages/admin/AdminDataEditorPage"));
const AdminDataPreviewPage = lazy(
  () => import("@/pages/admin/AdminDataPreviewPage"),
);
const AdminPagesPage = lazy(() => import("@/pages/admin/AdminPagesPage"));
const AdminArticlesPage = lazy(() => import("@/pages/admin/AdminArticlesPage"));
const AdminArticleEditorPage = lazy(() => import("@/pages/admin/AdminArticleEditorPage"));
const AdminSocialLinksPage = lazy(() => import("@/pages/admin/AdminSocialLinksPage"));
const AdminExperiencePage = lazy(() => import("@/pages/admin/AdminExperiencePage"));
const AdminLeadershipPage = lazy(() => import("@/pages/admin/AdminLeadershipPage"));
const AdminAppearancePage = lazy(() => import("@/pages/admin/AdminAppearancePage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <InlineLoading label="Loading page" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            element={
              <SiteSettingsProvider>
                <ContentProvider>
                  <PublicLayout />
                </ContentProvider>
              </SiteSettingsProvider>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="work" element={<WorkPage />} />
            <Route path="work/:slug" element={<ProjectDetailPage />} />
            <Route path="case-studies/:slug" element={<CaseStudyPage />} />
            <Route path="data-lab" element={<DataLabPage />} />
            <Route path="data/:slug" element={<DataProjectDetailPage />} />
            <Route path="data-lab/:slug" element={<DataProjectDetailPage />} />
            <Route path="build-lab" element={<BuildLabPage />} />
            <Route path="build-lab/:slug" element={<ProjectDetailPage />} />
            <Route path="leadership" element={<LeadershipPage />} />
            <Route path="leadership/:slug" element={<LeadershipDetailPage />} />
            <Route path="experience" element={<ExperiencePage />} />
            <Route path="experience/:slug" element={<ExperienceDetailPage />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="articles/:slug" element={<ArticleDetailPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="now" element={<NowPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="resume" element={<ResumePage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="arcade" element={<ArcadePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route path="projects/:id/preview" element={<AdminProjectPreviewPage />} />
            <Route path="data/:id/preview" element={<AdminDataPreviewPage />} />
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
              <Route path="now" element={<AdminNowPage />} />
              <Route path="timeline" element={<AdminTimelinePage />} />
              <Route path="resume" element={<AdminResumePage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="settings/integrations" element={<AdminGitHubIntegrationPage />} />
              <Route path="integrations/github" element={<AdminGitHubIntegrationPage />} />
              <Route path="github" element={<AdminGitHubRepositoriesPage />} />
              <Route path="github/:repositoryId" element={<AdminGitHubRepositoryPage />} />
              <Route path="projects" element={<AdminProjectsPage />} />
              <Route path="projects/import" element={<AdminGitHubRepositoriesPage />} />
              <Route path="projects/import/github" element={<AdminGitHubRepositoriesPage />} />
              <Route path="projects/new" element={<AdminProjectEditorPage />} />
              <Route path="projects/:id" element={<AdminProjectEditorPage />} />
              <Route path="pages" element={<AdminPagesPage />} />
              <Route path="articles" element={<AdminArticlesPage />} />
              <Route path="articles/new" element={<AdminArticleEditorPage />} />
              <Route path="articles/:id" element={<AdminArticleEditorPage />} />
              <Route path="social-links" element={<AdminSocialLinksPage />} />
              <Route path="experience" element={<AdminExperiencePage />} />
              <Route path="leadership" element={<AdminLeadershipPage />} />
              <Route path="appearance" element={<AdminAppearancePage />} />
              <Route path="case-studies" element={<AdminCaseStudiesPage />} />
              <Route path="case-studies/new" element={<AdminCaseStudyEditorPage />} />
              <Route path="case-studies/:id" element={<AdminCaseStudyEditorPage />} />
              <Route path="data" element={<AdminDataProjectsPage />} />
              <Route path="data/new" element={<AdminDataEditorPage />} />
              <Route path="data/:id" element={<AdminDataEditorPage />} />
              <Route path="media" element={<AdminMediaPage />} />
              <Route path="account" element={<AdminAccountPage />} />
              <Route path="security" element={<AdminSecurityPage />} />
              <Route path="security/sessions" element={<AdminSecuritySessionsPage />} />
            </Route>
          </Route>
        </Routes>
          </Suspense>
        </AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
