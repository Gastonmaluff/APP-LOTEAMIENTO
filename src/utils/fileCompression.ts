export async function compressImageFile(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputType?: "image/jpeg" | "image/webp";
  } = {}
) {
  if (!file.type.startsWith("image/")) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressed: false
    };
  }

  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    outputType = "image/jpeg"
  } = options;

  const imageBitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(imageBitmap.width, imageBitmap.height, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    imageBitmap.close();
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressed: false
    };
  }

  context.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, quality);
  });

  if (!blob || blob.size >= file.size) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressed: false
    };
  }

  const nextExtension = outputType === "image/webp" ? "webp" : "jpg";
  const nextName = replaceExtension(file.name, nextExtension);
  const compressedFile = new File([blob], nextName, {
    type: outputType,
    lastModified: Date.now()
  });

  return {
    file: compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    compressed: true
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName}.${extension}`;
}

