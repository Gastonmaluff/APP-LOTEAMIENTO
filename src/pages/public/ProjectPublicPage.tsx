import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InfoPanel } from "../../components/InfoPanel";
import { MapViewer } from "../../components/MapViewer";
import { StatusLegend } from "../../components/StatusLegend";
import { ADMIN_LOGIN_ROUTE, PROJECT_NAME, PROJECT_SLUG } from "../../config/project";
import { useLots } from "../../contexts/LotsContext";
import type { LotData } from "../../types/lots";

export function ProjectPublicPage() {
  const { error, loading, lots, seedRecommended, source } = useLots();
  const [activeItem, setActiveItem] = useState<LotData | null>(null);
  const [hoveredItem, setHoveredItem] = useState<LotData | null>(null);

  const metrics = useMemo(() => {
    const vendibleLots = lots.filter((item) => item.type === "lote");
    return {
      total: vendibleLots.length,
      available: vendibleLots.filter((item) => item.status === "available").length,
      reserved: vendibleLots.filter((item) => item.status === "reserved").length,
      sold: vendibleLots.filter((item) => item.status === "sold").length
    };
  }, [lots]);

  useEffect(() => {
    console.log("[ProjectPublicPage] Fuente visible de lotes:", {
      source,
      loading,
      seedRecommended,
      lotsCount: lots.length
    });
  }, [loading, lots.length, seedRecommended, source]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ec_0%,#eef5f6_40%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#17323d_0%,#2f7b83_42%,#d3ece5_100%)] shadow-soft">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-100">
                Vista publica conectada
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {PROJECT_NAME} con mapa SVG interactivo y lectura de lotes desde Firestore.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-50/90 sm:text-base">
                Hover y click siguen funcionando por id del SVG, pero los estados y datos comerciales ahora
                pueden persistirse y editarse desde el portal admin.
              </p>
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/15 bg-slate-950/20 p-4 backdrop-blur">
              <StatusLegend />
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Lotes" value={String(metrics.total)} />
                <MetricCard label="Disponibles" value={String(metrics.available)} />
                <MetricCard label="Reservados" value={String(metrics.reserved)} />
                <MetricCard label="Vendidos" value={String(metrics.sold)} />
              </div>
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white/80 px-5 py-4 shadow-soft backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
                  Mapa embebido
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  SVG real, ids intactos y datos sincronizados desde Firestore cuando el proyecto ya fue sembrado.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <SourceBadge source={source} />
                <Link
                  to={ADMIN_LOGIN_ROUTE}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
                >
                  Portal admin
                </Link>
              </div>
            </div>

            {error ? (
              <section className="rounded-[24px] border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                {error}
              </section>
            ) : null}

            {seedRecommended ? (
              <section className="rounded-[24px] border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-950">
                Firestore todavia no tiene lotes sembrados para el proyecto `{PROJECT_SLUG}`. La vista sigue
                operativa con datos iniciales locales hasta que ejecutes el seed desde el admin.
              </section>
            ) : null}

            <MapViewer lots={lots} onActiveChange={setActiveItem} onHoverChange={setHoveredItem} />
          </section>

          <div className="space-y-4">
            <InfoPanel activeItem={activeItem} hoveredItem={hoveredItem} />
            <section className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-soft backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
                Arquitectura actual
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  La capa visual del mapa sigue reaccionando por prefijo de id: `lote_`, `area_` y `road_`.
                </p>
                <p>
                  El origen de datos ahora puede venir de Firestore o del fallback inicial, sin tocar el SVG ni
                  romper hover, click o colores por estado.
                </p>
                <p>
                  El admin escribe documentos reales en `projects/{PROJECT_SLUG}/lots` usando el id del SVG como
                  document id.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "firestore" | "seed-data" | "local-fallback" }) {
  const copy =
    source === "firestore"
      ? { label: "Fuente: Firestore", className: "border-emerald-200 text-emerald-700" }
      : source === "seed-data"
        ? { label: "Fuente: seed local", className: "border-sky-200 text-sky-700" }
        : { label: "Fuente: fallback local", className: "border-amber-200 text-amber-700" };

  return (
    <div className={`rounded-full border px-4 py-2 text-xs font-medium ${copy.className}`}>{copy.label}</div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/12 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-50/80">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
