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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5efe6_0%,#f8f5ef_48%,#fcfbf8_100%)] text-slate-900">
      <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-40 rounded-[30px] border border-stone-200/90 bg-white/88 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#715b3b]">Administracion</p>
              <h1 className="font-display mt-2 text-3xl text-[#092930]">{PROJECT_NAME}</h1>
              <p className="mt-2 text-sm text-slate-600">Panel comercial para operar lotes, precios y disponibilidad.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <nav className="flex flex-wrap items-center gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "rounded-full px-4 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-[#0f2f35] text-white"
                          : "text-slate-700 hover:bg-[#f3ede3] hover:text-[#092930]"
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="rounded-full border border-stone-200 bg-[#f7f1e8] px-4 py-2 text-xs text-slate-700">
                {user?.email ?? "Sin usuario"}
              </div>
              <button
                type="button"
                onClick={() => {
                  void signOutUser();
                }}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </header>

        <main className="mt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
