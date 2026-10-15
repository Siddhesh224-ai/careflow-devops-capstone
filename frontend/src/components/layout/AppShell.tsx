import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  Stethoscope,
  Users,
  LogOut,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";

const adminNavigation = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const navigation = user?.role === "DOCTOR"
    ? [{ to: "/doctor", label: "My dashboard", icon: Stethoscope }]
    : adminNavigation;
  return (
    <div className="flex h-full flex-col bg-[#102d32] text-white">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500">
          <span className="text-lg font-bold">C</span>
        </div>
        <div>
          <div className="font-semibold tracking-tight">CareFlow</div>
          <div className="text-xs text-teal-100/60"> CareFlow Clinic operations</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-white/12 text-white" : "text-teal-50/70 hover:bg-white/7 hover:text-white"}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs leading-relaxed text-teal-50/50">
        Demonstration environment
        <br />
        Synthetic data only
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigation = user?.role === "DOCTOR"
    ? [{ to: "/doctor", label: "My dashboard", icon: Stethoscope }]
    : adminNavigation;
  const current =
    navigation.find((item) => item.to === location.pathname)?.label ??
    "CareFlow";
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-[280px]">
            <button
              className="absolute right-3 top-5 z-10 rounded-md p-2 text-white"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <main className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold">{current}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold">{user?.role === "DOCTOR" ? "Doctor" : "Clinic Administrator"}</div>
              <div className="text-[11px] text-slate-500">{user?.username}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
              {user?.role === "DOCTOR" ? "DR" : "CA"}
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="p-4 sm:p-7 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
