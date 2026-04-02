import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ADMIN_LOTES_ROUTE, PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import { useLots } from "../../contexts/LotsContext";
import { updateProjectLot } from "../../services/lotsRepository";
import type { LotData } from "../../types/lots";
import {
  computeArea,
  formatAreaNumber,
  fromLotEditorState,
  toLotEditorState,
  type LotEditorState
} from "../../utils/adminLotForm";
import { buildFallbackFeatureData, getCommercialPriceSummary } from "../../utils/mapUtils";

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

  const [form, setForm] = useState<LotEditorState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lot) {
      setForm(toLotEditorState(lot));
      setMessage(null);
      setError(null);
    }
  }, [lot]);

  const computedArea = useMemo(() => {
    if (!form) {
      return null;
    }

    return computeArea(form.width, form.length);
  }, [form]);

  async function saveLot(statusOverride?: LotData["status"]) {
    if (!form || !lot) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = fromLotEditorState(form, lot, statusOverride ?? form.status);
      await updateProjectLot(PROJECT_SLUG, payload, user?.email ?? null);
      setForm(toLotEditorState(payload));
      setMessage("Cambios guardados correctamente.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar el lote.");
    } finally {
      setSaving(false);
    }
  }

  if (!id || !lot || !form) {
    return (
      <section className="rounded-[30px] border border-stone-200 bg-white px-6 py-6 text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <p className="text-sm">No se encontro un lote valido para editar.</p>
        <Link
          to={ADMIN_LOTES_ROUTE}
          className="mt-4 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
        >
          Volver al listado
        </Link>
      </section>
    );
  }

  const areaLabel = computedArea ? formatAreaNumber(computedArea) : form.areaDisplay || "Sin calcular";
  const commercialPrice = getCommercialPriceSummary({
    currency: form.currency || null,
    deliveryPercent: parseNumberLike(form.deliveryPercent),
    finalPrice: parseNumberLike(form.finalPrice),
    financingText: form.financingText,
    installments: parseNumberLike(form.installments),
    price: parseNumberLike(form.price)
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] border border-stone-200 bg-white/92 px-6 py-7 shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Ficha del lote</p>
            <h2 className="font-display mt-3 text-[2.7rem] leading-tight text-[#092930]">{form.name || form.id}</h2>
            <p className="mt-2 text-sm text-slate-500">{form.id}</p>
          </div>

          <Link
            to={ADMIN_LOTES_ROUTE}
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
          >
            Volver al listado
          </Link>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-[#d8e7d4] bg-[#eef5eb] px-4 py-4 text-sm text-[#506a4e]">{message}</div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
        ) : null}
      </section>

      <section className="rounded-[34px] border border-stone-200 bg-white/94 px-6 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.05)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(event) => setForm((current) => (current ? { ...current, type: event.target.value as LotData["type"] } : current))}
                className="field-light"
              >
                <option value="lote">Lote</option>
                <option value="area">Area</option>
                <option value="road">Calle</option>
              </select>
            </Field>

            <Field label="Nombre">
              <input value={form.name} onChange={(event) => setForm((current) => (current ? { ...current, name: event.target.value } : current))} className="field-light" />
            </Field>

            <Field label="Manzana">
              <input value={form.manzana} onChange={(event) => setForm((current) => (current ? { ...current, manzana: event.target.value } : current))} className="field-light" />
            </Field>

            <Field label="Lote">
              <input value={form.lotNumber} onChange={(event) => setForm((current) => (current ? { ...current, lotNumber: event.target.value } : current))} className="field-light" />
            </Field>

            <Field label="Ancho">
              <input value={form.width} onChange={(event) => setForm((current) => (current ? { ...current, width: event.target.value } : current))} className="field-light" inputMode="decimal" placeholder="0" />
            </Field>

            <Field label="Largo">
              <input value={form.length} onChange={(event) => setForm((current) => (current ? { ...current, length: event.target.value } : current))} className="field-light" inputMode="decimal" placeholder="0" />
            </Field>

            <Field label={form.currency === "USD" ? "Precio final" : "Precio base"}>
              <input value={form.price} onChange={(event) => setForm((current) => (current ? { ...current, price: event.target.value } : current))} className="field-light" inputMode="decimal" />
            </Field>

            <Field label="Moneda">
              <select
                value={form.currency}
                onChange={(event) => setForm((current) => (current ? { ...current, currency: event.target.value as LotEditorState["currency"] } : current))}
                className="field-light"
              >
                <option value="">Sin definir</option>
                <option value="USD">USD</option>
                <option value="PYG">PYG</option>
              </select>
            </Field>

            <Field label="Estado">
              <select
                value={form.status}
                onChange={(event) => setForm((current) => (current ? { ...current, status: event.target.value as LotEditorState["status"] } : current))}
                className="field-light"
              >
                <option value="">Sin definir</option>
                <option value="available">Disponible</option>
                <option value="reserved">Reservado</option>
                <option value="sold">Vendido</option>
              </select>
            </Field>
          </div>

          <aside className="rounded-[30px] border border-stone-200 bg-[linear-gradient(180deg,#f7f2e9_0%,#f2ece3_100%)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Resumen comercial</p>
            <div className="mt-5 space-y-4">
              <SummaryRow label={commercialPrice.label} value={commercialPrice.value} />
              <SummaryRow label="Detalle comercial" value={commercialPrice.caption} />
              <SummaryRow label="Superficie" value={areaLabel} />
              <SummaryRow label="Cuotas" value={form.installments || "Sin definir"} />
              <SummaryRow label="Entrega" value={form.deliveryPercent ? `${form.deliveryPercent}%` : "Sin definir"} />
              <SummaryRow label="Pagina fuente" value={form.sourcePage ? String(form.sourcePage) : "Sin dato"} />
            </div>
          </aside>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Financiacion">
            <textarea
              value={form.financingText}
              onChange={(event) => setForm((current) => (current ? { ...current, financingText: event.target.value } : current))}
              className="field-light min-h-[120px]"
            />
          </Field>

          <Field label="Descripcion">
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => (current ? { ...current, description: event.target.value } : current))}
              className="field-light min-h-[120px]"
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
            className="rounded-full bg-[#0f2f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#143b43] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-full border border-stone-300 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar como vendido
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveLot("available");
                }}
                disabled={saving}
                className="rounded-full border border-[#b9d0b4] bg-[#eef5eb] px-5 py-3 text-sm font-semibold text-[#506a4e] transition hover:bg-[#e6f0e1] disabled:cursor-not-allowed disabled:opacity-60"
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
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-stone-200 pb-4 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-medium text-slate-900">{value}</p>
    </div>
  );
}
