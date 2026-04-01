import type { LotData } from "../types/lots";
import { formatArea, formatPrice, getFeatureLabel } from "../utils/mapUtils";

type InfoPanelProps = {
  activeItem: LotData | null;
  hoveredItem: LotData | null;
};

const statusCopy = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido"
} as const;

export function InfoPanel({ activeItem, hoveredItem }: InfoPanelProps) {
  const item = activeItem ?? hoveredItem;

  if (!item) {
    return (
      <aside className="rounded-[28px] border border-white/10 bg-white/90 p-6 shadow-soft backdrop-blur">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
              Vista del loteamiento
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Selecciona un lote o un area
            </h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            El mapa responde a hover y click usando los IDs reales del SVG. Los lotes muestran estado,
            area y referencia comercial; las areas muestran informacion institucional; los caminos no abren ficha.
          </p>
        </div>
      </aside>
    );
  }

  const isPersistent = activeItem?.id === item.id;

  return (
    <aside className="rounded-[28px] border border-white/10 bg-white/95 p-6 shadow-soft backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
            {getFeatureLabel(item.type)}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{item.name ?? item.id}</h2>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
          {isPersistent ? "Seleccionado" : "Hover"}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Metric label="ID" value={item.id} />
        <Metric label="Manzana" value={item.manzana ?? "No aplica"} />
        <Metric label="Lote" value={item.lotNumber ?? "No aplica"} />
        <Metric
          label="Estado"
          value={item.status ? statusCopy[item.status] : item.type === "road" ? "Solo referencia" : "Sin definir"}
        />
        <Metric label="Area" value={formatArea(item.area)} />
        <Metric label="Precio" value={formatPrice(item.price, item.currency)} />
      </div>

      <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-200">
        <p>{item.description ?? "Sin descripcion."}</p>
        {item.financingText ? <p className="mt-3 text-slate-300">{item.financingText}</p> : null}
      </div>
    </aside>
  );
}

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
