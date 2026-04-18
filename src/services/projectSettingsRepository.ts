import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { PROJECT_NAME, PUBLIC_PROJECT_ROUTE } from "../config/project";
import { db, storage } from "../firebase/client";
import type { MapAlignmentConfig, ProjectSettings } from "../types/project";
import { defaultMapAlignmentConfig } from "../types/project";

type FirestoreRecord = Record<string, unknown>;

export function subscribeToProjectSettings(
  projectSlug: string,
  onData: (settings: ProjectSettings, exists: boolean) => void,
  onError: (error: Error) => void
) {
  if (!db) {
    onData(buildDefaultProjectSettings(projectSlug), false);
    return () => undefined;
  }

  const projectRef = doc(db, "projects", projectSlug);

  return onSnapshot(
    projectRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(buildDefaultProjectSettings(projectSlug), false);
        return;
      }

      onData(normalizeProjectSettings(projectSlug, snapshot.data()), true);
    },
    (error) => onError(error)
  );
}

export async function saveProjectMapAlignment(
  projectSlug: string,
  alignment: MapAlignmentConfig,
  userEmail?: string | null
) {
  if (!db) {
    throw new Error("Firestore no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
  }

  const projectRef = doc(db, "projects", projectSlug);
  const activityRef = doc(projectRef, "adminActivity", `map-alignment-${Date.now()}`);
  const batch = writeBatch(db);

  batch.set(
    projectRef,
    {
      slug: projectSlug,
      name: PROJECT_NAME,
      publicRoute: PUBLIC_PROJECT_ROUTE,
      mapAlignment: serializeMapAlignment(alignment),
      updatedAt: serverTimestamp(),
      updatedBy: userEmail ?? null
    },
    { merge: true }
  );

  batch.set(activityRef, {
    action: "update-map-alignment",
    projectSlug,
    userEmail: userEmail ?? null,
    createdAt: serverTimestamp()
  });

  await batch.commit();
}

export async function uploadProjectAlignmentBackground(projectSlug: string, file: File) {
  if (!storage) {
    throw new Error("Firebase Storage no esta configurado.");
  }

  const extension = resolveFileExtension(file.name);
  const storagePath = `projects/${projectSlug}/map-alignment/background-${Date.now()}.${extension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg"
  });

  return {
    storagePath,
    url: await getDownloadURL(storageRef)
  };
}

export async function deleteProjectAlignmentBackground(storagePath?: string | null) {
  if (!storage || !storagePath) {
    return;
  }

  await deleteObject(ref(storage, storagePath));
}

export function buildDefaultProjectSettings(projectSlug: string): ProjectSettings {
  return {
    slug: projectSlug,
    name: PROJECT_NAME,
    publicRoute: PUBLIC_PROJECT_ROUTE,
    mapAlignment: defaultMapAlignmentConfig
  };
}

function normalizeProjectSettings(projectSlug: string, rawData: FirestoreRecord): ProjectSettings {
  return {
    slug: normalizeString(rawData.slug) ?? projectSlug,
    name: normalizeString(rawData.name) ?? PROJECT_NAME,
    publicRoute: normalizeString(rawData.publicRoute) ?? PUBLIC_PROJECT_ROUTE,
    mapAlignment: normalizeMapAlignment(rawData.mapAlignment)
  };
}

function normalizeMapAlignment(value: unknown): MapAlignmentConfig {
  if (!value || typeof value !== "object") {
    return defaultMapAlignmentConfig;
  }

  const rawData = value as FirestoreRecord;

  return {
    backgroundImage: normalizeString(rawData.backgroundImage),
    backgroundImageStoragePath: normalizeString(rawData.backgroundImageStoragePath),
    svgTransform: {
      x: normalizeNumber(rawData.svgTransform, "x", defaultMapAlignmentConfig.svgTransform.x),
      y: normalizeNumber(rawData.svgTransform, "y", defaultMapAlignmentConfig.svgTransform.y),
      scale: normalizeNumber(rawData.svgTransform, "scale", defaultMapAlignmentConfig.svgTransform.scale),
      rotation: normalizeNumber(rawData.svgTransform, "rotation", defaultMapAlignmentConfig.svgTransform.rotation),
      opacity: normalizeNumber(rawData.svgTransform, "opacity", defaultMapAlignmentConfig.svgTransform.opacity)
    },
    backgroundTransform: {
      x: normalizeNumber(rawData.backgroundTransform, "x", defaultMapAlignmentConfig.backgroundTransform.x),
      y: normalizeNumber(rawData.backgroundTransform, "y", defaultMapAlignmentConfig.backgroundTransform.y),
      scale: normalizeNumber(
        rawData.backgroundTransform,
        "scale",
        defaultMapAlignmentConfig.backgroundTransform.scale
      )
    },
    visual: {
      satelliteOpacity: normalizeNumber(
        rawData.visual,
        "satelliteOpacity",
        defaultMapAlignmentConfig.visual.satelliteOpacity
      ),
      overlayColor:
        normalizeStringFromObject(rawData.visual, "overlayColor") ?? defaultMapAlignmentConfig.visual.overlayColor,
      overlayOpacity: normalizeNumber(rawData.visual, "overlayOpacity", defaultMapAlignmentConfig.visual.overlayOpacity),
      blurPx: normalizeNumber(rawData.visual, "blurPx", defaultMapAlignmentConfig.visual.blurPx)
    },
    pointAlignment: {
      svgPoints: normalizePointArray(rawData.pointAlignment, "svgPoints"),
      backgroundPoints: normalizePointArray(rawData.pointAlignment, "backgroundPoints")
    }
  };
}

function normalizePointArray(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const points = (value as Record<string, unknown>)[key];
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const point = item as Record<string, unknown>;
      const x = typeof point.x === "number" && Number.isFinite(point.x) ? point.x : null;
      const y = typeof point.y === "number" && Number.isFinite(point.y) ? point.y : null;

      return x !== null && y !== null ? { x, y } : null;
    })
    .filter(Boolean) as Array<{ x: number; y: number }>;
}

function normalizeNumber(value: unknown, key: string, fallback: number) {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const result = (value as Record<string, unknown>)[key];
  return typeof result === "number" && Number.isFinite(result) ? result : fallback;
}

function normalizeStringFromObject(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return normalizeString((value as Record<string, unknown>)[key]);
}

function serializeMapAlignment(alignment: MapAlignmentConfig) {
  return {
    backgroundImage: alignment.backgroundImage ?? null,
    backgroundImageStoragePath: alignment.backgroundImageStoragePath ?? null,
    svgTransform: {
      x: alignment.svgTransform.x,
      y: alignment.svgTransform.y,
      scale: alignment.svgTransform.scale,
      rotation: alignment.svgTransform.rotation,
      opacity: alignment.svgTransform.opacity
    },
    backgroundTransform: {
      x: alignment.backgroundTransform.x,
      y: alignment.backgroundTransform.y,
      scale: alignment.backgroundTransform.scale
    },
    visual: {
      satelliteOpacity: alignment.visual.satelliteOpacity,
      overlayColor: alignment.visual.overlayColor,
      overlayOpacity: alignment.visual.overlayOpacity,
      blurPx: alignment.visual.blurPx
    },
    pointAlignment: {
      svgPoints: alignment.pointAlignment.svgPoints,
      backgroundPoints: alignment.pointAlignment.backgroundPoints
    }
  };
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();

  if (!extension || extension.length > 8 || !/^[a-z0-9]+$/.test(extension)) {
    return "jpg";
  }

  return extension;
}
