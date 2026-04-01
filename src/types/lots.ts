export type LotData = {
  id: string;
  type: "lote" | "area" | "road";
  manzana?: string;
  lotNumber?: string;
  name?: string;
  area?: number | string;
  price?: number | string;
  currency?: "USD" | "PYG";
  status?: "available" | "reserved" | "sold";
  financingText?: string;
  description?: string;
};

export type FeatureType = LotData["type"];
