import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ADMIN_LOGIN_ROUTE } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";

export function RequireAdminAuth() {
  const location = useLocation();
  const { isAdmin, loading, signOutUser, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">Admin</p>
          <h1 className="mt-3 text-2xl font-semibold">Verificando sesion...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ADMIN_LOGIN_ROUTE} replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">Acceso restringido</p>
          <h1 className="mt-3 text-2xl font-semibold">Tu usuario no tiene permiso para el portal admin.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Si queres limitar administradores, agrega el correo a VITE_ADMIN_ALLOWED_EMAILS y volve a iniciar sesion.
          </p>
          <button
            type="button"
            onClick={() => {
              void signOutUser();
            }}
            className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-50"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
