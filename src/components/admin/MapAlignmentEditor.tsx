import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { MapAlignmentConfig } from "../../types/project";
import {
  DEFAULT_SVG_ASPECT_RATIO,
  buildOverlayColor,
  buildTransformStyle,
  clampAlignmentConfig,
  fitRect
} from "../../utils/mapAlignment";

type MapAlignmentEditorProps = {
  backgroundBusy: boolean;
  backgroundHint: string | null;
  backgroundProgress: number;
  error: string | null;
  onBackgroundUpload: (file: File) => void;
  onChange: (nextValue: MapAlignmentConfig) => void;
  onPreviewPublic: () => void;
  onReset: () => void;
  onSave: () => void;
  saveState: "idle" | "saved" | "saving";
  value: MapAlignmentConfig;
};

type StageSize = {
  width: number;
  height: number;
};

type PointLayer = "background" | "svg";

const svgImageSrc = `${import.meta.env.BASE_URL}mapa-loteamiento.svg`;

export function MapAlignmentEditor({
  backgroundBusy,
  backgroundHint,
  backgroundProgress,
  error,
  onBackgroundUpload,
  onChange,
  onPreviewPublic,
  onReset,
  onSave,
  saveState,
  value
}: MapAlignmentEditorProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [dragStart, setDragStart] = useState<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const [isPointMode, setIsPointMode] = useState(false);
  const [pointLayer, setPointLayer] = useState<PointLayer>("background");

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }

    const stage = stageRef.current;
    const observer = new ResizeObserver((entries) => {
      const nextEntry = entries[0];
      if (!nextEntry) {
        return;
      }

      setStageSize({
        width: nextEntry.contentRect.width,
        height: nextEntry.contentRect.height
      });
    });

    observer.observe(stage);

    return () => {
      observer.disconnect();
    };
  }, []);

  const svgBaseRect = useMemo(
    () => fitRect(stageSize.width || 1, stageSize.height || 1, DEFAULT_SVG_ASPECT_RATIO),
    [stageSize.height, stageSize.width]
  );

  const overlayColor = useMemo(
    () => buildOverlayColor(value.visual.overlayColor, value.visual.overlayOpacity),
    [value.visual.overlayColor, value.visual.overlayOpacity]
  );

  const canApplyPointAlignment =
    value.pointAlignment.backgroundPoints.length >= 2 && value.pointAlignment.svgPoints.length >= 2;

  function updateAlignment(partial: Partial<MapAlignmentConfig>) {
    onChange(
      clampAlignmentConfig({
        ...value,
        ...partial
      })
    );
  }

  function updateNestedSection<K extends keyof MapAlignmentConfig>(
    section: K,
    nextValues: Partial<MapAlignmentConfig[K]>
  ) {
    updateAlignment({
      [section]: {
        ...(value[section] as Record<string, unknown>),
        ...nextValues
      }
    } as Partial<MapAlignmentConfig>);
  }

  function handleStagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (isPointMode) {
      return;
    }

    event.preventDefault();
    setDragStart({
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: value.svgTransform.x,
      y: value.svgTransform.y
    });
  }

  useEffect(() => {
    if (!dragStart) {
      return;
    }

    const activeDrag = dragStart;

    function handlePointerMove(event: PointerEvent) {
      updateNestedSection("svgTransform", {
        x: activeDrag.x + (event.clientX - activeDrag.pointerX),
        y: activeDrag.y + (event.clientY - activeDrag.pointerY)
      });
    }

    function handlePointerUp() {
      setDragStart(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragStart, value.svgTransform.x, value.svgTransform.y]);

  function handleBackgroundImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onBackgroundUpload(file);
    event.target.value = "";
  }

  function handleStageClick(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPointMode || !stageRef.current) {
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    const point = {
      x: event.clientX - stageRect.left,
      y: event.clientY - stageRect.top
    };

    if (pointLayer === "background") {
      updateNestedSection("pointAlignment", {
        backgroundPoints: [...value.pointAlignment.backgroundPoints.slice(-2), point]
      });
      return;
    }

    const svgPoint = projectStagePointToSvgLocal(point, stageSize, svgBaseRect, value.svgTransform);
    updateNestedSection("pointAlignment", {
      svgPoints: [...value.pointAlignment.svgPoints.slice(-2), svgPoint]
    });
  }

  function handleApplyPointAlignment() {
    if (!canApplyPointAlignment) {
      return;
    }

    const nextTransform = resolveTransformFromPoints(
      stageSize,
      svgBaseRect,
      value.pointAlignment.svgPoints,
      value.pointAlignment.backgroundPoints
    );

    updateNestedSection("svgTransform", nextTransform);
  }

  function clearPoints() {
    updateNestedSection("pointAlignment", {
      svgPoints: [],
      backgroundPoints: []
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_420px]">
      <section className="rounded-[32px] border border-stone-200 bg-white/94 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Vista previa</p>
            <h3 className="font-display mt-2 text-[2rem] text-[#092930]">Calibracion visual del loteamiento</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPointMode((current) => !current)}
              className={[
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition",
                isPointMode
                  ? "border-[#092930] bg-[#092930] text-white"
                  : "border-stone-300 bg-white text-slate-700 hover:border-[#8fa88b] hover:text-[#092930]"
              ].join(" ")}
            >
              {isPointMode ? "Salir de modo puntos" : "Modo puntos"}
            </button>

            <button
              type="button"
              onClick={onPreviewPublic}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
            >
              Vista previa publica
            </button>
          </div>
        </div>

        <div
          ref={stageRef}
          onClick={handleStageClick}
          className="relative aspect-[210/297] overflow-hidden rounded-[28px] border border-stone-200 bg-[#e8dfd3]"
        >
          {value.backgroundImage ? (
            <div
              className="absolute inset-0 origin-center transition"
              style={{
                transform: buildTransformStyle({
                  x: value.backgroundTransform.x,
                  y: value.backgroundTransform.y,
                  rotation: 0,
                  scale: value.backgroundTransform.scale
                }),
                filter: `blur(${value.visual.blurPx}px)`,
                opacity: value.visual.satelliteOpacity
              }}
            >
              <img
                src={value.backgroundImage}
                alt="Base satelital del proyecto."
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.68),rgba(237,231,221,0.92))] p-10 text-center text-sm leading-7 text-slate-500">
              Carga una imagen base o pega una URL para empezar a alinear el loteamiento sobre el mapa real.
            </div>
          )}

          <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: overlayColor }} />

          <div
            className={[
              "absolute inset-0 touch-none select-none",
              isPointMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
            ].join(" ")}
            onPointerDown={handleStagePointerDown}
            style={{
              transform: buildTransformStyle(value.svgTransform),
              opacity: value.svgTransform.opacity
            }}
          >
            <div
              className="absolute"
              style={{
                left: svgBaseRect.left,
                top: svgBaseRect.top,
                width: svgBaseRect.width,
                height: svgBaseRect.height
              }}
            >
              <img
                src={svgImageSrc}
                alt="SVG del loteamiento."
                className="h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(15,23,42,0.15)]"
                draggable={false}
              />
            </div>
          </div>

          {value.pointAlignment.backgroundPoints.map((point, index) => (
            <ReferencePoint key={`bg-${index}`} index={index} label="B" point={point} tone="background" />
          ))}
          {value.pointAlignment.svgPoints.map((point, index) => {
            const stagePoint = projectSvgLocalToStage(point, stageSize, svgBaseRect, value.svgTransform);
            return <ReferencePoint key={`svg-${index}`} index={index} label="S" point={stagePoint} tone="svg" />;
          })}

          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#092930] shadow-sm">
              SVG encima
            </span>
            <span className="rounded-full bg-white/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
              Fondo + overlay
            </span>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isPointMode ? (
          <div className="mt-4 rounded-[24px] border border-stone-200 bg-[#fcfaf6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#715b3b]">Alineacion fina por puntos</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Marca 2 o 3 referencias del fondo y luego las mismas referencias del SVG para proponer un ajuste
                  inicial.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPointLayer("background")}
                  className={pointModeButtonClass(pointLayer === "background")}
                >
                  Marcar fondo
                </button>
                <button
                  type="button"
                  onClick={() => setPointLayer("svg")}
                  className={pointModeButtonClass(pointLayer === "svg")}
                >
                  Marcar SVG
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MiniStat label="Puntos fondo" value={String(value.pointAlignment.backgroundPoints.length)} />
              <MiniStat label="Puntos SVG" value={String(value.pointAlignment.svgPoints.length)} />
              <MiniStat label="Modo actual" value={pointLayer === "background" ? "Fondo" : "SVG"} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApplyPointAlignment}
                disabled={!canApplyPointAlignment}
                className="rounded-full bg-[#092930] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Calcular ajuste inicial
              </button>
              <button
                type="button"
                onClick={clearPoints}
                className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
              >
                Limpiar puntos
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-4">
        <ControlCard title="Imagen base" eyebrow="Mapa satelital">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                URL o imagen actual
              </label>
              <input
                type="url"
                value={value.backgroundImage ?? ""}
                onChange={(event) =>
                  updateAlignment({
                    backgroundImage: event.target.value.trim() || null,
                    backgroundImageStoragePath: null
                  })
                }
                placeholder="https://..."
                className="field-light w-full"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-[22px] border border-dashed border-stone-300 bg-[#fbf8f2] px-4 py-3 text-sm text-slate-600 transition hover:border-[#8fa88b] hover:text-[#092930]">
              <span>{backgroundBusy ? "Subiendo imagen..." : "Subir imagen base"}</span>
              <span className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                Seleccionar
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundImageChange} />
            </label>

            {backgroundBusy ? (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-[#ece5da]">
                  <div
                    className="h-full rounded-full bg-[#8fa88b] transition-[width] duration-300"
                    style={{ width: `${Math.max(backgroundProgress * 100, 8)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {backgroundProgress > 0
                    ? `Subiendo imagen... ${Math.round(backgroundProgress * 100)}%`
                    : "Preparando imagen para la subida..."}
                </p>
              </div>
            ) : null}

            {backgroundHint ? <p className="text-xs leading-6 text-slate-500">{backgroundHint}</p> : null}
          </div>
        </ControlCard>

        <ControlCard title="Ajuste del SVG" eyebrow="Transformacion principal">
          <div className="space-y-4">
            <SliderField
              label="X"
              min={-260}
              max={260}
              step={1}
              value={value.svgTransform.x}
              onChange={(nextValue) => updateNestedSection("svgTransform", { x: nextValue })}
            />
            <SliderField
              label="Y"
              min={-260}
              max={260}
              step={1}
              value={value.svgTransform.y}
              onChange={(nextValue) => updateNestedSection("svgTransform", { y: nextValue })}
            />
            <SliderField
              label="Scale"
              min={0.2}
              max={4}
              step={0.01}
              value={value.svgTransform.scale}
              onChange={(nextValue) => updateNestedSection("svgTransform", { scale: nextValue })}
            />
            <SliderField
              label="Rotation"
              min={-180}
              max={180}
              step={0.1}
              value={value.svgTransform.rotation}
              onChange={(nextValue) => updateNestedSection("svgTransform", { rotation: nextValue })}
            />
            <SliderField
              label="Opacidad SVG"
              min={0.08}
              max={1}
              step={0.01}
              value={value.svgTransform.opacity}
              onChange={(nextValue) => updateNestedSection("svgTransform", { opacity: nextValue })}
            />
          </div>
        </ControlCard>

        <ControlCard title="Fondo y overlay" eyebrow="Contexto visual">
          <div className="space-y-4">
            <SliderField
              label="X fondo"
              min={-240}
              max={240}
              step={1}
              value={value.backgroundTransform.x}
              onChange={(nextValue) => updateNestedSection("backgroundTransform", { x: nextValue })}
            />
            <SliderField
              label="Y fondo"
              min={-240}
              max={240}
              step={1}
              value={value.backgroundTransform.y}
              onChange={(nextValue) => updateNestedSection("backgroundTransform", { y: nextValue })}
            />
            <SliderField
              label="Scale fondo"
              min={0.4}
              max={3}
              step={0.01}
              value={value.backgroundTransform.scale}
              onChange={(nextValue) => updateNestedSection("backgroundTransform", { scale: nextValue })}
            />
            <SliderField
              label="Opacidad satelite"
              min={0}
              max={1}
              step={0.01}
              value={value.visual.satelliteOpacity}
              onChange={(nextValue) => updateNestedSection("visual", { satelliteOpacity: nextValue })}
            />
            <SliderField
              label="Opacidad overlay"
              min={0}
              max={1}
              step={0.01}
              value={value.visual.overlayOpacity}
              onChange={(nextValue) => updateNestedSection("visual", { overlayOpacity: nextValue })}
            />
            <SliderField
              label="Blur"
              min={0}
              max={12}
              step={0.1}
              value={value.visual.blurPx}
              onChange={(nextValue) => updateNestedSection("visual", { blurPx: nextValue })}
            />
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Color del overlay
              </span>
              <input
                type="color"
                value={normalizeColorValue(value.visual.overlayColor)}
                onChange={(event) => updateNestedSection("visual", { overlayColor: event.target.value })}
                className="h-12 w-full rounded-[16px] border border-stone-200 bg-white p-2"
              />
            </label>
          </div>
        </ControlCard>

        <div className="rounded-[26px] border border-stone-200 bg-white/94 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onReset}
              className="flex-1 rounded-full border border-stone-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
            >
              Restablecer
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saveState === "saving"}
              className="flex-1 rounded-full bg-[#092930] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saveState === "saving" ? "Guardando..." : saveState === "saved" ? "Guardado" : "Guardar alineacion"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ControlCard({
  children,
  eyebrow,
  title
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-[26px] border border-stone-200 bg-white/94 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#715b3b]">{eyebrow}</p>
      <h4 className="font-display mt-2 text-[1.6rem] text-[#092930]">{title}</h4>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SliderField({
  label,
  max,
  min,
  onChange,
  step,
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
        <span className="text-sm font-medium text-[#092930]">{formatSliderValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#ece5da]"
      />
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-stone-200 bg-white/86 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#092930]">{value}</p>
    </div>
  );
}

function ReferencePoint({
  index,
  label,
  point,
  tone
}: {
  index: number;
  label: string;
  point: { x: number; y: number };
  tone: "background" | "svg";
}) {
  return (
    <div
      className={[
        "pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-semibold shadow-sm",
        tone === "background" ? "border-[#715b3b] bg-[#f1d6bf] text-[#715b3b]" : "border-[#092930] bg-white text-[#092930]"
      ].join(" ")}
      style={{ left: point.x, top: point.y }}
    >
      {label}
      {index + 1}
    </div>
  );
}

function pointModeButtonClass(active: boolean) {
  return [
    "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition",
    active ? "border-[#8fa88b] bg-[#eef5eb] text-[#4f684b]" : "border-stone-300 bg-white text-slate-700"
  ].join(" ");
}

function formatSliderValue(value: number) {
  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return String(Math.round(value));
  }

  return value.toFixed(2);
}

function normalizeColorValue(color: string) {
  return /^#([0-9a-f]{6})$/i.test(color) ? color : "#e6dfd5";
}

function projectStagePointToSvgLocal(
  stagePoint: { x: number; y: number },
  stageSize: StageSize,
  svgBaseRect: { left: number; top: number; width: number; height: number },
  transform: MapAlignmentConfig["svgTransform"]
) {
  const center = {
    x: stageSize.width / 2,
    y: stageSize.height / 2
  };

  const translated = {
    x: stagePoint.x - transform.x,
    y: stagePoint.y - transform.y
  };

  const radians = (-transform.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const deltaX = translated.x - center.x;
  const deltaY = translated.y - center.y;

  const unrotated = {
    x: center.x + (deltaX * cos - deltaY * sin) / transform.scale,
    y: center.y + (deltaX * sin + deltaY * cos) / transform.scale
  };

  return {
    x: unrotated.x - svgBaseRect.left,
    y: unrotated.y - svgBaseRect.top
  };
}

function projectSvgLocalToStage(
  localPoint: { x: number; y: number },
  stageSize: StageSize,
  svgBaseRect: { left: number; top: number; width: number; height: number },
  transform: MapAlignmentConfig["svgTransform"]
) {
  const center = {
    x: stageSize.width / 2,
    y: stageSize.height / 2
  };
  const basePoint = {
    x: svgBaseRect.left + localPoint.x,
    y: svgBaseRect.top + localPoint.y
  };

  const radians = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const deltaX = (basePoint.x - center.x) * transform.scale;
  const deltaY = (basePoint.y - center.y) * transform.scale;

  return {
    x: center.x + deltaX * cos - deltaY * sin + transform.x,
    y: center.y + deltaX * sin + deltaY * cos + transform.y
  };
}

function resolveTransformFromPoints(
  stageSize: StageSize,
  svgBaseRect: { left: number; top: number; width: number; height: number },
  svgPoints: Array<{ x: number; y: number }>,
  backgroundPoints: Array<{ x: number; y: number }>
) {
  const sourceA = {
    x: svgBaseRect.left + svgPoints[0].x,
    y: svgBaseRect.top + svgPoints[0].y
  };
  const sourceB = {
    x: svgBaseRect.left + svgPoints[1].x,
    y: svgBaseRect.top + svgPoints[1].y
  };
  const targetA = backgroundPoints[0];
  const targetB = backgroundPoints[1];
  const sourceVector = {
    x: sourceB.x - sourceA.x,
    y: sourceB.y - sourceA.y
  };
  const targetVector = {
    x: targetB.x - targetA.x,
    y: targetB.y - targetA.y
  };
  const sourceDistance = Math.hypot(sourceVector.x, sourceVector.y) || 1;
  const targetDistance = Math.hypot(targetVector.x, targetVector.y) || 1;
  const scale = targetDistance / sourceDistance;
  const rotation = ((Math.atan2(targetVector.y, targetVector.x) - Math.atan2(sourceVector.y, sourceVector.x)) * 180) / Math.PI;

  const center = {
    x: stageSize.width / 2,
    y: stageSize.height / 2
  };
  const rotatedSourceA = rotateAndScalePoint(sourceA, center, scale, rotation);
  let x = targetA.x - rotatedSourceA.x;
  let y = targetA.y - rotatedSourceA.y;

  if (svgPoints.length >= 3 && backgroundPoints.length >= 3) {
    const targetC = backgroundPoints[2];
    const sourceC = {
      x: svgBaseRect.left + svgPoints[2].x,
      y: svgBaseRect.top + svgPoints[2].y
    };
    const rotatedSourceC = rotateAndScalePoint(sourceC, center, scale, rotation);
    x = (x + (targetC.x - rotatedSourceC.x)) / 2;
    y = (y + (targetC.y - rotatedSourceC.y)) / 2;
  }

  return {
    x,
    y,
    scale,
    rotation
  };
}

function rotateAndScalePoint(
  point: { x: number; y: number },
  center: { x: number; y: number },
  scale: number,
  rotation: number
) {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const deltaX = (point.x - center.x) * scale;
  const deltaY = (point.y - center.y) * scale;

  return {
    x: center.x + deltaX * cos - deltaY * sin,
    y: center.y + deltaX * sin + deltaY * cos
  };
}
