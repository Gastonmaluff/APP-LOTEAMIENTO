import { startTransition, useEffect, useMemo, useState } from "react";
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
  const commonAreas = useMemo(() => lots.filter((item) => item.type === "area"), [lots]);

  const metrics = useMemo(
    () => ({
      total: vendibleLots.length,
      available: vendibleLots.filter((item) => item.status === "available").length,
      reserved: vendibleLots.filter((item) => item.status === "reserved").length,
      sold: vendibleLots.filter((item) => item.status === "sold").length
    }),
    [vendibleLots]
  );

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

  const visibleLots = useMemo(() => {
    return [...filteredLots]
      .sort((left, right) => {
        const leftPriority = getStatusPriority(left.status);
        const rightPriority = getStatusPriority(right.status);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return getNumericPrice(left) - getNumericPrice(right);
      })
      .slice(0, 4);
  }, [filteredLots]);

  const selectedCommercialItem = activeItem ?? hoveredItem;
  const lotWhatsAppHref = buildWhatsAppHref(
    selectedCommercialItem
      ? `Hola, quiero recibir informacion sobre ${selectedCommercialItem.name ?? selectedCommercialItem.id} en Viva Lago.`
      : "Hola, quiero recibir informacion sobre los lotes disponibles en Viva Lago."
  );
  const generalWhatsAppHref = buildWhatsAppHref(
    "Hola, quiero consultar por disponibilidad y financiacion en Viva Lago."
  );

  useEffect(() => {
    console.log("[ProjectPublicPage] Estado interno de datos:", {
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

    document.getElementById("explorar-lotes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-6 lg:gap-8 lg:px-8 lg:py-8">
        <header className="overflow-hidden rounded-[38px] border border-white/70 bg-[linear-gradient(135deg,#f8f4ec_0%,#ffffff_42%,#eef4f2_100%)] shadow-[0_35px_90px_rgba(15,23,42,0.1)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] lg:items-center lg:px-10 lg:py-10">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
                  Proyecto inmobiliario
                </span>
                <span className="rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700">
                  km 9 Acaray, Ciudad del Este
                </span>
              </div>

              <h1 className="font-display mt-6 max-w-4xl text-[2.9rem] font-semibold leading-[1.03] text-slate-950 sm:text-[3.7rem]">
                Viva Lago, un loteamiento pensado para proyectar con calma, ubicacion y estilo.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Descubre una propuesta residencial con administracion, calles internas y un entorno que invita a
                mirar el futuro con mas amplitud. Explora el mapa, revisa la disponibilidad y elige el lote ideal.
              </p>

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
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Viva Lago</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Espacio preparado para incorporar el logo del proyecto en futuras versiones.
                  </p>
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Logo
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Disponibles" value={String(metrics.available)} />
                <MetricCard label="Reservados" value={String(metrics.reserved)} />
                <MetricCard label="Vendidos" value={String(metrics.sold)} />
                <MetricCard label="Financiacion" value="Segun lote" />
              </div>

              <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
                <p className="font-semibold text-slate-900">Una propuesta clara para decidir mejor</p>
                <p className="mt-2">
                  Informacion simple, disponibilidad visible y acceso directo a consulta para avanzar con seguridad.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-6 lg:space-y-8">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <article className="rounded-[34px] border border-stone-200 bg-white/92 p-6 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">El proyecto</p>
              <h2 className="font-display mt-4 text-[2.4rem] font-semibold leading-tight text-slate-900">
                Un brochure comercial pensado para conocer el loteamiento de un vistazo.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Viva Lago integra una presentacion sobria del proyecto con herramientas para explorar lotes,
                revisar su disponibilidad y avanzar rapidamente hacia una consulta comercial.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <HighlightBadge label="Administracion" />
                <HighlightBadge label="Calles internas" />
                <HighlightBadge label={commonAreas.some((item) => item.name?.toLowerCase().includes("nautico")) ? "Club nautico / deportivo" : "Area comun"} />
                <HighlightBadge label="Disponibilidad visible" />
              </div>
            </article>

            <section className="grid gap-4 sm:grid-cols-2">
              <PhotoBlock title="Acceso y portada" subtitle="Espacio preparado para fotografia principal del proyecto." variant="tall" />
              <PhotoBlock title="Entorno del loteamiento" subtitle="Bloque visual listo para mostrar el contexto y el paisaje." />
              <PhotoBlock title="Administracion" subtitle="Seccion visual destinada a la recepcion y atencion del proyecto." />
              <PhotoBlock title="Club nautico / deportivo" subtitle="Espacio preparado para destacar el area comun y sus beneficios." />
            </section>
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            <BenefitCard
              eyebrow="Ubicacion"
              title="km 9 Acaray"
              copy="Una localizacion atractiva en Ciudad del Este, pensada para vivir, proyectar o invertir."
            />
            <BenefitCard
              eyebrow="Financiacion"
              title="Opciones segun lote"
              copy="Cada lote puede mostrar precio, entrega y cuotas para facilitar una decision comercial clara."
            />
            <BenefitCard
              eyebrow="Disponibilidad"
              title="Exploracion simple"
              copy="El mapa permite revisar estados y comparar lotes en pocos pasos, con una experiencia visual ordenada."
            />
            <BenefitCard
              eyebrow="Proyecto"
              title="Servicios y areas comunes"
              copy="Administracion, circulacion interna y area comun destacada dentro del trazado actual del proyecto."
            />
          </section>

          <section id="explorar-lotes" className="space-y-5">
            <div className="rounded-[34px] border border-stone-200 bg-white/92 p-6 shadow-soft">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">
                    Explora los lotes disponibles
                  </p>
                  <h2 className="font-display mt-3 text-[2.4rem] font-semibold leading-tight text-slate-900">
                    El mapa interactivo te ayuda a ubicar oportunidades con claridad.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                    Selecciona un lote para revisar superficie, precio, estado y financiacion, y continua la
                    conversacion por WhatsApp o solicitud de visita.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <StatusLegend variant="light" />
                </div>
              </div>
            </div>

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

            {error || seedRecommended ? (
              <section className="rounded-[24px] border border-stone-200 bg-stone-50 px-5 py-4 text-sm leading-7 text-slate-600">
                La disponibilidad puede actualizarse con el tiempo. Si un lote es de tu interes, consulta con
                nuestro equipo para confirmar condiciones y coordinacion comercial.
              </section>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_400px]">
              <section className="space-y-4">
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
                        Opciones visibles
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Una seleccion rapida para seguir comparando lotes.
                      </p>
                    </div>
                    <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-slate-500">
                      {visibleLots.length} opciones
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {visibleLots.length > 0 ? (
                      visibleLots.map((item) => (
                        <article key={item.id} className="rounded-[22px] border border-stone-200 bg-stone-50/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.name ?? item.id}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.manzana ?? "Manzana"} · lote {item.lotNumber ?? "-"}
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
                        Ajusta los filtros para descubrir mas alternativas dentro de Viva Lago.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>

          <ContactSection defaultWhatsAppHref={buildWhatsAppBaseHref()} selectedLot={activeItem} />
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-stone-200 bg-white px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function HighlightBadge({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-slate-700">
      {label}
    </div>
  );
}

function PhotoBlock({
  subtitle,
  title,
  variant = "default"
}: {
  subtitle: string;
  title: string;
  variant?: "default" | "tall";
}) {
  const heightClass = variant === "tall" ? "sm:row-span-2 min-h-[320px]" : "min-h-[152px]";

  return (
    <article
      className={`overflow-hidden rounded-[30px] border border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#f5f1ea_100%)] p-5 shadow-soft ${heightClass}`}
    >
      <div className="flex h-full flex-col justify-between rounded-[24px] border border-dashed border-stone-300 bg-[radial-gradient(circle_at_top_right,rgba(79,158,168,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,241,234,0.9))] p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Galeria del proyecto</p>
          <h3 className="font-display mt-3 text-[1.7rem] font-semibold text-slate-900">{title}</h3>
        </div>
        <p className="mt-6 max-w-sm text-sm leading-7 text-slate-600">{subtitle}</p>
      </div>
    </article>
  );
}

function BenefitCard({ copy, eyebrow, title }: { copy: string; eyebrow: string; title: string }) {
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

function getStatusPriority(status?: LotData["status"] | null) {
  if (status === "available") {
    return 0;
  }

  if (status === "reserved") {
    return 1;
  }

  if (status === "sold") {
    return 2;
  }

  return 3;
}
