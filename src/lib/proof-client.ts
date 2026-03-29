import type { ProofFileMeta } from "@/types";

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

const MAX_FILES = 5;
const MAX_BYTES = 8 * 1024 * 1024;

export async function filesToProofMeta(files: File[]): Promise<ProofFileMeta[]> {
  const slice = files.slice(0, MAX_FILES);
  const out: ProofFileMeta[] = [];
  for (const file of slice) {
    if (file.size > MAX_BYTES) continue;
    const buf = await file.arrayBuffer();
    const hash = await sha256(buf);
    const dims = await loadImageDimensions(file);
    out.push({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      sha256: hash,
      ...(dims ? { imageWidth: dims.width, imageHeight: dims.height } : {}),
    });
  }
  return out;
}

export { MAX_FILES, MAX_BYTES };
