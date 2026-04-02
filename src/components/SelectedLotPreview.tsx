import type { RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import type { LotData } from "../types/lots";
import { statusPalette } from "../utils/mapUtils";

type SelectedLotPreviewProps = {
  isVisible?: boolean;
  item: LotData;
  previewContainerRef?: RefObject<HTMLDivElement>;
  variant?: "full" | "support";
};

type PreviewState = {
  hasRealDimensions: boolean;
  markup: string;
} | null;

const previewPadding = {
  x: 8,
  y: 8
};

export function SelectedLotPreview({
  isVisible = true,
  item,
  previewContainerRef,
  variant = "full"
}: SelectedLotPreviewProps) {
  const [preview, setPreview] = useState<PreviewState>(null);
  const [loading, setLoading] = useState(false);

  const dimensions = useMemo(
    () => ({
      top: item.dimensions?.top ?? null,
      right: item.dimensions?.right ?? null,
      bottom: item.dimensions?.bottom ?? null,
      left: item.dimensions?.left ?? null
    }),
    [item.dimensions]
  );

  useEffect(() => {
    let isCancelled = false;

    if (item.type !== "lote") {
      setPreview(null);
      return;
    }

    setLoading(true);

    fetch(`${import.meta.env.BASE_URL}mapa-loteamiento.svg?preview=${item.id}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo preparar la vista del lote.");
        }

        const markup = await response.text();
        if (isCancelled) {
          return;
        }

        const nextPreview = buildPreviewMarkup(markup, item, dimensions);
        setPreview(nextPreview);
      })
      .catch(() => {
        if (!isCancelled) {
          setPreview(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dimensions, item]);

  const isSupportVariant = variant === "support";

  return (
    <section
      ref={previewContainerRef}
      className={[
        "overflow-hidden rounded-[28px] border border-stone-200 bg-[linear-gradient(180deg,#f8f4ec_0%,#f2ede4_100%)] transition duration-300 xl:rounded-[30px]",
        isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.985] opacity-0"
      ].join(" ")}
      aria-hidden={!isVisible}
    >
      <div className={isSupportVariant ? "border-b border-stone-200/80 px-4 py-3 sm:px-5" : "border-b border-stone-200/80 px-5 py-4 sm:px-6"}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
          {isSupportVariant ? "Vista del lote" : "Vista ampliada"}
        </p>
        {!isSupportVariant ? (
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {preview?.hasRealDimensions
              ? "La pieza queda lista para incorporar medidas reales del lote en futuras cargas."
              : "La pieza ya admite medidas reales cuando las carguemos en la capa de datos."}
          </p>
        ) : null}
      </div>

      <div className={isSupportVariant ? "px-3 py-3 sm:px-4 sm:py-4 xl:px-4 xl:py-4" : "px-4 py-4 sm:px-5 sm:py-5 xl:px-6 xl:py-6"}>
        <div
          key={item.id}
          className={[
            "preview-enter relative overflow-hidden rounded-[24px] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),rgba(244,239,232,0.9))] shadow-[0_18px_42px_rgba(15,23,42,0.08)]",
            isSupportVariant ? "px-2 py-3 sm:px-3 xl:min-h-[260px] xl:px-4 xl:py-4" : "px-3 py-4 sm:px-4 xl:min-h-[360px] xl:px-6 xl:py-6"
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">Preparando lote...</div>
          ) : preview ? (
            <div
              className={[
                "relative z-10 mx-auto w-full",
                isSupportVariant ? "max-w-[240px] xl:max-w-[290px]" : "max-w-[320px] xl:max-w-[460px]"
              ].join(" ")}
              dangerouslySetInnerHTML={{ __html: preview.markup }}
            />
          ) : (
            <div className="flex min-h-[280px] items-center justify-center text-center text-sm leading-7 text-slate-500">
              No se pudo generar la vista ampliada de este lote.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function buildPreviewMarkup(markup: string, item: LotData, dimensions: SelectedLotPreviewProps["item"]["dimensions"]) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(markup, "image/svg+xml");
  const sourceSvg = parsed.querySelector("svg");
  const sourceNode = parsed.getElementById(item.id);

  if (!sourceSvg || !sourceNode) {
    return null;
  }

  const sandbox = document.createElement("div");
  sandbox.style.position = "absolute";
  sandbox.style.left = "-99999px";
  sandbox.style.top = "-99999px";
  sandbox.style.width = "0";
  sandbox.style.height = "0";
  sandbox.style.visibility = "hidden";
  sandbox.innerHTML = markup;
  document.body.appendChild(sandbox);

  try {
    const workingSvg = sandbox.querySelector("svg");
    const workingNode = workingSvg?.querySelector<SVGGraphicsElement>(`#${CSS.escape(item.id)}`);

    if (!workingSvg || !workingNode) {
      return null;
    }

    const bounds = workingNode.getBBox();
    const width = Math.max(bounds.width, 1);
    const height = Math.max(bounds.height, 1);
    const padX = Math.max(width * 0.45, previewPadding.x);
    const padY = Math.max(height * 0.42, previewPadding.y);
    const viewBoxX = bounds.x - padX;
    const viewBoxY = bounds.y - padY;
    const viewBoxWidth = width + padX * 2;
    const viewBoxHeight = height + padY * 2;

    const statusColor =
      item.status && item.status in statusPalette ? statusPalette[item.status as keyof typeof statusPalette] : "#96aa8f";

    const clonedMarkup = workingNode.outerHTML.replace(
      /style="[^"]*"/,
      `style="fill:${statusColor};stroke:#6f675d;stroke-width:0.92;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round;filter:drop-shadow(0 10px 28px rgba(89,76,61,0.14));"`
    );

    const topY = bounds.y - padY * 0.48;
    const bottomY = bounds.y + height + padY * 0.48;
    const leftX = bounds.x - padX * 0.56;
    const rightX = bounds.x + width + padX * 0.56;
    const labelColor = "#7a7168";
    const lineColor = "#b7b0a7";

    const measureLabel = (text: string | null | undefined, x: number, y: number, rotate?: string) =>
      text
        ? `<text x="${x}" y="${y}" fill="${labelColor}" opacity="0.86" font-size="${Math.max(width, height) * 0.09}" text-anchor="middle"${
            rotate ? ` transform="${rotate}"` : ""
          } font-family="Book Antiqua, Palatino Linotype, serif" letter-spacing="0.04em">${text}</text>`
        : "";

    const previewMarkup = `
      <svg viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg" class="h-auto w-full overflow-visible">
        <g opacity="0.95">
          <line x1="${bounds.x}" y1="${topY}" x2="${bounds.x + width}" y2="${topY}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${bounds.x}" y1="${bottomY}" x2="${bounds.x + width}" y2="${bottomY}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${leftX}" y1="${bounds.y}" x2="${leftX}" y2="${bounds.y + height}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${rightX}" y1="${bounds.y}" x2="${rightX}" y2="${bounds.y + height}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${bounds.x}" y1="${topY - 1.8}" x2="${bounds.x}" y2="${topY + 1.8}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${bounds.x + width}" y1="${topY - 1.8}" x2="${bounds.x + width}" y2="${topY + 1.8}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${bounds.x}" y1="${bottomY - 1.8}" x2="${bounds.x}" y2="${bottomY + 1.8}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${bounds.x + width}" y1="${bottomY - 1.8}" x2="${bounds.x + width}" y2="${bottomY + 1.8}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${leftX - 1.8}" y1="${bounds.y}" x2="${leftX + 1.8}" y2="${bounds.y}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${leftX - 1.8}" y1="${bounds.y + height}" x2="${leftX + 1.8}" y2="${bounds.y + height}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${rightX - 1.8}" y1="${bounds.y}" x2="${rightX + 1.8}" y2="${bounds.y}" stroke="${lineColor}" stroke-width="0.46" />
          <line x1="${rightX - 1.8}" y1="${bounds.y + height}" x2="${rightX + 1.8}" y2="${bounds.y + height}" stroke="${lineColor}" stroke-width="0.46" />
        </g>
        ${clonedMarkup}
        ${measureLabel(dimensions?.top, bounds.x + width / 2, topY - 2.8)}
        ${measureLabel(dimensions?.bottom, bounds.x + width / 2, bottomY + 4.6)}
        ${measureLabel(
          dimensions?.left,
          leftX - 3.4,
          bounds.y + height / 2,
          `rotate(-90 ${leftX - 3.4} ${bounds.y + height / 2})`
        )}
        ${measureLabel(
          dimensions?.right,
          rightX + 3.4,
          bounds.y + height / 2,
          `rotate(90 ${rightX + 3.4} ${bounds.y + height / 2})`
        )}
      </svg>
    `;

    return {
      hasRealDimensions: Boolean(dimensions?.top || dimensions?.right || dimensions?.bottom || dimensions?.left),
      markup: previewMarkup
    };
  } finally {
    document.body.removeChild(sandbox);
  }
}
