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
      <aside className="overflow-hidden rounded-[30px] border border-stone-200 bg-white/92 shadow-soft backdrop-blur">
        <div className="border-b border-stone-100 bg-[linear-gradient(180deg,rgba(244,237,227,0.72),rgba(255,255,255,0.9))] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">
              Ficha comercial
            </p>
            <h2 className="font-display mt-3 text-[2rem] font-semibold text-slate-900">
              Seleccioná un lote para ver su propuesta.
            </h2>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <p className="text-sm leading-7 text-slate-600">
            El mapa sigue siendo el protagonista: pasá el cursor para descubrir disponibilidad y hacé click
            para fijar la ficha con precio, financiación y datos del lote.
          </p>

          <div className="grid gap-3">
            <Hint title="Exploración simple" copy="Hover para una vista rápida, click para comparar con calma." />
            <Hint title="Disponibilidad visible" copy="Los colores reflejan el estado comercial actual del lote." />
            <Hint title="Consulta inmediata" copy="Desde cada ficha podés ir directo a WhatsApp o solicitar visita." />
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
    <aside className="overflow-hidden rounded-[30px] border border-stone-200 bg-white/96 shadow-soft backdrop-blur">
      <div className="border-b border-stone-100 bg-[linear-gradient(180deg,rgba(248,244,236,0.9),rgba(255,255,255,0.9))] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">
              {getFeatureLabel(item.type)}
            </p>
            <h2 className="font-display mt-3 text-[2.1rem] font-semibold text-slate-900">
              {item.name ?? item.id}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{item.id}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
              {statusLabel}
            </span>
            <span className="rounded-full border border-stone-200 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
              {isPersistent ? "Seleccionado" : "Vista rápida"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Manzana" value={item.manzana ?? "No aplica"} />
          <Metric label="Lote" value={item.lotNumber ?? "No aplica"} />
          <Metric label="Superficie" value={formatArea(item.area)} />
          <Metric label="Precio" value={formatPrice(item.price, item.currency)} />
          <Metric label="Precio final" value={formatPrice(item.finalPrice, item.currency)} />
          <Metric label="Moneda" value={item.currency ?? "Consultar"} />
          <Metric label="Entrega" value={formatPercent(item.deliveryPercent)} />
          <Metric label="Cuotas" value={formatInstallments(item.installments)} />
        </div>

        <div className="rounded-[24px] border border-stone-200 bg-stone-50/90 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Financiación</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {item.financingText ?? "Consultanos para recibir alternativas de financiación y disponibilidad actualizada."}
          </p>
        </div>

        <div className="rounded-[24px] bg-slate-950 p-5 text-sm leading-7 text-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-100">Descripción</p>
          <p className="mt-3">{item.description ?? "Sin descripción comercial adicional por el momento."}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-400">
            Fuente {item.sourcePage ? `PDF · página ${item.sourcePage}` : "sin referencia PDF"}
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
