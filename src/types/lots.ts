export type LotData = {
  id: string;
  type: "lote" | "area" | "road";
  manzana?: string | null;
  lotNumber?: string | null;
  name?: string | null;
  area?: number | string | null;
  price?: number | string | null;
  currency?: "USD" | "PYG" | null;
  finalPrice?: number | string | null;
  deliveryPercent?: number | null;
  installments?: number | null;
  financingText?: string | null;
  dimensions?: {
    top?: string | null;
    right?: string | null;
    bottom?: string | null;
    left?: string | null;
  } | null;
  status?: "available" | "reserved" | "sold" | null;
  description?: string | null;
  sourcePage?: number | null;
};

export type FeatureType = LotData["type"];
