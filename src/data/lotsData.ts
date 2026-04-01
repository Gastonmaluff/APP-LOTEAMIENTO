import type { LotData } from "../types/lots";

export const lotsData: LotData[] = [
  {
    id: "lote_m1_02",
    type: "lote",
    manzana: "M1",
    lotNumber: "02",
    name: "Lote M1-02",
    area: 360,
    price: 18500,
    currency: "USD",
    status: "available",
    financingText: "Entrega del 25% y saldo hasta 24 cuotas.",
    description: "Lote ideal para vivienda familiar con buena orientacion y acceso cercano a la via principal."
  },
  {
    id: "lote_m1_03",
    type: "lote",
    manzana: "M1",
    lotNumber: "03",
    name: "Lote M1-03",
    area: 372,
    price: 19250,
    currency: "USD",
    status: "reserved",
    financingText: "Reserva confirmada, pendiente de firma de boleto.",
    description: "Unidad con frente amplio, util para proyecto residencial con jardin y cochera."
  },
  {
    id: "lote_m4_11",
    type: "lote",
    manzana: "M4",
    lotNumber: "11",
    name: "Lote M4-11",
    area: 410,
    price: 22500,
    currency: "USD",
    status: "sold",
    financingText: "Operacion cerrada.",
    description: "Lote vendido, referenciado como ejemplo de integracion con estados comerciales."
  },
  {
    id: "lote_m5_01",
    type: "lote",
    manzana: "M5",
    lotNumber: "01",
    name: "Lote M5-01",
    area: 395,
    price: 21000,
    currency: "USD",
    status: "available",
    financingText: "Plan de financiacion con anticipo flexible y refuerzo semestral.",
    description: "Ubicado en esquina estrategica del sector M5, con rapida salida al acceso principal."
  },
  {
    id: "area_admin_m5_04",
    type: "area",
    name: "Area administrativa M5-04",
    area: "Uso institucional",
    description: "Sector previsto para administracion, recepcion de visitas y servicios del loteamiento."
  },
  {
    id: "road_calle_3",
    type: "road",
    name: "Calle interna 3",
    description: "Referencia vial utilizada por la futura capa de navegacion y senalizacion."
  },
  {
    id: "road_calle",
    type: "road",
    name: "Calle principal",
    description: "Via actualmente presente en el SVG real."
  }
];

export const lotsDataById = new Map(lotsData.map((item) => [item.id, item]));
