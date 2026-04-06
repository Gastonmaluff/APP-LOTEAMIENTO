import {
  collection,
  doc,
  type DocumentReference,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch
} from "firebase/firestore";
import { PROJECT_NAME, PROJECT_SLUG, PUBLIC_PROJECT_ROUTE } from "../config/project";
import { db } from "../firebase/client";
import type {
  InstallmentRecord,
  InstallmentStatus,
  NewSaleInput,
  OperationType,
  RegisterPaymentInput,
  SaleOperationRecord
} from "../types/finance";
import type { LotData } from "../types/lots";

type FirestoreRecord = Record<string, unknown>;

export function subscribeToProjectSales(
  projectSlug: string,
  onData: (sales: SaleOperationRecord[]) => void,
  onError: (error: Error) => void
) {
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const salesRef = collection(db, "projects", projectSlug, "sales");
  const salesQuery = query(salesRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    salesQuery,
    (snapshot) => {
      onData(snapshot.docs.map((docSnapshot) => normalizeSale(docSnapshot.id, docSnapshot.data())));
    },
    (error) => onError(error)
  );
}

export function subscribeToSaleInstallments(
  projectSlug: string,
  saleId: string,
  onData: (installments: InstallmentRecord[]) => void,
  onError: (error: Error) => void
) {
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const installmentsRef = collection(db, "projects", projectSlug, "sales", saleId, "installments");
  const installmentsQuery = query(installmentsRef, orderBy("number", "asc"));

  return onSnapshot(
    installmentsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((docSnapshot) => normalizeInstallment(docSnapshot.id, docSnapshot.data())));
    },
    (error) => onError(error)
  );
}

export async function createProjectSale(
  projectSlug: string,
  lot: LotData,
  input: NewSaleInput,
  userEmail?: string | null
) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const projectRef = doc(db, "projects", projectSlug);
  const clientsRef = collection(projectRef, "clients");
  const salesRef = collection(projectRef, "sales");
  const activityRef = doc(collection(projectRef, "adminActivity"));
  const lotRef = doc(projectRef, "lots", lot.id);

  const clientSnapshot =
    input.client.nationalId.trim()
      ? await getDocs(query(clientsRef, where("nationalId", "==", input.client.nationalId.trim()), limit(1)))
      : null;

  const existingClientDoc = clientSnapshot && !clientSnapshot.empty ? clientSnapshot.docs[0] : null;
  const clientRef = existingClientDoc ? existingClientDoc.ref : doc(clientsRef);
  const saleRef = doc(salesRef);
  const batch = writeBatch(db);

  const clientPayload = {
    fullName: input.client.fullName.trim(),
    nationalId: normalizeBlank(input.client.nationalId),
    phone: normalizeBlank(input.client.phone),
    email: normalizeBlank(input.client.email),
    notes: normalizeBlank(input.client.notes),
    documentFrontUrl: input.client.documentFrontUrl ?? null,
    documentBackUrl: input.client.documentBackUrl ?? null,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail ?? null,
    ...(existingClientDoc ? {} : { createdAt: serverTimestamp(), createdBy: userEmail ?? null })
  };

  batch.set(clientRef, clientPayload, { merge: true });

  const lotLabel = buildLotLabel(lot);
  const lotStatus = input.operationType === "reserve" ? "reserved" : "sold";
  const nextPaymentAmount = calculateInstallmentAmount(
    input.commercial.price,
    input.commercial.deliveryPercent,
    input.commercial.installments
  );

  batch.set(
    saleRef,
    {
      projectSlug,
      projectName: PROJECT_NAME,
      publicRoute: PUBLIC_PROJECT_ROUTE,
      lotId: lot.id,
      lotLabel,
      clientId: clientRef.id,
      clientName: input.client.fullName.trim(),
      clientNationalId: normalizeBlank(input.client.nationalId),
      clientPhone: normalizeBlank(input.client.phone),
      clientEmail: normalizeBlank(input.client.email),
      operationType: input.operationType,
      status: "active",
      lotStatus,
      currency: input.commercial.currency,
      price: input.commercial.price,
      deliveryPercent: input.commercial.deliveryPercent ?? null,
      installments: input.commercial.installments ?? null,
      startDate: normalizeBlank(input.commercial.startDate),
      firstDueDate: normalizeBlank(input.commercial.firstDueDate),
      nextDueDate: normalizeBlank(input.commercial.firstDueDate),
      nextPaymentAmount,
      paymentStatus: nextPaymentAmount ? "pending" : null,
      notes: normalizeBlank(input.commercial.notes),
      contractUrl: input.commercial.contractUrl ?? null,
      createdAt: serverTimestamp(),
      createdBy: userEmail ?? null,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail ?? null
    },
    { merge: true }
  );

  createInstallments(
    batch,
    saleRef,
    clientRef.id,
    lot.id,
    input.commercial.firstDueDate,
    input.commercial.installments,
    nextPaymentAmount
  );

  batch.set(
    lotRef,
    {
      status: lotStatus,
      saleId: saleRef.id,
      clientId: clientRef.id,
      currency: input.commercial.currency,
      price: input.commercial.price,
      deliveryPercent: input.commercial.deliveryPercent ?? null,
      installments: input.commercial.installments ?? null,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail ?? null
    },
    { merge: true }
  );

  batch.set(activityRef, {
    action: input.operationType === "reserve" ? "create-reserve" : "create-sale",
    projectSlug,
    lotId: lot.id,
    saleId: saleRef.id,
    clientId: clientRef.id,
    userEmail: userEmail ?? null,
    createdAt: serverTimestamp()
  });

  await batch.commit();

  return {
    saleId: saleRef.id,
    clientId: clientRef.id
  };
}

export async function registerSalePayment(
  sale: SaleOperationRecord,
  installments: InstallmentRecord[],
  input: RegisterPaymentInput,
  userEmail?: string | null
) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const projectRef = doc(db, "projects", PROJECT_SLUG);
  const saleRef = doc(projectRef, "sales", sale.id);
  const installmentRef = doc(saleRef, "installments", input.installmentId);
  const activityRef = doc(collection(projectRef, "adminActivity"));
  const batch = writeBatch(db);

  batch.set(
    installmentRef,
    {
      amount: input.amount,
      status: "paid",
      paidAt: input.paidAt,
      paymentMethod: normalizeBlank(input.paymentMethod),
      note: normalizeBlank(input.note),
      updatedAt: serverTimestamp(),
      updatedBy: userEmail ?? null
    },
    { merge: true }
  );

  const nextInstallments = installments.map((installment) =>
    installment.id === input.installmentId
      ? {
          ...installment,
          amount: input.amount,
          status: "paid" as InstallmentStatus,
          paidAt: input.paidAt,
          paymentMethod: normalizeBlank(input.paymentMethod),
          note: normalizeBlank(input.note)
        }
      : installment
  );

  const nextDue = resolveNextDueInstallment(nextInstallments);
  const hasPendingInstallments = nextInstallments.some((installment) => getEffectiveInstallmentStatus(installment) !== "paid");

  batch.set(
    saleRef,
    {
      nextDueDate: nextDue?.dueDate ?? null,
      nextPaymentAmount: nextDue?.amount ?? null,
      paymentStatus: nextDue ? getEffectiveInstallmentStatus(nextDue) : "paid",
      status: hasPendingInstallments ? "active" : "completed",
      updatedAt: serverTimestamp(),
      updatedBy: userEmail ?? null
    },
    { merge: true }
  );

  batch.set(activityRef, {
    action: "register-payment",
    projectSlug: PROJECT_SLUG,
    saleId: sale.id,
    installmentId: input.installmentId,
    lotId: sale.lotId,
    userEmail: userEmail ?? null,
    createdAt: serverTimestamp()
  });

  await batch.commit();
}

function createInstallments(
  batch: ReturnType<typeof writeBatch>,
  saleRef: DocumentReference,
  clientId: string,
  lotId: string,
  firstDueDate: string,
  installments: number | null,
  amount: number | null
) {
  if (!installments || !amount || !firstDueDate) {
    return;
  }

  const installmentsRef = collection(saleRef, "installments");

  for (let index = 0; index < installments; index += 1) {
    const installmentRef = doc(installmentsRef);
    const dueDate = addMonthsToIsoDate(firstDueDate, index);

    batch.set(installmentRef, {
      saleId: saleRef.id,
      lotId,
      clientId,
      number: index + 1,
      dueDate,
      amount,
      status: "pending",
      paidAt: null,
      paymentMethod: null,
      note: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

function normalizeSale(id: string, rawData: FirestoreRecord): SaleOperationRecord {
  return {
    id,
    clientId: normalizeString(rawData.clientId) ?? "",
    clientName: normalizeString(rawData.clientName) ?? "Cliente sin nombre",
    clientNationalId: normalizeString(rawData.clientNationalId),
    clientPhone: normalizeString(rawData.clientPhone),
    clientEmail: normalizeString(rawData.clientEmail),
    lotId: normalizeString(rawData.lotId) ?? "",
    lotLabel: normalizeString(rawData.lotLabel) ?? "Lote sin asignar",
    operationType: normalizeOperationType(rawData.operationType),
    status: normalizeStatus(rawData.status),
    lotStatus: normalizeLotStatus(rawData.lotStatus),
    currency: normalizeCurrency(rawData.currency),
    price: normalizeNumber(rawData.price),
    deliveryPercent: normalizeNumber(rawData.deliveryPercent),
    installments: normalizeNumber(rawData.installments),
    startDate: normalizeString(rawData.startDate),
    firstDueDate: normalizeString(rawData.firstDueDate),
    nextDueDate: normalizeString(rawData.nextDueDate),
    nextPaymentAmount: normalizeNumber(rawData.nextPaymentAmount),
    paymentStatus: normalizePaymentStatus(rawData.paymentStatus),
    notes: normalizeString(rawData.notes),
    contractUrl: normalizeString(rawData.contractUrl),
    createdAtMs: normalizeTimestamp(rawData.createdAt)
  };
}

function normalizeInstallment(id: string, rawData: FirestoreRecord): InstallmentRecord {
  return {
    id,
    saleId: normalizeString(rawData.saleId) ?? "",
    lotId: normalizeString(rawData.lotId) ?? "",
    clientId: normalizeString(rawData.clientId) ?? "",
    number: normalizeNumber(rawData.number) ?? 0,
    dueDate: normalizeString(rawData.dueDate) ?? "",
    amount: normalizeNumber(rawData.amount) ?? 0,
    status: normalizeInstallmentStatus(rawData.status),
    paidAt: normalizeString(rawData.paidAt),
    paymentMethod: normalizeString(rawData.paymentMethod),
    note: normalizeString(rawData.note)
  };
}

function buildLotLabel(lot: LotData) {
  const manzana = lot.manzana?.trim() || "?";
  const lotNumber = lot.lotNumber?.trim() || "--";
  return `Lote ${manzana}-${lotNumber}`;
}

function calculateInstallmentAmount(price: number, deliveryPercent: number | null, installments: number | null) {
  if (!installments || installments <= 0) {
    return null;
  }

  const financedAmount = price * (1 - (deliveryPercent ?? 0) / 100);
  return Number((financedAmount / installments).toFixed(2));
}

function addMonthsToIsoDate(baseDate: string, offset: number) {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 10);
}

function normalizeBlank(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeOperationType(value: unknown): OperationType {
  return value === "reserve" ? "reserve" : "sale";
}

function normalizeStatus(value: unknown): SaleOperationRecord["status"] {
  if (value === "completed" || value === "cancelled") {
    return value;
  }

  return "active";
}

function normalizeLotStatus(value: unknown): SaleOperationRecord["lotStatus"] {
  return value === "reserved" ? "reserved" : "sold";
}

function normalizeCurrency(value: unknown): SaleOperationRecord["currency"] {
  return value === "USD" || value === "PYG" ? value : null;
}

function normalizePaymentStatus(value: unknown): SaleOperationRecord["paymentStatus"] {
  if (value === "paid" || value === "overdue") {
    return value;
  }

  return value === "pending" ? "pending" : null;
}

function normalizeInstallmentStatus(value: unknown): InstallmentStatus {
  if (value === "paid" || value === "overdue") {
    return value;
  }

  return "pending";
}

function normalizeTimestamp(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return null;
}

export function getEffectiveInstallmentStatus(installment: InstallmentRecord): InstallmentStatus {
  if (installment.status === "paid") {
    return "paid";
  }

  const today = new Date().toISOString().slice(0, 10);
  return installment.dueDate && installment.dueDate < today ? "overdue" : installment.status;
}

export function resolveNextDueInstallment(installments: InstallmentRecord[]) {
  return [...installments]
    .filter((installment) => getEffectiveInstallmentStatus(installment) !== "paid")
    .sort((left, right) => {
      if (left.dueDate !== right.dueDate) {
        return left.dueDate.localeCompare(right.dueDate);
      }

      return left.number - right.number;
    })[0] ?? null;
}
