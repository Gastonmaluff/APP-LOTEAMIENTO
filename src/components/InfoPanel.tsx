import type { LotData } from "../types/lots";
import {
  formatArea,
  formatInstallments,
  formatPercent,
  formatPrice,
  getFeatureLabel,
  getStatusLabel
} from "../utils/mapUtils";

type InfoPanelProps = {
  activeItem: LotData | null;
  hoveredItem: LotData | null;
  whatsappHref?: string;
  requestVisitHref?: string;
};

export function InfoPanel({
  activeItem,
  hoveredItem,
  requestVisitHref = "#contacto",
  whatsappHref = "#contacto"
}: InfoPanelProps) {
  const item = activeItem ?? hoveredItem;

  if (!item) {
    return (
      <aside className="w-full max-w-full overflow-hidden rounded-[30px] border border-stone-200 bg-white/94 shadow-soft backdrop-blur">
        <div className="border-b border-stone-100 bg-[linear-gradient(180deg,rgba(244,237,227,0.72),rgba(255,255,255,0.9))] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">Ficha del lote</p>
          <h2 className="font-display mt-3 text-[1.7rem] font-semibold leading-tight text-slate-900 sm:text-[2rem]">
            Selecciona un lote para ver su informacion.
          </h2>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <p className="text-sm leading-7 text-slate-600">
            Explora el mapa y descubre superficie, precio, estado y opciones de consulta para cada lote.
          </p>

          <div className="grid gap-3">
            <Hint title="Disponibilidad clara" copy="Los colores del mapa ayudan a ubicar lotes disponibles, reservados o vendidos." />
            <Hint title="Informacion comercial" copy="Cada ficha resume lo esencial para comparar y tomar una decision." />
            <Hint title="Contacto simple" copy="Desde aqui puedes avanzar directo por WhatsApp o solicitar una visita." />
          </div>
        </div>
      </aside>
    );
  }

  const isPersistent = activeItem?.id === item.id;
  const statusLabel = getStatusLabel(item.status, item.type);
  const statusClass =
    item.status === "available"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : item.status === "reserved"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : item.status === "sold"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <aside className="w-full max-w-full overflow-hidden rounded-[30px] border border-stone-200 bg-white/96 shadow-soft backdrop-blur">
      <div className="border-b border-stone-100 bg-[linear-gradient(180deg,rgba(248,244,236,0.9),rgba(255,255,255,0.9))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">
              {getFeatureLabel(item.type)}
            </p>
            <h2 className="font-display mt-3 break-words text-[1.75rem] font-semibold leading-tight text-slate-900 sm:text-[2.1rem]">
              {item.name ?? "Lote seleccionado"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {item.manzana ? `${item.manzana} - lote ${item.lotNumber ?? "-"}` : item.id}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
              {statusLabel}
            </span>
            <span className="rounded-full border border-stone-200 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
              {isPersistent ? "Seleccionado" : "Vista previa"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Manzana" value={item.manzana ?? "Consultar"} />
          <Metric label="Lote" value={item.lotNumber ?? "Consultar"} />
          <Metric label="Superficie" value={formatArea(item.area)} />
          <Metric label="Precio" value={formatPrice(item.price, item.currency)} />
          <Metric label="Precio final" value={formatPrice(item.finalPrice, item.currency)} />
          <Metric label="Moneda" value={item.currency ?? "Consultar"} />
          <Metric label="Entrega" value={formatPercent(item.deliveryPercent)} />
          <Metric label="Cuotas" value={formatInstallments(item.installments)} />
        </div>

        <div className="rounded-[24px] border border-stone-200 bg-stone-50/90 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Financiacion</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {item.financingText ?? "Consulta las opciones disponibles para este lote con nuestro equipo comercial."}
          </p>
        </div>

        <div className="rounded-[24px] bg-slate-950 p-5 text-sm leading-7 text-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-100">Descripcion</p>
          <p className="mt-3">
            {item.description ??
              "Un espacio pensado para acompanar tu proximo proyecto con informacion clara y acceso simple a consulta."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Consultar por WhatsApp
          </a>
          <a
            href={requestVisitHref}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-brand-300 hover:text-brand-700"
          >
            Solicitar visita
          </a>
        </div>
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
    <div className="rounded-[22px] border border-stone-200 bg-white px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function Hint({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="rounded-[22px] border border-stone-200 bg-stone-50/70 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
    </div>
  );
}
