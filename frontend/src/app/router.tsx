import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "../components/layout/AppShell";
import { InlineLoading } from "../components/ui/States";
import { LoginPage } from "../features/auth/LoginPage";
import { RequireRole } from "../features/auth/RequireRole";

const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const PatientsPage = lazy(() =>
  import("../features/patients/PatientsPage").then((module) => ({
    default: module.PatientsPage,
  })),
);
const DoctorsPage = lazy(() =>
  import("../features/doctors/DoctorsPage").then((module) => ({
    default: module.DoctorsPage,
  })),
);
const AppointmentsPage = lazy(() =>
  import("../features/appointments/AppointmentsPage").then((module) => ({
    default: module.AppointmentsPage,
  })),
);
const DoctorDashboardPage = lazy(() =>
  import("../features/doctor-portal/DoctorDashboardPage").then((module) => ({
    default: module.DoctorDashboardPage,
  })),
);
const load = (page: React.ReactNode) => (
  <Suspense fallback={<InlineLoading />}>{page}</Suspense>
);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireRole role="ADMIN"><AppShell /></RequireRole>,
    children: [
      { index: true, element: load(<DashboardPage />) },
      { path: "patients", element: load(<PatientsPage />) },
      { path: "doctors", element: load(<DoctorsPage />) },
      { path: "appointments", element: load(<AppointmentsPage />) },
      {
        path: "*",
        element: (
          <div className="surface p-10 text-center">
            <h1 className="text-xl font-semibold">Page not found</h1>
            <p className="mt-2 text-sm text-slate-500">
              Use the navigation to return to CareFlow.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    path: "/doctor",
    element: <RequireRole role="DOCTOR"><AppShell /></RequireRole>,
    children: [{ index: true, element: load(<DoctorDashboardPage />) }],
  },
]);
