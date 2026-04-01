export type StatusFilter = "all" | "available" | "reserved" | "sold";
export type CurrencyFilter = "all" | "USD" | "PYG";
export type PriceFilter = "all" | "entry" | "mid" | "premium";

type PublicFiltersProps = {
  availableCount: number;
  currencyFilter: CurrencyFilter;
  currencyOptions: Array<CurrencyFilter>;
  manzanaFilter: string;
  manzanaOptions: string[];
  onCurrencyChange: (value: CurrencyFilter) => void;
  onManzanaChange: (value: string) => void;
  onPriceChange: (value: PriceFilter) => void;
  onReset: () => void;
  onStatusChange: (value: StatusFilter) => void;
  priceFilter: PriceFilter;
  resultCount: number;
  statusFilter: StatusFilter;
  totalCount: number;
};

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Reservados", value: "reserved" },
  { label: "Vendidos", value: "sold" }
];

const priceOptions: Array<{ label: string; value: PriceFilter }> = [
  { label: "Todos los precios", value: "all" },
  { label: "Acceso inicial", value: "entry" },
  { label: "Rango medio", value: "mid" },
  { label: "Seleccion premium", value: "premium" }
];

export function PublicFilters({
  availableCount,
  currencyFilter,
  currencyOptions,
  manzanaFilter,
  manzanaOptions,
  onCurrencyChange,
  onManzanaChange,
  onPriceChange,
  onReset,
  onStatusChange,
  priceFilter,
  resultCount,
  statusFilter,
  totalCount
}: PublicFiltersProps) {
  return (
    <section className="w-full max-w-full overflow-hidden rounded-[30px] border border-stone-200 bg-white/88 p-4 shadow-soft backdrop-blur sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Explora los lotes</p>
            <h2 className="font-display mt-3 text-[1.6rem] font-semibold leading-tight text-slate-900 sm:text-[2rem]">
              Encontra el lote que mejor acompana tu proximo paso.
            </h2>
          </div>

          <div className="w-full rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-slate-600 sm:w-auto">
            <p className="font-semibold text-slate-900">{resultCount} opciones visibles</p>
            <p className="mt-1">{availableCount} disponibles de {totalCount} lotes comercializados</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const isActive = statusFilter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusChange(option.value)}
                className={[
                  "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]"
                    : "border border-stone-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="grid w-full max-w-full gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select
            value={manzanaFilter}
            onChange={(event) => onManzanaChange(event.target.value)}
            className="field-light"
            aria-label="Filtrar por manzana"
          >
            <option value="all">Manzana</option>
            {manzanaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={currencyFilter}
            onChange={(event) => onCurrencyChange(event.target.value as CurrencyFilter)}
            className="field-light"
            aria-label="Filtrar por moneda"
          >
            {currencyOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Moneda" : option}
              </option>
            ))}
          </select>

          <select
            value={priceFilter}
            onChange={(event) => onPriceChange(event.target.value as PriceFilter)}
            className="field-light"
            aria-label="Filtrar por rango de precio"
          >
            {priceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            Ver todo
          </button>
        </div>
      </div>
    </section>
  );
}
