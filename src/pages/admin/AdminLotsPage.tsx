import { useDeferredValue, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ADMIN_DASHBOARD_ROUTE, ADMIN_LOTES_ROUTE } from "../../config/project";
import { AdminLotRowEditor } from "../../components/admin/AdminLotRowEditor";
import { useLots } from "../../contexts/LotsContext";
import type { LotData } from "../../types/lots";

export function AdminLotsPage() {
  return <Navigate to={ADMIN_DASHBOARD_ROUTE} replace />;
}

export function AdminInventorySection() {
  const { loading, lots } = useLots();
  const [query, setQuery] = useState("");

  const deferredQuery = useDeferredValue(query);
  const vendibleLots = useMemo(() => lots.filter((item) => item.type === "lote"), [lots]);

  const filteredLots = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return vendibleLots;
    }

    return vendibleLots.filter((item) => {
      return (
        item.id.toLowerCase().includes(normalizedQuery) ||
        buildLotLabel(item).toLowerCase().includes(normalizedQuery) ||
        (item.description ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.financingText ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [deferredQuery, vendibleLots]);

  const groupedLots = useMemo(() => groupLotsByManzana(filteredLots), [filteredLots]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Gestion</p>
          <h2 className="font-display mt-3 text-[2.15rem] leading-tight text-[#092930]">
            Inventario de lotes disponibles
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Edita medidas, precios, cuotas, entrega y estado en una vista mas clara y operativa.
          </p>
        </div>

        <div className="w-full max-w-[360px]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Buscar lote
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Lote, descripcion o financiacion"
              className="field-light w-full"
            />
          </label>
        </div>
      </div>

      {loading ? <InventorySyncBanner /> : null}

      {groupedLots.length === 0 && loading ? (
        <InventorySkeleton />
      ) : groupedLots.length === 0 ? (
        <article className="rounded-[28px] border border-stone-200 bg-white px-6 py-7 text-sm text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          No encontramos lotes que coincidan con esa busqueda.
        </article>
      ) : (
        groupedLots.map((group) => (
          <section
            key={group.label}
            className="rounded-[30px] border border-stone-200 bg-white/95 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-5"
          >
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Manzana</p>
                <h3 className="font-display mt-1 text-[1.65rem] text-[#092930]">{group.label}</h3>
              </div>
              <p className="text-sm text-slate-500">
                {group.items.length} {group.items.length === 1 ? "lote" : "lotes"}
              </p>
            </div>

            <div className="space-y-3">
              {group.items.map((item) => (
                <AdminLotRowEditor key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))
      )}

      <section className="rounded-[28px] border border-stone-200 bg-white/92 px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Edicion puntual</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Si un lote necesita una ficha mas amplia, puedes abrirla aparte.
            </p>
          </div>
          {filteredLots[0] ? (
            <Link
              to={`${ADMIN_LOTES_ROUTE}/${filteredLots[0].id}`}
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
            >
              Abrir ficha
            </Link>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function InventorySyncBanner() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-stone-200 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#715b3b]">
          Actualizando inventario
        </p>
        <p className="text-xs text-slate-500">Cargando la informacion mas reciente...</p>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-[#efe7dd]">
        <div className="h-full w-1/2 animate-[inventory-loader_1.15s_ease-in-out_infinite] rounded-full bg-[#8fa88b]" />
      </div>
    </div>
  );
}

function InventorySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((groupIndex) => (
        <section
          key={groupIndex}
          className="rounded-[30px] border border-stone-200 bg-white/95 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-5"
        >
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div className="h-9 w-32 animate-pulse rounded-full bg-stone-100" />
            <div className="h-4 w-16 animate-pulse rounded-full bg-stone-100" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4].map((rowIndex) => (
              <div
                key={`${groupIndex}-${rowIndex}`}
                className="rounded-[18px] border border-stone-200 bg-[#fcfbf8] px-3 py-3 sm:px-4"
              >
                <div className="flex items-start justify-between gap-3 xl:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-28 animate-pulse rounded-full bg-stone-100" />
                    <div className="mt-2 h-3 w-36 animate-pulse rounded-full bg-stone-100" />
                  </div>
                  <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-stone-100" />
                </div>

                <div className="mt-3 flex items-end justify-between gap-3 border-t border-stone-200/70 pt-3 xl:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-24 animate-pulse rounded-full bg-stone-100" />
                    <div className="mt-2 h-3 w-32 animate-pulse rounded-full bg-stone-100" />
                  </div>
                  <div className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-stone-100" />
                </div>

                <div className="hidden gap-3 xl:grid xl:grid-cols-[minmax(180px,1.1fr)_minmax(170px,0.95fr)_minmax(130px,0.8fr)_minmax(180px,1fr)_minmax(120px,0.7fr)_auto]">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-stone-100" />
                  <div className="h-4 w-40 animate-pulse rounded-full bg-stone-100" />
                  <div className="h-4 w-28 animate-pulse rounded-full bg-stone-100" />
                  <div className="h-4 w-36 animate-pulse rounded-full bg-stone-100" />
                  <div className="h-7 w-24 justify-self-end animate-pulse rounded-full bg-stone-100" />
                  <div className="h-9 w-24 justify-self-end animate-pulse rounded-full bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupLotsByManzana(items: LotData[]) {
  const groups = new Map<string, LotData[]>();

  items.forEach((item) => {
    const label = item.manzana?.trim() || "Sin manzana";
    const currentItems = groups.get(label) ?? [];
    currentItems.push(item);
    groups.set(label, currentItems);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => {
      const leftNumber = Number(left.replace(/[^\d]/g, ""));
      const rightNumber = Number(right.replace(/[^\d]/g, ""));

      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
      }

      return left.localeCompare(right, "es");
    })
    .map(([label, groupedItems]) => ({
      label,
      items: [...groupedItems].sort((left, right) => {
        const leftLot = Number(left.lotNumber?.replace(/[^\d]/g, "") ?? "");
        const rightLot = Number(right.lotNumber?.replace(/[^\d]/g, "") ?? "");

        if (Number.isFinite(leftLot) && Number.isFinite(rightLot) && leftLot !== rightLot) {
          return leftLot - rightLot;
        }

        return left.id.localeCompare(right.id, "es");
      })
    }));
}

function buildLotLabel(item: LotData) {
  const manzana = item.manzana?.trim() || "?";
  const lotNumber = item.lotNumber?.trim() || "--";
  return `Lote ${manzana}-${lotNumber}`;
}
