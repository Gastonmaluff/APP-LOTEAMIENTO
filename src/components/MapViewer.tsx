import { useEffect, useMemo, useRef, useState } from "react";
import type { LotData } from "../types/lots";
import type { MapAlignmentConfig } from "../types/project";
import {
  buildOverlayColor,
  buildTransformStyle,
  DEFAULT_SVG_ASPECT_RATIO,
  fitRect,
  getBackgroundEffectiveScale
} from "../utils/mapAlignment";
import { getCommercialPriceSummary, getFeatureData, getFeatureTypeFromId, getStatusLabel, statusPalette } from "../utils/mapUtils";
import type { LotSelectionVisualPayload } from "./LotSelectionFlight";

type TooltipState = {
  x: number;
  y: number;
  item: LotData;
} | null;

type MapViewerProps = {
  hasHighlightFilter?: boolean;
  lots: LotData[];
  highlightedLotIds?: string[];
  onActiveChange: (item: LotData | null) => void;
  onHoverChange: (item: LotData | null) => void;
  onSelectionVisual?: (payload: LotSelectionVisualPayload | null) => void;
  mapAlignment?: MapAlignmentConfig | null;
  readOnly?: boolean;
  selectedLotId?: string | null;
};

type LotStatus = NonNullable<LotData["status"]>;

const svgIdSelector = "[id]";

export function MapViewer({
  hasHighlightFilter = false,
  highlightedLotIds,
  lots,
  onActiveChange,
  onHoverChange,
  onSelectionVisual,
  mapAlignment,
  readOnly = false,
  selectedLotId
}: MapViewerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const svgRootRef = useRef<SVGSVGElement | null>(null);
  const lotsByIdRef = useRef<Map<string, LotData>>(new Map());

  const [svgMarkup, setSvgMarkup] = useState("");
  const [svgAspectRatio, setSvgAspectRatio] = useState(DEFAULT_SVG_ASPECT_RATIO);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [error, setError] = useState<string | null>(null);

  const lotsById = useMemo(() => new Map(lots.map((item) => [item.id, item])), [lots]);
  const highlightedLotIdsSet = useMemo(() => new Set(highlightedLotIds ?? []), [highlightedLotIds]);
  const statusesById = useMemo(
    () =>
      new Map(
        lots.flatMap((item) =>
          item.type === "lote" && item.status ? ([[item.id, item.status]] as Array<[string, LotStatus]>) : []
        )
      ),
    [lots]
  );

  useEffect(() => {
    lotsByIdRef.current = lotsById;
  }, [lotsById]);

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(stageRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const svgUrl = `${import.meta.env.BASE_URL}mapa-loteamiento.svg?ts=${Date.now()}`;

    fetch(svgUrl, {
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`No se pudo cargar el SVG (${response.status}).`);
        }

        const markup = await response.text();
        if (isMounted) {
          setSvgMarkup(markup);
          setSvgAspectRatio(resolveSvgAspectRatio(markup));
          setError(null);
        }
      })
      .catch((fetchError: unknown) => {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Error inesperado al cargar el SVG.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!svgMarkup || !frameRef.current) {
      return;
    }

    const frame = frameRef.current;
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    frame.innerHTML = svgMarkup;

    const svgRoot = frame.querySelector("svg");
    if (!svgRoot) {
      setError("El archivo SVG no contiene una raiz <svg> valida.");
      return;
    }

    svgRootRef.current = svgRoot;
    svgRoot.setAttribute("width", "100%");
    svgRoot.setAttribute("height", "100%");
    svgRoot.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgRoot.style.display = "block";
    svgRoot.style.width = "100%";
    svgRoot.style.height = "100%";
    svgRoot.style.maxWidth = "100%";
    svgRoot.style.overflow = "visible";

    setHoveredId(null);
    setActiveId(selectedLotId ?? null);
    setTooltip(null);
    onActiveChange(selectedLotId ? getFeatureData(selectedLotId, lotsByIdRef.current) : null);
    onHoverChange(null);
    onSelectionVisual?.(null);

    const allDetectedIds = Array.from(svgRoot.querySelectorAll<SVGElement>(svgIdSelector))
      .map((node) => node.id)
      .filter(Boolean);

    const nodes = Array.from(svgRoot.querySelectorAll<SVGElement>(svgIdSelector)).filter((node) =>
      Boolean(node.id && getFeatureTypeFromId(node.id))
    );

    console.log("[MapViewer] SVG IDs detectados:", {
      totalIds: allDetectedIds.length,
      allIds: allDetectedIds,
      interactiveIds: nodes.map((node) => node.id)
    });

    const cleanups = nodes.map((node) => {
      const featureType = getFeatureTypeFromId(node.id);
      if (!featureType) {
        return () => undefined;
      }

      node.style.cursor = readOnly || featureType === "road" ? "default" : "pointer";
      node.style.transition =
        "fill 220ms ease, opacity 220ms ease, filter 220ms ease, transform 260ms ease, stroke 220ms ease, stroke-width 220ms ease";
      node.style.transformBox = "fill-box";
      node.style.transformOrigin = "center";
      node.style.vectorEffect = "non-scaling-stroke";
      node.style.strokeLinejoin = "round";
      node.style.strokeLinecap = "round";

      const handleMouseEnter = (event: Event) => {
        const current = event.currentTarget as SVGElement;
        const item = getFeatureData(current.id, lotsByIdRef.current);

        if (readOnly) {
          return;
        }

        setHoveredId(current.id);
        onHoverChange(item);

        if (item && item.type !== "road") {
          const bounds = current.getBoundingClientRect();
          const frameBounds = stage.getBoundingClientRect();
          setTooltip({
            item,
            x: bounds.left - frameBounds.left + bounds.width / 2,
            y: bounds.top - frameBounds.top
          });
        } else {
          setTooltip(null);
        }
      };

      const handleMouseMove = (event: Event) => {
        const current = event.currentTarget as SVGElement;
        const item = getFeatureData(current.id, lotsByIdRef.current);
        if (readOnly || !item || item.type === "road") {
          return;
        }

        const mouseEvent = event as MouseEvent;
        const frameBounds = stage.getBoundingClientRect();
        setTooltip({
          item,
          x: mouseEvent.clientX - frameBounds.left,
          y: mouseEvent.clientY - frameBounds.top - 18
        });
      };

      const handleMouseLeave = () => {
        if (readOnly) {
          return;
        }

        setHoveredId((currentId) => (currentId === node.id ? null : currentId));
        setTooltip((currentTooltip) => (currentTooltip?.item.id === node.id ? null : currentTooltip));
        onHoverChange(null);
      };

      const handleClick = (event: Event) => {
        if (readOnly) {
          return;
        }

        const current = event.currentTarget as SVGElement;
        const item = getFeatureData(current.id, lotsByIdRef.current);

        if (!item || item.type === "road") {
          return;
        }

        if (item.type === "lote") {
          onSelectionVisual?.(buildSelectionVisualPayload(current));
        } else {
          onSelectionVisual?.(null);
        }

        setActiveId(current.id);
        onActiveChange(item);
      };

      node.addEventListener("mouseenter", handleMouseEnter);
      node.addEventListener("mousemove", handleMouseMove);
      node.addEventListener("mouseleave", handleMouseLeave);
      node.addEventListener("click", handleClick);

      return () => {
        node.removeEventListener("mouseenter", handleMouseEnter);
        node.removeEventListener("mousemove", handleMouseMove);
        node.removeEventListener("mouseleave", handleMouseLeave);
        node.removeEventListener("click", handleClick);
      };
    });

    const handleFrameLeave = () => {
      if (readOnly) {
        return;
      }

      setHoveredId(null);
      setTooltip(null);
      onHoverChange(null);
    };

    const handleFrameClick = (event: MouseEvent) => {
      if (readOnly) {
        return;
      }

      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      const interactiveTarget = target.closest(svgIdSelector) as SVGElement | null;
      if (!interactiveTarget || !getFeatureTypeFromId(interactiveTarget.id)) {
        setActiveId(null);
        onActiveChange(null);
      }
    };

    stage.addEventListener("mouseleave", handleFrameLeave);
    stage.addEventListener("click", handleFrameClick);
    paintInteractiveNodes(svgRoot, null, selectedLotId ?? null, statusesById, highlightedLotIdsSet, hasHighlightFilter);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      stage.removeEventListener("mouseleave", handleFrameLeave);
      stage.removeEventListener("click", handleFrameClick);
    };
  }, [hasHighlightFilter, highlightedLotIdsSet, onActiveChange, onHoverChange, onSelectionVisual, readOnly, selectedLotId, svgMarkup]);

  useEffect(() => {
    if (selectedLotId === undefined) {
      return;
    }

    setActiveId(selectedLotId);
  }, [selectedLotId]);

  useEffect(() => {
    const svgRoot = svgRootRef.current;
    if (!svgRoot) {
      return;
    }

    paintInteractiveNodes(svgRoot, hoveredId, activeId, statusesById, highlightedLotIdsSet, hasHighlightFilter);
  }, [activeId, hasHighlightFilter, highlightedLotIdsSet, hoveredId, statusesById]);

  useEffect(() => {
    if (activeId) {
      onActiveChange(getFeatureData(activeId, lotsById));
    }

    if (hoveredId) {
      onHoverChange(getFeatureData(hoveredId, lotsById));
    }

    setTooltip((currentTooltip) => {
      if (!currentTooltip) {
        return currentTooltip;
      }

      const nextItem = getFeatureData(currentTooltip.item.id, lotsById);
      return nextItem ? { ...currentTooltip, item: nextItem } : null;
    });
  }, [activeId, hoveredId, lotsById, onActiveChange, onHoverChange]);

  const svgBaseRect = useMemo(
    () => fitRect(stageSize.width || 1, stageSize.height || 1, svgAspectRatio),
    [stageSize.height, stageSize.width, svgAspectRatio]
  );
  const overlayColor = useMemo(
    () =>
      mapAlignment?.backgroundImage
        ? buildOverlayColor(mapAlignment.visual.overlayColor, mapAlignment.visual.overlayOpacity)
        : null,
    [mapAlignment]
  );

  return (
    <div className="relative mx-auto flex w-full max-w-[1280px] justify-center">
      <div className="relative w-full max-w-full">
        {error ? (
          <div className="flex min-h-[360px] items-center justify-center p-6 text-center text-sm text-red-700 sm:min-h-[440px]">
            {error}
          </div>
        ) : (
          <div
            ref={stageRef}
            className="relative w-full max-w-full overflow-hidden rounded-[28px]"
            style={{ aspectRatio: `${svgAspectRatio}` }}
          >
            {mapAlignment?.backgroundImage ? (
              <div
                className="pointer-events-none absolute inset-0 origin-center"
                style={{
                  filter: `blur(${mapAlignment.visual.blurPx}px)`,
                  opacity: mapAlignment.visual.satelliteOpacity,
                  transform: buildTransformStyle({
                    x: mapAlignment.backgroundTransform.x,
                    y: mapAlignment.backgroundTransform.y,
                    rotation: mapAlignment.backgroundTransform.rotation,
                    scale: getBackgroundEffectiveScale(
                      mapAlignment.backgroundTransform.scale,
                      mapAlignment.backgroundTransform.rotation
                    )
                  })
                }}
              >
                <img
                  src={mapAlignment.backgroundImage}
                  alt="Contexto satelital del proyecto."
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
            ) : null}

            {overlayColor ? <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: overlayColor }} /> : null}

            <div
              className="absolute"
              style={{
                left: svgBaseRect.left,
                top: svgBaseRect.top,
                width: svgBaseRect.width,
                height: svgBaseRect.height,
                opacity: mapAlignment?.svgTransform.opacity ?? 1,
                transform: buildTransformStyle(mapAlignment?.svgTransform ?? { x: 0, y: 0, scale: 1, rotation: 0 }),
                transformOrigin: "center center"
              }}
            >
              <div ref={frameRef} className="h-full w-full" />
            </div>

            {tooltip ? (
              <div
                className="pointer-events-none absolute z-10 hidden max-w-[220px] -translate-x-1/2 -translate-y-full rounded-[22px] border border-white/80 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur sm:block"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                {tooltip.item.type === "lote" ? <MapTooltipPrice item={tooltip.item} /> : null}
                <p className="font-semibold">{tooltip.item.name ?? tooltip.item.id}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                  {getStatusLabel(tooltip.item.status, tooltip.item.type)}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function MapTooltipPrice({ item }: { item: LotData }) {
  const commercialPrice = getCommercialPriceSummary(item);

  return (
    <div className="mb-3 border-b border-stone-200 pb-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{commercialPrice.label}</p>
      <p className="mt-1 font-semibold text-[#092930]">{commercialPrice.value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{commercialPrice.caption}</p>
    </div>
  );
}

function buildSelectionVisualPayload(node: SVGElement): LotSelectionVisualPayload {
  const graphicNode = node as SVGGraphicsElement;
  const bounds = graphicNode.getBBox();
  const paddingX = Math.max(bounds.width * 0.22, 3.6);
  const paddingY = Math.max(bounds.height * 0.22, 3.6);
  const clone = node.cloneNode(true) as SVGElement;
  clone.removeAttribute("id");
  clone.style.filter = "drop-shadow(0 12px 26px rgba(89,76,61,0.18))";
  clone.style.transform = "scale(1)";

  return {
    id: node.id,
    markup: `
      <svg viewBox="${bounds.x - paddingX} ${bounds.y - paddingY} ${bounds.width + paddingX * 2} ${bounds.height + paddingY * 2}" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;overflow:visible">
        ${clone.outerHTML}
      </svg>
    `,
    sourceRect: serializeRect(node.getBoundingClientRect())
  };
}

function serializeRect(rect: DOMRect) {
  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width
  };
}

function resolveSvgAspectRatio(svgMarkup: string) {
  const viewBoxMatch = svgMarkup.match(/viewBox="([\d.\s-]+)"/i);
  if (viewBoxMatch) {
    const [, rawViewBox] = viewBoxMatch;
    const values = rawViewBox
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));

    if (values.length === 4 && values[2] > 0 && values[3] > 0) {
      return values[2] / values[3];
    }
  }

  return DEFAULT_SVG_ASPECT_RATIO;
}

function paintInteractiveNodes(
  svgRoot: SVGSVGElement,
  hoveredId: string | null,
  activeId: string | null,
  statusesById: Map<string, LotStatus>,
  highlightedLotIdsSet: Set<string>,
  hasHighlightFilter: boolean
) {
  const nodes = Array.from(svgRoot.querySelectorAll<SVGElement>(svgIdSelector));

  nodes.forEach((node) => {
    const featureType = getFeatureTypeFromId(node.id);
    if (!featureType) {
      return;
    }

    const isHovered = hoveredId === node.id;
    const isActive = activeId === node.id;
    const status = statusesById.get(node.id);
    const isHighlightedLot = !hasHighlightFilter || highlightedLotIdsSet.has(node.id);

    node.style.stroke = isActive ? "#4f6450" : isHovered ? "#857d73" : "#a29a90";
    node.style.strokeWidth = featureType === "road" ? "0.88" : isActive ? "2.8" : isHovered ? "1.04" : "0.98";
    node.style.filter = "none";
    node.style.transform = "scale(1)";

    if (featureType === "lote") {
      node.style.fill = status ? statusPalette[status] : "#96aa8f";
      node.style.opacity = isActive ? "1" : isHovered ? "0.995" : isHighlightedLot ? "0.985" : "0.2";
      if (isActive) {
        node.style.stroke = "#445a45";
        node.style.strokeWidth = "3";
        node.style.filter = "brightness(1.08) drop-shadow(0 0 14px rgba(68, 90, 69, 0.32))";
        node.style.transform = "scale(1.018)";
        node.parentElement?.append(node);
      } else if (isHovered) {
        node.style.stroke = "#786f64";
        node.style.strokeWidth = "1.08";
        node.style.filter = "brightness(1.03) drop-shadow(0 0 7px rgba(98, 87, 74, 0.1))";
        node.style.transform = "scale(1.006)";
      } else if (!isHighlightedLot) {
        node.style.filter = "saturate(0.55)";
      }
      return;
    }

    if (featureType === "area") {
      node.style.fill = isActive ? "#b9c5bc" : isHovered ? "#c5d0c8" : "#d7ddd5";
      node.style.stroke = isActive ? "#7b7f76" : isHovered ? "#8d9188" : "#a9aca4";
      node.style.strokeWidth = isActive ? "1.06" : isHovered ? "0.98" : "0.92";
      node.style.opacity = isActive ? "0.97" : isHovered ? "0.95" : "0.92";
      if (isActive) {
        node.style.filter = "drop-shadow(0 0 10px rgba(99, 102, 89, 0.12))";
      }
      return;
    }

    node.style.fill = isHovered ? "#ddd9d3" : "#d6d3cd";
    node.style.stroke = isHovered ? "#b2aca2" : "#bdb7ad";
    node.style.strokeWidth = isHovered ? "0.96" : "0.88";
    node.style.opacity = isHovered ? "0.96" : "0.92";
  });
}
