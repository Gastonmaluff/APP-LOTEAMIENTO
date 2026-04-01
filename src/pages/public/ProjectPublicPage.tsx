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

const brochureVisuals = [
  {
    title: "Portada del proyecto",
    subtitle: "Espacio listo para la imagen principal de Viva Lago.",
    variant: "hero" as const
  },
  {
    title: "Acceso y entorno",
    subtitle: "Ideal para mostrar ingreso, paisaje y atmosfera del lugar."
  },
  {
    title: "Administracion",
    subtitle: "Preparado para destacar el servicio y la recepcion del proyecto."
  },
  {
    title: "Club nautico y deportivo",
    subtitle: "Bloque listo para sumar imagenes reales del area comun."
  }
];

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

  const curatedLots = useMemo(() => {
    return [...filteredLots]
      .sort((left, right) => {
        const leftPriority = getStatusPriority(left.status);
        const rightPriority = getStatusPriority(right.status);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return getNumericPrice(left) - getNumericPrice(right);
      })
      .slice(0, 3);
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
    <div className="min-h-screen bg-[#f7f3ec] text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200/70 bg-[#f8f4ec]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <a href="#inicio" className="font-display text-2xl font-semibold tracking-tight text-[#092930]">
            Viva Lago
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            <a className="text-sm text-slate-600 transition hover:text-[#092930]" href="#proyecto">
              Proyecto
            </a>
            <a className="text-sm text-slate-600 transition hover:text-[#092930]" href="#galeria">
              Galeria
            </a>
            <a className="text-sm text-slate-600 transition hover:text-[#092930]" href="#explorar-lotes">
              Lotes
            </a>
            <a className="text-sm text-slate-600 transition hover:text-[#092930]" href="#contacto">
              Contacto
            </a>
          </nav>

          <a
            href={generalWhatsAppHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#092930] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition hover:opacity-90"
          >
            Consultar
          </a>
        </div>
      </header>

      <main className="pb-12 pt-20">
        <section id="inicio" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.8),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(9,41,48,0.08),transparent_28%)]" />
          <div className="mx-auto grid min-h-[84vh] max-w-[1440px] gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:px-10 lg:py-10">
            <div className="relative z-10 flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#715b3b]">km 9 Acaray · Ciudad del Este</p>
              <h1 className="font-display mt-6 max-w-4xl text-[3.2rem] font-semibold leading-[0.96] text-[#092930] sm:text-[4.8rem] lg:text-[6.3rem]">
                Elegancia junto al agua, pensada para tu proximo proyecto.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
                Viva Lago presenta una propuesta inmobiliaria sobria y actual, con administracion, calles internas
                y un area comun que realza la experiencia del loteamiento.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={focusAvailableLots}
                  className="rounded-lg bg-[#f1d6bf] px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#092930] transition hover:translate-y-[-1px]"
                >
                  Ver lotes disponibles
                </button>
                <a
                  href={generalWhatsAppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[#092930]/20 bg-[#092930]/70 px-8 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur transition hover:bg-[#092930]"
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden rounded-[24px] shadow-[0_40px_80px_rgba(9,41,48,0.12)] lg:min-h-[720px]">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,41,48,0.2),rgba(9,41,48,0.45)),radial-gradient(circle_at_top,rgba(255,242,224,0.24),transparent_40%),linear-gradient(135deg,#4f6a73_0%,#19353c_40%,#7b8965_100%)]" />
              <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent_0%,rgba(9,41,48,0.2)_40%,rgba(9,41,48,0.48)_100%)]" />
              <div className="absolute inset-x-6 top-6 flex items-start justify-between">
                <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-white backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Imagen principal</p>
                  <p className="mt-2 text-sm font-medium">Espacio listo para tu render o foto IA</p>
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75 backdrop-blur">
                  Logo
                </div>
              </div>
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Viva Lago</p>
                <p className="mt-3 max-w-xs text-sm leading-7 text-white/85">
                  Reemplaza este bloque por la imagen hero cuando me pases los assets finales.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-[#f3eee5] py-10">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-10">
            <StatColumn label="Total de lotes" value={String(metrics.total)} />
            <StatColumn label="Disponibles" value={String(metrics.available)} />
            <StatColumn label="Reservados" value={String(metrics.reserved)} />
            <StatColumn label="Vendidos" value={String(metrics.sold)} />
          </div>
        </section>

        <section id="proyecto" className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">El proyecto</p>
              <h2 className="font-display mt-5 text-[2.8rem] leading-tight text-[#092930]">
                Una propuesta inmobiliaria presentada como brochure comercial.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
                Viva Lago combina un trazado claro con una presentacion elegante para que puedas evaluar lotes,
                disponibilidad y formas de contacto en una sola experiencia.
              </p>

              <div className="mt-8 grid gap-6">
                <ProjectPoint
                  title="Administracion"
                  copy="Una estructura preparada para acompanar la atencion y el funcionamiento del loteamiento."
                />
                <ProjectPoint
                  title="Calles internas"
                  copy="Circulacion clara dentro del trazado, integrada visualmente al mapa general del proyecto."
                />
                <ProjectPoint
                  title={
                    commonAreas.some((item) => item.name?.toLowerCase().includes("nautico"))
                      ? "Club nautico y deportivo"
                      : "Area comun destacada"
                  }
                  copy="Un sector comun que suma valor a la propuesta y fortalece la identidad del proyecto."
                />
              </div>
            </div>

            <div id="galeria" className="grid gap-4 sm:grid-cols-2">
              {brochureVisuals.map((item) => (
                <VisualPanel
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  variant={item.variant ?? "default"}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#fbf8f2] py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Resumen comercial</p>
              <h2 className="font-display mt-5 text-[2.8rem] text-[#092930]">Lo esencial para decidir con claridad</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <BenefitCard
                eyebrow="Ubicacion"
                title="km 9 Acaray"
                copy="Una localizacion atractiva en Ciudad del Este para vivir, proyectar o invertir."
              />
              <BenefitCard
                eyebrow="Financiacion"
                title="Alternativas por lote"
                copy="Cada lote puede mostrar entrega, cuotas y precio para una lectura comercial mas simple."
              />
              <BenefitCard
                eyebrow="Disponibilidad"
                title="Visual y actual"
                copy="El mapa te ayuda a distinguir rapidamente opciones disponibles, reservadas o vendidas."
              />
              <BenefitCard
                eyebrow="Exploracion"
                title="Consulta sin friccion"
                copy="Selecciona un lote y continua la conversacion por WhatsApp o solicitud de visita."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10">
          <div className="mb-12 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Lotes destacados</p>
              <h2 className="font-display mt-4 text-[2.6rem] text-[#092930]">Una seleccion para empezar a comparar</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {curatedLots.length > 0 ? (
              curatedLots.map((item, index) => (
                <LotShowcaseCard key={item.id} item={item} badgeLabel={index === 0 ? "Disponible" : getStatusLabel(item.status, item.type)} />
              ))
            ) : (
              <div className="col-span-full rounded-[24px] border border-stone-200 bg-white p-6 text-sm leading-7 text-slate-600 shadow-soft">
                Ajusta los filtros o explora el mapa para descubrir nuevas alternativas dentro de Viva Lago.
              </div>
            )}
          </div>
        </section>

        <section id="explorar-lotes" className="bg-[#fbf8f2] py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="grid gap-14 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Explora los lotes disponibles</p>
                  <h2 className="font-display mt-4 text-[2.8rem] leading-tight text-[#092930]">
                    El mapa te ayuda a ubicar cada oportunidad con claridad.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Selecciona un lote para conocer superficie, precio, estado y formas de contacto en el mismo flujo.
                  </p>
                </div>

                <StatusLegend variant="light" />

                <div className="space-y-3 text-sm leading-7 text-slate-600">
                  <p>Filtra por estado, manzana, moneda o rango de precio para concentrarte en las opciones que mas te interesan.</p>
                  <p>Si no ves lo que buscas, puedes reiniciar los filtros y volver a recorrer todo el loteamiento.</p>
                </div>
              </div>

              <div className="space-y-6">
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

                {(error || seedRecommended) && (
                  <section className="rounded-[24px] border border-stone-200 bg-stone-50 px-5 py-4 text-sm leading-7 text-slate-600">
                    Si un lote es de tu interes, consultanos para confirmar condiciones y coordinar una atencion personalizada.
                  </section>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_390px]">
                  <MapViewer
                    hasHighlightFilter={hasActiveFilters}
                    lots={lots}
                    highlightedLotIds={highlightedLotIds}
                    onActiveChange={setActiveItem}
                    onHoverChange={setHoveredItem}
                  />

                  <div className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                    <InfoPanel
                      activeItem={activeItem}
                      hoveredItem={hoveredItem}
                      requestVisitHref="#contacto"
                      whatsappHref={lotWhatsAppHref}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ContactSection defaultWhatsAppHref={buildWhatsAppBaseHref()} selectedLot={activeItem} />
      </main>
    </div>
  );
}

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-stone-300/60 md:border-r md:last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="font-display mt-3 text-4xl text-[#092930]">{value}</p>
    </div>
  );
}

function ProjectPoint({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="border-l border-stone-300 pl-5">
      <p className="font-display text-[1.45rem] text-[#092930]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{copy}</p>
    </div>
  );
}

function VisualPanel({
  subtitle,
  title,
  variant
}: {
  subtitle: string;
  title: string;
  variant: "default" | "hero";
}) {
  const className =
    variant === "hero"
      ? "sm:col-span-2 min-h-[340px]"
      : "min-h-[190px]";

  return (
    <article
      className={`overflow-hidden rounded-[18px] border border-stone-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.05)] ${className}`}
    >
      <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_top_right,rgba(79,158,168,0.1),transparent_35%),linear-gradient(180deg,#f8f4ec_0%,#f0ece5_100%)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#715b3b]">Galeria del proyecto</p>
            <h3 className="font-display mt-3 text-[1.8rem] text-[#092930]">{title}</h3>
          </div>
          <div className="rounded-lg border border-dashed border-stone-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Imagen
          </div>
        </div>
        <p className="mt-8 max-w-sm text-sm leading-7 text-slate-600">{subtitle}</p>
      </div>
    </article>
  );
}

function BenefitCard({ copy, eyebrow, title }: { copy: string; eyebrow: string; title: string }) {
  return (
    <article className="rounded-[18px] border border-stone-200 bg-white p-6 shadow-[0_24px_50px_rgba(15,23,42,0.05)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#715b3b]">{eyebrow}</p>
      <h3 className="font-display mt-4 text-[1.8rem] leading-tight text-[#092930]">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-slate-600">{copy}</p>
    </article>
  );
}

function LotShowcaseCard({ badgeLabel, item }: { badgeLabel: string; item: LotData }) {
  return (
    <article className="overflow-hidden rounded-[18px] border border-stone-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.05)] transition hover:-translate-y-1">
      <div className="relative h-64 overflow-hidden bg-[linear-gradient(135deg,#d2d9d7_0%,#6b7f67_50%,#d7c4ac_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_38%),linear-gradient(180deg,transparent_0%,rgba(9,41,48,0.18)_100%)]" />
        <span className="absolute left-4 top-4 rounded-md bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#092930]">
          {badgeLabel}
        </span>
        <div className="absolute bottom-4 left-4 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
          Espacio listo para imagen IA
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-[1.8rem] text-[#092930]">{item.name ?? item.id}</h3>
          <p className="text-sm font-semibold text-[#715b3b]">{formatPrice(item.price, item.currency)}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-200 pt-5 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Manzana</p>
            <p className="mt-1 text-slate-800">{item.manzana ?? "Consultar"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Lote</p>
            <p className="mt-1 text-slate-800">{item.lotNumber ?? "Consultar"}</p>
          </div>
        </div>
      </div>
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
