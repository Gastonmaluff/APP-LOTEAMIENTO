import { useEffect, useMemo, useState } from "react";
import { PROJECT_SLUG } from "../../config/project";
import { subscribeToProjectSales, subscribeToSaleInstallments, getEffectiveInstallmentStatus, resolveNextDueInstallment } from "../../services/financeRepository";
import type { InstallmentRecord, InstallmentStatus, SaleOperationRecord } from "../../types/finance";
import { formatPrice } from "../../utils/mapUtils";
import { useLots } from "../../contexts/LotsContext";
import { AdminNewSaleModal } from "./AdminNewSaleModal";
import { AdminRegisterPaymentModal } from "./AdminRegisterPaymentModal";
import { AdminPaymentsCalendar, type CalendarPaymentEntry } from "./AdminPaymentsCalendar";

export function AdminFinanceSection() {
  const { lots } = useLots();
  const [sales, setSales] = useState<SaleOperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<InstallmentRecord[]>([]);
  const [installmentsBySaleId, setInstallmentsBySaleId] = useState<Record<string, InstallmentRecord[]>>({});

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

  const selectedOperation = useMemo(
    () => sales.find((operation) => operation.id === selectedOperationId) ?? sales[0] ?? null,
    [sales, selectedOperationId]
  );

  useEffect(() => {
    if (!selectedOperation) {
      setSelectedInstallments([]);
      return;
    }

    return subscribeToSaleInstallments(
      PROJECT_SLUG,
      selectedOperation.id,
      (nextInstallments) => {
        setSelectedInstallments(nextInstallments);
      },
      (nextError) => {
        console.error("[AdminFinanceSection] Error leyendo cuotas:", nextError);
      }
    );
  }, [selectedOperation]);

  useEffect(() => {
    const saleIds = new Set(sales.map((sale) => sale.id));

    setInstallmentsBySaleId((currentMap) =>
      Object.fromEntries(Object.entries(currentMap).filter(([saleId]) => saleIds.has(saleId)))
    );

    if (sales.length === 0) {
      return () => undefined;
    }

    const unsubscribers = sales.map((sale) =>
      subscribeToSaleInstallments(
        PROJECT_SLUG,
        sale.id,
        (nextInstallments) => {
          setInstallmentsBySaleId((currentMap) => ({
            ...currentMap,
            [sale.id]: nextInstallments
          }));
        },
        (nextError) => {
          console.error(`[AdminFinanceSection] Error leyendo cuotas de ${sale.id}:`, nextError);
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [sales]);

  const calendarEntries = useMemo<CalendarPaymentEntry[]>(
    () =>
      sales.flatMap((sale) =>
        (installmentsBySaleId[sale.id] ?? [])
          .map((installment) => ({
            id: installment.id,
            saleId: sale.id,
            clientName: sale.clientName,
            lotLabel: sale.lotLabel,
            dueDate: installment.dueDate,
            amount: installment.amount,
            installmentNumber: installment.number,
            status: getEffectiveInstallmentStatus(installment),
            currency: sale.currency
          }))
          .filter((entry) => entry.status !== "paid")
      ),
    [installmentsBySaleId, sales]
  );
  const financeData = useMemo(
    () => buildFinanceData(sales, installmentsBySaleId),
    [installmentsBySaleId, sales]
  );
  const nextDueInstallment = useMemo(
    () => resolveNextDueInstallment(selectedInstallments),
    [selectedInstallments]
  );
  const sortedInstallments = useMemo(
    () => sortInstallmentsForDisplay(selectedInstallments),
    [selectedInstallments]
  );
  const calendarLoading = loading || (sales.length > 0 && sales.some((sale) => installmentsBySaleId[sale.id] === undefined));

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.95fr)]">
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
              Todavia no hay operaciones cargadas. Usa "Nueva venta" para registrar la primera.
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
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${getOperationTone(operation)}`}>
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
                      onClick={() => {
                        setSelectedOperationId(operation.id);
                        setIsRegisteringPayment(true);
                      }}
                      className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
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

              <div className="rounded-[24px] border border-stone-200 bg-[linear-gradient(180deg,#f7f2e9_0%,#f1ece3_100%)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Proximo vencimiento</p>
                {nextDueInstallment ? (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-display text-[2rem] leading-none text-[#092930]">
                      Cuota {nextDueInstallment.number}
                    </h4>
                    <p className="text-lg font-semibold text-[#715b3b]">
                      {formatPrice(nextDueInstallment.amount, selectedOperation.currency)}
                    </p>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p>Fecha: {nextDueInstallment.dueDate}</p>
                      <p>Cliente: {selectedOperation.clientName}</p>
                      <p>Lote: {selectedOperation.lotLabel}</p>
                      <p>Estado: {getInstallmentStatusLabel(getEffectiveInstallmentStatus(nextDueInstallment))}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-700">Sin vencimientos pendientes</p>
                )}
              </div>

              <div className="rounded-[22px] bg-[#f7f1e8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Plan de pagos</p>
                  <button
                    type="button"
                    onClick={() => setIsRegisteringPayment(true)}
                    className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
                  >
                    Registrar cobro
                  </button>
                </div>
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Historial de pagos</p>
                {sortedInstallments.length === 0 ? (
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Todavia no hay cuotas generadas para esta operacion.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {sortedInstallments.map((installment) => {
                      const effectiveStatus = getEffectiveInstallmentStatus(installment);
                      return (
                        <article
                          key={installment.id}
                          className="rounded-[18px] border border-stone-200 bg-[#fcfbf8] px-4 py-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#092930]">
                                Cuota {installment.number} - {formatPrice(installment.amount, selectedOperation.currency)}
                              </p>
                              <div className="mt-2 space-y-1 text-xs leading-6 text-slate-600 sm:text-sm">
                                <p>Vencimiento: {installment.dueDate}</p>
                                <p>Pago real: {installment.paidAt ?? "Pendiente"}</p>
                                <p>Medio: {installment.paymentMethod ?? "Sin registrar"}</p>
                                <p>Observacion: {installment.note ?? "Sin observacion"}</p>
                              </div>
                            </div>

                            <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${getInstallmentTone(effectiveStatus)}`}>
                              {getInstallmentStatusLabel(effectiveStatus)}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
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
              Selecciona una operacion para ver cliente, lote, vencimientos y pagos.
            </p>
          )}
        </section>
      </div>

      <AdminPaymentsCalendar entries={calendarEntries} loading={calendarLoading} />

      {isCreatingSale ? (
        <AdminNewSaleModal
          lots={lots}
          onClose={() => setIsCreatingSale(false)}
          onCreated={() => {
            setSelectedOperationId(null);
          }}
        />
      ) : null}

      {isRegisteringPayment && selectedOperation ? (
        <AdminRegisterPaymentModal
          sale={selectedOperation}
          installments={selectedInstallments}
          onClose={() => setIsRegisteringPayment(false)}
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

function buildFinanceData(
  sales: SaleOperationRecord[],
  installmentsBySaleId: Record<string, InstallmentRecord[]>
) {
  const today = new Date().toISOString().slice(0, 10);
  const weekLimit = addDaysToIsoDate(today, 7);
  const monthKey = today.slice(0, 7);
  const allInstallments = sales.flatMap((sale) => installmentsBySaleId[sale.id] ?? []);
  const nonPaidInstallments = allInstallments.filter((installment) => getEffectiveInstallmentStatus(installment) !== "paid");
  const dueTodayCount = nonPaidInstallments.filter((installment) => installment.dueDate === today).length;
  const dueThisWeekCount = nonPaidInstallments.filter(
    (installment) => installment.dueDate >= today && installment.dueDate <= weekLimit
  ).length;
  const overdueCount = nonPaidInstallments.filter(
    (installment) => getEffectiveInstallmentStatus(installment) === "overdue"
  ).length;
  const collectedThisMonth = allInstallments
    .filter((installment) => installment.paidAt?.slice(0, 7) === monthKey)
    .reduce((accumulator, installment) => accumulator + installment.amount, 0);
  const sortedOperations = [...sales].sort((left, right) => {
    const leftPriority = getOperationPaymentPriority(left.paymentStatus);
    const rightPriority = getOperationPaymentPriority(right.paymentStatus);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if ((left.nextDueDate ?? "") !== (right.nextDueDate ?? "")) {
      return (left.nextDueDate ?? "9999-99-99").localeCompare(right.nextDueDate ?? "9999-99-99");
    }

    return left.lotLabel.localeCompare(right.lotLabel, "es");
  });

  return {
    metrics: [
      { label: "Ventas activas", value: String(sales.length) },
      { label: "Vencen hoy", value: String(dueTodayCount) },
      { label: "Vencen esta semana", value: String(dueThisWeekCount) },
      { label: "En mora", value: String(overdueCount) },
      { label: "Cobros del mes", value: formatPrice(collectedThisMonth, sales[0]?.currency ?? "PYG") },
      { label: "Reservas pendientes", value: String(sales.filter((sale) => sale.operationType === "reserve").length) }
    ],
    operations: sortedOperations
  };
}

function sortInstallmentsForDisplay(installments: InstallmentRecord[]) {
  return [...installments].sort((left, right) => {
    const leftStatus = getEffectiveInstallmentStatus(left);
    const rightStatus = getEffectiveInstallmentStatus(right);
    const leftPriority = leftStatus === "paid" ? 1 : 0;
    const rightPriority = rightStatus === "paid" ? 1 : 0;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (left.dueDate !== right.dueDate) {
      return left.dueDate.localeCompare(right.dueDate);
    }

    return left.number - right.number;
  });
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

function getInstallmentStatusLabel(status: InstallmentStatus) {
  if (status === "paid") {
    return "Pagada";
  }

  if (status === "overdue") {
    return "Vencida";
  }

  return "Pendiente";
}

function getOperationTone(operation: SaleOperationRecord) {
  return operation.operationType === "reserve"
    ? "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]"
    : "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
}

function getInstallmentTone(status: InstallmentStatus) {
  if (status === "paid") {
    return "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
  }

  if (status === "overdue") {
    return "border-[#d6c2b6] bg-[#f3e6df] text-[#8a5b48]";
  }

  return "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]";
}

function getOperationPaymentPriority(status: SaleOperationRecord["paymentStatus"]) {
  if (status === "overdue") {
    return 0;
  }

  if (status === "pending") {
    return 1;
  }

  if (status === "paid") {
    return 2;
  }

  return 3;
}

function addDaysToIsoDate(baseDate: string, days: number) {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
