import { useEffect, useMemo, useRef, useState } from "react";
import { lotsData } from "../data/lotsData";
import type { LotData } from "../types/lots";
import { getFeatureData, getFeatureTypeFromId, statusPalette } from "../utils/mapUtils";

type TooltipState = {
  x: number;
  y: number;
  item: LotData;
} | null;

type MapViewerProps = {
  onActiveChange: (item: LotData | null) => void;
  onHoverChange: (item: LotData | null) => void;
};

type LotStatus = NonNullable<LotData["status"]>;

const svgIdSelector = "[id]";

export function MapViewer({ onActiveChange, onHoverChange }: MapViewerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const svgRootRef = useRef<SVGSVGElement | null>(null);

  const [svgMarkup, setSvgMarkup] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [error, setError] = useState<string | null>(null);

  const statusesById = useMemo(
    () =>
      new Map(
        lotsData.flatMap((item) =>
          item.type === "lote" && item.status ? ([[item.id, item.status]] as Array<[string, LotStatus]>) : []
        )
      ),
    []
  );

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
        "fill 180ms ease, opacity 180ms ease, filter 180ms ease, transform 180ms ease, stroke 180ms ease";
      node.style.transformBox = "fill-box";
      node.style.transformOrigin = "center";
      node.style.vectorEffect = "non-scaling-stroke";

      const handleMouseEnter = (event: Event) => {
        const current = event.currentTarget as SVGElement;
        const item = getFeatureData(current.id);

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
        const item = getFeatureData(current.id);
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
        const item = getFeatureData(current.id);

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
    paintInteractiveNodes(svgRoot, null, null, statusesById);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      frame.removeEventListener("mouseleave", handleFrameLeave);
      frame.removeEventListener("click", handleFrameClick);
    };
  }, [onActiveChange, onHoverChange, svgMarkup]);

  useEffect(() => {
    const svgRoot = svgRootRef.current;
    if (!svgRoot) {
      return;
    }

    paintInteractiveNodes(svgRoot, hoveredId, activeId, statusesById);
  }, [activeId, hoveredId, statusesById]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 shadow-soft">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#4f9ea826,transparent_42%),linear-gradient(135deg,#0f172acc,rgba(15,23,42,0.74))]" />
      <div className="absolute inset-0 bg-grid-fade bg-[size:32px_32px] opacity-20" />

      <div className="relative min-h-[520px] p-3 sm:p-4">
        {error ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-100">
            {error}
          </div>
        ) : (
          <div className="relative min-h-[520px] overflow-auto rounded-[28px] border border-white/10 bg-white/95">
            <div ref={frameRef} className="min-h-[520px] min-w-[760px] p-4 sm:p-6" />
            {tooltip ? (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-2xl border border-white/20 bg-slate-950/90 px-4 py-3 text-sm text-white shadow-soft backdrop-blur"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                <p className="font-semibold">{tooltip.item.name ?? tooltip.item.id}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {tooltip.item.status === "available"
                    ? "Disponible"
                    : tooltip.item.status === "reserved"
                      ? "Reservado"
                      : tooltip.item.status === "sold"
                        ? "Vendido"
                        : tooltip.item.type === "area"
                          ? "Area informativa"
                          : "Elemento detectado"}
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
  statusesById: Map<string, LotStatus>
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

    node.style.stroke = isActive ? "#10253c" : isHovered ? "#1d4ed8" : "rgba(15, 23, 42, 0.18)";
    node.style.strokeWidth = featureType === "road" ? "0.45" : isHovered || isActive ? "0.85" : "0.35";
    node.style.filter = "none";
    node.style.transform = "scale(1)";

    if (featureType === "lote") {
      node.style.fill = status ? statusPalette[status] : "#cfe6d7";
      node.style.opacity = isHovered || isActive ? "1" : "0.96";
      if (isHovered || isActive) {
        node.style.filter = "brightness(1.05) drop-shadow(0 0 10px rgba(46, 128, 140, 0.34))";
        node.style.transform = "scale(1.015)";
      }
      return;
    }

    if (featureType === "area") {
      node.style.fill = isHovered || isActive ? "#8ec3cf" : "#bdd8de";
      node.style.opacity = isHovered || isActive ? "0.96" : "0.84";
      return;
    }

    node.style.fill = isHovered ? "#7f8c9d" : "#95a3b8";
    node.style.opacity = isHovered ? "0.96" : "0.72";
  });
}
