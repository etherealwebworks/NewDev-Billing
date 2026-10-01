import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SplashScreen from "./components/ui/SplashScreen";

import Login from "./pages/auth/Login";

import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Clients from "./pages/admin/Clients";
import StaffManagement from "./pages/admin/StaffManagement";
import Projects from "./pages/admin/Projects";
import Services from "./pages/admin/Services";
import Invoices from "./pages/admin/Invoices";
import InvoiceView from "./pages/admin/InvoiceView";
import Payments from "./pages/admin/Payments";
import Reports from "./pages/admin/Reports";
import CompanySettings from "./pages/admin/CompanySettings";

import StaffLayout from "./components/layout/StaffLayout";
import StaffDashboard from "./pages/staff/StaffDashboard";
import MyClients from "./pages/staff/MyClients";
import MyProjects from "./pages/staff/MyProjects";

// Reads the auth bootstrap state so the dark-logo splash (Section 3 of the
// Phase 8 addendum) shows until the initial session check resolves, then
// fades into the real app.
function AppShell() {
  const { loading } = useAuth();

  return (
    <>
      <SplashScreen show={loading} />
      {!loading && (
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="projects" element={<Projects />} />
            <Route path="services" element={<Services />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceView />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<CompanySettings />} />
          </Route>

          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["staff"]}>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StaffDashboard />} />
            <Route path="clients" element={<MyClients />} />
            <Route path="projects" element={<MyProjects />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
