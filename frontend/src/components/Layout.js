import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Cog,
  CalendarClock,
  Boxes,
  Users,
  Wrench,
  BarChart3,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/machines", label: "Manajemen Mesin", icon: Cog },
  { to: "/schedules", label: "Jadwal Pemeliharaan", icon: CalendarClock },
  { to: "/spareparts", label: "Manajemen Sparepart", icon: Boxes },
  { to: "/technicians", label: "Manajemen Teknisi", icon: Users },
  { to: "/repairs", label: "Perbaikan & Riwayat", icon: Wrench },
  { to: "/reports", label: "Laporan & Analisa", icon: BarChart3 },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Berhasil keluar");
    navigate("/login");
  };

  const items = [...nav];
  if (isAdmin) items.push({ to: "/users", label: "Manajemen Pengguna", icon: ShieldCheck });

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-50 inset-y-0 left-0 w-72 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        data-testid="sidebar"
      >
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-sky-600 flex items-center justify-center font-heading font-extrabold text-xl">
            SE
          </div>
          <div>
            <div className="font-heading font-extrabold text-lg tracking-wide leading-none">
              SATRIA
            </div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
              Engineering
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={`nav-${it.to.slice(1)}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sky-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <it.icon className="w-5 h-5 shrink-0" />
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-slate-700" data-testid="profile-photo">
              <img src="/logo.png" alt="Satria Engineering" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" data-testid="current-user-name">
                {user?.name}
              </div>
              <Badge
                className={`mt-0.5 text-[10px] ${
                  isAdmin ? "bg-sky-600" : "bg-slate-600"
                } text-white border-0`}
                data-testid="current-user-role"
              >
                {isAdmin ? "Admin" : "User (Lihat Saja)"}
              </Badge>
            </div>
          </div>
          <Button
            variant="secondary"
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 border-0"
            onClick={handleLogout}
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:hidden flex items-center justify-between px-4 bg-slate-900 text-white border-b border-slate-800">
          <button onClick={() => setOpen(!open)} data-testid="menu-toggle">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-heading font-bold tracking-wide">SATRIA ENGINEERING</span>
          <span className="w-6" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
