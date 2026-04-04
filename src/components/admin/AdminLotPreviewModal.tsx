import type { LotData } from "../../types/lots";
import { getCommercialPriceSummary, getStatusLabel } from "../../utils/mapUtils";
import { MapViewer } from "../MapViewer";

type AdminLotPreviewModalProps = {
  item: LotData;
  onClose: () => void;
};

export function AdminLotPreviewModal({ item, onClose }: AdminLotPreviewModalProps) {
  const commercialPrice = getCommercialPriceSummary(item);
  const statusLabel = getStatusLabel(item.status, item.type);
  const lotTitle = item.name?.trim() || buildLotTitle(item);

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#091719]/70 px-3 py-4 backdrop-blur-sm sm:px-6">
      <div className="mx-auto max-w-[1280px] rounded-[28px] border border-white/60 bg-[#f8f4ec] p-4 shadow-[0_40px_90px_rgba(5,16,18,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Vista de lote</p>
            <h2 className="font-display mt-3 text-[2.4rem] leading-none text-[#092930] sm:text-[3rem]">{lotTitle}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#715b3b]">
                {commercialPrice.value}
              </p>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClass(item.status ?? null)}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 rounded-[24px] border border-stone-200 bg-white/60 px-2 py-4 sm:px-4">
          <MapViewer
            hasHighlightFilter
            highlightedLotIds={[item.id]}
            lots={[item]}
            onActiveChange={() => undefined}
            onHoverChange={() => undefined}
            readOnly
            selectedLotId={item.id}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <LotPhotoPanel src={item.photo1Url} label="Foto 1" />
          <LotPhotoPanel src={item.photo2Url} label="Foto 2" />
        </div>
      </div>
    </div>
  );
}

function LotPhotoPanel({ label, src }: { label: string; src?: string | null }) {
  if (src) {
    return (
      <figure className="overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
        <img src={src} alt={label} className="h-[260px] w-full object-cover sm:h-[340px]" />
      </figure>
    );
  }

  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-white/55 px-6 text-center sm:min-h-[340px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">{label}</p>
        <p className="font-display mt-4 text-[2rem] leading-tight text-[#092930]">{label} pendiente</p>
        <p className="mt-3 max-w-xs text-sm leading-7 text-slate-600">
          Aun no hay una imagen cargada para este lote.
        </p>
      </div>
    </div>
  );
}

function buildLotTitle(item: LotData) {
  const manzana = item.manzana?.trim() || "?";
  const lotNumber = item.lotNumber?.trim() || "--";
  return `Lote ${manzana}-${lotNumber}`;
}

function getStatusBadgeClass(status: LotData["status"]) {
  if (status === "available") {
    return "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
  }

  if (status === "reserved") {
    return "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]";
  }

  if (status === "sold") {
    return "border-[#c8bbb1] bg-[#ece3dc] text-[#7d5242]";
  }

  return "border-stone-200 bg-stone-100 text-slate-600";
}
