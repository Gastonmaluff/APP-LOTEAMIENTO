import { useEffect, useMemo, useRef, useState } from "react";
import { PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import {
  cancelSaleOperation,
  deleteTestSaleOperation,
  getEffectiveInstallmentStatus,
  resolveNextDueInstallment,
  subscribeToProjectClients,
  subscribeToProjectSales,
  subscribeToSaleInstallments
} from "../../services/financeRepository";
import type { ClientRecord, InstallmentRecord, InstallmentStatus, SaleOperationRecord } from "../../types/finance";
import { formatPrice } from "../../utils/mapUtils";
import { useLots } from "../../contexts/LotsContext";
import { AdminNewSaleModal } from "./AdminNewSaleModal";
import { AdminRegisterPaymentModal } from "./AdminRegisterPaymentModal";
import { AdminPaymentsCalendar, type CalendarPaymentEntry } from "./AdminPaymentsCalendar";
import { AdminClientProfileModal } from "./AdminClientProfileModal";

export function AdminFinanceSection() {
  const { user } = useAuth();
  const { lots } = useLots();
  const [sales, setSales] = useState<SaleOperationRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<InstallmentRecord[]>([]);
  const [installmentsBySaleId, setInstallmentsBySaleId] = useState<Record<string, InstallmentRecord[]>>({});
  const [clientSearch, setClientSearch] = useState("");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [clientProfileStartsEditing, setClientProfileStartsEditing] = useState(false);
  const [saleVisibilityFilter, setSaleVisibilityFilter] = useState<"active" | "cancelled" | "test" | "all">("active");
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null);
  const [cleaningTests, setCleaningTests] = useState(false);

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

  useEffect(() => {
    return subscribeToProjectClients(
      PROJECT_SLUG,
      (nextClients) => {
        setClients(nextClients);
      },
      (nextError) => {
        console.error("[AdminFinanceSection] Error leyendo clientes:", nextError);
      }
    );
  }, []);

  const filteredSales = useMemo(
    () =>
      sales.filter((sale) => {
        switch (saleVisibilityFilter) {
          case "active":
            return !sale.isTest && sale.status !== "cancelled";
          case "cancelled":
            return sale.status === "cancelled";
          case "test":
            return sale.isTest;
          case "all":
          default:
            return true;
        }
      }),
    [saleVisibilityFilter, sales]
  );

  const selectedOperation = useMemo(
    () => filteredSales.find((operation) => operation.id === selectedOperationId) ?? filteredSales[0] ?? null,
    [filteredSales, selectedOperationId]
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
      filteredSales.flatMap((sale) =>
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
          .filter((entry) => entry.status !== "paid" && entry.status !== "cancelled")
      ),
    [filteredSales, installmentsBySaleId]
  );
  const financeData = useMemo(
    () => buildFinanceData(filteredSales, installmentsBySaleId),
    [filteredSales, installmentsBySaleId]
  );
  const nextDueInstallment = useMemo(
    () => resolveNextDueInstallment(selectedInstallments),
    [selectedInstallments]
  );
  const sortedInstallments = useMemo(
    () => sortInstallmentsForDisplay(selectedInstallments),
    [selectedInstallments]
  );
  const installmentSummary = useMemo(
    () => buildInstallmentSummary(selectedInstallments),
    [selectedInstallments]
  );
  const calendarLoading = loading || (sales.length > 0 && sales.some((sale) => installmentsBySaleId[sale.id] === undefined));
  const filteredClients = useMemo(() => {
    const normalizedQuery = clientSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return clients
      .filter((client) => {
        const fullName = client.fullName.toLowerCase();
        const nationalId = client.nationalId?.toLowerCase() ?? "";
        return fullName.includes(normalizedQuery) || nationalId.includes(normalizedQuery);
      })
      .slice(0, 6);
  }, [clientSearch, clients]);
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );
  const testSales = useMemo(() => sales.filter((sale) => sale.isTest), [sales]);

  useEffect(() => {
    setIsHistoryExpanded(false);
  }, [selectedOperation?.id]);

  async function handleDeleteTestSale(operation: SaleOperationRecord) {
    if (!operation.isTest || deletingSaleId) {
      return;
    }

    const shouldDelete = window.confirm(
      `Vas a eliminar la operación de prueba de ${operation.clientName} para ${operation.lotLabel}.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingSaleId(operation.id);

    try {
      await deleteTestSaleOperation(PROJECT_SLUG, operation, user?.email ?? null);
      if (selectedOperationId === operation.id) {
        setSelectedOperationId(null);
      }
    } catch (nextError) {
      console.error("[AdminFinanceSection] Error eliminando venta de prueba:", nextError);
      setError(nextError instanceof Error ? nextError.message : "No se pudo eliminar la venta de prueba.");
    } finally {
      setDeletingSaleId(null);
    }
  }

  async function handleCancelSale(operation: SaleOperationRecord) {
    if (operation.isTest || operation.status === "cancelled" || cancellingSaleId) {
      return;
    }

    const shouldCancel = window.confirm(
      "¿Estas seguro de anular esta venta?\nEl lote volvera a disponible y la operacion quedara marcada como anulada."
    );

    if (!shouldCancel) {
      return;
    }

    const reason =
      window.prompt(
        "Motivo de anulacion:\nerror de carga / cliente desistio / operacion de prueba / duplicado / otro",
        "cliente desistio"
      ) ?? "";

    if (!reason.trim()) {
      return;
    }

    setCancellingSaleId(operation.id);

    try {
      await cancelSaleOperation(
        PROJECT_SLUG,
        operation,
        installmentsBySaleId[operation.id] ?? [],
        reason,
        user?.email ?? null
      );
    } catch (nextError) {
      console.error("[AdminFinanceSection] Error anulando venta:", nextError);
      setError(nextError instanceof Error ? nextError.message : "No se pudo anular la operacion.");
    } finally {
      setCancellingSaleId(null);
    }
  }

  async function handleClearTestSales() {
    if (testSales.length === 0 || cleaningTests) {
      return;
    }

    const shouldDelete = window.confirm(
      `Vas a eliminar ${testSales.length} operaciones de prueba. Esta accion es permanente.`
    );

    if (!shouldDelete) {
      return;
    }

    setCleaningTests(true);
    setError(null);

    try {
      for (const sale of testSales) {
        await deleteTestSaleOperation(PROJECT_SLUG, sale, user?.email ?? null);
      }
      setSelectedOperationId(null);
    } catch (nextError) {
      console.error("[AdminFinanceSection] Error limpiando operaciones de prueba:", nextError);
      setError(nextError instanceof Error ? nextError.message : "No se pudieron limpiar las operaciones de prueba.");
    } finally {
      setCleaningTests(false);
    }
  }

  function openClientProfile(clientId: string, options?: { startEditing?: boolean }) {
    setSelectedClientId(clientId);
    setClientProfileStartsEditing(options?.startEditing === true);
    setClientSearch("");
  }

  function openOperation(saleId: string) {
    setSelectedOperationId(saleId);
    setSelectedClientId(null);
    setClientProfileStartsEditing(false);
  }

  function openRegisterPayment(saleId: string) {
    setSelectedOperationId(saleId);
    setSelectedClientId(null);
    setClientProfileStartsEditing(false);
    setIsRegisteringPayment(true);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Financiero</p>
          <h2 className="font-display mt-3 text-[2.15rem] leading-tight text-[#092930]">
            Operaciones, cuotas y seguimiento comercial
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Base operativa para registrar ventas, clientes, pagos, vencimientos y observaciones por lote.
          </p>

          <div className="mt-4 inline-grid grid-cols-2 gap-1 rounded-[22px] border border-stone-200 bg-white/88 p-1 sm:grid-cols-4">
            <FilterTab
              active={saleVisibilityFilter === "active"}
              label="Activas"
              onClick={() => setSaleVisibilityFilter("active")}
            />
            <FilterTab
              active={saleVisibilityFilter === "cancelled"}
              label="Anuladas"
              onClick={() => setSaleVisibilityFilter("cancelled")}
            />
            <FilterTab
              active={saleVisibilityFilter === "test"}
              label="Prueba"
              onClick={() => setSaleVisibilityFilter("test")}
            />
            <FilterTab
              active={saleVisibilityFilter === "all"}
              label="Todas"
              onClick={() => setSaleVisibilityFilter("all")}
            />
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Buscar cliente
            </span>
            <input
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Nombre o cedula"
              className="field-light w-full"
            />
          </label>

          {filteredClients.length > 0 ? (
            <div className="absolute z-20 mt-2 w-full rounded-[20px] border border-stone-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => openClientProfile(client.id)}
                  className="flex w-full items-start justify-between rounded-[16px] px-3 py-2 text-left transition hover:bg-[#f7f1e8]"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[#092930]">{client.fullName}</span>
                    <span className="block text-xs text-slate-600">{client.nationalId ?? "Cedula sin registrar"}</span>
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#715b3b]">Ver</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
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
              <h3 className="font-display mt-2 text-[1.8rem] text-[#092930]">Ventas y reservas</h3>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {testSales.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleClearTestSales();
                  }}
                  disabled={cleaningTests}
                  className="rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cleaningTests ? "Limpiando pruebas..." : "Limpiar pruebas"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsCreatingSale(true)}
                className="rounded-full bg-[#092930] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143b43]"
              >
                Nueva venta
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-sm leading-7 text-slate-600">Cargando operaciones financieras...</p>
          ) : error ? (
            <p className="py-8 text-sm leading-7 text-rose-700">{error}</p>
          ) : financeData.operations.length === 0 ? (
            <p className="py-8 text-sm leading-7 text-slate-600">
              {saleVisibilityFilter === "test"
                ? "Todavia no hay operaciones de prueba."
                : saleVisibilityFilter === "cancelled"
                  ? "Todavia no hay operaciones anuladas."
                : saleVisibilityFilter === "all"
                  ? "Todavia no hay operaciones cargadas. Usa \"Nueva venta\" para registrar la primera."
                  : "Todavia no hay operaciones activas cargadas. Usa \"Nueva venta\" para registrar la primera."}
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
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {operation.isTest ? (
                        <span className="rounded-full border border-[#dccfbf] bg-[#fbf4ea] px-3 py-1 text-[11px] font-semibold text-[#8a7358]">
                          Prueba
                        </span>
                      ) : null}
                      {operation.status === "cancelled" ? (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          Anulada
                        </span>
                      ) : null}
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getOperationTone(operation)}`}>
                        {getOperationLabel(operation)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 border-t border-stone-200/70 pt-3 text-xs text-slate-600 sm:grid-cols-3 sm:text-sm">
                    <p>Proximo vencimiento: {operation.nextDueDate ?? "Sin fecha"}</p>
                    <p>
                      {operation.status === "cancelled"
                        ? `Motivo: ${operation.cancellationReason ?? "Sin motivo"}`
                        : `Monto cuota: ${formatPrice(operation.nextPaymentAmount, operation.currency)}`}
                    </p>
                    <p>Estado de pago: {operation.status === "cancelled" ? "Anulada" : getPaymentLabel(operation.paymentStatus)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <WhatsAppAction operation={operation} />
                    <button
                      type="button"
                      onClick={() => openClientProfile(operation.clientId, { startEditing: true })}
                      className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b] hover:bg-[#f7f1e8]"
                    >
                      Registrar gestion
                    </button>
                    <OperationActionMenu
                      operation={operation}
                      isCancelling={cancellingSaleId === operation.id}
                      isDeleting={deletingSaleId === operation.id || cleaningTests}
                      onEdit={() => openClientProfile(operation.clientId, { startEditing: true })}
                      onDelete={() => {
                        void handleDeleteTestSale(operation);
                      }}
                      onCloseSale={() => {
                        void handleCancelSale(operation);
                      }}
                    />
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
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{selectedOperation.clientName}</span>
                  {selectedOperation.isTest ? (
                    <span className="rounded-full border border-[#dccfbf] bg-[#fbf4ea] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7358]">
                      Prueba
                    </span>
                  ) : null}
                  {selectedOperation.status === "cancelled" ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      Anulada
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openClientProfile(selectedOperation.clientId)}
                    className="rounded-full border border-stone-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f2f35] transition hover:border-[#8fa88b]"
                  >
                    Ver cliente
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoPill label="Estado" value={getOperationLabel(selectedOperation)} />
                <InfoPill label="Monto" value={formatPrice(selectedOperation.price, selectedOperation.currency)} />
                <InfoPill label="Proximo vencimiento" value={selectedOperation.nextDueDate ?? "Sin fecha"} />
                <InfoPill
                  label="Estado pago"
                  value={selectedOperation.status === "cancelled" ? "Anulada" : getPaymentLabel(selectedOperation.paymentStatus)}
                />
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRegisteringPayment(true)}
                      disabled={selectedOperation.status === "cancelled"}
                      className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
                    >
                      Registrar cobro
                    </button>
                    {!selectedOperation.isTest && selectedOperation.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleCancelSale(selectedOperation);
                        }}
                        disabled={cancellingSaleId === selectedOperation.id}
                        className="rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancellingSaleId === selectedOperation.id ? "Anulando..." : "Anular venta"}
                      </button>
                    ) : null}
                    {selectedOperation.isTest ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteTestSale(selectedOperation);
                        }}
                        disabled={deletingSaleId === selectedOperation.id || cleaningTests}
                        className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingSaleId === selectedOperation.id ? "Eliminando..." : "Eliminar prueba"}
                      </button>
                    ) : null}
                  </div>
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
                {selectedOperation.status === "cancelled" ? (
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    Motivo de anulacion: {selectedOperation.cancellationReason ?? "Sin motivo"}
                  </p>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-stone-200 p-4">
                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded((currentValue) => !currentValue)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Historial de pagos
                    </p>
                    {sortedInstallments.length === 0 ? (
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Todavia no hay cuotas generadas para esta operacion.
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        {installmentSummary.total} cuotas · {installmentSummary.paid} pagadas ·{" "}
                        {installmentSummary.pending} pendientes · {installmentSummary.overdue} vencidas
                        {installmentSummary.cancelled > 0 ? ` · ${installmentSummary.cancelled} anuladas` : ""}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f2f35] transition hover:border-[#8fa88b]">
                    {isHistoryExpanded ? "Ocultar historial" : "Ver historial"}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className={`h-4 w-4 transition-transform duration-300 ${isHistoryExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {isHistoryExpanded && sortedInstallments.length > 0 ? (
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
                ) : null}
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

      {selectedClient ? (
        <AdminClientProfileModal
          client={selectedClient}
          sales={sales}
          installmentsBySaleId={installmentsBySaleId}
          onClose={() => {
            setSelectedClientId(null);
            setClientProfileStartsEditing(false);
          }}
          onOpenOperation={openOperation}
          onRegisterPayment={openRegisterPayment}
          startEditing={clientProfileStartsEditing}
        />
      ) : null}
    </section>
  );
}

function WhatsAppAction({ operation }: { operation: SaleOperationRecord }) {
  const href = buildOperationWhatsAppHref(operation);

  if (!href) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-400"
      >
        WhatsApp
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[#1f3d2b] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#294f39]"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M19.05 4.94A9.86 9.86 0 0 0 12.02 2C6.5 2 2.02 6.48 2.02 12c0 1.76.46 3.48 1.33 5L2 22l5.13-1.34A9.95 9.95 0 0 0 12.02 22C17.54 22 22.02 17.52 22.02 12c0-2.66-1.04-5.16-2.97-7.06ZM12.02 20.16c-1.51 0-2.99-.4-4.29-1.15l-.31-.18-3.04.79.81-2.97-.2-.31A8.1 8.1 0 0 1 3.86 12c0-4.5 3.66-8.16 8.16-8.16 2.18 0 4.23.85 5.76 2.39A8.09 8.09 0 0 1 20.18 12c0 4.5-3.66 8.16-8.16 8.16Zm4.47-6.12c-.24-.12-1.43-.7-1.65-.78-.22-.08-.39-.12-.55.12-.16.24-.63.78-.77.94-.14.16-.29.18-.53.06a6.64 6.64 0 0 1-1.96-1.21 7.36 7.36 0 0 1-1.36-1.68c-.14-.24-.01-.36.11-.48.11-.11.24-.29.37-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.75-1.82-.2-.49-.4-.42-.55-.43h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.31.98 2.47.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.58.18 1.11.15 1.53.09.47-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.05-.1-.21-.16-.45-.28Z" />
      </svg>
      <span>WhatsApp</span>
    </a>
  );
}

function OperationActionMenu({
  operation,
  isCancelling,
  isDeleting,
  onCloseSale,
  onDelete,
  onEdit
}: {
  operation: SaleOperationRecord;
  isCancelling: boolean;
  isDeleting: boolean;
  onCloseSale: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const canDelete = operation.isTest && !isDeleting;
  const canCloseSale = !operation.isTest && operation.status !== "cancelled" && !isCancelling;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-[#0f2f35] transition hover:border-[#8fa88b] hover:bg-[#f7f1e8]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir acciones"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <circle cx="10" cy="4" r="1.7" />
          <circle cx="10" cy="10" r="1.7" />
          <circle cx="10" cy="16" r="1.7" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-[18px] border border-stone-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <MenuAction
            label="Editar"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          />
          <MenuAction
            label={isDeleting ? "Eliminando..." : "Eliminar"}
            destructive
            disabled={!canDelete}
            onClick={() => {
              if (!canDelete) {
                return;
              }
              setOpen(false);
              onDelete();
            }}
          />
          <MenuAction
            label={isCancelling ? "Cerrando..." : "Cerrar venta"}
            disabled={!canCloseSale}
            onClick={() => {
              if (!canCloseSale) {
                return;
              }
              setOpen(false);
              onCloseSale();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuAction({
  destructive = false,
  disabled = false,
  label,
  onClick
}: {
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex w-full items-center rounded-[14px] px-3 py-2 text-left text-sm font-medium transition",
        disabled
          ? "cursor-not-allowed text-slate-300"
          : destructive
            ? "text-rose-700 hover:bg-rose-50"
            : "text-[#0f2f35] hover:bg-[#f7f1e8]"
      ].join(" ")}
    >
      {label}
    </button>
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

function FilterTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
        active ? "bg-[#092930] text-white" : "text-slate-600 hover:bg-[#f7f1e8] hover:text-[#092930]"
      ].join(" ")}
    >
      {label}
    </button>
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
  const nonPaidInstallments = allInstallments.filter((installment) => {
    const effectiveStatus = getEffectiveInstallmentStatus(installment);
    return effectiveStatus !== "paid" && effectiveStatus !== "cancelled";
  });
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
      { label: "Ventas activas", value: String(sales.filter((sale) => sale.status !== "cancelled").length) },
      { label: "Vencen hoy", value: String(dueTodayCount) },
      { label: "Vencen esta semana", value: String(dueThisWeekCount) },
      { label: "En mora", value: String(overdueCount) },
      { label: "Cobros del mes", value: formatPrice(collectedThisMonth, sales[0]?.currency ?? "PYG") },
      {
        label: "Reservas pendientes",
        value: String(sales.filter((sale) => sale.operationType === "reserve" && sale.status !== "cancelled").length)
      }
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

function buildInstallmentSummary(installments: InstallmentRecord[]) {
  return installments.reduce(
    (summary, installment) => {
      const effectiveStatus = getEffectiveInstallmentStatus(installment);

      if (effectiveStatus === "paid") {
        summary.paid += 1;
      } else if (effectiveStatus === "cancelled") {
        summary.cancelled += 1;
      } else if (effectiveStatus === "overdue") {
        summary.overdue += 1;
      } else {
        summary.pending += 1;
      }

      summary.total += 1;
      return summary;
    },
    { total: 0, paid: 0, pending: 0, overdue: 0, cancelled: 0 }
  );
}

function getOperationLabel(operation: SaleOperationRecord) {
  return operation.operationType === "reserve" ? "Reserva" : "Venta";
}

function getPaymentLabel(status: SaleOperationRecord["paymentStatus"]) {
  if (status === "cancelled") {
    return "Anulada";
  }

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
  if (status === "cancelled") {
    return "Anulada";
  }

  if (status === "paid") {
    return "Pagada";
  }

  if (status === "overdue") {
    return "Vencida";
  }

  return "Pendiente";
}

function getOperationTone(operation: SaleOperationRecord) {
  if (operation.status === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return operation.operationType === "reserve"
    ? "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]"
    : "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
}

function buildOperationWhatsAppHref(operation: SaleOperationRecord) {
  const phone = operation.clientPhone?.replace(/\D/g, "") ?? "";

  if (!phone) {
    return null;
  }

  const message = [
    `Hola ${operation.clientName},`,
    `te escribo por ${operation.lotLabel} en Viva Lago.`,
    operation.status === "cancelled"
      ? "Queria retomar el seguimiento de tu operacion anulada."
      : "Queria continuar el seguimiento comercial de tu operacion.",
    "Quedo atento para coordinar los proximos pasos."
  ].join(" ");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getInstallmentTone(status: InstallmentStatus) {
  if (status === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (status === "paid") {
    return "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
  }

  if (status === "overdue") {
    return "border-[#d6c2b6] bg-[#f3e6df] text-[#8a5b48]";
  }

  return "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]";
}

function getOperationPaymentPriority(status: SaleOperationRecord["paymentStatus"]) {
  if (status === "cancelled") {
    return 3;
  }

  if (status === "overdue") {
    return 0;
  }

  if (status === "pending") {
    return 1;
  }

  if (status === "paid") {
    return 2;
  }

  return 4;
}

function addDaysToIsoDate(baseDate: string, days: number) {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
