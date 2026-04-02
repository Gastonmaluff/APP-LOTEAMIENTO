import { useEffect, useMemo, useState, type ReactNode } from "react";
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

  async function handleSave(statusOverride?: LotData["status"]) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = fromLotEditorState(form, item, statusOverride ?? form.status);
      await updateProjectLot(PROJECT_SLUG, payload, user?.email ?? null);
      setMessage("Guardado");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-[28px] border border-stone-200 bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:px-5 xl:px-6">
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.4fr)_88px_88px_96px_96px_120px_132px_110px_92px_96px_132px_auto] xl:items-end">
        <Field label="Nombre">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="field-light min-w-0"
            placeholder="Nombre comercial"
          />
        </Field>

        <Field label="Manzana">
          <input
            value={form.manzana}
            onChange={(event) => setForm((current) => ({ ...current, manzana: event.target.value }))}
            className="field-light"
          />
        </Field>

        <Field label="Lote">
          <input
            value={form.lotNumber}
            onChange={(event) => setForm((current) => ({ ...current, lotNumber: event.target.value }))}
            className="field-light"
          />
        </Field>

        <Field label="Ancho">
          <input
            value={form.width}
            onChange={(event) => setForm((current) => ({ ...current, width: event.target.value }))}
            className="field-light"
            inputMode="decimal"
            placeholder="0"
          />
        </Field>

        <Field label="Largo">
          <input
            value={form.length}
            onChange={(event) => setForm((current) => ({ ...current, length: event.target.value }))}
            className="field-light"
            inputMode="decimal"
            placeholder="0"
          />
        </Field>

        <Field label="m²">
          <div className="flex min-h-[50px] items-center rounded-2xl border border-stone-200 bg-[#f5f0e7] px-4 text-sm font-semibold text-slate-800">
            {areaLabel}
          </div>
        </Field>

        <Field label="Precio">
          <input
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            className="field-light"
            inputMode="decimal"
            placeholder="0"
          />
        </Field>

        <Field label="Moneda">
          <select
            value={form.currency}
            onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as LotEditorState["currency"] }))}
            className="field-light"
          >
            <option value="">-</option>
            <option value="USD">USD</option>
            <option value="PYG">PYG</option>
          </select>
        </Field>

        <Field label="Cuotas">
          <input
            value={form.installments}
            onChange={(event) => setForm((current) => ({ ...current, installments: event.target.value }))}
            className="field-light"
            inputMode="numeric"
            placeholder="0"
          />
        </Field>

        <Field label="Entrega %">
          <input
            value={form.deliveryPercent}
            onChange={(event) => setForm((current) => ({ ...current, deliveryPercent: event.target.value }))}
            className="field-light"
            inputMode="decimal"
            placeholder="0"
          />
        </Field>

        <Field label="Estado">
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LotEditorState["status"] }))}
            className="field-light"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving}
            className="rounded-full bg-[#0f2f35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#143b43] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave("available");
            }}
            disabled={saving}
            className="rounded-full border border-[#b9d0b4] bg-[#eef5eb] px-4 py-3 text-sm font-semibold text-[#506a4e] transition hover:bg-[#e6f0e1] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Disponible
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave("sold");
            }}
            disabled={saving}
            className="rounded-full border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Vendido
          </button>
          <Link
            to={`${ADMIN_LOTES_ROUTE}/${item.id}`}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            Ver ficha
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
        <Field label="Precio final">
          <input
            value={form.finalPrice}
            onChange={(event) => setForm((current) => ({ ...current, finalPrice: event.target.value }))}
            className="field-light"
            inputMode="decimal"
          />
        </Field>

        <Field label="Financiacion">
          <input
            value={form.financingText}
            onChange={(event) => setForm((current) => ({ ...current, financingText: event.target.value }))}
            className="field-light"
            placeholder="Ej. 20% entrega + 36 cuotas"
          />
        </Field>

        <Field label="Descripcion">
          <input
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="field-light"
            placeholder="Observacion comercial"
          />
        </Field>
      </div>

      {message || error ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
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
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
