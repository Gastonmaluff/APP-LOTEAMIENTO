import type { RefObject } from "react";
import type { LotData } from "../types/lots";
import { SelectedLotPreview } from "./SelectedLotPreview";
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

  const isPersistent = activeItem?.id === item.id;
  const statusLabel = getStatusLabel(item.status, item.type);
  const statusClass =
    item.status === "available"
      ? "border-[#cedcc8] bg-[#eff5ec] text-[#567052]"
      : item.status === "reserved"
        ? "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]"
        : item.status === "sold"
          ? "border-[#cfc7c0] bg-[#f0ece8] text-[#625a50]"
          : "border-stone-200 bg-stone-100 text-slate-600";

  const detailItems = [
    { label: "Manzana", value: item.manzana ?? "Consultar" },
    { label: "Lote", value: item.lotNumber ?? "Consultar" },
    { label: "Superficie", value: formatArea(item.area) },
    { label: "Moneda", value: item.currency ?? "Consultar" },
    { label: "Entrega", value: formatPercent(item.deliveryPercent) },
    { label: "Cuotas", value: formatInstallments(item.installments) }
  ];

  return (
    <aside className="w-full max-w-full overflow-hidden rounded-[32px] border border-stone-200 bg-white/96 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur xl:min-h-[780px]">
      <div className="p-5 sm:p-6 xl:p-8">
        <div className="flex flex-col gap-6 border-b border-stone-200/90 pb-6 xl:flex-row xl:items-start xl:justify-between xl:gap-10 xl:pb-8">
          <div className="min-w-0 xl:max-w-[58%]">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">
              {getFeatureLabel(item.type)}
            </p>
            <h2 className="font-display mt-3 break-words text-[1.85rem] font-semibold leading-[1.02] text-slate-900 sm:text-[2.2rem] xl:text-[3.35rem]">
              {item.name ?? "Lote seleccionado"}
            </h2>
            <p className="mt-3 text-sm text-slate-500 xl:text-base">
              {item.manzana ? `${item.manzana} - lote ${item.lotNumber ?? "-"}` : item.id}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 xl:text-[1rem] xl:leading-8">
              {item.description ??
                "Una seleccion presentada con informacion clara, lectura visual limpia y acceso inmediato a consulta."}
            </p>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(180deg,#faf7f1_0%,#f4efe7_100%)] px-5 py-5 xl:min-w-[260px] xl:px-6 xl:py-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
                {statusLabel}
              </span>
              <span className="rounded-full border border-stone-200 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                {isPersistent ? "Seleccionado" : "Vista previa"}
              </span>
            </div>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Precio</p>
            <p className="font-display mt-3 text-[2.2rem] leading-none text-[#092930] xl:text-[3.1rem]">
              {formatPrice(item.price, item.currency)}
            </p>

            {item.finalPrice ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Precio final: <span className="font-semibold text-slate-900">{formatPrice(item.finalPrice, item.currency)}</span>
              </p>
            ) : null}

            <p className="mt-4 text-sm leading-7 text-slate-600">
              {formatArea(item.area) !== "No disponible" ? `Superficie: ${formatArea(item.area)}` : "Superficie disponible a confirmar."}
            </p>
          </div>
        </div>

        <div className="mt-6 xl:mt-8">
          {item.type === "lote" ? (
            <SelectedLotPreview isVisible={previewVisible} item={item} previewContainerRef={previewTargetRef} />
          ) : null}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Datos principales</p>
            </div>

            <div className="grid gap-x-8 border-t border-stone-200 sm:grid-cols-2">
              {detailItems.map((detail) => (
                <DetailRow key={detail.label} label={detail.label} value={detail.value} />
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[26px] border border-stone-200 bg-[linear-gradient(180deg,#f8f4ec_0%,#f5f0e8_100%)] px-5 py-5 xl:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Financiacion</p>
              <p className="mt-4 text-[1rem] leading-8 text-slate-700 xl:text-[1.05rem]">
                {item.financingText ?? "Consulta las opciones disponibles para este lote con nuestro equipo comercial."}
              </p>
            </div>

            <div className="rounded-[26px] border border-stone-200 bg-white px-5 py-5 xl:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Observacion</p>
              <p className="mt-4 text-sm leading-8 text-slate-600 xl:text-[1rem]">
                {item.description ??
                  "La ficha queda preparada para seguir creciendo con mas detalles tecnicos, medidas exactas y observaciones comerciales."}
              </p>
            </div>

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
          </section>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-stone-200 py-4 xl:py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-[0.98rem] font-medium leading-7 text-slate-900 xl:text-[1.08rem]">{value}</p>
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
