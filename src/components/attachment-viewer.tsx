"use client";

import { Download, ExternalLink } from "lucide-react";
import { Modal } from "@/components/modal";
import { AttachmentIcon } from "@/components/attachment-uploader";
import { readableSize } from "@/lib/attachments";
import type { Attachment } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  attachments: Attachment[];
};

export function AttachmentViewer({ open, onClose, title, attachments }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Attachments"
      description={title}
      widthClass="max-w-2xl"
    >
      {attachments.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No attachments.
        </p>
      ) : (
        <ul className="space-y-3">
          {attachments.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5">
                <AttachmentIcon mime={a.type} />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-medium text-slate-900"
                    title={a.name}
                  >
                    {a.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {a.type} · {readableSize(a.size)}
                  </div>
                </div>
                <a
                  href={a.dataUrl}
                  download={a.name}
                  className="btn-ghost !px-2"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <a
                  href={a.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost !px-2"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="bg-slate-50 p-3">
                {a.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.dataUrl}
                    alt={a.name}
                    className="mx-auto max-h-72 rounded-lg object-contain"
                  />
                ) : a.type === "application/pdf" ? (
                  <iframe
                    src={a.dataUrl}
                    title={a.name}
                    className="h-72 w-full rounded-lg border border-slate-200 bg-white"
                  />
                ) : (
                  <p className="py-4 text-center text-xs text-slate-500">
                    Preview not available — use Download or Open.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
