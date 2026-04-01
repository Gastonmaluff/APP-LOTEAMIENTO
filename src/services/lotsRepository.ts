import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { EXPECTED_FIRESTORE_COLLECTIONS, PROJECT_NAME, PUBLIC_PROJECT_ROUTE } from "../config/project";
import { structuredLotsData } from "../data/structuredLotsData";
import { db } from "../firebase/client";
import type { FeatureType, LotData } from "../types/lots";

type FirestoreLotRecord = Record<string, unknown>;

function normalizeType(value: unknown): FeatureType {
  if (value === "area" || value === "road") {
    return value;
  }

  return "lote";
}

function normalizeStatus(value: unknown): LotData["status"] {
  if (value === "available" || value === "reserved" || value === "sold") {
    return value;
  }

  return null;
}

function normalizeCurrency(value: unknown): LotData["currency"] {
  if (value === "USD" || value === "PYG") {
    return value;
  }

  return null;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function normalizeNumberishField(value: unknown): number | string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return null;
}

function normalizeLot(id: string, rawData: FirestoreLotRecord): LotData {
  return {
    id,
    type: normalizeType(rawData.type),
    manzana: normalizeNullableString(rawData.manzana),
    lotNumber: normalizeNullableString(rawData.lotNumber),
    name: normalizeNullableString(rawData.name),
    area: normalizeNumberishField(rawData.area),
    price: normalizeNumberishField(rawData.price),
    currency: normalizeCurrency(rawData.currency),
    finalPrice: normalizeNumberishField(rawData.finalPrice),
    deliveryPercent: normalizeNullableNumber(rawData.deliveryPercent),
    installments: normalizeNullableNumber(rawData.installments),
    financingText: normalizeNullableString(rawData.financingText),
    status: normalizeStatus(rawData.status),
    description: normalizeNullableString(rawData.description),
    sourcePage: normalizeNullableNumber(rawData.sourcePage)
  };
}

function toSortableNumber(value?: string | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const numericValue = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : Number.MAX_SAFE_INTEGER;
}

export function sortLots(items: LotData[]) {
  const typeOrder: Record<FeatureType, number> = {
    lote: 0,
    area: 1,
    road: 2
  };

  return [...items].sort((left, right) => {
    const typeDiff = typeOrder[left.type] - typeOrder[right.type];
    if (typeDiff !== 0) {
      return typeDiff;
    }

    const manzanaDiff = toSortableNumber(left.manzana) - toSortableNumber(right.manzana);
    if (manzanaDiff !== 0) {
      return manzanaDiff;
    }

    const lotDiff = toSortableNumber(left.lotNumber) - toSortableNumber(right.lotNumber);
    if (lotDiff !== 0) {
      return lotDiff;
    }

    return left.id.localeCompare(right.id, "es");
  });
}

export function subscribeToProjectLots(
  projectSlug: string,
  onData: (lots: LotData[], isEmpty: boolean) => void,
  onError: (error: Error) => void
) {
  if (!db) {
    onData([], true);
    return () => undefined;
  }

  const lotsRef = collection(db, "projects", projectSlug, "lots");

  return onSnapshot(
    lotsRef,
    (snapshot) => {
      const nextLots = sortLots(
        snapshot.docs.map((documentSnapshot) => normalizeLot(documentSnapshot.id, documentSnapshot.data()))
      );
      onData(nextLots, snapshot.empty);
    },
    (error) => {
      onError(error);
    }
  );
}

function serializeLotForWrite(item: LotData) {
  return {
    id: item.id,
    type: item.type,
    manzana: item.manzana ?? null,
    lotNumber: item.lotNumber ?? null,
    name: item.name ?? null,
    area: item.area ?? null,
    price: item.price ?? null,
    currency: item.currency ?? null,
    finalPrice: item.finalPrice ?? null,
    deliveryPercent: item.deliveryPercent ?? null,
    installments: item.installments ?? null,
    financingText: item.financingText ?? null,
    status: item.status ?? null,
    description: item.description ?? null,
    sourcePage: item.sourcePage ?? null
  };
}

export async function seedProjectLots(projectSlug: string, userEmail?: string | null) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const projectRef = doc(db, "projects", projectSlug);
  const activityRef = doc(collection(projectRef, "adminActivity"));
  const batch = writeBatch(db);

  batch.set(
    projectRef,
    {
      slug: projectSlug,
      name: PROJECT_NAME,
      publicRoute: PUBLIC_PROJECT_ROUTE,
      expectedCollections: EXPECTED_FIRESTORE_COLLECTIONS,
      updatedAt: serverTimestamp(),
      seededAt: serverTimestamp(),
      seededBy: userEmail ?? null
    },
    { merge: true }
  );

  structuredLotsData.forEach((item) => {
    batch.set(
      doc(projectRef, "lots", item.id),
      {
        ...serializeLotForWrite(item),
        projectSlug,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail ?? null
      },
      { merge: true }
    );
  });

  batch.set(activityRef, {
    action: "seed",
    projectSlug,
    lotsCount: structuredLotsData.length,
    userEmail: userEmail ?? null,
    createdAt: serverTimestamp()
  });

  await batch.commit();

  return {
    lotsCount: structuredLotsData.length,
    projectSlug
  };
}

export async function updateProjectLot(projectSlug: string, item: LotData, userEmail?: string | null) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const projectRef = doc(db, "projects", projectSlug);
  const lotRef = doc(projectRef, "lots", item.id);
  const activityRef = doc(collection(projectRef, "adminActivity"));
  const batch = writeBatch(db);

  batch.set(
    lotRef,
    {
      ...serializeLotForWrite(item),
      projectSlug,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail ?? null
    },
    { merge: true }
  );

  batch.set(activityRef, {
    action: "update-lot",
    projectSlug,
    lotId: item.id,
    status: item.status ?? null,
    type: item.type,
    userEmail: userEmail ?? null,
    createdAt: serverTimestamp()
  });

  await batch.commit();
}
