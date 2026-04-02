import type { LotData } from "../types/lots";
import { getFeatureTypeFromId } from "./mapUtils";

export type LotEditorState = {
  id: string;
  type: LotData["type"];
  manzana: string;
  lotNumber: string;
  name: string;
  width: string;
  length: string;
  areaDisplay: string;
  price: string;
  currency: "" | "USD" | "PYG";
  finalPrice: string;
  deliveryPercent: string;
  installments: string;
  financingText: string;
  status: "" | "available" | "reserved" | "sold";
  description: string;
  sourcePage: number | null;
};

export function toLotEditorState(item: LotData): LotEditorState {
  const width = inferDimensionValue(item, "width");
  const length = inferDimensionValue(item, "length");
  const computedArea = computeArea(width, length);

  return {
    id: item.id,
    type: item.type,
    manzana: item.manzana ?? "",
    lotNumber: item.lotNumber ?? "",
    name: item.name ?? "",
    width,
    length,
    areaDisplay: computedArea ? formatAreaNumber(computedArea) : stringifyNumberish(item.area),
    price: stringifyNumberish(item.price),
    currency: item.currency ?? "",
    finalPrice: stringifyNumberish(item.finalPrice),
    deliveryPercent: item.deliveryPercent === null || item.deliveryPercent === undefined ? "" : String(item.deliveryPercent),
    installments: item.installments === null || item.installments === undefined ? "" : String(item.installments),
    financingText: item.financingText ?? "",
    status: item.status ?? "",
    description: item.description ?? "",
    sourcePage: item.sourcePage ?? null
  };
}

export function fromLotEditorState(form: LotEditorState, previous: LotData, statusOverride: LotEditorState["status"]): LotData {
  const inferredType = getFeatureTypeFromId(form.id);
  const widthNumber = parseDecimalInput(form.width);
  const lengthNumber = parseDecimalInput(form.length);
  const computedArea = computeArea(form.width, form.length);
  const preservedArea = computedArea ? computedArea : previous.area ?? parseNumberishInput(form.areaDisplay);

  return {
    id: form.id,
    type: form.type ?? inferredType ?? "lote",
    manzana: normalizeBlank(form.manzana),
    lotNumber: normalizeBlank(form.lotNumber),
    name: normalizeBlank(form.name),
    area: preservedArea,
    price: parseNumberishInput(form.price),
    currency: form.currency || null,
    finalPrice: parseNumberishInput(form.finalPrice),
    deliveryPercent: parseNumericInput(form.deliveryPercent),
    installments: parseNumericInput(form.installments),
    financingText: normalizeBlank(form.financingText),
    dimensions:
      widthNumber !== null || lengthNumber !== null || previous.dimensions
        ? {
            width: widthNumber,
            length: lengthNumber,
            top: formatDimensionLabel(widthNumber),
            bottom: formatDimensionLabel(widthNumber),
            left: formatDimensionLabel(lengthNumber),
            right: formatDimensionLabel(lengthNumber)
          }
        : null,
    status: statusOverride || null,
    description: normalizeBlank(form.description),
    sourcePage: form.sourcePage
  };
}

export function computeArea(width: string, length: string) {
  const widthNumber = parseDecimalInput(width);
  const lengthNumber = parseDecimalInput(length);

  if (widthNumber === null || lengthNumber === null) {
    return null;
  }

  return Number((widthNumber * lengthNumber).toFixed(2));
}

export function parseDecimalInput(value: string) {
  const normalized = normalizeBlank(value);
  if (!normalized) {
    return null;
  }

  const numberValue = Number(normalized.replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function parseNumericInput(value: string) {
  return parseDecimalInput(value);
}

export function parseNumberishInput(value: string): number | string | null {
  const normalized = normalizeBlank(value);
  if (!normalized) {
    return null;
  }

  if (/^-?\d+$/.test(normalized)) {
    return Number(normalized);
  }

  if (/^-?\d{1,3}([.,]\d{3})+$/.test(normalized)) {
    return Number(normalized.replace(/[.,]/g, ""));
  }

  if (/^-?\d+[.,]\d+$/.test(normalized)) {
    return Number(normalized.replace(",", "."));
  }

  return normalized;
}

export function normalizeBlank(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function stringifyNumberish(value?: number | string | null) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

export function formatAreaNumber(value: number) {
  const formatter = Number.isInteger(value)
    ? new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 })
    : new Intl.NumberFormat("es-PY", { maximumFractionDigits: 2 });

  return `${formatter.format(value)} m²`;
}

function inferDimensionValue(item: LotData, kind: "width" | "length") {
  if (kind === "width") {
    if (item.dimensions?.width !== null && item.dimensions?.width !== undefined) {
      return String(item.dimensions.width);
    }

    const top = parseDecimalLabel(item.dimensions?.top);
    const bottom = parseDecimalLabel(item.dimensions?.bottom);
    if (top !== null && bottom !== null && top === bottom) {
      return String(top);
    }
  }

  if (kind === "length") {
    if (item.dimensions?.length !== null && item.dimensions?.length !== undefined) {
      return String(item.dimensions.length);
    }

    const left = parseDecimalLabel(item.dimensions?.left);
    const right = parseDecimalLabel(item.dimensions?.right);
    if (left !== null && right !== null && left === right) {
      return String(left);
    }
  }

  return "";
}

function parseDecimalLabel(value?: string | null) {
  if (!value) {
    return null;
  }

  const matched = value.match(/-?\d+(?:[.,]\d+)?/);
  if (!matched) {
    return null;
  }

  const parsed = Number(matched[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDimensionLabel(value: number | null) {
  return value === null ? null : `${value} m`;
}
