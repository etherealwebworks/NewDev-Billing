import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserCog,
  FolderKanban,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/staff", label: "Staff Management", icon: UserCog },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/services", label: "Services", icon: Package },
  { to: "/admin/invoices", label: "Invoices", icon: FileText },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Company Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // The sidebar strip is always black in both themes (deliberate constant
  // nav chrome — see Phase 8 addendum, Section 2), so it always shows the
  // dark-background logo mark regardless of the active app theme.
  const SidebarContent = (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && <Logo forceTheme="dark" className="h-7 w-auto" />}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:block"
        >
          <Menu size={16} />
        </button>
        <button
          onClick={() => setDrawerOpen(false)}
          className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isActive ? "bg-white text-ink font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper-off">
      {/* Desktop sidebar */}
      <div
        className={`hidden shrink-0 transition-all duration-200 lg:block ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {SidebarContent}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/60 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-60 lg:hidden"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border-muted bg-paper px-4 py-3 lg:hidden">
          <button onClick={() => setDrawerOpen(true)} className="rounded-lg p-1.5 text-text-dark">
            <Menu size={18} />
          </button>
          <Logo className="h-6 w-auto" />
          <ThemeToggle className="text-text-muted" />
        </header>

        <header className="hidden items-center justify-end gap-3 border-b border-border-muted bg-paper px-6 py-3 lg:flex">
          <ThemeToggle className="text-text-muted" />
          <span className="text-sm text-text-muted">{user?.full_name} · Admin</span>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
