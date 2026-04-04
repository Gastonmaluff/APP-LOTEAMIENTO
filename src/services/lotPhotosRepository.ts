import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/client";

export type LotPhotoSlot = "photo1Url" | "photo2Url";

export async function uploadProjectLotPhoto(projectSlug: string, lotId: string, slot: LotPhotoSlot, file: File) {
  if (!storage) {
    throw new Error("Firebase Storage no esta configurado.");
  }

  const extension = resolveFileExtension(file.name);
  const objectPath = `projects/${projectSlug}/lots/${lotId}/${slot}-${Date.now()}.${extension}`;
  const photoRef = ref(storage, objectPath);

  await uploadBytes(photoRef, file, {
    contentType: file.type || "image/jpeg"
  });

  return getDownloadURL(photoRef);
}

export async function deleteProjectLotPhoto(photoUrl?: string | null) {
  if (!photoUrl || !storage) {
    return;
  }

  await deleteObject(ref(storage, photoUrl));
}

function resolveFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();

  if (!extension || extension.length > 8 || !/^[a-z0-9]+$/.test(extension)) {
    return "jpg";
  }

  return extension;
}
