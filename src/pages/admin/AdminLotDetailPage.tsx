import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useParams } from "react-router-dom";
import { ADMIN_LOTES_ROUTE, PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import { useLots } from "../../contexts/LotsContext";
import { updateProjectLot } from "../../services/lotsRepository";
import type { LotData } from "../../types/lots";
import { buildFallbackFeatureData, getFeatureTypeFromId } from "../../utils/mapUtils";

type LotFormState = {
  id: string;
  type: LotData["type"];
  manzana: string;
  lotNumber: string;
  name: string;
  area: string;
  price: string;
  currency: "" | "USD" | "PYG";
  finalPrice: string;
  deliveryPercent: string;
  installments: string;
  financingText: string;
  status: "" | "available" | "reserved" | "sold";
  description: string;
  sourcePage: number | null;
};

export function AdminLotDetailPage() {
  const { id } = useParams();
  const { lotsById } = useLots();
  const { user } = useAuth();

  const lot = useMemo(() => {
    if (!id) {
      return null;
    }

    return lotsById.get(id) ?? buildFallbackFeatureData(id);
  }, [id, lotsById]);

  const [form, setForm] = useState<LotFormState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lot) {
      setForm(toFormState(lot));
      setMessage(null);
      setError(null);
    }
  }, [lot]);

  async function saveLot(nextStatus?: LotData["status"]) {
    if (!form) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = fromFormState(form, nextStatus ?? form.status);
      await updateProjectLot(PROJECT_SLUG, payload, user?.email ?? null);
      setForm(toFormState(payload));
      setMessage("Cambios guardados en Firestore.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar el lote.");
    } finally {
      setSaving(false);
    }
  }

  if (!id || !lot || !form) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-100 shadow-soft backdrop-blur">
        <p className="text-sm text-slate-300">No se encontro un lote valido para editar.</p>
        <Link
          to={ADMIN_LOTES_ROUTE}
          className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Volver al listado
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">Editor de lote</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{form.name || form.id}</h2>
            <p className="mt-2 text-sm text-slate-300">{form.id}</p>
          </div>

          <Link
            to={ADMIN_LOTES_ROUTE}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver al listado
          </Link>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Type">
            <select
              value={form.type}
              onChange={(event) => updateForm(setForm, "type", event.target.value as LotData["type"])}
              className="field-dark"
            >
              <option value="lote">lote</option>
              <option value="area">area</option>
              <option value="road">road</option>
            </select>
          </Field>

          <Field label="Nombre">
            <input
              value={form.name}
              onChange={(event) => updateForm(setForm, "name", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Manzana">
            <input
              value={form.manzana}
              onChange={(event) => updateForm(setForm, "manzana", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Lote">
            <input
              value={form.lotNumber}
              onChange={(event) => updateForm(setForm, "lotNumber", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Area">
            <input
              value={form.area}
              onChange={(event) => updateForm(setForm, "area", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Precio">
            <input
              value={form.price}
              onChange={(event) => updateForm(setForm, "price", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Moneda">
            <select
              value={form.currency}
              onChange={(event) => updateForm(setForm, "currency", event.target.value as LotFormState["currency"])}
              className="field-dark"
            >
              <option value="">Sin definir</option>
              <option value="USD">USD</option>
              <option value="PYG">PYG</option>
            </select>
          </Field>

          <Field label="Precio final">
            <input
              value={form.finalPrice}
              onChange={(event) => updateForm(setForm, "finalPrice", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Entrega %">
            <input
              value={form.deliveryPercent}
              onChange={(event) => updateForm(setForm, "deliveryPercent", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Cuotas">
            <input
              value={form.installments}
              onChange={(event) => updateForm(setForm, "installments", event.target.value)}
              className="field-dark"
            />
          </Field>

          <Field label="Estado">
            <select
              value={form.status}
              onChange={(event) => updateForm(setForm, "status", event.target.value as LotFormState["status"])}
              className="field-dark"
            >
              <option value="">Sin definir</option>
              <option value="available">available</option>
              <option value="reserved">reserved</option>
              <option value="sold">sold</option>
            </select>
          </Field>

          <Field label="Pagina fuente">
            <input value={form.sourcePage ?? ""} className="field-dark opacity-70" readOnly />
          </Field>
        </div>

        <div className="mt-4 grid gap-4">
          <Field label="Financiacion">
            <textarea
              value={form.financingText}
              onChange={(event) => updateForm(setForm, "financingText", event.target.value)}
              className="field-dark min-h-[120px]"
            />
          </Field>

          <Field label="Descripcion">
            <textarea
              value={form.description}
              onChange={(event) => updateForm(setForm, "description", event.target.value)}
              className="field-dark min-h-[140px]"
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void saveLot();
            }}
            disabled={saving}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>

          {form.type === "lote" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void saveLot("sold");
                }}
                disabled={saving}
                className="rounded-full border border-rose-300/40 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar como vendido
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveLot("available");
                }}
                disabled={saving}
                className="rounded-full border border-emerald-300/40 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar como disponible
              </button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function toFormState(item: LotData): LotFormState {
  return {
    id: item.id,
    type: item.type,
    manzana: item.manzana ?? "",
    lotNumber: item.lotNumber ?? "",
    name: item.name ?? "",
    area: stringifyNumberish(item.area),
    price: stringifyNumberish(item.price),
    currency: item.currency ?? "",
    finalPrice: stringifyNumberish(item.finalPrice),
    deliveryPercent: item.deliveryPercent === null || item.deliveryPercent === undefined ? "" : String(item.deliveryPercent),
    installments: item.installments === null || item.installments === undefined ? "" : String(item.installments),
    financingText: item.financingText ?? "",
    status: item.status ?? "",
    description: item.description ?? "",
    sourcePage: item.sourcePage ?? null
  };
}

function fromFormState(form: LotFormState, statusOverride: LotFormState["status"]): LotData {
  const inferredType = getFeatureTypeFromId(form.id);

  return {
    id: form.id,
    type: form.type ?? inferredType ?? "lote",
    manzana: normalizeBlank(form.manzana),
    lotNumber: normalizeBlank(form.lotNumber),
    name: normalizeBlank(form.name),
    area: parseNumberishInput(form.area),
    price: parseNumberishInput(form.price),
    currency: form.currency || null,
    finalPrice: parseNumberishInput(form.finalPrice),
    deliveryPercent: parseNumericInput(form.deliveryPercent),
    installments: parseNumericInput(form.installments),
    financingText: normalizeBlank(form.financingText),
    status: statusOverride || null,
    description: normalizeBlank(form.description),
    sourcePage: form.sourcePage
  };
}

function updateForm<K extends keyof LotFormState>(
  setForm: Dispatch<SetStateAction<LotFormState | null>>,
  key: K,
  value: LotFormState[K]
) {
  setForm((current) => (current ? { ...current, [key]: value } : current));
}

function stringifyNumberish(value?: number | string | null) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function normalizeBlank(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseNumericInput(value: string) {
  const normalized = normalizeBlank(value);
  if (!normalized) {
    return null;
  }

  const numberValue = Number(normalized.replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseNumberishInput(value: string): number | string | null {
  const normalized = normalizeBlank(value);
  if (!normalized) {
    return null;
  }

  if (/^-?\d+$/.test(normalized)) {
    return Number(normalized);
  }

  if (/^-?\d{1,3}([.,]\d{3})+$/.test(normalized)) {
    return Number(normalized.replace(/[.,]/g, ""));
  }

  if (/^-?\d+[.,]\d+$/.test(normalized)) {
    return Number(normalized.replace(",", "."));
  }

  return normalized;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}
