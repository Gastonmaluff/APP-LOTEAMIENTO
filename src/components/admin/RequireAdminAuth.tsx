import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ADMIN_LOGIN_ROUTE } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";

export function RequireAdminAuth() {
  const location = useLocation();
  const { isAdmin, loading, signOutUser, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5efe6_0%,#f8f5ef_48%,#fcfbf8_100%)] px-4 text-slate-900">
        <div className="w-full max-w-md rounded-[30px] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Admin</p>
          <h1 className="font-display mt-3 text-2xl text-[#092930]">Verificando sesion...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ADMIN_LOGIN_ROUTE} replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5efe6_0%,#f8f5ef_48%,#fcfbf8_100%)] px-4 text-slate-900">
        <div className="w-full max-w-lg rounded-[30px] border border-stone-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Acceso restringido</p>
          <h1 className="font-display mt-3 text-2xl text-[#092930]">Tu usuario no tiene permiso para este panel.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Si queres limitar administradores, agrega el correo a VITE_ADMIN_ALLOWED_EMAILS y volve a iniciar sesion.
          </p>
          <button
            type="button"
            onClick={() => {
              void signOutUser();
            }}
            className="mt-6 rounded-full bg-[#0f2f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#143b43]"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
