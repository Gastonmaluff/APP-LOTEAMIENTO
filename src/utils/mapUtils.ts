import { structuredLotsDataById } from "../data/structuredLotsData";
import type { FeatureType, LotData } from "../types/lots";

export const statusPalette = {
  available: "#46b981",
  reserved: "#f2a93b",
  sold: "#d86b7a"
} as const;

const labelByType: Record<FeatureType, string> = {
  lote: "Lote",
  area: "Area",
  road: "Camino"
};

export function getFeatureTypeFromId(id: string): FeatureType | null {
  if (id.startsWith("lote_")) {
    return "lote";
  }

  if (id.startsWith("area_")) {
    return "area";
  }

  if (id.startsWith("road_")) {
    return "road";
  }

  return null;
}

export function getFeatureData(id: string): LotData | null {
  const directMatch = structuredLotsDataById.get(id);
  if (directMatch) {
    return directMatch;
  }

  const inferredType = getFeatureTypeFromId(id);
  if (!inferredType) {
    return null;
  }

  return {
    id,
    type: inferredType,
    description: "Elemento detectado en el SVG. Sin datos comerciales cargados todavia."
  };
}

export function getFeatureLabel(type: FeatureType): string {
  return labelByType[type];
}

export function formatArea(value?: number | string | null): string {
  if (value === undefined || value === null) {
    return "No disponible";
  }

  if (typeof value === "number") {
    return `${value.toLocaleString("es-PY")} m2`;
  }

  return value;
}

export function formatPrice(price?: number | string | null, currency?: "USD" | "PYG" | null): string {
  if (price === undefined || price === null) {
    return "Consultar";
  }

  if (typeof price === "string") {
    return price;
  }

  if (currency === "PYG") {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      maximumFractionDigits: 0
    }).format(price);
  }

  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0
  }).format(price);
}
