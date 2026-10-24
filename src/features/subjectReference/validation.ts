export type SubjectReferenceCapability = {
  supported: boolean;
  aspect_ratios?: string[];
  status?: string;
  code?: string;
  message?: string;
  media_types: string[];
  max_bytes: number;
  max_width: number;
  max_height: number;
  max_pixels: number;
};
export type SubjectReferenceSelection = { file: File; width: number; height: number };
export type SubjectReferenceState = { selection: SubjectReferenceSelection | null; pending: boolean; error: string };
export const emptySubjectReference: SubjectReferenceState = { selection: null, pending: false, error: "" };

export function canSelectSubjectReference(capability?: SubjectReferenceCapability): boolean {
  return capability?.supported === true && Array.isArray(capability.media_types) &&
    capability.media_types.length > 0 && [capability.max_bytes, capability.max_width, capability.max_height, capability.max_pixels].every(n => Number.isSafeInteger(n) && n > 0);
}

async function imageDimensions(file: File) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    try { return { width: bitmap.width, height: bitmap.height }; } finally { bitmap.close(); }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Could not decode the image."));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}
export async function validateSubjectReference(file: File, capability: SubjectReferenceCapability): Promise<SubjectReferenceSelection> {
  if (!canSelectSubjectReference(capability)) throw new Error("Subject Reference is unavailable until its provider role is verified.");
  if (!capability.media_types.includes(file.type) || !["image/png", "image/jpeg"].includes(file.type)) throw new Error("Choose a PNG or JPEG image.");
  if (!file.size || file.size > capability.max_bytes) throw new Error(`Choose a non-empty image no larger than ${capability.max_bytes / 1048576} MiB.`);
  let dimensions: { width: number; height: number };
  try { dimensions = await imageDimensions(file); } catch { throw new Error("This image could not be decoded. Choose a valid PNG or JPEG."); }
  const { width, height } = dimensions;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > capability.max_width || height > capability.max_height || width * height > capability.max_pixels) {
    throw new Error(`Image dimensions must be at most ${capability.max_width} by ${capability.max_height} pixels and ${capability.max_pixels.toLocaleString()} pixels total.`);
  }
  return { file, width, height };
}
