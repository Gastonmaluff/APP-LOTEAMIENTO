export type OperationType = "reserve" | "sale";
export type InstallmentStatus = "pending" | "paid" | "overdue";

export type ClientRecord = {
  id: string;
  fullName: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
};

export type SaleOperationRecord = {
  id: string;
  clientId: string;
  clientName: string;
  clientNationalId: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  lotId: string;
  lotLabel: string;
  operationType: OperationType;
  status: "active" | "completed" | "cancelled";
  lotStatus: "reserved" | "sold";
  currency: "USD" | "PYG" | null;
  price: number | null;
  deliveryPercent: number | null;
  installments: number | null;
  startDate: string | null;
  firstDueDate: string | null;
  nextDueDate: string | null;
  nextPaymentAmount: number | null;
  paymentStatus: InstallmentStatus | null;
  notes: string | null;
  contractUrl: string | null;
  createdAtMs: number | null;
};

export type InstallmentRecord = {
  id: string;
  saleId: string;
  lotId: string;
  clientId: string;
  number: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidAt: string | null;
  paymentMethod: string | null;
  note: string | null;
};

export type RegisterPaymentInput = {
  installmentId: string;
  paidAt: string;
  amount: number;
  paymentMethod: string;
  note: string;
  markAsFullPayment: boolean;
};

export type NewSaleInput = {
  lotId: string;
  operationType: OperationType;
  client: {
    fullName: string;
    nationalId: string;
    phone: string;
    email: string;
    notes: string;
    documentFrontUrl?: string | null;
    documentBackUrl?: string | null;
  };
  commercial: {
    currency: "USD" | "PYG";
    price: number;
    deliveryPercent: number | null;
    installments: number | null;
    startDate: string;
    firstDueDate: string;
    notes: string;
    contractUrl?: string | null;
  };
};
