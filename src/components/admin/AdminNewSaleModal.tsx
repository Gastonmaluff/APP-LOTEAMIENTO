import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import {
  createClientDocumentRecord,
  createProjectSale
} from "../../services/financeRepository";
import { uploadFinanceDocumentAsset } from "../../services/financeDocumentsRepository";
import type { NewSaleInput, OperationType } from "../../types/finance";
import type { LotData } from "../../types/lots";
import { compressImageFile, formatFileSize } from "../../utils/fileCompression";
import { formatPrice } from "../../utils/mapUtils";

type AdminNewSaleModalProps = {
  lots: LotData[];
  onClose: () => void;
  onCreated?: () => void;
};

type SaleFormState = {
  lotId: string;
  isTest: boolean;
  lotSearch: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  clientNotes: string;
  operationType: OperationType;
  currency: "USD" | "PYG";
  price: string;
  deliveryPercent: string;
  installments: string;
  startDate: string;
  firstDueDate: string;
  saleNotes: string;
};

type SubmissionStage =
  | "idle"
  | "saving-sale"
  | "updating-lot"
  | "generating-plan"
  | "uploading-documents"
  | "finalizing";

type DocumentStats = {
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
};

const initialForm: SaleFormState = {
  lotId: "",
  isTest: false,
  lotSearch: "",
  fullName: "",
  nationalId: "",
  phone: "",
  email: "",
  clientNotes: "",
  operationType: "reserve",
  currency: "USD",
  price: "",
  deliveryPercent: "",
  installments: "",
  startDate: "",
  firstDueDate: "",
  saleNotes: ""
};

const stageOrder: SubmissionStage[] = [
  "saving-sale",
  "updating-lot",
  "generating-plan",
  "uploading-documents",
  "finalizing"
];

export function AdminNewSaleModal({ lots, onClose, onCreated }: AdminNewSaleModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<SaleFormState>(initialForm);
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<SubmissionStage>("idle");
  const [documentStats, setDocumentStats] = useState<Record<string, DocumentStats>>({});

  const availableLots = useMemo(
    () =>
      lots
        .filter((item) => item.type === "lote" && (form.isTest || item.status === "available"))
        .sort((left, right) => buildLotLabel(left).localeCompare(buildLotLabel(right), "es")),
    [form.isTest, lots]
  );

  const filteredLots = useMemo(() => {
    const normalizedQuery = form.lotSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableLots;
    }

    return availableLots.filter((item) => buildLotLabel(item).toLowerCase().includes(normalizedQuery));
  }, [availableLots, form.lotSearch]);

  const selectedLot = useMemo(
    () => availableLots.find((item) => item.id === form.lotId) ?? null,
    [availableLots, form.lotId]
  );

  const listPriceValue = useMemo(() => {
    if (!selectedLot || typeof selectedLot.price !== "number") {
      return null;
    }

    return selectedLot.price;
  }, [selectedLot]);

  const listPriceCurrency = selectedLot?.currency ?? form.currency;
  const closePriceValue = useMemo(() => parseFormattedNumber(form.price), [form.price]);
  const priceDifference = useMemo(() => {
    if (!selectedLot || typeof selectedLot.price !== "number" || closePriceValue === null) {
      return null;
    }

    return closePriceValue - selectedLot.price;
  }, [closePriceValue, selectedLot]);

  const activeStages = useMemo(
    () =>
      stageOrder.filter((stage) => {
        if (stage !== "uploading-documents") {
          return true;
        }

        return Boolean(documentFront || documentBack || contractFile);
      }),
    [contractFile, documentBack, documentFront]
  );

  const currentStageIndex = activeStages.findIndex((stage) => stage === currentStage);
  const progressPercent = saving && currentStageIndex >= 0
    ? Math.round(((currentStageIndex + 1) / activeStages.length) * 100)
    : 0;

  useEffect(() => {
    if (!selectedLot) {
      return;
    }

    setForm((current) => ({
      ...current,
      currency: selectedLot.currency ?? current.currency,
      price: typeof selectedLot.price === "number" ? formatNumericInput(selectedLot.price) : current.price
    }));
  }, [selectedLot?.id]);

  async function handleSubmit() {
    if (!selectedLot) {
      setError("Selecciona un lote disponible.");
      return;
    }

    const parsedPrice = parseFormattedNumber(form.price);
    if (parsedPrice === null || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido.");
      return;
    }

    const closePrice = parsedPrice;

    if (!form.fullName.trim() || !form.nationalId.trim() || !form.phone.trim()) {
      setError("Completa nombre, cedula y telefono del cliente.");
      return;
    }

    setSaving(true);
    setCurrentStage("saving-sale");
    setError(null);

    try {
      const input: NewSaleInput = {
        lotId: selectedLot.id,
        isTest: form.isTest,
        operationType: form.operationType,
        client: {
          fullName: form.fullName,
          nationalId: form.nationalId,
          phone: form.phone,
          email: form.email,
          notes: form.clientNotes
        },
        commercial: {
          currency: form.currency,
          price: closePrice,
          deliveryPercent: parseOptionalNumber(form.deliveryPercent),
          installments: parseOptionalInteger(form.installments),
          startDate: form.startDate,
          firstDueDate: form.firstDueDate,
          notes: form.saleNotes
        }
      };

      const createdOperation = await createProjectSale(PROJECT_SLUG, selectedLot, input, user?.email ?? null);

      setCurrentStage("updating-lot");
      await pauseForFeedback(160);

      setCurrentStage("generating-plan");
      await pauseForFeedback(180);

      if (documentFront || documentBack || contractFile) {
        setCurrentStage("uploading-documents");
        await uploadDocumentsAfterSale({
          clientId: createdOperation.clientId,
          saleId: createdOperation.saleId,
          saleLabel: buildLotLabel(selectedLot),
          documentFront,
          documentBack,
          contractFile,
          scopeId: selectedLot.id,
          setDocumentStats,
          userEmail: user?.email ?? null
        });
      }

      setCurrentStage("finalizing");
      await pauseForFeedback(180);

      onCreated?.();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo registrar la operacion.");
      setCurrentStage("idle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-[#091719]/70 px-3 py-4 backdrop-blur-sm sm:px-6">
      <div className="mx-auto max-w-[980px] rounded-[28px] border border-white/60 bg-[#f8f4ec] p-5 shadow-[0_40px_90px_rgba(5,16,18,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Nueva venta</p>
            <h2 className="font-display mt-3 text-[2.2rem] leading-tight text-[#092930]">Registrar reserva o venta</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="self-start rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>

        {saving ? (
          <div className="mt-5 rounded-[24px] border border-stone-200 bg-white/88 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Proceso de registro</p>
                <p className="mt-2 text-base font-semibold text-[#092930]">{getStageLabel(currentStage)}</p>
              </div>
              <div className="text-sm font-semibold text-[#715b3b]">{progressPercent}%</div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-[#1f3d2b] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {activeStages.map((stage, index) => {
                const stageIndex = activeStages.findIndex((item) => item === currentStage);
                const isDone = stageIndex > index;
                const isCurrent = currentStage === stage;

                return (
                  <div
                    key={stage}
                    className={`rounded-[18px] border px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] ${
                      isCurrent
                        ? "border-[#8fa88b] bg-[#eef4ea] text-[#1f3d2b]"
                        : isDone
                          ? "border-[#cedcc8] bg-[#eff5ec] text-[#567052]"
                          : "border-stone-200 bg-white text-slate-500"
                    }`}
                  >
                    {getStageLabel(stage)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <SectionTitle title="Lote" />
            <Field label="Buscar lote">
              <input
                value={form.lotSearch}
                onChange={(event) => setForm((current) => ({ ...current, lotSearch: event.target.value }))}
                className="field-light"
                placeholder="M1-01, M4-11..."
              />
            </Field>

            <Field label="Lote disponible">
              <select
                value={form.lotId}
                onChange={(event) => setForm((current) => ({ ...current, lotId: event.target.value }))}
                className="field-light"
              >
                <option value="">Seleccionar lote</option>
                {filteredLots.map((item) => (
                  <option key={item.id} value={item.id}>
                    {buildLotLabel(item)}
                  </option>
                ))}
              </select>
            </Field>

            <label className="flex items-center gap-3 rounded-[18px] border border-stone-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isTest}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isTest: event.target.checked,
                    lotId: ""
                  }))
                }
                className="h-4 w-4 rounded border-stone-300 text-[#092930] focus:ring-[#8fa88b]"
              />
              <span>
                Marcar como prueba
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  No cambia el estado real del lote ni afecta el portal publico.
                </span>
              </span>
            </label>

            {selectedLot ? (
              <div className="rounded-[20px] border border-stone-200 bg-white/85 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Precio de lista</p>
                <p className="mt-2 text-lg font-semibold text-[#092930]">
                  {formatPrice(listPriceValue, listPriceCurrency)}
                </p>
                {priceDifference !== null && priceDifference !== 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {priceDifference < 0
                      ? `Descuento aplicado: ${formatPrice(Math.abs(priceDifference), listPriceCurrency)}`
                      : `Ajuste sobre lista: ${formatPrice(priceDifference, listPriceCurrency)}`}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">El precio de cierre coincide con el valor actual del lote.</p>
                )}
              </div>
            ) : null}

            <Field label="Tipo de operacion">
              <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-stone-200 bg-white p-1">
                <OperationToggle
                  active={form.operationType === "reserve"}
                  label="Reserva"
                  onClick={() => setForm((current) => ({ ...current, operationType: "reserve" }))}
                />
                <OperationToggle
                  active={form.operationType === "sale"}
                  label="Venta"
                  onClick={() => setForm((current) => ({ ...current, operationType: "sale" }))}
                />
              </div>
            </Field>
          </div>

          <div className="space-y-4">
            <SectionTitle title="Cliente" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo">
                <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="field-light" />
              </Field>
              <Field label="Cedula">
                <input value={form.nationalId} onChange={(event) => setForm((current) => ({ ...current, nationalId: event.target.value }))} className="field-light" />
              </Field>
              <Field label="Telefono">
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="field-light" />
              </Field>
              <Field label="Correo">
                <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="field-light" />
              </Field>
            </div>

            <Field label="Observaciones del cliente">
              <textarea
                value={form.clientNotes}
                onChange={(event) => setForm((current) => ({ ...current, clientNotes: event.target.value }))}
                className="field-light min-h-[96px]"
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <SectionTitle title="Documentos" />
            <UploadField
              label="Frente de cedula"
              file={documentFront}
              stats={documentStats["front"] ?? null}
              onChange={setDocumentFront}
              accept="image/*"
            />
            <UploadField
              label="Dorso de cedula"
              file={documentBack}
              stats={documentStats["back"] ?? null}
              onChange={setDocumentBack}
              accept="image/*"
            />
            <UploadField
              label="Contrato"
              file={contractFile}
              stats={documentStats["contract"] ?? null}
              onChange={setContractFile}
              accept=".pdf,image/*"
            />
          </div>

          <div className="space-y-4">
            <SectionTitle title="Datos comerciales" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Moneda">
                <select
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as "USD" | "PYG" }))}
                  className="field-light"
                >
                  <option value="USD">USD</option>
                  <option value="PYG">PYG</option>
                </select>
              </Field>

              <Field label="Precio de cierre">
                <input
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: formatUserTypedNumericInput(event.target.value)
                    }))
                  }
                  onBlur={() =>
                    setForm((current) => ({
                      ...current,
                      price: formatNumericInput(parseFormattedNumber(current.price))
                    }))
                  }
                  className="field-light"
                  inputMode="decimal"
                />
              </Field>

              <Field label="Entrega %">
                <input value={form.deliveryPercent} onChange={(event) => setForm((current) => ({ ...current, deliveryPercent: event.target.value }))} className="field-light" inputMode="decimal" />
              </Field>

              <Field label="Cuotas">
                <input value={form.installments} onChange={(event) => setForm((current) => ({ ...current, installments: event.target.value }))} className="field-light" inputMode="numeric" />
              </Field>

              <Field label="Fecha de inicio">
                <input value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} type="date" className="field-light" />
              </Field>

              <Field label="Primer vencimiento">
                <input value={form.firstDueDate} onChange={(event) => setForm((current) => ({ ...current, firstDueDate: event.target.value }))} type="date" className="field-light" />
              </Field>
            </div>

            <Field label="Observaciones de la venta">
              <textarea
                value={form.saleNotes}
                onChange={(event) => setForm((current) => ({ ...current, saleNotes: event.target.value }))}
                className="field-light min-h-[96px]"
              />
            </Field>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={saving}
            className="rounded-full bg-[#0f2f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#143b43] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? getStageLabel(currentStage) : "Confirmar operacion"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

async function uploadDocumentsAfterSale({
  clientId,
  contractFile,
  documentBack,
  documentFront,
  saleId,
  saleLabel,
  scopeId,
  setDocumentStats,
  userEmail
}: {
  clientId: string;
  saleId: string;
  saleLabel: string;
  scopeId: string;
  documentFront: File | null;
  documentBack: File | null;
  contractFile: File | null;
  setDocumentStats: Dispatch<SetStateAction<Record<string, DocumentStats>>>;
  userEmail?: string | null;
}) {
  const uploadJobs = [
    {
      key: "front",
      kind: "client-front" as const,
      file: documentFront,
      compress: true
    },
    {
      key: "back",
      kind: "client-back" as const,
      file: documentBack,
      compress: true
    },
    {
      key: "contract",
      kind: "contract" as const,
      file: contractFile,
      compress: contractFile?.type.startsWith("image/") ?? false
    }
  ].filter((job) => Boolean(job.file));

  await Promise.all(
    uploadJobs.map(async (job) => {
      const sourceFile = job.file as File;
      const compression = job.compress ? await compressImageFile(sourceFile) : {
        file: sourceFile,
        originalSize: sourceFile.size,
        compressedSize: sourceFile.size,
        compressed: false
      };

      setDocumentStats((current) => ({
        ...current,
        [job.key]: {
          originalSize: compression.originalSize,
          compressedSize: compression.compressedSize,
          compressed: compression.compressed
        }
      }));

      const asset = await uploadFinanceDocumentAsset(PROJECT_SLUG, scopeId, job.kind, compression.file);
      await createClientDocumentRecord(
        PROJECT_SLUG,
        clientId,
        {
          kind: job.kind,
          url: asset.url,
          storagePath: asset.storagePath,
          name: asset.name,
          saleId: job.kind === "contract" ? saleId : null,
          saleLabel: job.kind === "contract" ? saleLabel : null
        },
        userEmail ?? null
      );
    })
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

function SectionTitle({ title }: { title: string }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">{title}</p>;
}

function OperationToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[16px] px-4 py-3 text-sm font-semibold transition",
        active ? "bg-[#092930] text-white" : "text-slate-600 hover:bg-[#f7f1e8] hover:text-[#092930]"
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function UploadField({
  accept,
  file,
  label,
  onChange,
  stats
}: {
  accept: string;
  file: File | null;
  label: string;
  onChange: (file: File | null) => void;
  stats: DocumentStats | null;
}) {
  return (
    <label className="block rounded-[20px] border border-stone-200 bg-white/80 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="truncate text-sm text-slate-600">{file?.name ?? "Sin archivo"}</span>
        <span className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
          Seleccionar
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-500">
        {stats
          ? stats.compressed
            ? `Optimizada antes de subir: ${formatFileSize(stats.originalSize)} -> ${formatFileSize(stats.compressedSize)}`
            : `Lista para subir: ${formatFileSize(stats.originalSize)}`
          : "Las imagenes se optimizan automaticamente antes de subir."}
      </p>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function buildLotLabel(item: LotData) {
  const manzana = item.manzana?.trim() || "?";
  const lotNumber = item.lotNumber?.trim() || "--";
  return `Lote ${manzana}-${lotNumber}`;
}

function parseOptionalNumber(value: string) {
  const parsed = parseFormattedNumber(value);
  return parsed === null ? null : parsed;
}

function parseOptionalInteger(value: string) {
  const parsed = parseOptionalNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function formatNumericInput(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2
  }).format(value);
}

function formatUserTypedNumericInput(value: string) {
  const parsed = parseFormattedNumber(value);
  return parsed === null ? "" : formatNumericInput(parsed);
}

function parseFormattedNumber(value: string) {
  const normalized = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getStageLabel(stage: SubmissionStage) {
  switch (stage) {
    case "saving-sale":
      return "Guardando venta...";
    case "updating-lot":
      return "Actualizando estado del lote...";
    case "generating-plan":
      return "Generando plan de pagos...";
    case "uploading-documents":
      return "Subiendo documentos...";
    case "finalizing":
      return "Finalizando operacion...";
    default:
      return "Preparando operacion...";
  }
}

function pauseForFeedback(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
