"use client";

import { useRef, useState } from "react";
import { File as FileIcon, FileImage, ImagePlus, Loader2, Paperclip, X } from "lucide-react";
import { fileToAttachment, readableSize, validateFile } from "@/lib/attachments";
import { MAX_ATTACHMENTS_PER_ENTRY, MAX_ATTACHMENT_BYTES } from "@/lib/store";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/cn";
import type { Attachment } from "@/lib/types";

type Props = {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  disabled?: boolean;
};

export function AttachmentUploader({ attachments, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  async function handleFiles(files: FileList | File[]) {
    const room = MAX_ATTACHMENTS_PER_ENTRY - attachments.length;
    if (room <= 0) {
      toast.error(
        "Attachment limit reached",
        `Max ${MAX_ATTACHMENTS_PER_ENTRY} files per entry.`
      );
      return;
    }
    const list = Array.from(files).slice(0, room);
    const accepted: Attachment[] = [];
    setBusy(true);
    try {
      for (const f of list) {
        const err = validateFile(f);
        if (err) {
          toast.error("Skipped a file", err);
          continue;
        }
        try {
          accepted.push(await fileToAttachment(f));
        } catch {
          toast.error("Could not read file", f.name);
        }
      }
      if (accepted.length > 0) {
        onChange([...attachments, ...accepted]);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    onChange(attachments.filter((a) => a.id !== id));
  }

  const canAdd = attachments.length < MAX_ATTACHMENTS_PER_ENTRY;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          if (disabled || !canAdd) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled || !canAdd) return;
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-4 text-center text-xs transition-colors",
          dragOver
            ? "border-brand-400 bg-brand-50"
            : "border-slate-200 bg-slate-50",
          (disabled || !canAdd) && "opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
          disabled={disabled || !canAdd}
        />
        <div className="flex flex-col items-center gap-1.5 text-slate-500">
          <ImagePlus className="h-5 w-5 text-slate-400" />
          <div>
            <button
              type="button"
              className="font-semibold text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed disabled:text-slate-400"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || !canAdd || busy}
            >
              {busy ? "Reading…" : "Choose files"}
            </button>{" "}
            or drag &amp; drop
          </div>
          <div className="text-[11px] text-slate-400">
            PNG, JPEG, WEBP, GIF, or PDF · max {readableSize(MAX_ATTACHMENT_BYTES)} ·{" "}
            up to {MAX_ATTACHMENTS_PER_ENTRY} files ({attachments.length}/
            {MAX_ATTACHMENTS_PER_ENTRY} used)
          </div>
        </div>
      </div>

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
            >
              <AttachmentIcon mime={a.type} />
              <span className="flex-1 truncate text-slate-700" title={a.name}>
                {a.name}
              </span>
              <span className="flex-none text-[11px] tabular-nums text-slate-400">
                {readableSize(a.size)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  aria-label={`Remove ${a.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {busy && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing…
        </div>
      )}
    </div>
  );
}

export function AttachmentIcon({ mime }: { mime: string }) {
  const isImage = mime.startsWith("image/");
  return (
    <span
      className={cn(
        "flex h-6 w-6 flex-none items-center justify-center rounded-md ring-1",
        isImage
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-red-200"
      )}
    >
      {isImage ? <FileImage className="h-3.5 w-3.5" /> : <FileIcon className="h-3.5 w-3.5" />}
    </span>
  );
}

export function AttachmentChip({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
      title={`${count} attachment${count === 1 ? "" : "s"} — click to view`}
    >
      <Paperclip className="h-3 w-3" />
      {count}
    </button>
  );
}
