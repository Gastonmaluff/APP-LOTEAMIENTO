import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ADMIN_DASHBOARD_ROUTE, PUBLIC_PROJECT_ROUTE } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";

type LocationState = {
  from?: string;
};

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isConfigured, loading, signIn, user } = useAuth();

  const redirectTo = (location.state as LocationState | null)?.from ?? ADMIN_DASHBOARD_ROUTE;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAdmin, loading, navigate, redirectTo, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar sesion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#08121e_0%,#0f172a_100%)] px-4 py-8 text-slate-100">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_440px]">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-200">Firebase Auth</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Portal admin protegido para Viva Lago.</h1>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
            <p>
              Desde aca se administra el inventario real del loteamiento, se guarda en Firestore y la vista
              publica se actualiza automaticamente.
            </p>
            <p>
              Usa un usuario de Firebase Authentication con email y password. Si definis
              `VITE_ADMIN_ALLOWED_EMAILS`, solo esos correos podran entrar al admin.
            </p>
          </div>
          <Link
            to={PUBLIC_PROJECT_ROUTE}
            className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver al mapa publico
          </Link>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white p-8 text-slate-900 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Login admin</p>
          <h2 className="mt-3 text-2xl font-semibold">Ingresar al dashboard</h2>

          {!isConfigured ? (
            <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              Firebase no esta configurado todavia. Crea un archivo `.env.local` con las variables
              `VITE_FIREBASE_*` antes de intentar iniciar sesion.
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white"
                placeholder="admin@tuempresa.com"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-brand-400 focus:bg-white"
                placeholder="********"
                required
              />
            </Field>

            <button
              type="submit"
              disabled={submitting || !isConfigured}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Ingresando..." : "Entrar al admin"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
