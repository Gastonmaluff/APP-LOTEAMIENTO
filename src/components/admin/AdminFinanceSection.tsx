import { useEffect, useMemo, useState } from "react";
import { AdminNewSaleModal } from "./AdminNewSaleModal";
import { useLots } from "../../contexts/LotsContext";
import { PROJECT_SLUG } from "../../config/project";
import { subscribeToProjectSales } from "../../services/financeRepository";
import type { SaleOperationRecord } from "../../types/finance";
import { formatPrice } from "../../utils/mapUtils";

export function AdminFinanceSection() {
  const { lots } = useLots();
  const [sales, setSales] = useState<SaleOperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToProjectSales(
      PROJECT_SLUG,
      (nextSales) => {
        setSales(nextSales);
        setLoading(false);
        setError(null);
      },
      (nextError) => {
        console.error("[AdminFinanceSection] Error leyendo ventas:", nextError);
        setError("No se pudieron leer las operaciones financieras.");
        setLoading(false);
      }
    );
  }, []);

  const financeData = useMemo(() => buildFinanceData(sales), [sales]);

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
            <button
              type="button"
              onClick={() => setIsCreatingSale(true)}
              className="rounded-full bg-[#092930] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143b43]"
            >
              Nueva venta
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-sm leading-7 text-slate-600">Cargando operaciones financieras...</p>
          ) : error ? (
            <p className="py-8 text-sm leading-7 text-rose-700">{error}</p>
          ) : financeData.operations.length === 0 ? (
            <p className="py-8 text-sm leading-7 text-slate-600">
              Todavia no hay operaciones cargadas. Usa “Nueva venta” para registrar la primera.
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
                      <p className="truncate text-sm font-semibold text-[#092930] sm:text-base">{operation.clientName}</p>
                      <p className="mt-1 text-xs text-slate-600 sm:text-sm">{operation.lotLabel}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#dccfbf] bg-[#f6f1ea] px-3 py-1 text-[11px] font-semibold text-[#7e6f5d]">
                      {getOperationLabel(operation)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 border-t border-stone-200/70 pt-3 text-xs text-slate-600 sm:grid-cols-3 sm:text-sm">
                    <p>Proximo vencimiento: {operation.nextDueDate ?? "Sin fecha"}</p>
                    <p>Monto cuota: {formatPrice(operation.nextPaymentAmount, operation.currency)}</p>
                    <p>Estado de pago: {getPaymentLabel(operation.paymentStatus)}</p>
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
                <p className="mt-2 text-sm text-slate-600">{selectedOperation.clientName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoPill label="Estado" value={getOperationLabel(selectedOperation)} />
                <InfoPill label="Monto" value={formatPrice(selectedOperation.price, selectedOperation.currency)} />
                <InfoPill label="Proximo vencimiento" value={selectedOperation.nextDueDate ?? "Sin fecha"} />
                <InfoPill label="Estado pago" value={getPaymentLabel(selectedOperation.paymentStatus)} />
              </div>

              <div className="rounded-[22px] bg-[#f7f1e8] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Plan de pagos</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {selectedOperation.deliveryPercent !== null && selectedOperation.deliveryPercent !== undefined
                    ? `Entrega ${selectedOperation.deliveryPercent}%`
                    : "Entrega pendiente de definir"}
                  {selectedOperation.installments ? ` + ${selectedOperation.installments} cuotas` : ""}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Fecha de inicio: {selectedOperation.startDate ?? "Sin fecha"} | Primer vencimiento:{" "}
                  {selectedOperation.firstDueDate ?? "Sin fecha"}
                </p>
              </div>

              <div className="rounded-[22px] border border-stone-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Agenda y seguimiento</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  <li>Proximos vencimientos: {selectedOperation.nextDueDate ?? "Sin fecha de agenda"}</li>
                  <li>Pagos atrasados: {selectedOperation.paymentStatus === "overdue" ? "Si" : "No"}</li>
                  <li>Observaciones: {selectedOperation.notes ?? "Sin observaciones"}</li>
                </ul>
              </div>

              <div className="rounded-[22px] border border-stone-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Cliente</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  <p>Nombre: {selectedOperation.clientName}</p>
                  <p>Cedula: {selectedOperation.clientNationalId ?? "Sin dato"}</p>
                  <p>Telefono: {selectedOperation.clientPhone ?? "Sin dato"}</p>
                  <p>Correo: {selectedOperation.clientEmail ?? "Sin dato"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Selecciona una operacion para ver cliente, lote, plan de pagos y seguimiento.
            </p>
          )}
        </section>
      </div>

      {isCreatingSale ? (
        <AdminNewSaleModal
          lots={lots}
          onClose={() => setIsCreatingSale(false)}
          onCreated={() => {
            setSelectedOperationId(null);
          }}
        />
      ) : null}
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

function buildFinanceData(sales: SaleOperationRecord[]) {
  const today = new Date().toISOString().slice(0, 10);
  const weekLimit = addDaysToIsoDate(today, 7);

  return {
    metrics: [
      { label: "Ventas activas", value: String(sales.length) },
      { label: "Vencen hoy", value: String(sales.filter((sale) => sale.nextDueDate === today).length) },
      {
        label: "Vencen esta semana",
        value: String(sales.filter((sale) => sale.nextDueDate && sale.nextDueDate >= today && sale.nextDueDate <= weekLimit).length)
      },
      { label: "En mora", value: String(sales.filter((sale) => sale.paymentStatus === "overdue").length) },
      {
        label: "Cobros del mes",
        value: formatPrice(0, sales[0]?.currency ?? "PYG")
      },
      {
        label: "Reservas pendientes",
        value: String(sales.filter((sale) => sale.operationType === "reserve").length)
      }
    ],
    operations: sales
  };
}

function getOperationLabel(operation: SaleOperationRecord) {
  return operation.operationType === "reserve" ? "Reserva" : "Venta";
}

function getPaymentLabel(status: SaleOperationRecord["paymentStatus"]) {
  if (status === "paid") {
    return "Pagada";
  }

  if (status === "overdue") {
    return "Vencida";
  }

  if (status === "pending") {
    return "Pendiente";
  }

  return "Sin calendario";
}

function addDaysToIsoDate(baseDate: string, days: number) {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
