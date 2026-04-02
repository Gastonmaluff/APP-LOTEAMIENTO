import type { RefObject } from "react";
import type { LotData } from "../types/lots";
import { SelectedLotPreview } from "./SelectedLotPreview";
import {
  formatArea,
  formatInstallments,
  formatPercent,
  getCommercialPriceSummary,
  getFeatureLabel,
  getStatusLabel
} from "../utils/mapUtils";

type InfoPanelProps = {
  activeItem: LotData | null;
  hoveredItem: LotData | null;
  previewTargetRef?: RefObject<HTMLDivElement>;
  previewVisible?: boolean;
  whatsappHref?: string;
  requestVisitHref?: string;
};

export function InfoPanel({
  activeItem,
  hoveredItem,
  previewTargetRef,
  previewVisible = true,
  requestVisitHref = "#contacto",
  whatsappHref = "#contacto"
}: InfoPanelProps) {
  const item = activeItem ?? hoveredItem;

  if (!item) {
    return (
      <aside className="w-full max-w-full overflow-hidden rounded-[30px] border border-stone-200 bg-white/94 shadow-soft backdrop-blur xl:min-h-[780px]">
        <div className="border-b border-stone-100 bg-[linear-gradient(180deg,rgba(244,237,227,0.72),rgba(255,255,255,0.9))] p-5 sm:p-6 xl:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">Ficha del lote</p>
          <h2 className="font-display mt-3 text-[1.7rem] font-semibold leading-tight text-slate-900 sm:text-[2rem] xl:text-[2.6rem]">
            Selecciona un lote para ver su informacion.
          </h2>
        </div>

        <div className="space-y-6 p-5 sm:p-6 xl:p-8">
          <p className="max-w-2xl text-sm leading-7 text-slate-600 xl:text-[1.02rem] xl:leading-8">
            Explora el mapa y descubre superficie, precio, estado y opciones de consulta para cada lote.
          </p>

          <div className="grid gap-3 xl:gap-4">
            <Hint title="Disponibilidad clara" copy="Los colores del mapa ayudan a ubicar lotes disponibles, reservados o vendidos." />
            <Hint title="Informacion comercial" copy="Cada ficha resume lo esencial para comparar y tomar una decision." />
            <Hint title="Contacto simple" copy="Desde aqui puedes avanzar directo por WhatsApp o solicitar una visita." />
          </div>
        </div>
      </aside>
    );
  }

  const statusLabel = getStatusLabel(item.status, item.type);
  const statusClass =
    item.status === "available"
      ? "border-[#cedcc8] bg-[#eff5ec] text-[#567052]"
      : item.status === "reserved"
        ? "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]"
        : item.status === "sold"
          ? "border-[#cfc7c0] bg-[#f0ece8] text-[#625a50]"
          : "border-stone-200 bg-stone-100 text-slate-600";
  const commercialPrice = getCommercialPriceSummary(item);

  return (
    <aside className="w-full max-w-full overflow-hidden rounded-[32px] border border-stone-200 bg-white/96 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur xl:min-h-[780px]">
      <div className="p-5 sm:p-6 xl:p-8">
        <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(210px,0.42fr)_minmax(0,0.58fr)] xl:items-start xl:gap-8">
          <div className="xl:pt-1">
            {item.type === "lote" ? (
              <SelectedLotPreview
                isVisible={previewVisible}
                item={item}
                previewContainerRef={previewTargetRef}
                variant="support"
              />
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">
              {getFeatureLabel(item.type)}
            </p>
            <h2 className="font-display mt-3 break-words text-[1.85rem] font-semibold leading-[1.02] text-slate-900 sm:text-[2.2rem] xl:text-[3.35rem]">
              {item.name ?? "Lote seleccionado"}
            </h2>
            <p className="mt-3 text-sm text-slate-500 xl:text-base">
              {item.manzana ? `${item.manzana} - lote ${item.lotNumber ?? "-"}` : item.id}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
                {statusLabel}
              </span>
            </div>

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{commercialPrice.label}</p>
            <p className="font-display mt-3 text-[2.35rem] leading-none text-[#092930] xl:text-[3.3rem]">
              {commercialPrice.value}
            </p>
            <p className="mt-3 text-sm text-slate-500">{commercialPrice.caption}</p>

            <dl className="mt-7 grid gap-x-8 gap-y-4 border-t border-stone-200 pt-6 sm:grid-cols-2">
              <InfoStat label={commercialPrice.label} value={commercialPrice.value} />
              <InfoStat label="Superficie" value={formatArea(item.area)} />
              <InfoStat label="Moneda" value={item.currency ?? "Consultar"} />
              <InfoStat label="Entrega" value={formatPercent(item.deliveryPercent)} />
              <InfoStat label="Cuotas" value={formatInstallments(item.installments)} />
              <InfoStat label="Estado" value={statusLabel} />
            </dl>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Consultar por WhatsApp
              </a>
              <a
                href={requestVisitHref}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-brand-300 hover:text-brand-700"
              >
                Solicitar visita
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6 xl:hidden">
          <section className="rounded-[26px] border border-stone-200 bg-[linear-gradient(180deg,#f8f4ec_0%,#f5f0e8_100%)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Financiacion</p>
            <p className="mt-4 text-[1rem] leading-8 text-slate-700">
              {item.financingText ?? "Consulta las opciones disponibles para este lote con nuestro equipo comercial."}
            </p>
          </section>

          <section className="rounded-[26px] border border-stone-200 bg-white px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Descripcion</p>
            <p className="mt-4 text-sm leading-8 text-slate-600">
              {item.description ??
                "La ficha queda preparada para seguir creciendo con mas detalles tecnicos, medidas exactas y observaciones comerciales."}
            </p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Consultar por WhatsApp
            </a>
            <a
              href={requestVisitHref}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-brand-300 hover:text-brand-700"
            >
              Solicitar visita
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-[1rem] font-medium leading-7 text-slate-900 xl:text-[1.05rem]">{value}</p>
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
