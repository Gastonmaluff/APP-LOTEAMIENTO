import { startTransition, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InfoPanel } from "../../components/InfoPanel";
import { MapViewer } from "../../components/MapViewer";
import { StatusLegend } from "../../components/StatusLegend";
import { ContactSection } from "../../components/public/ContactSection";
import {
  PublicFilters,
  type CurrencyFilter,
  type PriceFilter,
  type StatusFilter
} from "../../components/public/PublicFilters";
import { ADMIN_LOGIN_ROUTE, PROJECT_NAME, PROJECT_SLUG } from "../../config/project";
import { useLots } from "../../contexts/LotsContext";
import type { LotData } from "../../types/lots";
import { formatPrice, getStatusLabel } from "../../utils/mapUtils";

const whatsappNumber = (import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

export function ProjectPublicPage() {
  const { error, loading, lots, seedRecommended, source } = useLots();
  const [activeItem, setActiveItem] = useState<LotData | null>(null);
  const [hoveredItem, setHoveredItem] = useState<LotData | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [manzanaFilter, setManzanaFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

  const vendibleLots = useMemo(() => lots.filter((item) => item.type === "lote"), [lots]);

  const metrics = useMemo(() => {
    return {
      total: vendibleLots.length,
      available: vendibleLots.filter((item) => item.status === "available").length,
      reserved: vendibleLots.filter((item) => item.status === "reserved").length,
      sold: vendibleLots.filter((item) => item.status === "sold").length
    };
  }, [vendibleLots]);

  const manzanaOptions = useMemo(
    () =>
      Array.from(new Set(vendibleLots.map((item) => item.manzana).filter((value): value is string => Boolean(value)))).sort(
        (left, right) => left.localeCompare(right, "es")
      ),
    [vendibleLots]
  );

  const currencyOptions = useMemo(() => {
    const dynamicOptions = Array.from(
      new Set(vendibleLots.map((item) => item.currency).filter((value): value is "USD" | "PYG" => Boolean(value)))
    );
    return ["all", ...dynamicOptions] as CurrencyFilter[];
  }, [vendibleLots]);

  const filteredLots = useMemo(() => {
    return vendibleLots.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesManzana = manzanaFilter === "all" || item.manzana === manzanaFilter;
      const matchesCurrency = currencyFilter === "all" || item.currency === currencyFilter;
      const matchesPrice = matchesPriceBand(item, priceFilter);

      return matchesStatus && matchesManzana && matchesCurrency && matchesPrice;
    });
  }, [currencyFilter, manzanaFilter, priceFilter, statusFilter, vendibleLots]);

  const highlightedLotIds = useMemo(() => filteredLots.map((item) => item.id), [filteredLots]);
  const hasActiveFilters =
    statusFilter !== "all" || manzanaFilter !== "all" || currencyFilter !== "all" || priceFilter !== "all";

  const highlightedLots = useMemo(() => {
    const statusWeight = {
      available: 0,
      reserved: 1,
      sold: 2,
      undefined: 3
    } as const;

    return [...filteredLots]
      .sort((left, right) => {
        const leftWeight = statusWeight[left.status ?? "undefined"];
        const rightWeight = statusWeight[right.status ?? "undefined"];

        if (leftWeight !== rightWeight) {
          return leftWeight - rightWeight;
        }

        return getNumericPrice(left) - getNumericPrice(right);
      })
      .slice(0, 4);
  }, [filteredLots]);

  const currentCommercialItem = activeItem ?? hoveredItem;
  const lotWhatsAppHref = buildWhatsAppHref(
    currentCommercialItem
      ? `Hola, quiero recibir informacion sobre ${currentCommercialItem.name ?? currentCommercialItem.id} en ${PROJECT_NAME}.`
      : `Hola, quiero recibir informacion sobre lotes disponibles en ${PROJECT_NAME}.`
  );
  const generalWhatsAppHref = buildWhatsAppHref(
    `Hola, quiero consultar por lotes disponibles y financiacion en ${PROJECT_NAME}.`
  );

  useEffect(() => {
    console.log("[ProjectPublicPage] Fuente visible de lotes:", {
      source,
      loading,
      seedRecommended,
      lotsCount: lots.length,
      filteredLotsCount: filteredLots.length
    });
  }, [filteredLots.length, loading, lots.length, seedRecommended, source]);

  function resetFilters() {
    setStatusFilter("all");
    setManzanaFilter("all");
    setCurrencyFilter("all");
    setPriceFilter("all");
  }

  function focusAvailableLots() {
    startTransition(() => {
      setStatusFilter("available");
      setManzanaFilter("all");
      setCurrencyFilter("all");
      setPriceFilter("all");
    });

    const mapSection = document.getElementById("explorar-lotes");
    mapSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-6 lg:gap-8 lg:px-8 lg:py-8">
        <header className="overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(135deg,#f8f4ec_0%,#ffffff_38%,#e8f0ef_100%)] shadow-[0_35px_90px_rgba(15,23,42,0.1)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.78fr)] lg:items-center lg:px-10 lg:py-10">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
                  Loteamiento premium
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                  Disponibilidad actualizada
                </span>
              </div>

              <h1 className="font-display mt-6 max-w-4xl text-[2.8rem] font-semibold leading-[1.05] text-slate-950 sm:text-[3.5rem]">
                {PROJECT_NAME}, una forma elegante de explorar lotes, financiación y disponibilidad real.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Plataforma inmobiliaria enfocada en decisión comercial clara: mapa interactivo como protagonista,
                estados visibles, acceso directo a consulta y lectura actual de lotes desde la base del proyecto.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="rounded-full border border-stone-200 bg-white/70 px-4 py-2">
                  Ubicación del proyecto · Paraguay
                </span>
                <span className="rounded-full border border-stone-200 bg-white/70 px-4 py-2">
                  Financiación visible por lote
                </span>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={focusAvailableLots}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Ver lotes disponibles
                </button>
                <a
                  href={generalWhatsAppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-brand-400 hover:text-brand-700"
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </div>

            <div className="grid gap-4 rounded-[30px] border border-stone-200 bg-white/82 p-5 shadow-[0_26px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Panorama comercial</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    El mapa sigue siendo la pieza central y el proyecto conserva lectura desde Firestore cuando ya existe seed.
                  </p>
                </div>
                <SourceBadge source={source} />
              </div>

              <StatusLegend variant="light" />

              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Lotes cargados" value={String(metrics.total)} />
                <MetricCard label="Disponibles" value={String(metrics.available)} />
                <MetricCard label="Reservados" value={String(metrics.reserved)} />
                <MetricCard label="Vendidos" value={String(metrics.sold)} />
              </div>

              <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
                <p className="font-semibold text-slate-900">Confianza comercial</p>
                <p className="mt-2">
                  Datos actuales, interacción directa y una presentación limpia para explorar sin fricción.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-6 lg:space-y-8">
          <section id="explorar-lotes" className="space-y-5">
            <PublicFilters
              availableCount={metrics.available}
              currencyFilter={currencyFilter}
              currencyOptions={currencyOptions}
              manzanaFilter={manzanaFilter}
              manzanaOptions={manzanaOptions}
              onCurrencyChange={setCurrencyFilter}
              onManzanaChange={setManzanaFilter}
              onPriceChange={setPriceFilter}
              onReset={resetFilters}
              onStatusChange={setStatusFilter}
              priceFilter={priceFilter}
              resultCount={filteredLots.length}
              statusFilter={statusFilter}
              totalCount={metrics.total}
            />

            {error ? (
              <section className="rounded-[24px] border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                {error}
              </section>
            ) : null}

            {seedRecommended ? (
              <section className="rounded-[24px] border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-950">
                Firestore todavía no tiene lotes sembrados para el proyecto `{PROJECT_SLUG}`. La vista pública
                sigue operativa con los datos actuales mientras completes el seed desde el admin.
              </section>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_400px]">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[30px] border border-stone-200 bg-white/90 px-5 py-4 shadow-soft">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
                      Mapa interactivo
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      El SVG real se mantiene intacto. Los filtros solo destacan visualmente lotes coincidentes,
                      sin desactivar hover, click ni los IDs del loteamiento.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-600">
                      {filteredLots.length} lotes destacados
                    </span>
                    <Link
                      to={ADMIN_LOGIN_ROUTE}
                      className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
                    >
                      Portal admin
                    </Link>
                  </div>
                </div>

                <MapViewer
                  hasHighlightFilter={hasActiveFilters}
                  lots={lots}
                  highlightedLotIds={highlightedLotIds}
                  onActiveChange={setActiveItem}
                  onHoverChange={setHoveredItem}
                />
              </section>

              <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <InfoPanel
                  activeItem={activeItem}
                  hoveredItem={hoveredItem}
                  requestVisitHref="#contacto"
                  whatsappHref={lotWhatsAppHref}
                />

                <section className="rounded-[30px] border border-stone-200 bg-white/92 p-5 shadow-soft">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
                        Lotes destacados
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Una selección rápida según los filtros activos.
                      </p>
                    </div>
                    <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-slate-500">
                      {highlightedLots.length} visibles
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {highlightedLots.length > 0 ? (
                      highlightedLots.map((item) => (
                        <article key={item.id} className="rounded-[22px] border border-stone-200 bg-stone-50/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.name ?? item.id}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.manzana ?? "Sin manzana"} · lote {item.lotNumber ?? "-"}
                              </p>
                            </div>
                            <span className="rounded-full border border-stone-200 px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {getStatusLabel(item.status, item.type)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-brand-700">
                            {formatPrice(item.price, item.currency)}
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm leading-7 text-slate-600">
                        No hay lotes que coincidan con esa combinación. Probá abrir el rango de precio o cambiar
                        la manzana para seguir explorando.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <TrustCard
              eyebrow="Presentación seria"
              title="Diseño enfocado en decisión"
              copy="La experiencia prioriza lectura rápida, jerarquía clara y acceso directo a consulta sin esconder el mapa."
            />
            <TrustCard
              eyebrow="Disponibilidad visible"
              title="Estados comerciales a simple vista"
              copy="Disponible, reservado o vendido se entienden desde el color y se refuerzan en la ficha."
            />
            <TrustCard
              eyebrow="Financiación"
              title="Información comercial accesible"
              copy="Precio, entrega, cuotas y notas del PDF siguen accesibles sin transformar la vista en un dashboard técnico."
            />
          </section>

          <ContactSection defaultWhatsAppHref={buildWhatsAppBaseHref()} selectedLot={activeItem} />
        </main>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "firestore" | "seed-data" | "local-fallback" }) {
  const copy =
    source === "firestore"
      ? { label: "Firestore activo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
      : source === "seed-data"
        ? { label: "Seed local visible", className: "border-sky-200 bg-sky-50 text-sky-700" }
        : { label: "Fallback local", className: "border-amber-200 bg-amber-50 text-amber-700" };

  return <div className={`rounded-full border px-4 py-2 text-xs font-semibold ${copy.className}`}>{copy.label}</div>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-stone-200 bg-white px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function TrustCard({ copy, eyebrow, title }: { copy: string; eyebrow: string; title: string }) {
  return (
    <article className="rounded-[30px] border border-stone-200 bg-white/92 p-6 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">{eyebrow}</p>
      <h2 className="font-display mt-4 text-[1.8rem] font-semibold leading-tight text-slate-900">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600">{copy}</p>
    </article>
  );
}

function buildWhatsAppBaseHref() {
  if (whatsappNumber) {
    return `https://wa.me/${whatsappNumber}?text=`;
  }

  return "https://wa.me/?text=";
}

function buildWhatsAppHref(message: string) {
  return `${buildWhatsAppBaseHref()}${encodeURIComponent(message)}`;
}

function matchesPriceBand(item: LotData, priceFilter: PriceFilter) {
  if (priceFilter === "all") {
    return true;
  }

  const numericPrice = getNumericPrice(item);
  if (numericPrice === Number.MAX_SAFE_INTEGER) {
    return false;
  }

  if (item.currency === "USD") {
    if (priceFilter === "entry") {
      return numericPrice <= 60000;
    }

    if (priceFilter === "mid") {
      return numericPrice > 60000 && numericPrice <= 100000;
    }

    return numericPrice > 100000;
  }

  if (item.currency === "PYG") {
    if (priceFilter === "entry") {
      return numericPrice <= 3500000;
    }

    if (priceFilter === "mid") {
      return numericPrice > 3500000 && numericPrice <= 3800000;
    }

    return numericPrice > 3800000;
  }

  return false;
}

function getNumericPrice(item: LotData) {
  if (typeof item.price === "number") {
    return item.price;
  }

  return Number.MAX_SAFE_INTEGER;
}
