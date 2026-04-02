import type { LotData } from "../types/lots";
import {
  formatArea,
  formatInstallments,
  formatPercent,
  getFinancingSummary,
  hasMeaningfulDescription
} from "../utils/mapUtils";

type LotDesktopPanelsProps = {
  item: LotData | null;
};

export function LotDesktopPanels({ item }: LotDesktopPanelsProps) {
  if (!item) {
    return null;
  }

  const financingSummary = getFinancingSummary(item);
  const showDescription = hasMeaningfulDescription(item.description);

  return (
    <section className="hidden xl:grid xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] xl:gap-10">
      <article className="rounded-[30px] border border-stone-200 bg-white/94 px-7 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Datos principales</p>
        <div className="mt-6 grid gap-x-10 border-t border-stone-200 sm:grid-cols-2">
          <DetailRow label="Manzana" value={item.manzana ?? "Consultar"} />
          <DetailRow label="Lote" value={item.lotNumber ?? "Consultar"} />
          <DetailRow label="Superficie" value={formatArea(item.area)} />
          <DetailRow label="Moneda" value={item.currency ?? "Consultar"} />
          <DetailRow label="Entrega" value={formatPercent(item.deliveryPercent)} />
          <DetailRow label="Cuotas" value={formatInstallments(item.installments)} />
        </div>
      </article>

      <div className="space-y-5">
        <article className="rounded-[30px] border border-stone-200 bg-[linear-gradient(180deg,#f8f4ec_0%,#f4eee5_100%)] px-7 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Financiacion</p>
          <div className="mt-5 space-y-4">
            <FinanceRow label={financingSummary.downPaymentLabel ?? "Entrega"} value={financingSummary.downPayment} />
            <FinanceRow
              label={financingSummary.installmentsLabel ?? "Cuotas"}
              value={financingSummary.estimatedInstallment}
            />
            <FinanceRow label="Total" value={financingSummary.total} isStrong />
          </div>
        </article>

        {showDescription ? (
          <article className="rounded-[30px] border border-stone-200 bg-white px-7 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Descripcion</p>
            <p className="mt-5 text-[1rem] leading-8 text-slate-600">{item.description}</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-stone-200 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-[1rem] font-medium leading-7 text-slate-900">{value}</p>
    </div>
  );
}

function FinanceRow({
  isStrong = false,
  label,
  value
}: {
  isStrong?: boolean;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-4 last:border-b-0 last:pb-0">
      <p className={`text-sm ${isStrong ? "font-semibold text-slate-800" : "text-slate-600"}`}>{label}</p>
      <p className={`${isStrong ? "font-semibold text-[#092930]" : "font-medium text-slate-900"}`}>{value ?? "Consultar"}</p>
    </div>
  );
}
