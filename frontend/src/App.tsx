import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { SiteSettingsProvider } from "@/app/SiteSettingsProvider";
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
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const NowPage = lazy(() => import("@/pages/NowPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminProjectsPage = lazy(() => import("@/pages/admin/AdminProjectsPage"));
const AdminProjectEditorPage = lazy(() => import("@/pages/admin/AdminProjectEditorPage"));
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

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <InlineLoading label="Loading page" />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            element={
              <SiteSettingsProvider>
                <PublicLayout />
              </SiteSettingsProvider>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="work" element={<WorkPage />} />
            <Route path="work/:slug" element={<ProjectDetailPage />} />
            <Route path="case-studies/:slug" element={<CaseStudyPage />} />
            <Route path="data-lab" element={<DataLabPage />} />
            <Route path="data/:slug" element={<DataProjectDetailPage />} />
            <Route path="build-lab" element={<BuildLabPage />} />
            <Route path="leadership" element={<LeadershipPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="now" element={<NowPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route path="projects/:id/preview" element={<AdminProjectPreviewPage />} />
            <Route path="data/:id/preview" element={<AdminDataPreviewPage />} />
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="projects" element={<AdminProjectsPage />} />
              <Route path="projects/new" element={<AdminProjectEditorPage />} />
              <Route path="projects/:id" element={<AdminProjectEditorPage />} />
              <Route path="case-studies" element={<AdminCaseStudiesPage />} />
              <Route path="case-studies/new" element={<AdminCaseStudyEditorPage />} />
              <Route path="case-studies/:id" element={<AdminCaseStudyEditorPage />} />
              <Route path="data" element={<AdminDataProjectsPage />} />
              <Route path="data/new" element={<AdminDataEditorPage />} />
              <Route path="data/:id" element={<AdminDataEditorPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </MotionConfig>
  );
}
