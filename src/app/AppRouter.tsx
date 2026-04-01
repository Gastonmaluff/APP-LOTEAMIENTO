import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "../components/admin/AdminShell";
import { RequireAdminAuth } from "../components/admin/RequireAdminAuth";
import {
  ADMIN_DASHBOARD_ROUTE,
  ADMIN_LOGIN_ROUTE,
  ADMIN_LOTE_DETAIL_ROUTE,
  ADMIN_LOTES_ROUTE,
  PUBLIC_PROJECT_ROUTE
} from "../config/project";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { AdminLotDetailPage } from "../pages/admin/AdminLotDetailPage";
import { AdminLotsPage } from "../pages/admin/AdminLotsPage";
import { ProjectPublicPage } from "../pages/public/ProjectPublicPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={PUBLIC_PROJECT_ROUTE} replace />} />
      <Route path={PUBLIC_PROJECT_ROUTE} element={<ProjectPublicPage />} />
      <Route path={ADMIN_LOGIN_ROUTE} element={<AdminLoginPage />} />

      <Route element={<RequireAdminAuth />}>
        <Route element={<AdminShell />}>
          <Route path={ADMIN_DASHBOARD_ROUTE} element={<AdminDashboardPage />} />
          <Route path={ADMIN_LOTES_ROUTE} element={<AdminLotsPage />} />
          <Route path={ADMIN_LOTE_DETAIL_ROUTE} element={<AdminLotDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={PUBLIC_PROJECT_ROUTE} replace />} />
    </Routes>
  );
}
