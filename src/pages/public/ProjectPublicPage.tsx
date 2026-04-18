import { useEffect, useMemo, useRef, useState } from "react";
import { InfoPanel } from "../../components/InfoPanel";
import { LotDesktopPanels } from "../../components/LotDesktopPanels";
import { LotSelectionFlight, type LotSelectionVisualPayload } from "../../components/LotSelectionFlight";
import { MapViewer } from "../../components/MapViewer";
import { ContactSection } from "../../components/public/ContactSection";
import { useLots } from "../../contexts/LotsContext";
import { useProjectSettings } from "../../contexts/ProjectSettingsContext";
import type { LotData } from "../../types/lots";
import { getCommercialPriceSummary, getStatusLabel } from "../../utils/mapUtils";

const whatsappNumber = (import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const assetBasePath = import.meta.env.BASE_URL;

const heroImageSrc = `${assetBasePath}images/viva-lago-drone.png`;
const logoImageSrc = `${assetBasePath}images/viva-lago-logo.png`;
const adminImageSrc = `${assetBasePath}images/viva-lago-admin.png`;
const nauticoImageSrc = `${assetBasePath}images/viva-lago-nautico.png`;
const gateImageSrc = `${assetBasePath}images/viva-lago-porteria.png`;

const projectVisuals = [
  {
    src: adminImageSrc,
    alt: "Oficinas administrativas de Viva Lago Country.",
    title: "Administracion",
    subtitle: "Un acceso sobrio y cuidado para recibir a propietarios e inversores.",
    variant: "large" as const
  },
  {
    src: gateImageSrc,
    alt: "Porteria principal de Viva Lago Country.",
    title: "Porteria",
    subtitle: "Ingreso jerarquizado con presencia y control.",
    variant: "small" as const
  },
  {
    src: nauticoImageSrc,
    alt: "Area nautica y comun de Viva Lago Country frente al agua.",
    title: "Club nautico y area comun",
    subtitle: "Un entorno pensado para compartir tiempo, paisaje y servicios.",
    variant: "small" as const
  }
];

export function ProjectPublicPage() {
  const { loading, lots, seedRecommended, source } = useLots();
  const { projectSettings } = useProjectSettings();
  const [activeItem, setActiveItem] = useState<LotData | null>(null);
  const [hoveredItem, setHoveredItem] = useState<LotData | null>(null);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [selectionVisual, setSelectionVisual] = useState<LotSelectionVisualPayload | null>(null);
  const previewTargetRef = useRef<HTMLDivElement>(null);

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

  const highlightedLotIds = useMemo(() => vendibleLots.map((item) => item.id), [vendibleLots]);

  const curatedLots = useMemo(() => {
    return [...vendibleLots]
      .sort((left, right) => {
        const leftPriority = getStatusPriority(left.status);
        const rightPriority = getStatusPriority(right.status);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return getNumericPrice(left) - getNumericPrice(right);
      })
      .slice(0, 3);
  }, [vendibleLots]);

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
      vendibleLotsCount: vendibleLots.length
    });
  }, [loading, lots.length, seedRecommended, source, vendibleLots.length]);

  useEffect(() => {
    if (!activeItem || activeItem.type !== "lote") {
      setPreviewVisible(true);
      setSelectionVisual(null);
    }
  }, [activeItem]);

  function focusAvailableLots() {
    document.getElementById("explorar-lotes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f4ec] text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200/80 bg-white/94 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
          <a href="#inicio" className="flex items-center">
            <img src={logoImageSrc} alt="Logo de Viva Lago Country." className="h-[52px] w-auto object-contain lg:h-[64px]" />
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            <a className="text-sm text-slate-600 transition hover:text-[#092930]" href="#proyecto">
              Proyecto
            </a>
            <a className="text-sm text-slate-600 transition hover:text-[#092930]" href="#explorar-lotes">
              Lotes
            </a>
            <a className="text-sm text-slate-600 transition hover:text-[#092930]" href="#contacto">
              Contacto
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href={`${import.meta.env.BASE_URL}admin/login`}
              aria-label="Abrir portal admin"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-[#092930] transition hover:border-[#1f3d2b]/30 hover:bg-[#f6f3eb] hover:text-[#1f3d2b]"
            >
              <PortalMark className="h-[18px] w-[18px] shrink-0" />
            </a>

            <a
              href={generalWhatsAppHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1f3d2b] px-5 py-3 text-[11px] font-semibold text-white transition hover:brightness-110 sm:px-6"
            >
              <WhatsAppMark className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Consultar por WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      <main className="pt-20">
        <section id="inicio" className="relative overflow-hidden">
          <div className="relative min-h-[88vh]">
            <img
              src={heroImageSrc}
              alt="Vista aerea de Viva Lago Country junto al agua al atardecer."
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,41,48,0.14),rgba(9,41,48,0.5))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,244,224,0.18),transparent_36%)]" />

            <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-[1440px] items-center px-4 sm:px-6 lg:px-10">
              <div className="max-w-5xl pt-12 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/75">
                  km 9 Acaray - Ciudad del Este
                </p>
                <h1 className="font-display mt-6 max-w-4xl text-[3.1rem] leading-[0.95] drop-shadow-[0_6px_26px_rgba(0,0,0,0.24)] sm:text-[4.8rem] lg:text-[6.2rem]">
                  Elegancia junto al agua para proyectar con mas amplitud.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/88">
                  Viva Lago Country combina un acceso jerarquizado, administracion, calles internas y un area comun
                  frente al agua en una propuesta inmobiliaria pensada para vivir o invertir.
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
                    className="rounded-lg border border-white/25 bg-white/10 px-8 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur transition hover:bg-white/16"
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
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
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">El proyecto</p>
              <h2 className="font-display mt-5 text-[2.8rem] leading-tight text-[#092930]">
                Una propuesta residencial con presencia, orden y una experiencia visual real.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
                Viva Lago Country presenta una identidad clara desde la porteria hasta sus areas comunes, con una
                lectura comercial limpia para descubrir lotes y avanzar hacia una consulta personalizada.
              </p>

              <div className="mt-8 grid gap-6">
                <ProjectPoint
                  title="Administracion"
                  copy="Una recepcion moderna y organizada para el acompanamiento cotidiano del proyecto."
                />
                <ProjectPoint
                  title="Calles internas"
                  copy="Un trazado claro que se integra con el mapa interactivo y ayuda a ubicar cada lote."
                />
                <ProjectPoint
                  title={
                    commonAreas.some((item) => item.name?.toLowerCase().includes("nautico"))
                      ? "Club nautico y deportivo"
                      : "Area comun destacada"
                  }
                  copy="Un espacio frente al agua preparado para sumar vida social, paisaje y valor al desarrollo."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {projectVisuals.map((item) => (
                <VisualPanel
                  key={item.title}
                  src={item.src}
                  alt={item.alt}
                  title={item.title}
                  subtitle={item.subtitle}
                  variant={item.variant}
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
                copy="El mapa ayuda a distinguir rapidamente opciones disponibles, reservadas o vendidas."
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
                <LotShowcaseCard
                  key={item.id}
                  item={item}
                  imageSrc={index === 0 ? gateImageSrc : index === 1 ? adminImageSrc : nauticoImageSrc}
                  badgeLabel={index === 0 ? "Disponible" : getStatusLabel(item.status, item.type)}
                />
              ))
            ) : (
              <div className="col-span-full rounded-[24px] border border-stone-200 bg-white p-6 text-sm leading-7 text-slate-600 shadow-soft">
                Ajusta los filtros o explora el mapa para descubrir nuevas alternativas dentro de Viva Lago.
              </div>
            )}
          </div>
        </section>

        <section id="explorar-lotes" className="bg-[#fbf8f2] py-20 sm:py-24">
          <div className="mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="space-y-8 xl:space-y-10">
              <div>
                <div>
                  <h2 className="font-display text-[2rem] leading-tight text-[#092930] sm:text-[2.3rem] lg:text-[2.8rem]">
                    Explora los lotes disponibles
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Selecciona un lote en el mapa para ver su precio, financiacion y detalles.
                  </p>
                </div>
              </div>

              <div className="min-w-0 space-y-6">
                <div className="grid gap-8 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] xl:gap-10">
                  <div className="min-w-0 overflow-hidden xl:pt-2">
                    <MapViewer
                      hasHighlightFilter={false}
                      lots={lots}
                      highlightedLotIds={highlightedLotIds}
                      mapAlignment={projectSettings.mapAlignment}
                      onActiveChange={setActiveItem}
                      onHoverChange={setHoveredItem}
                      onSelectionVisual={setSelectionVisual}
                    />
                  </div>

                  <div className="w-full min-w-0 space-y-4 xl:sticky xl:top-28 xl:self-start">
                    <InfoPanel
                      activeItem={activeItem}
                      hoveredItem={hoveredItem}
                      previewTargetRef={previewTargetRef}
                      previewVisible={previewVisible}
                      requestVisitHref="#contacto"
                      whatsappHref={lotWhatsAppHref}
                    />
                  </div>
                </div>

                <LotDesktopPanels item={selectedCommercialItem?.type === "road" ? null : selectedCommercialItem} />
              </div>
            </div>
          </div>
        </section>

        <ContactSection defaultWhatsAppHref={buildWhatsAppBaseHref()} selectedLot={activeItem} />
        <LotSelectionFlight
          visual={selectionVisual}
          targetRef={previewTargetRef}
          onStart={() => setPreviewVisible(false)}
          onComplete={() => {
            setSelectionVisual(null);
            setPreviewVisible(true);
          }}
        />

        <footer className="border-t border-stone-200 bg-[#0d2830]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-10 text-white sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="flex flex-col gap-4">
              <img
                src={logoImageSrc}
                alt="Logo de Viva Lago Country."
                className="h-16 w-auto object-contain brightness-0 invert"
              />
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">km 9 Acaray - Ciudad del Este</p>
            </div>

            <div className="text-sm leading-7 text-white/65">
              <p>Explora lotes, consulta financiacion y coordina una visita con nuestro equipo comercial.</p>
            </div>
          </div>
        </footer>
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
  alt,
  src,
  subtitle,
  title,
  variant
}: {
  alt: string;
  src: string;
  subtitle: string;
  title: string;
  variant: "large" | "small";
}) {
  const className = variant === "large" ? "sm:row-span-2 min-h-[420px]" : "min-h-[204px]";

  return (
    <article
      className={`group relative overflow-hidden rounded-[18px] border border-stone-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.05)] ${className}`}
    >
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,41,48,0.06),rgba(9,41,48,0.46))]" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Galeria del proyecto</p>
        <h3 className="font-display mt-3 text-[1.7rem] leading-tight">{title}</h3>
        <p className="mt-3 max-w-sm text-sm leading-7 text-white/85">{subtitle}</p>
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

function LotShowcaseCard({
  badgeLabel,
  imageSrc,
  item
}: {
  badgeLabel: string;
  imageSrc: string;
  item: LotData;
}) {
  const commercialPrice = getCommercialPriceSummary(item);

  return (
    <article className="overflow-hidden rounded-[18px] border border-stone-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.05)] transition hover:-translate-y-1">
      <div className="relative h-64 overflow-hidden">
        <img src={imageSrc} alt={`Vista asociada a ${item.name ?? item.id}.`} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(9,41,48,0.28)_100%)]" />
        <span className="absolute left-4 top-4 rounded-md bg-white/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#092930]">
          {badgeLabel}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-[1.8rem] text-[#092930]">{item.name ?? item.id}</h3>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{commercialPrice.label}</p>
            <p className="mt-1 text-sm font-semibold text-[#715b3b]">{commercialPrice.value}</p>
          </div>
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

        <p className="mt-4 text-sm leading-6 text-slate-500">{commercialPrice.caption}</p>
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

function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M20 12.05A8 8 0 0 1 8.34 19.16L4 20l.87-4.18A8 8 0 1 1 20 12.05Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.85 9.36c.16-.35.33-.36.56-.37h.47c.14 0 .37.05.56.46.18.41.62 1.43.67 1.54.05.1.08.23.02.36-.05.13-.08.21-.16.32-.08.11-.17.24-.24.31-.08.08-.17.18-.07.36.1.18.46.75.98 1.22.68.6 1.25.79 1.43.88.18.08.28.07.39-.04.11-.11.45-.52.56-.69.12-.18.24-.15.4-.09.16.06 1.04.49 1.21.58.17.08.28.12.32.19.04.07.04.41-.1.8-.13.39-.76.75-1.05.8-.29.05-.66.08-1.06-.05-.24-.08-.55-.18-.95-.35a5.96 5.96 0 0 1-2.07-1.28 6.98 6.98 0 0 1-1.44-1.9c-.15-.26-.4-.74-.4-1.41 0-.67.35-1 .48-1.14Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PortalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M8 9.25h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 14.75h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="16.75" cy="14.75" r="1.25" fill="currentColor" />
    </svg>
  );
}
