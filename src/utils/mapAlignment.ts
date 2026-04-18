import type { MapAlignmentConfig } from "../types/project";
import { defaultMapAlignmentConfig } from "../types/project";

export const DEFAULT_SVG_ASPECT_RATIO = 210 / 297;

export type FittedRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function fitRect(containerWidth: number, containerHeight: number, aspectRatio: number): FittedRect {
  const safeAspectRatio = aspectRatio > 0 ? aspectRatio : DEFAULT_SVG_ASPECT_RATIO;
  const containerRatio = containerWidth / containerHeight;

  if (containerRatio > safeAspectRatio) {
    const height = containerHeight;
    const width = height * safeAspectRatio;
    return {
      left: (containerWidth - width) / 2,
      top: 0,
      width,
      height
    };
  }

  const width = containerWidth;
  const height = width / safeAspectRatio;

  return {
    left: 0,
    top: (containerHeight - height) / 2,
    width,
    height
  };
}

export function clampAlignmentConfig(alignment: MapAlignmentConfig): MapAlignmentConfig {
  return {
    ...alignment,
    svgTransform: {
      x: roundValue(alignment.svgTransform.x),
      y: roundValue(alignment.svgTransform.y),
      scale: clamp(roundValue(alignment.svgTransform.scale), 0.2, 4),
      rotation: clamp(roundValue(alignment.svgTransform.rotation), -180, 180),
      opacity: clamp(roundValue(alignment.svgTransform.opacity), 0.08, 1)
    },
    backgroundTransform: {
      x: roundValue(alignment.backgroundTransform.x),
      y: roundValue(alignment.backgroundTransform.y),
      scale: clamp(roundValue(alignment.backgroundTransform.scale), 0.4, 3),
      rotation: clamp(roundValue(alignment.backgroundTransform.rotation), -45, 45)
    },
    visual: {
      satelliteOpacity: clamp(roundValue(alignment.visual.satelliteOpacity), 0, 1),
      overlayColor: alignment.visual.overlayColor || defaultMapAlignmentConfig.visual.overlayColor,
      overlayOpacity: clamp(roundValue(alignment.visual.overlayOpacity), 0, 1),
      blurPx: clamp(roundValue(alignment.visual.blurPx), 0, 12)
    },
    pointAlignment: {
      svgPoints: alignment.pointAlignment.svgPoints.slice(0, 3),
      backgroundPoints: alignment.pointAlignment.backgroundPoints.slice(0, 3)
    }
  };
}

export function buildTransformStyle({
  rotation,
  scale,
  x,
  y
}: {
  rotation: number;
  scale: number;
  x: number;
  y: number;
}) {
  return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
}

export function getBackgroundEffectiveScale(scale: number, rotation: number) {
  const normalizedRotation = Math.abs(rotation);
  const coverageBoost = 1 + Math.min(normalizedRotation / 180, 0.12);
  return scale * coverageBoost;
}

export function buildOverlayColor(color: string, opacity: number) {
  const alpha = clamp(opacity, 0, 1);

  if (color.startsWith("#")) {
    const normalizedColor = color.slice(1);
    const size = normalizedColor.length === 3 ? 1 : 2;
    const segments = [0, 1, 2].map((index) => {
      const start = index * size;
      const value = normalizedColor.slice(start, start + size);
      const expanded = size === 1 ? `${value}${value}` : value;
      return Number.parseInt(expanded, 16);
    });

    if (segments.every((value) => Number.isFinite(value))) {
      return `rgba(${segments[0]}, ${segments[1]}, ${segments[2]}, ${alpha})`;
    }
  }

  if (color.startsWith("rgb")) {
    return color.replace(/rgba?\((.+)\)/, (_, values) => {
      const segments = values
        .split(",")
        .slice(0, 3)
        .map((segment: string) => segment.trim());

      return `rgba(${segments.join(", ")}, ${alpha})`;
    });
  }

  return color;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundValue(value: number) {
  return Number(value.toFixed(3));
}
