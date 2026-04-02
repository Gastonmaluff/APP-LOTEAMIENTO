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

const decorativeAreaIds = new Set(["area_lago", "area_acceso"]);

export function getFeatureTypeFromId(id: string): FeatureType | null {
  if (decorativeAreaIds.has(id)) {
    return null;
  }

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

export type CommercialPriceSummary = {
  caption: string;
  label: string;
  value: string;
};

export type FinancingSummary = {
  detail: string;
  estimatedInstallment: string | null;
  title: string;
  value: string;
};

export function getCommercialPriceSummary(item: Pick<LotData, "currency" | "deliveryPercent" | "finalPrice" | "financingText" | "installments" | "price">): CommercialPriceSummary {
  if (item.currency === "USD") {
    return {
      label: "Precio final",
      value: formatPrice(item.finalPrice ?? item.price, "USD"),
      caption: item.deliveryPercent !== null && item.deliveryPercent !== undefined || item.installments
        ? "Consultar financiacion"
        : "Pago contado"
    };
  }

  if (item.currency === "PYG") {
    const calculatedInstallment = calculateMonthlyInstallment(item.price, item.deliveryPercent, item.installments);
    const caption = buildInstallmentCaption(item.deliveryPercent, item.installments, item.financingText);

    return {
      label: "Cuota mensual",
      value: formatPrice(calculatedInstallment ?? item.price, "PYG"),
      caption
    };
  }

  return {
    label: "Precio",
    value: formatPrice(item.price, item.currency),
    caption: "Consultar disponibilidad"
  };
}

export function getFinancingSummary(item: Pick<LotData, "currency" | "deliveryPercent" | "financingText" | "installments" | "price">): FinancingSummary {
  const calculatedInstallment = calculateMonthlyInstallment(item.price, item.deliveryPercent, item.installments);
  const installmentCaption = buildInstallmentCaption(item.deliveryPercent, item.installments, item.financingText);

  if (item.currency === "PYG") {
    return {
      title: "Cuota mensual",
      value: formatPrice(calculatedInstallment ?? item.price, "PYG"),
      detail: installmentCaption,
      estimatedInstallment: null
    };
  }

  if (item.currency === "USD") {
    return {
      title: "Financiacion",
      value: installmentCaption,
      detail: calculatedInstallment ? `Cuota estimada: ${formatPrice(calculatedInstallment, "USD")}` : "Pago contado",
      estimatedInstallment: calculatedInstallment ? formatPrice(calculatedInstallment, "USD") : null
    };
  }

  return {
    title: "Financiacion",
    value: item.financingText ?? "Consultar condiciones comerciales",
    detail: "Nuestro equipo puede ayudarte a revisar opciones para este lote.",
    estimatedInstallment: null
  };
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

export function calculateMonthlyInstallment(
  price?: number | string | null,
  deliveryPercent?: number | null,
  installments?: number | null
) {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return null;
  }

  if (deliveryPercent === undefined || deliveryPercent === null || installments === undefined || installments === null || installments <= 0) {
    return null;
  }

  const financedAmount = price * (1 - deliveryPercent / 100);
  return financedAmount / installments;
}

function buildInstallmentCaption(
  deliveryPercent?: number | null,
  installments?: number | null,
  financingText?: string | null
) {
  if (deliveryPercent !== undefined && deliveryPercent !== null && installments !== undefined && installments !== null) {
    return `Entrega ${deliveryPercent}% + ${installments} cuotas`;
  }

  if (financingText) {
    return financingText;
  }

  return "Consultar financiacion";
}

export function hasMeaningfulDescription(description?: string | null) {
  if (!description) {
    return false;
  }

  const normalized = description.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const placeholderFragments = [
    "la ficha queda preparada para seguir creciendo",
    "detalles tecnicos",
    "medidas exactas",
    "observaciones comerciales",
    "argumentos comerciales"
  ];

  return !placeholderFragments.some((fragment) => normalized.includes(fragment));
}
