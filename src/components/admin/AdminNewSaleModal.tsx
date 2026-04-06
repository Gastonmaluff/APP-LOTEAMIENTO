import { useMemo, useState, type ReactNode } from "react";
import { PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import { uploadFinanceDocument } from "../../services/financeDocumentsRepository";
import { createProjectSale } from "../../services/financeRepository";
import type { NewSaleInput, OperationType } from "../../types/finance";
import type { LotData } from "../../types/lots";

type AdminNewSaleModalProps = {
  lots: LotData[];
  onClose: () => void;
  onCreated?: () => void;
};

type SaleFormState = {
  lotId: string;
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

const initialForm: SaleFormState = {
  lotId: "",
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

export function AdminNewSaleModal({ lots, onClose, onCreated }: AdminNewSaleModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<SaleFormState>(initialForm);
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLots = useMemo(
    () =>
      lots
        .filter((item) => item.type === "lote" && item.status === "available")
        .sort((left, right) => buildLotLabel(left).localeCompare(buildLotLabel(right), "es")),
    [lots]
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

  async function handleSubmit() {
    if (!selectedLot) {
      setError("Selecciona un lote disponible.");
      return;
    }

    const parsedPrice = Number(form.price.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido.");
      return;
    }

    if (!form.fullName.trim() || !form.nationalId.trim() || !form.phone.trim()) {
      setError("Completa nombre, cedula y telefono del cliente.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const [documentFrontUrl, documentBackUrl, contractUrl] = await Promise.all([
        documentFront ? uploadFinanceDocument(PROJECT_SLUG, selectedLot.id, "client-front", documentFront) : Promise.resolve(null),
        documentBack ? uploadFinanceDocument(PROJECT_SLUG, selectedLot.id, "client-back", documentBack) : Promise.resolve(null),
        contractFile ? uploadFinanceDocument(PROJECT_SLUG, selectedLot.id, "contract", contractFile) : Promise.resolve(null)
      ]);

      const input: NewSaleInput = {
        lotId: selectedLot.id,
        operationType: form.operationType,
        client: {
          fullName: form.fullName,
          nationalId: form.nationalId,
          phone: form.phone,
          email: form.email,
          notes: form.clientNotes,
          documentFrontUrl,
          documentBackUrl
        },
        commercial: {
          currency: form.currency,
          price: parsedPrice,
          deliveryPercent: parseOptionalNumber(form.deliveryPercent),
          installments: parseOptionalInteger(form.installments),
          startDate: form.startDate,
          firstDueDate: form.firstDueDate,
          notes: form.saleNotes,
          contractUrl
        }
      };

      await createProjectSale(PROJECT_SLUG, selectedLot, input, user?.email ?? null);
      onCreated?.();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo registrar la operacion.");
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
            className="self-start rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            Cerrar
          </button>
        </div>

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
            <UploadField label="Frente de cedula" file={documentFront} onChange={setDocumentFront} accept="image/*" />
            <UploadField label="Dorso de cedula" file={documentBack} onChange={setDocumentBack} accept="image/*" />
            <UploadField label="Contrato" file={contractFile} onChange={setContractFile} accept=".pdf,image/*" />
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

              <Field label="Precio">
                <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="field-light" inputMode="decimal" />
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
            {saving ? "Registrando..." : "Confirmar operacion"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
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
  onChange
}: {
  accept: string;
  file: File | null;
  label: string;
  onChange: (file: File | null) => void;
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
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const parsed = parseOptionalNumber(value);
  return parsed === null ? null : Math.round(parsed);
}
