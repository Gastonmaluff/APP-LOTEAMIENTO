import { Link } from "react-router-dom";
import {
  ADMIN_LOTES_ROUTE,
  PROJECT_NAME,
  PROJECT_SLUG,
  PUBLIC_PROJECT_ROUTE
} from "../../config/project";
import { unmatchedLots } from "../../data/structuredLotsData";
import { useAuth } from "../../contexts/AuthContext";
import { useLots } from "../../contexts/LotsContext";
import { seedProjectLots } from "../../services/lotsRepository";

import { useMemo, useState } from "react";

export function AdminDashboardPage() {
  const { lots, seedRecommended, source } = useLots();
  const { user } = useAuth();

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const metrics = useMemo(() => {
    const vendibleLots = lots.filter((item) => item.type === "lote");
    return {
      total: vendibleLots.length,
      available: vendibleLots.filter((item) => item.status === "available").length,
      reserved: vendibleLots.filter((item) => item.status === "reserved").length,
      sold: vendibleLots.filter((item) => item.status === "sold").length
    };
  }, [lots]);

  async function handleSeed() {
    setSeeding(true);
    setMessage(null);
    setError(null);

    try {
      const result = await seedProjectLots(PROJECT_SLUG, user?.email ?? null);
      setMessage(`Seed completado. ${result.lotsCount} documentos sincronizados en Firestore.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo ejecutar el seed.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">Resumen</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold text-white">{PROJECT_NAME}</h2>
            <p className="mt-2 text-sm text-slate-300">
              Proyecto `{PROJECT_SLUG}` conectado a Firestore y listo para operacion admin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleSeed();
              }}
              disabled={seeding}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {seeding ? "Sembrando..." : "Sembrar Firestore"}
            </button>
            <Link
              to={ADMIN_LOTES_ROUTE}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Gestionar lotes
            </Link>
            <Link
              to={PUBLIC_PROJECT_ROUTE}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Abrir sitio publico
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Lotes" value={String(metrics.total)} />
        <DashboardCard label="Disponibles" value={String(metrics.available)} />
        <DashboardCard label="Reservados" value={String(metrics.reserved)} />
        <DashboardCard label="Vendidos" value={String(metrics.sold)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">Estado del backend</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
            <p>
              Fuente actual de datos: <span className="font-semibold text-white">{source}</span>
            </p>
            <p>
              {seedRecommended
                ? "Firestore aun no devuelve documentos para este proyecto. El seed va a crear el documento del proyecto y la subcoleccion lots."
                : "Firestore ya esta respondiendo documentos y alimenta la vista publica."}
            </p>
            <p>
              La coleccion `adminActivity` ya se usa para registrar seeds y actualizaciones. `visitRequests`
              queda preparada para la siguiente fase.
            </p>
          </div>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">No mapeados del PDF</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            {unmatchedLots.length === 0 ? (
              <p>Todo lo extraido del PDF se pudo vincular al SVG actual.</p>
            ) : (
              unmatchedLots.map((item) => (
                <div key={item.rawLabel} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="font-semibold text-white">{item.rawLabel}</p>
                  <p className="mt-1 text-slate-300">{item.reason}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function DashboardCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 shadow-soft backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
