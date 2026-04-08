import {
  collection,
  doc,
  type DocumentReference,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { PROJECT_NAME, PROJECT_SLUG, PUBLIC_PROJECT_ROUTE } from "../config/project";
import { db } from "../firebase/client";
import type {
  ClientDocumentKind,
  ClientDocumentRecord,
  ClientRecord,
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

export function subscribeToProjectClients(
  projectSlug: string,
  onData: (clients: ClientRecord[]) => void,
  onError: (error: Error) => void
) {
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const clientsRef = collection(db, "projects", projectSlug, "clients");
  const clientsQuery = query(clientsRef, orderBy("fullName", "asc"));

  return onSnapshot(
    clientsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((docSnapshot) => normalizeClient(docSnapshot.id, docSnapshot.data())));
    },
    (error) => onError(error)
  );
}

export function subscribeToClientDocuments(
  projectSlug: string,
  clientId: string,
  onData: (documents: ClientDocumentRecord[]) => void,
  onError: (error: Error) => void
) {
  if (!db) {
    onData([]);
    return () => undefined;
  }

  const documentsRef = collection(db, "projects", projectSlug, "clients", clientId, "documents");
  const documentsQuery = query(documentsRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    documentsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((docSnapshot) => normalizeClientDocument(docSnapshot.id, docSnapshot.data())));
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
  const saleRef = doc(salesRef);
  const clientRef = doc(clientsRef, resolveClientDocumentId(input.client.nationalId, input.client.fullName));
  const coreBatch = writeBatch(db);

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
    createdAt: serverTimestamp(),
    createdBy: userEmail ?? null
  };

  coreBatch.set(clientRef, clientPayload, { merge: true });

  const lotLabel = buildLotLabel(lot);
  const lotStatus = input.operationType === "reserve" ? "reserved" : "sold";
  const nextPaymentAmount = calculateInstallmentAmount(
    input.commercial.price,
    input.commercial.deliveryPercent,
    input.commercial.installments
  );

  console.log("[Finance] Registrando operacion:", {
    projectSlug,
    lotId: lot.id,
    lotLabel,
    lotStatusBefore: lot.status ?? null,
    lotStatusAfter: lotStatus,
    operationType: input.operationType,
    clientNationalId: normalizeBlank(input.client.nationalId),
    price: input.commercial.price,
    currency: input.commercial.currency
  });

  coreBatch.set(
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

  coreBatch.set(
    lotRef,
    {
      id: lot.id,
      type: lot.type,
      manzana: lot.manzana ?? null,
      lotNumber: lot.lotNumber ?? null,
      name: lot.name ?? null,
      area: lot.area ?? null,
      finalPrice: lot.finalPrice ?? null,
      financingText: lot.financingText ?? null,
      photo1Url: lot.photo1Url ?? null,
      photo2Url: lot.photo2Url ?? null,
      dimensions: lot.dimensions ?? null,
      description: lot.description ?? null,
      sourcePage: lot.sourcePage ?? null,
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

  coreBatch.set(activityRef, {
    action: input.operationType === "reserve" ? "create-reserve" : "create-sale",
    projectSlug,
    lotId: lot.id,
    saleId: saleRef.id,
    clientId: clientRef.id,
    userEmail: userEmail ?? null,
    createdAt: serverTimestamp()
  });

  await coreBatch.commit();

  console.log("[Finance] Venta principal guardada:", {
    saleId: saleRef.id,
    clientId: clientRef.id,
    lotId: lot.id,
    persistedLotStatus: lotStatus
  });

  await createInstallmentsInChunks({
    saleRef,
    clientId: clientRef.id,
    lotId: lot.id,
    firstDueDate: input.commercial.firstDueDate,
    installments: input.commercial.installments,
    amount: nextPaymentAmount
  });

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

export async function updateProjectClient(
  projectSlug: string,
  clientId: string,
  input: {
    fullName: string;
    nationalId: string;
    phone: string;
    email: string;
    notes: string;
  },
  userEmail?: string | null
) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const clientRef = doc(db, "projects", projectSlug, "clients", clientId);

  await writeBatch(db)
    .set(
      clientRef,
      {
        fullName: input.fullName.trim(),
        nationalId: normalizeBlank(input.nationalId),
        phone: normalizeBlank(input.phone),
        email: normalizeBlank(input.email),
        notes: normalizeBlank(input.notes),
        updatedAt: serverTimestamp(),
        updatedBy: userEmail ?? null
      },
      { merge: true }
    )
    .commit();
}

export async function createClientDocumentRecord(
  projectSlug: string,
  clientId: string,
  input: {
    kind: ClientDocumentKind;
    url: string;
    storagePath?: string | null;
    name?: string | null;
    saleId?: string | null;
    saleLabel?: string | null;
  },
  userEmail?: string | null
) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const projectRef = doc(db, "projects", projectSlug);
  const clientRef = doc(projectRef, "clients", clientId);
  const documentRef = doc(collection(clientRef, "documents"));
  const batch = writeBatch(db);

  batch.set(documentRef, {
    clientId,
    kind: input.kind,
    url: input.url,
    storagePath: input.storagePath ?? null,
    name: input.name ?? null,
    saleId: input.saleId ?? null,
    saleLabel: input.saleLabel ?? null,
    createdAt: serverTimestamp(),
    createdBy: userEmail ?? null
  });

  if (input.kind === "client-front" || input.kind === "client-back") {
    batch.set(
      clientRef,
      input.kind === "client-front"
        ? {
            documentFrontUrl: input.url,
            documentFrontPath: input.storagePath ?? null,
            updatedAt: serverTimestamp(),
            updatedBy: userEmail ?? null
          }
        : {
            documentBackUrl: input.url,
            documentBackPath: input.storagePath ?? null,
            updatedAt: serverTimestamp(),
            updatedBy: userEmail ?? null
          },
      { merge: true }
    );
  }

  if (input.kind === "contract" && input.saleId) {
    batch.set(
      doc(projectRef, "sales", input.saleId),
      {
        contractUrl: input.url,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail ?? null
      },
      { merge: true }
    );
  }

  await batch.commit();
  return documentRef.id;
}

export async function deleteClientDocumentRecord(
  projectSlug: string,
  clientId: string,
  input: {
    documentId?: string | null;
    kind: ClientDocumentKind;
    saleId?: string | null;
  },
  userEmail?: string | null
) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const projectRef = doc(db, "projects", projectSlug);
  const clientRef = doc(projectRef, "clients", clientId);
  const batch = writeBatch(db);

  if (input.documentId) {
    batch.delete(doc(clientRef, "documents", input.documentId));
  }

  if (input.kind === "client-front") {
    batch.set(
      clientRef,
      {
        documentFrontUrl: null,
        documentFrontPath: null,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail ?? null
      },
      { merge: true }
    );
  }

  if (input.kind === "client-back") {
    batch.set(
      clientRef,
      {
        documentBackUrl: null,
        documentBackPath: null,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail ?? null
      },
      { merge: true }
    );
  }

  if (input.kind === "contract" && input.saleId) {
    batch.set(
      doc(projectRef, "sales", input.saleId),
      {
        contractUrl: null,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail ?? null
      },
      { merge: true }
    );
  }

  await batch.commit();
}

async function createInstallmentsInChunks({
  saleRef,
  clientId,
  lotId,
  firstDueDate,
  installments,
  amount
}: {
  saleRef: DocumentReference;
  clientId: string;
  lotId: string;
  firstDueDate: string;
  installments: number | null;
  amount: number | null;
}) {
  if (!db || !installments || !amount || !firstDueDate) {
    return;
  }

  const chunkSize = 40;
  const installmentsRef = collection(saleRef, "installments");

  for (let chunkStart = 0; chunkStart < installments; chunkStart += chunkSize) {
    const batch = writeBatch(db);
    const chunkEnd = Math.min(chunkStart + chunkSize, installments);

    for (let index = chunkStart; index < chunkEnd; index += 1) {
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

    await batch.commit();
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

function normalizeClient(id: string, rawData: FirestoreRecord): ClientRecord {
  return {
    id,
    fullName: normalizeString(rawData.fullName) ?? "Cliente sin nombre",
    nationalId: normalizeString(rawData.nationalId),
    phone: normalizeString(rawData.phone),
    email: normalizeString(rawData.email),
    notes: normalizeString(rawData.notes),
    documentFrontUrl: normalizeString(rawData.documentFrontUrl),
    documentFrontPath: normalizeString(rawData.documentFrontPath),
    documentBackUrl: normalizeString(rawData.documentBackUrl),
    documentBackPath: normalizeString(rawData.documentBackPath)
  };
}

function normalizeClientDocument(id: string, rawData: FirestoreRecord): ClientDocumentRecord {
  return {
    id,
    clientId: normalizeString(rawData.clientId) ?? "",
    kind: normalizeClientDocumentKind(rawData.kind),
    name: normalizeString(rawData.name),
    url: normalizeString(rawData.url) ?? "",
    storagePath: normalizeString(rawData.storagePath),
    saleId: normalizeString(rawData.saleId),
    saleLabel: normalizeString(rawData.saleLabel),
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

function resolveClientDocumentId(nationalId: string, fullName: string) {
  const normalizedNationalId = nationalId.replace(/\D/g, "");
  if (normalizedNationalId) {
    return `ci-${normalizedNationalId}`;
  }

  const normalizedName = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedName ? `name-${normalizedName}` : `client-${Date.now()}`;
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

function normalizeClientDocumentKind(value: unknown): ClientDocumentKind {
  if (value === "client-front" || value === "client-back") {
    return value;
  }

  return "contract";
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
