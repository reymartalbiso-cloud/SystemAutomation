"use client";

import type { Attachment } from "./types";
import { MAX_ATTACHMENT_BYTES } from "./store";

export const ALLOWED_MIME = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type FileValidationError = {
  fileName: string;
  reason: string;
};

export async function fileToAttachment(file: File): Promise<Attachment> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Read failed."));
    reader.readAsDataURL(file);
  });
  return {
    id: `a_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export function validateFile(file: File): string | null {
  if (!isAllowedMime(file.type)) {
    return `${file.name}: only PNG, JPEG, WEBP, GIF, or PDF files are allowed.`;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name}: file is ${readableSize(file.size)}; max is ${readableSize(MAX_ATTACHMENT_BYTES)}.`;
  }
  if (file.size === 0) {
    return `${file.name}: file is empty.`;
  }
  return null;
}
