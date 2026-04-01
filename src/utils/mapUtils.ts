import type { FeatureType, LotData } from "../types/lots";

export const statusPalette = {
  available: "#6f8f6b",
  reserved: "#cbb89d",
  sold: "#6b6257"
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

export function buildFallbackFeatureData(id: string): LotData | null {
  const inferredType = getFeatureTypeFromId(id);
  if (!inferredType) {
    return null;
  }

  return {
    id,
    type: inferredType,
    name: id,
    description: "Elemento detectado en el SVG. Sin datos comerciales cargados todavia."
  };
}

export function getFeatureData(id: string, lotsById: ReadonlyMap<string, LotData>): LotData | null {
  const directMatch = lotsById.get(id);
  if (directMatch) {
    return directMatch;
  }

  return buildFallbackFeatureData(id);
}

export function getFeatureLabel(type: FeatureType): string {
  return labelByType[type];
}

export function getStatusLabel(status?: LotData["status"], type?: FeatureType) {
  if (status === "available") {
    return "Disponible";
  }

  if (status === "reserved") {
    return "Reservado";
  }

  if (status === "sold") {
    return "Vendido";
  }

  if (type === "road") {
    return "Solo referencia";
  }

  if (type === "area") {
    return "Area comun";
  }

  return "Sin definir";
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

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null) {
    return "No disponible";
  }

  return `${value}%`;
}

export function formatInstallments(value?: number | null): string {
  if (value === undefined || value === null) {
    return "No disponible";
  }

  return `${value} cuotas`;
}
