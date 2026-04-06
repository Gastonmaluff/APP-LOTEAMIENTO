import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/client";

export type FinanceDocumentKind = "client-front" | "client-back" | "contract";

export async function uploadFinanceDocument(
  projectSlug: string,
  lotId: string,
  kind: FinanceDocumentKind,
  file: File
) {
  const asset = await uploadFinanceDocumentAsset(projectSlug, lotId, kind, file);
  return asset.url;
}

export async function uploadFinanceDocumentAsset(
  projectSlug: string,
  scopeId: string,
  kind: FinanceDocumentKind,
  file: File
) {
  if (!storage) {
    throw new Error("Firebase Storage no esta configurado.");
  }

  const extension = resolveFileExtension(file.name);
  const objectPath = `projects/${projectSlug}/finance/${scopeId}/${kind}-${Date.now()}.${extension}`;
  const documentRef = ref(storage, objectPath);

  await uploadBytes(documentRef, file, {
    contentType: file.type || "application/octet-stream"
  });

  return {
    url: await getDownloadURL(documentRef),
    storagePath: objectPath,
    name: file.name
  };
}

export async function deleteFinanceDocumentAsset(storagePath?: string | null, fileUrl?: string | null) {
  if (!storage || (!storagePath && !fileUrl)) {
    return;
  }

  const assetRef = ref(storage, storagePath ?? fileUrl ?? "");
  await deleteObject(assetRef);
}

function resolveFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();

  if (!extension || extension.length > 10 || !/^[a-z0-9]+$/.test(extension)) {
    return "bin";
  }

  return extension;
}
