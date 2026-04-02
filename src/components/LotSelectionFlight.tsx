import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type LotSelectionVisualPayload = {
  id: string;
  markup: string;
  sourceRect: {
    height: number;
    left: number;
    top: number;
    width: number;
  };
};

type LotSelectionFlightProps = {
  onComplete: () => void;
  onStart?: () => void;
  targetRef: RefObject<HTMLDivElement>;
  visual: LotSelectionVisualPayload | null;
};

export function LotSelectionFlight({
  onComplete,
  onStart,
  targetRef,
  visual
}: LotSelectionFlightProps) {
  const [isActive, setIsActive] = useState(false);
  const [animationMetrics, setAnimationMetrics] = useState<{
    scale: number;
    translateX: number;
    translateY: number;
  } | null>(null);

  useEffect(() => {
    if (!visual) {
      setAnimationMetrics(null);
      return;
    }

    let rafId = 0;

    const measure = () => {
      if (!targetRef.current) {
        rafId = window.requestAnimationFrame(measure);
        return;
      }

      const targetRect = targetRef.current.getBoundingClientRect();
      const sourceCenterX = visual.sourceRect.left + visual.sourceRect.width / 2;
      const sourceCenterY = visual.sourceRect.top + visual.sourceRect.height / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const scale = Math.max(1.6, Math.min(targetRect.width / Math.max(visual.sourceRect.width, 1), 4.4));

      setAnimationMetrics({
        scale,
        translateX: targetCenterX - sourceCenterX,
        translateY: targetCenterY - sourceCenterY
      });
    };

    measure();

    return () => {
      window.cancelAnimationFrame(rafId);
      setAnimationMetrics(null);
    };
  }, [targetRef, visual]);

  useEffect(() => {
    if (!visual || !animationMetrics) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    onStart?.();

    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      setIsActive(true);
    });

    const timeoutId = window.setTimeout(() => {
      setIsActive(false);
      onComplete();
    }, 520);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      setIsActive(false);
    };
  }, [animationMetrics, onComplete, onStart, visual]);

  if (!visual || !animationMetrics) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed z-[70] origin-center transition-[transform,opacity,filter] duration-[520ms]"
      style={{
        left: `${visual.sourceRect.left}px`,
        top: `${visual.sourceRect.top}px`,
        width: `${visual.sourceRect.width}px`,
        height: `${visual.sourceRect.height}px`,
        opacity: isActive ? 0.08 : 0.96,
        filter: isActive ? "drop-shadow(0 18px 34px rgba(15,23,42,0.2))" : "drop-shadow(0 8px 16px rgba(15,23,42,0.12))",
        transform: isActive
          ? `translate(${animationMetrics.translateX}px, ${animationMetrics.translateY}px) scale(${animationMetrics.scale})`
          : "translate(0px, 0px) scale(1)",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)"
      }}
      dangerouslySetInnerHTML={{ __html: visual.markup }}
    />,
    document.body
  );
}
