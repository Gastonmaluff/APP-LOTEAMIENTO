import type { LotData } from "../types/lots";

export type { LotData } from "../types/lots";

export type UnmatchedLotRecord = {
  rawLabel: string;
  reason: string;
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
  status?: "available" | "reserved" | "sold" | null;
  description?: string | null;
  sourcePage?: number | null;
};

const financingM1 = {
  deliveryPercent: 50,
  installments: 24,
  financingText: "Entrega 50% + cuotas 24 meses."
} as const;

const financingUsd36 = {
  deliveryPercent: 30,
  installments: 36,
  financingText: "Entrega del 30% + cuotas 36 meses. El PDF indica que se mantiene el precio contado."
} as const;

const financingGs135 = {
  deliveryPercent: null,
  installments: 135,
  financingText: "135 cuotas + entrega. El porcentaje de entrega no se distingue con claridad en el PDF."
} as const;

function buildLotName(manzana: string, lotNumber: string) {
  return `Lote ${manzana}-${lotNumber}`;
}

function lotRecord(input: LotData): LotData {
  return {
    finalPrice: null,
    deliveryPercent: null,
    installments: null,
    financingText: null,
    status: null,
    description: null,
    sourcePage: null,
    ...input
  };
}

// Pages 5-7 show "cuota" and "precio final" blocks consistent with 135 cuotas + 1 entrega.
// We keep deliveryPercent as null because the PDF text extraction does not expose a percentage.
function finalPriceFrom135PlusDelivery(monthlyQuota: number) {
  return monthlyQuota * 136;
}

export const vendibleLots: LotData[] = [
  lotRecord({
    id: "lote_m1_01",
    type: "lote",
    manzana: "M1",
    lotNumber: "01",
    name: buildLotName("M1", "01"),
    price: 120000,
    currency: "USD",
    status: "available",
    ...financingM1,
    sourcePage: 3
  }),
  lotRecord({
    id: "lote_m1_02",
    type: "lote",
    manzana: "M1",
    lotNumber: "02",
    name: buildLotName("M1", "02"),
    price: null,
    currency: null,
    status: "sold",
    ...financingM1,
    sourcePage: 3,
    description: "El PDF muestra 'VENDIDO' sin precio legible para este lote."
  }),
  lotRecord({
    id: "lote_m1_03",
    type: "lote",
    manzana: "M1",
    lotNumber: "03",
    name: buildLotName("M1", "03"),
    price: 130000,
    currency: "USD",
    status: "available",
    ...financingM1,
    sourcePage: 3
  }),
  lotRecord({
    id: "lote_m1_04",
    type: "lote",
    manzana: "M1",
    lotNumber: "04",
    name: buildLotName("M1", "04"),
    price: 140000,
    currency: "USD",
    status: "available",
    ...financingM1,
    sourcePage: 3
  }),
  lotRecord({
    id: "lote_m2_02",
    type: "lote",
    manzana: "M2",
    lotNumber: "02",
    name: buildLotName("M2", "02"),
    price: 80000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 4
  }),
  lotRecord({
    id: "lote_m2_03",
    type: "lote",
    manzana: "M2",
    lotNumber: "03",
    name: buildLotName("M2", "03"),
    price: 80000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 4
  }),
  lotRecord({
    id: "lote_m3_01",
    type: "lote",
    manzana: "M3",
    lotNumber: "01",
    name: buildLotName("M3", "01"),
    price: 60000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_02",
    type: "lote",
    manzana: "M3",
    lotNumber: "02",
    name: buildLotName("M3", "02"),
    price: 55000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_03",
    type: "lote",
    manzana: "M3",
    lotNumber: "03",
    name: buildLotName("M3", "03"),
    price: 55000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_04",
    type: "lote",
    manzana: "M3",
    lotNumber: "04",
    name: buildLotName("M3", "04"),
    price: 3800000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3800000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_05",
    type: "lote",
    manzana: "M3",
    lotNumber: "05",
    name: buildLotName("M3", "05"),
    price: 3700000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3700000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_06",
    type: "lote",
    manzana: "M3",
    lotNumber: "06",
    name: buildLotName("M3", "06"),
    price: 3600000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3600000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_07",
    type: "lote",
    manzana: "M3",
    lotNumber: "07",
    name: buildLotName("M3", "07"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_08",
    type: "lote",
    manzana: "M3",
    lotNumber: "08",
    name: buildLotName("M3", "08"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_09",
    type: "lote",
    manzana: "M3",
    lotNumber: "09",
    name: buildLotName("M3", "09"),
    price: 3800000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3800000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_10",
    type: "lote",
    manzana: "M3",
    lotNumber: "10",
    name: buildLotName("M3", "10"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m3_11",
    type: "lote",
    manzana: "M3",
    lotNumber: "11",
    name: buildLotName("M3", "11"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 5
  }),
  lotRecord({
    id: "lote_m4_01",
    type: "lote",
    manzana: "M4",
    lotNumber: "01",
    name: buildLotName("M4", "01"),
    price: 60000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_02",
    type: "lote",
    manzana: "M4",
    lotNumber: "02",
    name: buildLotName("M4", "02"),
    price: 55000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_03",
    type: "lote",
    manzana: "M4",
    lotNumber: "03",
    name: buildLotName("M4", "03"),
    price: 60000,
    currency: "USD",
    status: "available",
    ...financingUsd36,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_04",
    type: "lote",
    manzana: "M4",
    lotNumber: "04",
    name: buildLotName("M4", "04"),
    price: 3800000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3800000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_05",
    type: "lote",
    manzana: "M4",
    lotNumber: "05",
    name: buildLotName("M4", "05"),
    price: 3700000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3700000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_06",
    type: "lote",
    manzana: "M4",
    lotNumber: "06",
    name: buildLotName("M4", "06"),
    price: 3600000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3600000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_07",
    type: "lote",
    manzana: "M4",
    lotNumber: "07",
    name: buildLotName("M4", "07"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_08",
    type: "lote",
    manzana: "M4",
    lotNumber: "08",
    name: buildLotName("M4", "08"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_09",
    type: "lote",
    manzana: "M4",
    lotNumber: "09",
    name: buildLotName("M4", "09"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_10",
    type: "lote",
    manzana: "M4",
    lotNumber: "10",
    name: buildLotName("M4", "10"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_11",
    type: "lote",
    manzana: "M4",
    lotNumber: "11",
    name: buildLotName("M4", "11"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m4_12",
    type: "lote",
    manzana: "M4",
    lotNumber: "12",
    name: buildLotName("M4", "12"),
    price: 3800000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3800000),
    status: "available",
    ...financingGs135,
    sourcePage: 6
  }),
  lotRecord({
    id: "lote_m5_01",
    type: "lote",
    manzana: "M5",
    lotNumber: "01",
    name: buildLotName("M5", "01"),
    price: 3500000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3500000),
    status: "available",
    ...financingGs135,
    sourcePage: 7
  }),
  lotRecord({
    id: "lote_m5_02",
    type: "lote",
    manzana: "M5",
    lotNumber: "02",
    name: buildLotName("M5", "02"),
    price: 3800000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(3800000),
    status: "available",
    ...financingGs135,
    sourcePage: 7
  }),
  lotRecord({
    id: "lote_m5_03",
    type: "lote",
    manzana: "M5",
    lotNumber: "03",
    name: buildLotName("M5", "03"),
    price: 4000000,
    currency: "PYG",
    finalPrice: finalPriceFrom135PlusDelivery(4000000),
    status: "available",
    ...financingGs135,
    sourcePage: 7
  })
];

export const commonAreas: LotData[] = [
  lotRecord({
    id: "area_admin_m5_04",
    type: "area",
    name: "Administracion",
    description: "Area comun identificada como ADMINISTRACION en el plano comercial del PDF.",
    sourcePage: 2
  }),
  lotRecord({
    id: "area_nautico_m2_01",
    type: "area",
    name: "Club Nautico y Deportivo",
    description: "Area comun identificada en el PDF como CLUB NAUTICO & DEPORTIVO.",
    sourcePage: 3
  })
];

export const roads: LotData[] = [
  lotRecord({
    id: "road_calle",
    type: "road",
    name: "Camino del trazado",
    description:
      "El SVG actual solo expone un id vial generico. El PDF menciona CALLE 3, CALLE 4 y AVENIDA PRINCIPAL, pero no se asignan con confianza a este id.",
    sourcePage: null
  })
];

export const unmatchedLots: UnmatchedLotRecord[] = [
  {
    rawLabel: "manzana 2 / lote 1",
    reason: "El PDF lista este lote, pero el SVG actual no contiene un id lote_m2_01 para mapearlo con confianza.",
    type: "lote",
    manzana: "M2",
    lotNumber: "01",
    name: "Lote M2-01",
    area: null,
    price: null,
    currency: null,
    finalPrice: null,
    deliveryPercent: 30,
    installments: 36,
    financingText: financingUsd36.financingText,
    status: "available",
    description: "El PDF muestra 'LOTE 1 /' sin precio legible.",
    sourcePage: 4
  }
];

export const structuredLotsData: LotData[] = [...vendibleLots, ...commonAreas, ...roads];

export const structuredLotsDataById = new Map(structuredLotsData.map((item) => [item.id, item]));

export const matchedIds = [...vendibleLots, ...commonAreas].map((item) => item.id);
