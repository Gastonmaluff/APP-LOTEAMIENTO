import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_LOTES_ROUTE } from "../../config/project";
import { useLots } from "../../contexts/LotsContext";
import { getStatusLabel } from "../../utils/mapUtils";

type TypeFilter = "all" | "lote" | "area" | "road";
type StatusFilter = "all" | "available" | "reserved" | "sold" | "undefined";

export function AdminLotsPage() {
  const { loading, lots } = useLots();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const deferredQuery = useDeferredValue(query);

  const filteredLots = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return lots.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        (item.name ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.manzana ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.lotNumber ?? "").toLowerCase().includes(normalizedQuery);

      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "undefined" ? !item.status : item.status === statusFilter);

      return matchesQuery && matchesType && matchesStatus;
    });
  }, [deferredQuery, lots, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">Inventario</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por id, nombre, manzana o lote"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-brand-300"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-brand-300"
          >
            <option value="all">Todos los tipos</option>
            <option value="lote">Lotes</option>
            <option value="area">Areas</option>
            <option value="road">Calles</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-brand-300"
          >
            <option value="all">Todos los estados</option>
            <option value="available">Disponibles</option>
            <option value="reserved">Reservados</option>
            <option value="sold">Vendidos</option>
            <option value="undefined">Sin definir</option>
          </select>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-300">
              {loading ? "Cargando..." : `${filteredLots.length} registros visibles`}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredLots.map((item) => (
            <article
              key={item.id}
              className="rounded-[24px] border border-white/10 bg-slate-950/30 p-5 transition hover:border-brand-300/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-brand-200">{item.type}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{item.name ?? item.id}</h2>
                  <p className="mt-2 text-sm text-slate-300">{item.id}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                  {getStatusLabel(item.status, item.type)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <Metric label="Manzana" value={item.manzana ?? "-"} />
                <Metric label="Lote" value={item.lotNumber ?? "-"} />
              </div>

              <Link
                to={`${ADMIN_LOTES_ROUTE}/${item.id}`}
                className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-50"
              >
                Editar
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}
