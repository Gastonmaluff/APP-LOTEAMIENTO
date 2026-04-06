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
import { PROJECT_NAME, PUBLIC_PROJECT_ROUTE } from "../config/project";
import { db } from "../firebase/client";
import type { NewSaleInput, OperationType, SaleOperationRecord } from "../types/finance";
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

function normalizeTimestamp(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return null;
}
