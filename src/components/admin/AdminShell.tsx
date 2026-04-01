import { NavLink, Outlet } from "react-router-dom";
import {
  ADMIN_DASHBOARD_ROUTE,
  ADMIN_LOTES_ROUTE,
  PROJECT_NAME,
  PUBLIC_PROJECT_ROUTE
} from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { to: ADMIN_DASHBOARD_ROUTE, label: "Dashboard" },
  { to: ADMIN_LOTES_ROUTE, label: "Lotes" },
  { to: PUBLIC_PROJECT_ROUTE, label: "Ver sitio" }
];

export function AdminShell() {
  const { signOutUser, user } = useAuth();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#08121e_0%,#0f172a_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/10 bg-white/5 px-6 py-6 shadow-soft backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-200">
                Portal admin
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{PROJECT_NAME}</h1>
              <p className="mt-2 text-sm text-slate-300">Firestore + Auth para operar los lotes del proyecto.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
                {user?.email ?? "Sin usuario"}
              </div>
              <button
                type="button"
                onClick={() => {
                  void signOutUser();
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-soft backdrop-blur">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "block rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
