import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_LOTES_ROUTE } from "../../config/project";
import { AdminLotRowEditor } from "../../components/admin/AdminLotRowEditor";
import { useLots } from "../../contexts/LotsContext";
import type { LotData } from "../../types/lots";

export function AdminLotsPage() {
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
        (item.name ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.manzana ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.lotNumber ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [deferredQuery, vendibleLots]);

  const groupedLots = useMemo(() => groupLotsByManzana(filteredLots), [filteredLots]);

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] border border-stone-200 bg-white/92 px-6 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Gestion de lotes</p>
            <h2 className="font-display mt-3 text-[2.3rem] leading-tight text-[#092930]">
              Inventario agrupado por manzana
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Edita medidas, precio, cuotas, entrega y estado en una vista mas clara y operativa.
            </p>
          </div>

          <div className="w-full max-w-[420px]">
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Buscar lote
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre, manzana, lote o ID"
                className="field-light w-full"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {loading ? (
          <article className="rounded-[30px] border border-stone-200 bg-white px-6 py-8 text-sm text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            Cargando inventario...
          </article>
        ) : groupedLots.length === 0 ? (
          <article className="rounded-[30px] border border-stone-200 bg-white px-6 py-8 text-sm text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            No encontramos lotes que coincidan con esa busqueda.
          </article>
        ) : (
          groupedLots.map((group) => (
            <section
              key={group.label}
              className="rounded-[34px] border border-stone-200 bg-white/94 px-4 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] sm:px-6"
            >
              <div className="mb-5 flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Manzana</p>
                  <h3 className="font-display mt-2 text-[2rem] text-[#092930]">{group.label}</h3>
                </div>
                <p className="text-sm text-slate-500">
                  {group.items.length} {group.items.length === 1 ? "lote" : "lotes"}
                </p>
              </div>

              <div className="space-y-4">
                {group.items.map((item) => (
                  <AdminLotRowEditor key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))
        )}
      </section>

      <section className="rounded-[30px] border border-stone-200 bg-white/92 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Edicion puntual</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Si necesitas mas espacio para un lote puntual, puedes abrir su ficha individual.
            </p>
          </div>
          {filteredLots[0] ? (
            <Link
              to={`${ADMIN_LOTES_ROUTE}/${filteredLots[0].id}`}
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
            >
              Abrir una ficha
            </Link>
          ) : null}
        </div>
      </section>
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
