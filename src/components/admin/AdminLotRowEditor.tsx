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
    <article className="rounded-[22px] border border-stone-200 bg-[#fcfbf8] px-3 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:px-4">
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

        <Field label="Precio">
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

        <Field label="Precio final">
          <input
            value={form.finalPrice}
            onChange={(event) => setForm((current) => ({ ...current, finalPrice: event.target.value }))}
            className="field-light px-3 py-2.5"
            inputMode="decimal"
            placeholder="0"
          />
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

      {message || error ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {message ? <span className="rounded-full bg-[#eef5eb] px-3 py-1.5 font-medium text-[#506a4e]">{message}</span> : null}
          {error ? <span className="rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700">{error}</span> : null}
        </div>
      ) : null}
    </article>
  );
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
