import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { PROJECT_SLUG } from "../../config/project";
import {
  createClientDocumentRecord,
  deleteClientDocumentRecord,
  getEffectiveInstallmentStatus,
  resolveNextDueInstallment,
  subscribeToClientDocuments,
  updateProjectClient
} from "../../services/financeRepository";
import {
  deleteFinanceDocumentAsset,
  uploadFinanceDocumentAsset
} from "../../services/financeDocumentsRepository";
import type {
  ClientDocumentKind,
  ClientDocumentRecord,
  ClientRecord,
  InstallmentRecord,
  SaleOperationRecord
} from "../../types/finance";
import { formatPrice } from "../../utils/mapUtils";

type AdminClientProfileModalProps = {
  client: ClientRecord;
  installmentsBySaleId: Record<string, InstallmentRecord[]>;
  onClose: () => void;
  onOpenOperation: (saleId: string) => void;
  onRegisterPayment: (saleId: string) => void;
  sales: SaleOperationRecord[];
};

type ClientFormState = {
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  notes: string;
};

type VisibleDocument = {
  id: string;
  kind: ClientDocumentKind;
  title: string;
  url: string;
  storagePath: string | null;
  saleId: string | null;
  saleLabel: string | null;
  canDelete: boolean;
  source: "client-field" | "client-doc" | "sale-contract";
};

export function AdminClientProfileModal({
  client,
  installmentsBySaleId,
  onClose,
  onOpenOperation,
  onRegisterPayment,
  sales
}: AdminClientProfileModalProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ClientDocumentRecord[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<ClientDocumentKind | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [form, setForm] = useState<ClientFormState>(() => buildClientForm(client));

  useEffect(() => {
    setForm(buildClientForm(client));
    setEditing(false);
    setError(null);
    setIsHistoryExpanded(false);
  }, [client]);

  useEffect(() => {
    return subscribeToClientDocuments(
      PROJECT_SLUG,
      client.id,
      (nextDocuments) => {
        setDocuments(nextDocuments);
      },
      (nextError) => {
        console.error("[AdminClientProfileModal] Error leyendo documentos del cliente:", nextError);
      }
    );
  }, [client.id]);

  const clientSales = useMemo(
    () =>
      sales
        .filter((sale) => sale.clientId === client.id)
        .sort((left, right) => (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0)),
    [client.id, sales]
  );

  const clientInstallments = useMemo(
    () =>
      clientSales.flatMap((sale) => installmentsBySaleId[sale.id] ?? []).sort((left, right) => {
        if (left.dueDate !== right.dueDate) {
          return left.dueDate.localeCompare(right.dueDate);
        }

        return left.number - right.number;
      }),
    [clientSales, installmentsBySaleId]
  );

  const nextDue = useMemo(() => resolveNextDueInstallment(clientInstallments), [clientInstallments]);

  const summary = useMemo(() => buildClientFinancialSummary(clientSales, clientInstallments), [clientInstallments, clientSales]);

  const statusLabel = useMemo(() => {
    if (clientSales.length === 0) {
      return "Sin operaciones";
    }

    if (summary.overdueCount > 0) {
      return "En mora";
    }

    return "Activo";
  }, [clientSales.length, summary.overdueCount]);

  const visibleDocuments = useMemo(
    () => buildVisibleDocuments(client, documents, clientSales),
    [client, clientSales, documents]
  );

  const history = useMemo(
    () =>
      clientInstallments
        .map((installment) => {
          const sale = clientSales.find((item) => item.id === installment.saleId) ?? null;
          return {
            ...installment,
            lotLabel: sale?.lotLabel ?? "Lote sin asignar",
            currency: sale?.currency ?? null,
            effectiveStatus: getEffectiveInstallmentStatus(installment)
          };
        })
        .sort((left, right) => {
          const leftPriority = left.effectiveStatus === "paid" ? 1 : 0;
          const rightPriority = right.effectiveStatus === "paid" ? 1 : 0;

          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }

          if (left.dueDate !== right.dueDate) {
            return left.dueDate.localeCompare(right.dueDate);
          }

          return left.number - right.number;
        }),
    [clientInstallments, clientSales]
  );
  const historySummary = useMemo(() => buildHistorySummary(history), [history]);

  const nextDueSale = useMemo(
    () => (nextDue ? clientSales.find((sale) => sale.id === nextDue.saleId) ?? null : null),
    [clientSales, nextDue]
  );

  async function handleSaveClient() {
    if (!form.fullName.trim()) {
      setError("Ingresa el nombre del cliente.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateProjectClient(PROJECT_SLUG, client.id, form, user?.email ?? null);
      setEditing(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo actualizar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(kind: ClientDocumentKind, file: File | null) {
    if (!file) {
      return;
    }

    setUploadingKind(kind);
    setError(null);

    try {
      const asset = await uploadFinanceDocumentAsset(PROJECT_SLUG, client.id, kind, file);
      await createClientDocumentRecord(
        PROJECT_SLUG,
        client.id,
        {
          kind,
          url: asset.url,
          storagePath: asset.storagePath,
          name: asset.name
        },
        user?.email ?? null
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo subir el documento.");
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleDeleteDocument(document: VisibleDocument) {
    try {
      await deleteClientDocumentRecord(
        PROJECT_SLUG,
        client.id,
        {
          documentId: document.source === "client-doc" ? document.id : null,
          kind: document.kind,
          saleId: document.source === "sale-contract" ? document.saleId : null
        },
        user?.email ?? null
      );
      await deleteFinanceDocumentAsset(document.storagePath, document.url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo eliminar el documento.");
    }
  }

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto bg-[#091719]/70 px-3 py-4 backdrop-blur-sm sm:px-6">
      <div className="mx-auto max-w-[1200px] rounded-[28px] border border-white/60 bg-[#f8f4ec] p-5 shadow-[0_40px_90px_rgba(5,16,18,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Ficha de cliente</p>
            <h2 className="font-display mt-3 text-[2.2rem] leading-tight text-[#092930]">{client.fullName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{client.nationalId ?? "Cedula sin registrar"}</span>
              <span className="text-stone-300">•</span>
              <span>{client.phone ?? "Telefono sin registrar"}</span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getClientStatusTone(statusLabel)}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing((currentValue) => !currentValue)}
              className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
            >
              {editing ? "Cancelar edicion" : "Editar cliente"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <section className="rounded-[24px] border border-stone-200 bg-white/90 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Datos del cliente</p>

              {editing ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre">
                    <input
                      value={form.fullName}
                      onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                      className="field-light"
                    />
                  </Field>
                  <Field label="Cedula">
                    <input
                      value={form.nationalId}
                      onChange={(event) => setForm((current) => ({ ...current, nationalId: event.target.value }))}
                      className="field-light"
                    />
                  </Field>
                  <Field label="Telefono">
                    <input
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      className="field-light"
                    />
                  </Field>
                  <Field label="Correo">
                    <input
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="field-light"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Observaciones">
                      <textarea
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        className="field-light min-h-[110px]"
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                  <p>Nombre: {client.fullName}</p>
                  <p>Cedula: {client.nationalId ?? "Sin dato"}</p>
                  <p>Telefono: {client.phone ?? "Sin dato"}</p>
                  <p>Correo: {client.email ?? "Sin dato"}</p>
                  <p>Observaciones: {client.notes ?? "Sin observaciones"}</p>
                </div>
              )}

              {editing ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSaveClient();
                    }}
                    disabled={saving}
                    className="rounded-full bg-[#092930] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143b43] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Guardar cliente"}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-[24px] border border-stone-200 bg-white/90 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Documentos</p>
                <div className="flex flex-wrap gap-2">
                  <UploadChip label="Frente" onPick={(file) => void handleUpload("client-front", file)} loading={uploadingKind === "client-front"} />
                  <UploadChip label="Dorso" onPick={(file) => void handleUpload("client-back", file)} loading={uploadingKind === "client-back"} />
                  <UploadChip label="Contrato" onPick={(file) => void handleUpload("contract", file)} loading={uploadingKind === "contract"} />
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {visibleDocuments.length === 0 ? (
                  <p className="rounded-[18px] border border-dashed border-stone-300 bg-stone-50/70 px-4 py-4 text-sm leading-7 text-slate-600">
                    Todavia no hay documentos cargados para este cliente.
                  </p>
                ) : (
                  visibleDocuments.map((document) => (
                    <article key={document.id} className="rounded-[18px] border border-stone-200 bg-[#fcfbf8] px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#092930]">{document.title}</p>
                          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                            {document.saleLabel ?? "Documento del cliente"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
                          >
                            Ver archivo
                          </a>
                          {document.canDelete ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleDeleteDocument(document);
                              }}
                              className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[24px] border border-stone-200 bg-white/90 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Resumen financiero</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SummaryCard label="Deuda pendiente" value={formatPrice(summary.pendingDebt, summary.currency)} />
                <SummaryCard label="Total pagado" value={formatPrice(summary.paidTotal, summary.currency)} />
                <SummaryCard label="Cuotas pendientes" value={String(summary.pendingCount)} />
                <SummaryCard label="Cuotas vencidas" value={String(summary.overdueCount)} />
              </div>
            </section>

            <section className="rounded-[24px] border border-stone-200 bg-[linear-gradient(180deg,#f7f2e9_0%,#f1ece3_100%)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Proximo vencimiento</p>
                  {nextDue && nextDueSale ? (
                    <>
                      <h3 className="font-display mt-3 text-[2rem] leading-none text-[#092930]">Cuota {nextDue.number}</h3>
                      <p className="mt-2 text-lg font-semibold text-[#715b3b]">
                        {formatPrice(nextDue.amount, nextDueSale.currency)}
                      </p>
                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p>Fecha: {nextDue.dueDate}</p>
                        <p>Lote: {nextDueSale.lotLabel}</p>
                        <p>Estado: {getInstallmentLabel(getEffectiveInstallmentStatus(nextDue))}</p>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-700">Sin vencimientos pendientes</p>
                  )}
                </div>

                {nextDueSale ? (
                  <button
                    type="button"
                    onClick={() => onRegisterPayment(nextDueSale.id)}
                    className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
                  >
                    Registrar cobro
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[24px] border border-stone-200 bg-white/90 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Lotes y operaciones</p>
              </div>

              <div className="mt-4 space-y-3">
                {clientSales.length === 0 ? (
                  <p className="rounded-[18px] border border-dashed border-stone-300 bg-stone-50/70 px-4 py-4 text-sm leading-7 text-slate-600">
                    Este cliente todavia no tiene operaciones registradas.
                  </p>
                ) : (
                  clientSales.map((sale) => (
                    <article key={sale.id} className="rounded-[18px] border border-stone-200 bg-[#fcfbf8] px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#092930]">{sale.lotLabel}</p>
                          <div className="mt-1 space-y-1 text-xs text-slate-600 sm:text-sm">
                            <p>
                              {getOperationLabel(sale)} - {formatPrice(sale.price, sale.currency)}
                            </p>
                            <p>Estado del lote: {sale.lotStatus === "reserved" ? "Reservado" : "Vendido"}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenOperation(sale.id)}
                            className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
                          >
                            Ver operacion
                          </button>
                          <button
                            type="button"
                            onClick={() => onRegisterPayment(sale.id)}
                            className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
                          >
                            Registrar cobro
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-stone-200 bg-white/90 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setIsHistoryExpanded((currentValue) => !currentValue)}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Historial de pagos</p>
                  {history.length === 0 ? (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Todavia no hay cuotas ni pagos registrados para este cliente.
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {historySummary.total} cuotas · {historySummary.paid} pagadas · {historySummary.pending} pendientes · {historySummary.overdue} vencidas
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

              {isHistoryExpanded ? (
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? (
                    <p className="rounded-[18px] border border-dashed border-stone-300 bg-stone-50/70 px-4 py-4 text-sm leading-7 text-slate-600">
                      Todavia no hay cuotas ni pagos registrados para este cliente.
                    </p>
                  ) : (
                    history.map((item) => (
                      <article key={item.id} className="rounded-[18px] border border-stone-200 bg-[#fcfbf8] px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#092930]">
                              {item.lotLabel} - Cuota {item.number}
                            </p>
                            <div className="mt-1 space-y-1 text-xs text-slate-600 sm:text-sm">
                              <p>Fecha: {item.paidAt ?? item.dueDate}</p>
                              <p>Monto: {formatPrice(item.amount, item.currency)}</p>
                              <p>Pago real: {item.paidAt ?? "Pendiente"}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${getInstallmentTone(item.effectiveStatus)}`}>
                            {getInstallmentLabel(item.effectiveStatus)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildClientForm(client: ClientRecord): ClientFormState {
  return {
    fullName: client.fullName,
    nationalId: client.nationalId ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    notes: client.notes ?? ""
  };
}

function buildVisibleDocuments(
  client: ClientRecord,
  documents: ClientDocumentRecord[],
  clientSales: SaleOperationRecord[]
) {
  const visibleDocuments: VisibleDocument[] = [];

  if (client.documentFrontUrl) {
    const frontDoc = documents.find((item) => item.kind === "client-front" && item.url === client.documentFrontUrl);
    visibleDocuments.push({
      id: frontDoc?.id ?? "legacy-front",
      kind: "client-front",
      title: "Frente de cedula",
      url: client.documentFrontUrl,
      storagePath: frontDoc?.storagePath ?? client.documentFrontPath ?? null,
      saleId: null,
      saleLabel: null,
      canDelete: true,
      source: frontDoc ? "client-doc" : "client-field"
    });
  }

  if (client.documentBackUrl) {
    const backDoc = documents.find((item) => item.kind === "client-back" && item.url === client.documentBackUrl);
    visibleDocuments.push({
      id: backDoc?.id ?? "legacy-back",
      kind: "client-back",
      title: "Dorso de cedula",
      url: client.documentBackUrl,
      storagePath: backDoc?.storagePath ?? client.documentBackPath ?? null,
      saleId: null,
      saleLabel: null,
      canDelete: true,
      source: backDoc ? "client-doc" : "client-field"
    });
  }

  documents
    .filter((item) => item.kind === "contract")
    .forEach((document) => {
      visibleDocuments.push({
        id: document.id,
        kind: "contract",
        title: document.name ?? "Contrato",
        url: document.url,
        storagePath: document.storagePath,
        saleId: document.saleId,
        saleLabel: document.saleLabel,
        canDelete: true,
        source: "client-doc"
      });
    });

  clientSales
    .filter((sale) => sale.contractUrl)
    .forEach((sale) => {
      visibleDocuments.push({
        id: `sale-contract-${sale.id}`,
        kind: "contract",
        title: "Contrato de operacion",
        url: sale.contractUrl ?? "",
        storagePath: null,
        saleId: sale.id,
        saleLabel: sale.lotLabel,
        canDelete: true,
        source: "sale-contract"
      });
    });

  return visibleDocuments;
}

function buildClientFinancialSummary(
  sales: SaleOperationRecord[],
  installments: InstallmentRecord[]
) {
  const pendingInstallments = installments.filter((item) => getEffectiveInstallmentStatus(item) !== "paid");
  const paidInstallments = installments.filter((item) => getEffectiveInstallmentStatus(item) === "paid");
  const referenceCurrency = sales[0]?.currency ?? "PYG";

  return {
    pendingDebt: pendingInstallments.reduce((accumulator, item) => accumulator + item.amount, 0),
    paidTotal: paidInstallments.reduce((accumulator, item) => accumulator + item.amount, 0),
    pendingCount: pendingInstallments.length,
    overdueCount: pendingInstallments.filter((item) => getEffectiveInstallmentStatus(item) === "overdue").length,
    currency: referenceCurrency
  };
}

function buildHistorySummary(
  history: Array<{
    effectiveStatus: InstallmentRecord["status"];
  }>
) {
  return history.reduce(
    (summary, item) => {
      if (item.effectiveStatus === "paid") {
        summary.paid += 1;
      } else if (item.effectiveStatus === "overdue") {
        summary.overdue += 1;
      } else {
        summary.pending += 1;
      }

      summary.total += 1;
      return summary;
    },
    { total: 0, paid: 0, pending: 0, overdue: 0 }
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[18px] border border-stone-200 bg-[#fcfbf8] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#092930] sm:text-base">{value}</p>
    </article>
  );
}

function UploadChip({
  label,
  loading,
  onPick
}: {
  label: string;
  loading: boolean;
  onPick: (file: File | null) => void;
}) {
  return (
    <label className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]">
      {loading ? "Subiendo..." : `Subir ${label}`}
      <input
        type="file"
        accept={label === "Contrato" ? ".pdf,image/*" : "image/*"}
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function getOperationLabel(sale: SaleOperationRecord) {
  return sale.operationType === "reserve" ? "Reserva" : "Venta";
}

function getInstallmentLabel(status: InstallmentRecord["status"]) {
  if (status === "paid") {
    return "Pagada";
  }

  if (status === "overdue") {
    return "Vencida";
  }

  return "Pendiente";
}

function getInstallmentTone(status: InstallmentRecord["status"]) {
  if (status === "paid") {
    return "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
  }

  if (status === "overdue") {
    return "border-[#d6c2b6] bg-[#f3e6df] text-[#8a5b48]";
  }

  return "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]";
}

function getClientStatusTone(status: string) {
  if (status === "En mora") {
    return "border-[#d6c2b6] bg-[#f3e6df] text-[#8a5b48]";
  }

  if (status === "Activo") {
    return "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
  }

  return "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]";
}
