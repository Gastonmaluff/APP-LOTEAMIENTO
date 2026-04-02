import { Outlet } from "react-router-dom";
import { PUBLIC_PROJECT_ROUTE } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";

export function AdminShell() {
  const { signOutUser, user } = useAuth();
  const logoImageSrc = `${import.meta.env.BASE_URL}images/viva-lago-logo.png`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5efe6_0%,#f8f5ef_48%,#fcfbf8_100%)] text-slate-900">
      <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-40 rounded-[30px] border border-stone-200/90 bg-white/88 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <img src={logoImageSrc} alt="Logo de Viva Lago Country." className="h-12 w-auto object-contain sm:h-14" />

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={PUBLIC_PROJECT_ROUTE}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
              >
                Ver sitio
              </a>

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
