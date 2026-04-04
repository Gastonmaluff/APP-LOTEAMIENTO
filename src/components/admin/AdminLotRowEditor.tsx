import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import { ADMIN_LOTES_ROUTE, PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
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
  const [form, setForm] = useState<LotEditorState>(() => toLotEditorState(item));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toLotEditorState(item));
    setMessage(null);
    setError(null);
  }, [item]);

  const computedArea = useMemo(() => computeArea(form.width, form.length), [form.length, form.width]);
  const areaLabel = computedArea ? formatAreaNumber(computedArea) : form.areaDisplay || "Sin calcular";
  const lotLabel = buildLotLabel(form.manzana, form.lotNumber);
  const lotMeasures = formatLotMeasures(form.width, form.length, areaLabel);
  const planLabel = formatPlanSummary(form.deliveryPercent, form.installments, form.financingText, form.currency);
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

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = fromLotEditorState(form, item, form.status);
      await updateProjectLot(PROJECT_SLUG, payload, user?.email ?? null);
      setMessage("Guardado");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
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

          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="shrink-0 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            {isEditing ? "Cerrar" : "Editar"}
          </button>
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
            onClick={() => setIsEditing((current) => !current)}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            {isEditing ? "Cerrar" : "Editar"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="border-t border-stone-200 bg-white/70 px-3 py-4 sm:px-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(180px,1.2fr)_minmax(150px,1.05fr)_110px_120px_88px_120px_126px_150px_170px_auto] xl:items-end">
            <Field label="Lote">
              <input
                value={lotLabel}
                onChange={(event) => applyLotLabel(event.target.value, setForm)}
                className="field-light min-w-0 px-3 py-2.5"
                placeholder="Lote M1-01"
              />
            </Field>

            <Field label="Dimensiones">
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

            <Field label="m2">
              <div className="flex min-h-[44px] items-center rounded-2xl border border-stone-200 bg-[#f3ede4] px-3 text-sm font-semibold text-slate-800">
                {areaLabel}
              </div>
            </Field>

            <Field label={form.currency === "USD" ? "Precio final" : "Precio base"}>
              <input
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                className="field-light px-3 py-2.5"
                inputMode="decimal"
                placeholder="0"
              />
            </Field>

            <Field label="Moneda">
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

            <Field label="Cuotas">
              <input
                value={form.installments}
                onChange={(event) => setForm((current) => ({ ...current, installments: event.target.value }))}
                className="field-light px-3 py-2.5"
                inputMode="numeric"
                placeholder="0"
              />
            </Field>

            <Field label="Entrega %">
              <input
                value={form.deliveryPercent}
                onChange={(event) => setForm((current) => ({ ...current, deliveryPercent: event.target.value }))}
                className="field-light px-3 py-2.5"
                inputMode="decimal"
                placeholder="0"
              />
            </Field>

            <Field label={commercialPrice.label}>
              <div className="flex min-h-[44px] items-center rounded-2xl border border-stone-200 bg-[#f3ede4] px-3 text-sm font-semibold text-slate-800">
                {commercialPrice.value}
              </div>
            </Field>

            <Field label="Estado">
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

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-1">
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
              <Link
                to={`${ADMIN_LOTES_ROUTE}/${item.id}`}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
              >
                Ficha
              </Link>
            </div>
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

          <p className="mt-3 text-xs leading-5 text-slate-500">{commercialPrice.caption}</p>

          {message || error ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {message ? <span className="rounded-full bg-[#eef5eb] px-3 py-1.5 font-medium text-[#506a4e]">{message}</span> : null}
              {error ? <span className="rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700">{error}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}
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

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function CompactField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
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
