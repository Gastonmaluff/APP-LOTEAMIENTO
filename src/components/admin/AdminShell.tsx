import { Link, Outlet } from "react-router-dom";
import { PUBLIC_PROJECT_ROUTE } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";

export function AdminShell() {
  const { signOutUser } = useAuth();
  const logoImageSrc = `${import.meta.env.BASE_URL}images/viva-lago-logo.png`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5efe6_0%,#f8f5ef_48%,#fcfbf8_100%)] text-slate-900">
      <div className="mx-auto max-w-[1560px] px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
        <header className="sticky top-2 z-40 rounded-[22px] border border-stone-200/90 bg-white/88 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:top-4 sm:rounded-[30px] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-2.5 sm:gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-3">
              <img src={logoImageSrc} alt="Logo de Viva Lago Country." className="h-10 w-auto object-contain sm:h-14" />

              <div className="flex items-center gap-2 sm:hidden">
                <Link
                  to={PUBLIC_PROJECT_ROUTE}
                  className="rounded-full border border-stone-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
                >
                  Ver sitio
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void signOutUser();
                  }}
                  className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
                >
                  Salir
                </button>
              </div>
            </div>

            <div className="hidden flex-wrap items-center gap-3 sm:flex">
              <Link
                to={PUBLIC_PROJECT_ROUTE}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
              >
                Ver sitio
              </Link>

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

        <main className="mt-5 sm:mt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
