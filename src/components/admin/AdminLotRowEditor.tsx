import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import { deleteProjectLotPhoto, uploadProjectLotPhoto, type LotPhotoSlot } from "../../services/lotPhotosRepository";
import { updateProjectLot } from "../../services/lotsRepository";
import type { LotData } from "../../types/lots";
import {
  computeArea,
  formatAreaNumber,
  fromLotEditorState,
  toLotEditorState,
  type LotEditorState
} from "../../utils/adminLotForm";
import { getCommercialPriceSummary, getStatusLabel } from "../../utils/mapUtils";
import { AdminLotPreviewModal } from "./AdminLotPreviewModal";

type AdminLotRowEditorProps = {
  item: LotData;
};

const statusOptions = [
  { value: "", label: "Sin definir" },
  { value: "available", label: "Disponible" },
  { value: "reserved", label: "Reservado" },
  { value: "sold", label: "Vendido" }
] as const;

const currencyOptions = [
  { value: "PYG", label: "Gs" },
  { value: "USD", label: "USD" }
] as const;

export function AdminLotRowEditor({ item }: AdminLotRowEditorProps) {
  const { user } = useAuth();
  const initialForm = useMemo(() => toLotEditorState(item), [item]);
  const [form, setForm] = useState<LotEditorState>(() => initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClosePromptOpen, setIsClosePromptOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotoSlot, setUploadingPhotoSlot] = useState<LotPhotoSlot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm);
    setMessage(null);
    setError(null);
    setIsClosePromptOpen(false);
  }, [initialForm]);

  const computedArea = useMemo(() => computeArea(form.width, form.length), [form.length, form.width]);
  const areaLabel = computedArea ? formatAreaNumber(computedArea) : form.areaDisplay || "Sin calcular";
  const lotLabel = buildLotLabel(form.manzana, form.lotNumber);
  const lotMeasures = formatLotMeasures(form.width, form.length, areaLabel);
  const planLabel = formatPlanSummary(form.deliveryPercent, form.installments, form.financingText, form.currency);
  const previewItem = useMemo(() => fromLotEditorState(form, item, form.status), [form, item]);
  const commercialPrice = getCommercialPriceSummary({
    currency: form.currency || null,
    deliveryPercent: parseNumberLike(form.deliveryPercent),
    finalPrice: parseNumberLike(form.finalPrice),
    financingText: form.financingText,
    installments: parseNumberLike(form.installments),
    price: parseNumberLike(form.price)
  });
  const statusLabel = getStatusLabel(form.status || null, "lote");
  const statusBadgeClass = getStatusBadgeClass(form.status || null);
  const hasUnsavedChanges = useMemo(() => !areEditorStatesEqual(form, initialForm), [form, initialForm]);

  useEffect(() => {
    if (!isEditing || !hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isEditing]);

  async function persistFormState(nextForm: LotEditorState, successMessage: string) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = fromLotEditorState(nextForm, item, nextForm.status);
      await updateProjectLot(PROJECT_SLUG, payload, user?.email ?? null);
      setForm(nextForm);
      setMessage(successMessage);
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await persistFormState(form, "Guardado");
  }

  async function handleSaveAndClose() {
    const saved = await persistFormState(form, "Guardado");
    if (saved) {
      setIsEditing(false);
      setIsClosePromptOpen(false);
    }
  }

  function handleCancelEditing() {
    setForm(initialForm);
    setMessage(null);
    setError(null);
    setIsEditing(false);
    setIsClosePromptOpen(false);
  }

  function handleToggleEditing() {
    if (!isEditing) {
      setIsEditing(true);
      setIsClosePromptOpen(false);
      return;
    }

    if (hasUnsavedChanges) {
      setIsClosePromptOpen(true);
      return;
    }

    handleCancelEditing();
  }

  async function handlePhotoUpload(slot: LotPhotoSlot, files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const previousUrl = form[slot];
    setUploadingPhotoSlot(slot);
    setMessage(null);
    setError(null);

    try {
      const photoUrl = await uploadProjectLotPhoto(PROJECT_SLUG, item.id, slot, file);
      const nextForm = { ...form, [slot]: photoUrl };
      await persistFormState(nextForm, slot === "photo1Url" ? "Foto 1 actualizada" : "Foto 2 actualizada");

      if (previousUrl && previousUrl !== photoUrl) {
        try {
          await deleteProjectLotPhoto(previousUrl);
        } catch {
          // Mantener la URL nueva guardada aunque la limpieza del archivo viejo falle.
        }
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo subir la foto.");
    } finally {
      setUploadingPhotoSlot(null);
    }
  }

  async function handlePhotoDelete(slot: LotPhotoSlot) {
    const previousUrl = form[slot];
    if (!previousUrl) {
      return;
    }

    setUploadingPhotoSlot(slot);
    setMessage(null);
    setError(null);

    try {
      const nextForm = { ...form, [slot]: "" };
      await persistFormState(nextForm, slot === "photo1Url" ? "Foto 1 eliminada" : "Foto 2 eliminada");
      try {
        await deleteProjectLotPhoto(previousUrl);
      } catch {
        // No bloquear la eliminacion logica del lote si la limpieza fisica falla.
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo eliminar la foto.");
    } finally {
      setUploadingPhotoSlot(null);
    }
  }

  return (
    <article className="overflow-hidden rounded-[18px] border border-stone-200 bg-[#fcfbf8] shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="px-3 py-2.5 xl:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] font-semibold text-[#092930]">{lotLabel}</p>
            <p className="mt-1 text-xs text-slate-600">{lotMeasures}</p>
          </div>

          <span
            className={[
              "max-w-[108px] shrink-0 truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4",
              statusBadgeClass
            ].join(" ")}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-2 flex items-end justify-between gap-3 border-t border-stone-200/70 pt-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{commercialPrice.value}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-600">{planLabel}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
            >
              Ver lote
            </button>
            <button
              type="button"
              onClick={handleToggleEditing}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
            >
              {isEditing ? "Cerrar" : "Editar"}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden gap-3 px-4 py-2.5 xl:grid xl:grid-cols-[minmax(180px,1.1fr)_minmax(170px,0.95fr)_minmax(130px,0.8fr)_minmax(180px,1fr)_minmax(120px,0.7fr)_auto] xl:items-center">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#092930]">{lotLabel}</p>
        </div>

        <p className="text-sm text-slate-700">{lotMeasures}</p>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{commercialPrice.value}</p>
        </div>

        <p className="truncate text-sm text-slate-700">{planLabel}</p>

        <div className="flex min-w-0 justify-start xl:justify-end">
          <span
            className={[
              "max-w-full shrink-0 truncate rounded-full border px-3 py-1.5 text-xs font-semibold",
              statusBadgeClass
            ].join(" ")}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-[#0f2f35] transition hover:border-[#8fa88b]"
          >
            Ver lote
          </button>
          <button
            type="button"
            onClick={handleToggleEditing}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            {isEditing ? "Cerrar" : "Editar"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="border-t border-stone-200 bg-white/70 px-3 py-4 sm:px-4">
          <div className="grid gap-3 xl:grid-cols-12 xl:items-end">
            <Field label="Lote" className="xl:col-span-2">
              <input
                value={lotLabel}
                onChange={(event) => applyLotLabel(event.target.value, setForm)}
                className="field-light min-w-0 px-3 py-2.5"
                placeholder="Lote M1-01"
              />
            </Field>

            <Field label="Dimensiones" className="xl:col-span-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.width}
                  onChange={(event) => setForm((current) => ({ ...current, width: event.target.value }))}
                  className="field-light px-3 py-2.5"
                  inputMode="decimal"
                  placeholder="Ancho"
                />
                <input
                  value={form.length}
                  onChange={(event) => setForm((current) => ({ ...current, length: event.target.value }))}
                  className="field-light px-3 py-2.5"
                  inputMode="decimal"
                  placeholder="Largo"
                />
              </div>
            </Field>

            <Field label="m2" className="xl:col-span-1">
              <div className="flex min-h-[44px] items-center rounded-2xl border border-stone-200 bg-[#f3ede4] px-3 text-sm font-semibold text-slate-800">
                {areaLabel}
              </div>
            </Field>

            <Field label={form.currency === "USD" ? "Precio final" : "Precio base"} className="xl:col-span-1">
              <input
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                className="field-light px-3 py-2.5"
                inputMode="decimal"
                placeholder="0"
              />
            </Field>

            <Field label="Moneda" className="xl:col-span-1">
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-white p-1">
                {currencyOptions.map((option) => {
                  const isActive = form.currency === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, currency: option.value }))}
                      className={[
                        "rounded-xl px-2 py-2 text-xs font-semibold transition",
                        isActive ? "bg-[#0f2f35] text-white" : "text-slate-600 hover:bg-[#f3ede4]"
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Cuotas" className="xl:col-span-1">
              <input
                value={form.installments}
                onChange={(event) => setForm((current) => ({ ...current, installments: event.target.value }))}
                className="field-light px-3 py-2.5"
                inputMode="numeric"
                placeholder="0"
              />
            </Field>

            <Field label="Entrega %" className="xl:col-span-1">
              <input
                value={form.deliveryPercent}
                onChange={(event) => setForm((current) => ({ ...current, deliveryPercent: event.target.value }))}
                className="field-light px-3 py-2.5"
                inputMode="decimal"
                placeholder="0"
              />
            </Field>

            <Field label={commercialPrice.label} className="xl:col-span-2">
              <div className="flex min-h-[44px] items-center rounded-2xl border border-stone-200 bg-[#f3ede4] px-3 text-sm font-semibold text-slate-800">
                {commercialPrice.value}
              </div>
            </Field>

            <Field label="Estado" className="xl:col-span-2">
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LotEditorState["status"] }))}
                className="field-light px-3 py-2.5"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
              className="rounded-full bg-[#0f2f35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143b43] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={handleToggleEditing}
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
            >
              Cancelar
            </button>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <CompactField label="Financiacion">
              <input
                value={form.financingText}
                onChange={(event) => setForm((current) => ({ ...current, financingText: event.target.value }))}
                className="field-light px-3 py-2.5"
                placeholder="Ej. 20% entrega + 36 cuotas"
              />
            </CompactField>

            <CompactField label="Observacion">
              <input
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="field-light px-3 py-2.5"
                placeholder="Observacion comercial"
              />
            </CompactField>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <PhotoUploadField
              label="Foto 1"
              photoUrl={form.photo1Url}
              busy={uploadingPhotoSlot === "photo1Url"}
              onDelete={() => {
                void handlePhotoDelete("photo1Url");
              }}
              onUpload={(files) => {
                void handlePhotoUpload("photo1Url", files);
              }}
            />
            <PhotoUploadField
              label="Foto 2"
              photoUrl={form.photo2Url}
              busy={uploadingPhotoSlot === "photo2Url"}
              onDelete={() => {
                void handlePhotoDelete("photo2Url");
              }}
              onUpload={(files) => {
                void handlePhotoUpload("photo2Url", files);
              }}
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">{commercialPrice.caption}</p>

          {message || error ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {message ? <span className="rounded-full bg-[#eef5eb] px-3 py-1.5 font-medium text-[#506a4e]">{message}</span> : null}
              {error ? <span className="rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700">{error}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isClosePromptOpen ? (
        <div className="border-t border-stone-200 bg-[#f8f4ec] px-4 py-4">
          <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-[#092930]">Tienes cambios sin guardar.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              ¿Deseas guardarlos antes de cerrar?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleSaveAndClose();
                }}
                disabled={saving}
                className="rounded-full bg-[#0f2f35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143b43] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar y cerrar"}
              </button>
              <button
                type="button"
                onClick={handleCancelEditing}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
              >
                Cerrar sin guardar
              </button>
              <button
                type="button"
                onClick={() => setIsClosePromptOpen(false)}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
              >
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isPreviewOpen ? <AdminLotPreviewModal item={previewItem} onClose={() => setIsPreviewOpen(false)} /> : null}
    </article>
  );
}

function parseNumberLike(value: string) {
  if (!value.trim()) {
    return null;
  }

  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

function Field({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <label className={["block min-w-0", className ?? ""].join(" ").trim()}>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function CompactField({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <label className={["block min-w-0", className ?? ""].join(" ").trim()}>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function PhotoUploadField({
  busy,
  label,
  onDelete,
  onUpload,
  photoUrl
}: {
  busy: boolean;
  label: string;
  onDelete: () => void;
  onUpload: (files: FileList | null) => void;
  photoUrl: string;
}) {
  return (
    <div className="rounded-[22px] border border-stone-200 bg-white/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]">
            {busy ? "Subiendo..." : photoUrl ? "Reemplazar" : "Subir"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(event) => {
                onUpload(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {photoUrl ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Eliminar
            </button>
          ) : null}
        </div>
      </div>

      {photoUrl ? (
        <img src={photoUrl} alt={label} className="mt-3 h-28 w-full rounded-[16px] object-cover" />
      ) : (
        <div className="mt-3 flex h-28 items-center justify-center rounded-[16px] bg-[#f6f1e8] text-xs font-medium text-slate-500">
          {label} pendiente
        </div>
      )}
    </div>
  );
}

function formatLotMeasures(width: string, length: string, areaLabel: string) {
  const widthValue = width.trim();
  const lengthValue = length.trim();

  if (widthValue && lengthValue) {
    return `${widthValue} x ${lengthValue} m | ${areaLabel}`;
  }

  if (widthValue || lengthValue) {
    return `${widthValue || "?"} x ${lengthValue || "?"} m | ${areaLabel}`;
  }

  return areaLabel;
}

function formatPlanSummary(
  deliveryPercent: string,
  installments: string,
  financingText: string,
  currency: string
) {
  const deliveryValue = deliveryPercent.trim();
  const installmentsValue = installments.trim();
  const financingValue = financingText.trim();

  if (deliveryValue && installmentsValue) {
    return `Entrega ${deliveryValue}% + ${installmentsValue} cuotas`;
  }

  if (financingValue) {
    return financingValue;
  }

  return currency === "USD" ? "Pago contado" : "Consultar plan";
}

function buildLotLabel(manzana: string, lotNumber: string) {
  const cleanManzana = manzana.trim() || "?";
  const cleanLotNumber = lotNumber.trim() || "--";
  return `Lote ${cleanManzana}-${cleanLotNumber}`;
}

function applyLotLabel(value: string, setForm: Dispatch<SetStateAction<LotEditorState>>) {
  const normalized = value.trim();
  const matched = normalized.match(/lote\s+([a-z0-9-]+)\s*-\s*([a-z0-9]+)/i);

  if (!matched) {
    setForm((current) => ({ ...current, name: current.name }));
    return;
  }

  setForm((current) => ({
    ...current,
    manzana: matched[1].toUpperCase(),
    lotNumber: matched[2].toUpperCase()
  }));
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

function areEditorStatesEqual(left: LotEditorState, right: LotEditorState) {
  return JSON.stringify(left) === JSON.stringify(right);
}
