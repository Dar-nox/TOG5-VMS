import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ConnectionProblemScreen } from "../components/auth/ConnectionProblemScreen";
import { NotAdmittedScreen } from "../components/auth/NotAdmittedScreen";
import { NotConfiguredScreen } from "../components/auth/NotConfiguredScreen";
import { SignInScreen } from "../components/auth/SignInScreen";
import { AppShell } from "../components/shell/AppShell";
import { SkeletonRows } from "../components/ui/Spinner";
import { isConfigured } from "../services/api/client";
import { AuthProvider } from "./providers/AuthProvider";
import { useAuth } from "./providers/authContext";
import { ConfirmProvider } from "./providers/ConfirmProvider";
import { FormatProvider } from "./providers/FormatProvider";
import { PeopleProvider } from "./providers/PeopleProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { useHardwareBack } from "./useHardwareBack";

/**
 * Each screen is fetched when it is first opened rather than shipped in one
 * bundle. The whole app was a single 562 KB chunk, which is a long wait on a
 * phone at a petrol station for a screen the driver may not open.
 */
const DashboardPage = lazy(() => import("./routes/DashboardPage"));
const VehiclesPage = lazy(() => import("./routes/VehiclesPage"));
const VehiclePage = lazy(() => import("./routes/VehiclePage"));
const VehicleEditorPage = lazy(() => import("./routes/VehicleEditorPage"));
const AlertsPage = lazy(() => import("./routes/AlertsPage"));
const ReportsPage = lazy(() => import("./routes/ReportsPage"));
const SettingsPage = lazy(() => import("./routes/SettingsPage"));

export function App() {
  // Checked before the provider, because a provider with nowhere to connect to
  // would spend its first render asking an address that does not exist and
  // report it as a connection problem — which sends somebody looking at their
  // wi-fi instead of at the deployment.
  if (!isConfigured) {
    return <NotConfiguredScreen />;
  }

  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

/** Nothing renders until we know who is using the app. */
function AppGate() {
  const { phase } = useAuth();

  switch (phase) {
    case "checking":
      return <SplashScreen />;
    case "unreachable":
      return <ConnectionProblemScreen />;
    case "signed-out":
      return <SignInScreen />;
    case "not-admitted":
      return <NotAdmittedScreen />;
    case "signed-in":
      return <Workspace />;
  }
}

function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-page p-6">
      <p className="text-sm text-muted" role="status">
        Loading TOG 5 VMS…
      </p>
    </div>
  );
}

function Workspace() {
  return (
    <FormatProvider>
      <PeopleProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <RoutedApp />
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </PeopleProvider>
    </FormatProvider>
  );
}

function RoutedApp() {
  useHardwareBack();

  return (
    <Routes>
      <Route element={<AppShell />} path="/">
        <Route
          index
          element={
            <PageFrame>
              <DashboardPage />
            </PageFrame>
          }
        />
        <Route
          element={
            <PageFrame>
              <VehiclesPage />
            </PageFrame>
          }
          path="vehicles"
        />
        {/* Before the vehicle route, so "new" is not read as an id. */}
        <Route
          element={
            <PageFrame>
              <VehicleEditorPage />
            </PageFrame>
          }
          path="vehicles/new"
        />
        {/* Static "edit" outranks the :tab parameter below it. */}
        <Route
          element={
            <PageFrame>
              <VehicleEditorPage />
            </PageFrame>
          }
          path="vehicles/:vehicleId/edit"
        />
        {/* The tab is part of the address, so a link can point at a vehicle's
            fuel history and the back button steps between tabs. */}
        <Route
          element={
            <PageFrame>
              <VehiclePage />
            </PageFrame>
          }
          path="vehicles/:vehicleId/:tab?"
        />
        <Route
          element={
            <PageFrame>
              <AlertsPage />
            </PageFrame>
          }
          path="alerts"
        />
        <Route
          element={
            <PageFrame>
              <ReportsPage />
            </PageFrame>
          }
          path="reports"
        />
        <Route
          element={
            <PageFrame>
              <SettingsPage />
            </PageFrame>
          }
          path="settings"
        />
        {/* An address that means nothing goes home rather than showing a blank
            page. */}
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SkeletonRows rows={3} />}>{children}</Suspense>;
}
