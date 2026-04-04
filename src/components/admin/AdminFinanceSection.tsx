import { useMemo, useState } from "react";
import { useLots } from "../../contexts/LotsContext";
import type { LotData } from "../../types/lots";
import { formatPrice, getCommercialPriceSummary, getStatusLabel } from "../../utils/mapUtils";

type FinanceOperation = {
  id: string;
  lot: LotData;
  lotLabel: string;
  clientLabel: string;
  operationStatus: string;
  nextDueDate: string;
  nextPaymentLabel: string;
  paymentStatus: string;
};

export function AdminFinanceSection() {
  const { lots } = useLots();
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const financeData = useMemo(() => {
    const operations = lots
      .filter((item) => item.type === "lote" && (item.status === "reserved" || item.status === "sold"))
      .map((item) => buildFinanceOperation(item));

    return {
      metrics: [
        { label: "Ventas activas", value: String(operations.length) },
        { label: "Vencen hoy", value: "0" },
        { label: "Vencen esta semana", value: "0" },
        { label: "En mora", value: "0" },
        { label: "Cobros del mes", value: formatPrice(0, "PYG") },
        {
          label: "Reservas pendientes",
          value: String(lots.filter((item) => item.type === "lote" && item.status === "reserved").length)
        }
      ],
      operations
    };
  }, [lots]);

  const selectedOperation = useMemo(
    () => financeData.operations.find((operation) => operation.id === selectedOperationId) ?? financeData.operations[0] ?? null,
    [financeData.operations, selectedOperationId]
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Financiero</p>
        <h2 className="font-display mt-3 text-[2.15rem] leading-tight text-[#092930]">
          Operaciones, cuotas y seguimiento comercial
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Base operativa para registrar ventas, clientes, pagos, vencimientos y observaciones por lote.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-6">
        {financeData.metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[20px] border border-stone-200 bg-white/92 px-3 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-5 sm:py-5"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-[10px]">
              {metric.label}
            </p>
            <p className="font-display mt-2.5 text-[2rem] leading-none text-[#092930] sm:text-[2.45rem]">
              {metric.value}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <section className="rounded-[28px] border border-stone-200 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Operaciones</p>
              <h3 className="font-display mt-2 text-[1.8rem] text-[#092930]">Ventas y reservas activas</h3>
            </div>
          </div>

          {financeData.operations.length === 0 ? (
            <p className="py-8 text-sm leading-7 text-slate-600">
              Todavia no hay operaciones reservadas o vendidas para listar.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {financeData.operations.map((operation) => (
                <article
                  key={operation.id}
                  className="rounded-[20px] border border-stone-200 bg-[#fcfbf8] px-3 py-3 sm:px-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#092930] sm:text-base">{operation.clientLabel}</p>
                      <p className="mt-1 text-xs text-slate-600 sm:text-sm">{operation.lotLabel}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#dccfbf] bg-[#f6f1ea] px-3 py-1 text-[11px] font-semibold text-[#7e6f5d]">
                      {operation.operationStatus}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 border-t border-stone-200/70 pt-3 text-xs text-slate-600 sm:grid-cols-3 sm:text-sm">
                    <p>Proximo vencimiento: {operation.nextDueDate}</p>
                    <p>Monto cuota: {operation.nextPaymentLabel}</p>
                    <p>Estado de pago: {operation.paymentStatus}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOperationId(operation.id)}
                      className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
                    >
                      Ver ficha
                    </button>
                    <button
                      type="button"
                      className="cursor-not-allowed rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-400"
                      title="Se activa cuando conectemos cobranza y plan de cuotas."
                    >
                      Registrar cobro
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-stone-200 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Ficha de operacion</p>

          {selectedOperation ? (
            <div className="mt-4 space-y-5">
              <div>
                <h3 className="font-display text-[2rem] leading-tight text-[#092930]">
                  {selectedOperation.lotLabel}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{selectedOperation.clientLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoPill label="Estado" value={selectedOperation.operationStatus} />
                <InfoPill label="Monto" value={getCommercialPriceSummary(selectedOperation.lot).value} />
                <InfoPill label="Proximo vencimiento" value={selectedOperation.nextDueDate} />
                <InfoPill label="Estado pago" value={selectedOperation.paymentStatus} />
              </div>

              <div className="rounded-[22px] bg-[#f7f1e8] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Plan de pagos</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {selectedOperation.lot.deliveryPercent !== null && selectedOperation.lot.deliveryPercent !== undefined
                    ? `Entrega ${selectedOperation.lot.deliveryPercent}%`
                    : "Entrega pendiente de definir"}
                  {selectedOperation.lot.installments ? ` + ${selectedOperation.lot.installments} cuotas` : ""}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  La tabla de cuotas, reprogramacion y cobros queda preparada para conectar Firestore en la siguiente fase.
                </p>
              </div>

              <div className="rounded-[22px] border border-stone-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Agenda y seguimiento</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  <li>Proximos vencimientos: por cargar</li>
                  <li>Pagos atrasados: sin registros conectados</li>
                  <li>Promesas de pago y observaciones: pendiente de modulo</li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Selecciona una operacion para ver cliente, lote, plan de pagos y seguimiento.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-stone-200 bg-white/80 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-[#092930]">{value}</p>
    </div>
  );
}

function buildFinanceOperation(item: LotData): FinanceOperation {
  return {
    id: item.id,
    lot: item,
    lotLabel: buildLotLabel(item),
    clientLabel: item.status === "sold" ? "Cliente a registrar" : "Reserva a asignar",
    operationStatus: getStatusLabel(item.status, item.type),
    nextDueDate: "Pendiente de plan",
    nextPaymentLabel: getCommercialPriceSummary(item).value,
    paymentStatus: "Sin calendario"
  };
}

function buildLotLabel(item: LotData) {
  const manzana = item.manzana?.trim() || "?";
  const lotNumber = item.lotNumber?.trim() || "--";
  return `Lote ${manzana}-${lotNumber}`;
}
