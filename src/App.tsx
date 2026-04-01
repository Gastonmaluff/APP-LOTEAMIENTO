import { useMemo, useState } from "react";
import { InfoPanel } from "./components/InfoPanel";
import { MapViewer } from "./components/MapViewer";
import { StatusLegend } from "./components/StatusLegend";
import { lotsData } from "./data/lotsData";
import type { LotData } from "./types/lots";

function App() {
  const [activeItem, setActiveItem] = useState<LotData | null>(null);
  const [hoveredItem, setHoveredItem] = useState<LotData | null>(null);

  const metrics = useMemo(() => {
    const lots = lotsData.filter((item) => item.type === "lote");
    return {
      total: lots.length,
      available: lots.filter((item) => item.status === "available").length,
      reserved: lots.filter((item) => item.status === "reserved").length,
      sold: lots.filter((item) => item.status === "sold").length
    };
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ec_0%,#eef5f6_40%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#17323d_0%,#2f7b83_42%,#d3ece5_100%)] shadow-soft">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-100">
                MVP interactivo
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Loteamiento Viva Lago con mapa SVG interactivo y estados comerciales mock.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-50/90 sm:text-base">
                Base lista para reemplazar los datos manuales por informacion estructurada desde PDF, APIs
                o un backend futuro, sin reescribir la logica del visor.
              </p>
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/15 bg-slate-950/20 p-4 backdrop-blur">
              <StatusLegend />
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Lotes mock" value={String(metrics.total)} />
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
                  Hover suave, click persistente y colores por estado sin alterar los IDs del SVG original.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600">
                Fuente: <span className="font-semibold text-slate-900">/public/mapa-loteamiento.svg</span>
              </div>
            </div>

            <MapViewer onActiveChange={setActiveItem} onHoverChange={setHoveredItem} />
          </section>

          <div className="space-y-4">
            <InfoPanel activeItem={activeItem} hoveredItem={hoveredItem} />
            <section className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-soft backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
                Preparado para datos reales
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  La UI consume objetos tipados `LotData`. Cuando extraigamos el PDF, solo tendremos que
                  transformar esa fuente al mismo contrato y reemplazar `lotsData.ts`.
                </p>
                <p>
                  El componente del mapa ya decide el comportamiento por prefijo de `id`, asi que la capa de
                  datos futura podra venir de JSON, Firestore o un endpoint sin tocar el SVG.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
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

export default App;
