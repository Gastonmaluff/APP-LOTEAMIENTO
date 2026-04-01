import { useEffect, useMemo, useRef, useState } from "react";
import type { LotData } from "../types/lots";
import { getFeatureData, getFeatureTypeFromId, getStatusLabel, statusPalette } from "../utils/mapUtils";

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
};

type LotStatus = NonNullable<LotData["status"]>;

const svgIdSelector = "[id]";

export function MapViewer({
  hasHighlightFilter = false,
  highlightedLotIds,
  lots,
  onActiveChange,
  onHoverChange
}: MapViewerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const svgRootRef = useRef<SVGSVGElement | null>(null);
  const lotsByIdRef = useRef<Map<string, LotData>>(new Map());

  const [svgMarkup, setSvgMarkup] = useState("");
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
    svgRoot.style.overflow = "visible";

    setHoveredId(null);
    setActiveId(null);
    setTooltip(null);
    onActiveChange(null);
    onHoverChange(null);

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

      node.style.cursor = featureType === "road" ? "default" : "pointer";
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

        setHoveredId(current.id);
        onHoverChange(item);

        if (item && item.type !== "road") {
          const bounds = current.getBoundingClientRect();
          const frameBounds = frame.getBoundingClientRect();
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
        if (!item || item.type === "road") {
          return;
        }

        const mouseEvent = event as MouseEvent;
        const frameBounds = frame.getBoundingClientRect();
        setTooltip({
          item,
          x: mouseEvent.clientX - frameBounds.left,
          y: mouseEvent.clientY - frameBounds.top - 18
        });
      };

      const handleMouseLeave = () => {
        setHoveredId((currentId) => (currentId === node.id ? null : currentId));
        setTooltip((currentTooltip) => (currentTooltip?.item.id === node.id ? null : currentTooltip));
        onHoverChange(null);
      };

      const handleClick = (event: Event) => {
        const current = event.currentTarget as SVGElement;
        const item = getFeatureData(current.id, lotsByIdRef.current);

        if (!item || item.type === "road") {
          return;
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
      setHoveredId(null);
      setTooltip(null);
      onHoverChange(null);
    };

    const handleFrameClick = (event: MouseEvent) => {
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

    frame.addEventListener("mouseleave", handleFrameLeave);
    frame.addEventListener("click", handleFrameClick);
    paintInteractiveNodes(svgRoot, null, null, statusesById, highlightedLotIdsSet, hasHighlightFilter);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      frame.removeEventListener("mouseleave", handleFrameLeave);
      frame.removeEventListener("click", handleFrameClick);
    };
  }, [hasHighlightFilter, highlightedLotIdsSet, onActiveChange, onHoverChange, svgMarkup]);

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

  return (
    <div className="relative mx-auto flex w-full max-w-[1040px] justify-center">
      <div className="relative min-h-[560px] w-full">
        {error ? (
          <div className="flex min-h-[540px] items-center justify-center p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="relative min-h-[540px] overflow-auto">
            <div ref={frameRef} className="mx-auto min-h-[540px] min-w-[760px] max-w-[1040px] p-2 sm:p-4 lg:p-6" />
            {tooltip ? (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[22px] border border-white/80 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
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

    node.style.stroke = isActive ? "#4f5a64" : isHovered ? "#66727d" : "#7b858f";
    node.style.strokeWidth = featureType === "road" ? "0.62" : isActive ? "1.14" : isHovered ? "0.96" : "0.82";
    node.style.filter = "none";
    node.style.transform = "scale(1)";

    if (featureType === "lote") {
      node.style.fill = status ? statusPalette[status] : "#cfe6d7";
      node.style.opacity = isActive ? "1" : isHovered ? "0.995" : isHighlightedLot ? "0.985" : "0.2";
      if (isActive) {
        node.style.stroke = "#31424e";
        node.style.strokeWidth = "1.26";
        node.style.filter = "brightness(1.02) drop-shadow(0 0 12px rgba(45, 60, 72, 0.18))";
        node.style.transform = "scale(1.015)";
      } else if (isHovered) {
        node.style.stroke = "#5d6a75";
        node.style.strokeWidth = "1.02";
        node.style.filter = "brightness(1.012) drop-shadow(0 0 7px rgba(82, 97, 110, 0.12))";
        node.style.transform = "scale(1.006)";
      } else if (!isHighlightedLot) {
        node.style.filter = "saturate(0.55)";
      }
      return;
    }

    if (featureType === "area") {
      node.style.fill = isActive ? "#85b9c4" : isHovered ? "#98c8d1" : "#c9dde1";
      node.style.stroke = isActive ? "#5c737a" : isHovered ? "#738a91" : "#8fa0a6";
      node.style.strokeWidth = isActive ? "1" : isHovered ? "0.86" : "0.74";
      node.style.opacity = isActive ? "0.97" : isHovered ? "0.94" : "0.9";
      if (isActive) {
        node.style.filter = "drop-shadow(0 0 10px rgba(80, 103, 111, 0.14))";
      }
      return;
    }

    node.style.fill = isHovered ? "#949aa6" : "#9aa1ad";
    node.style.stroke = isHovered ? "#707780" : "#7b838d";
    node.style.strokeWidth = isHovered ? "0.7" : "0.62";
    node.style.opacity = isHovered ? "0.94" : "0.84";
  });
}
