import type { UploadAttachment } from "@repo/api-client";

export async function toOpencodeUploadAttachment(
  file: File,
): Promise<UploadAttachment> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const startsWith = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  let mimeType = "application/octet-stream";
  let type: UploadAttachment["type"] = "file";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    mimeType = "image/png";
    type = "image";
  } else if (startsWith([0xff, 0xd8, 0xff])) {
    mimeType = "image/jpeg";
    type = "image";
  } else if (startsWith([0x47, 0x49, 0x46, 0x38])) {
    mimeType = "image/gif";
    type = "image";
  } else if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    mimeType = "image/webp";
    type = "image";
  } else if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) {
    mimeType = "application/pdf";
    type = "pdf";
  } else {
    try {
      const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(content)) {
        mimeType = "text/plain";
        type = "text";
      }
    } catch {
      // Other binary files are staged for the agent's tools.
    }
  }

  return {
    type,
    name: file.name,
    mimeType,
    sizeBytes: file.size,
    dataUrl: await fileToDataUrl(file),
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
