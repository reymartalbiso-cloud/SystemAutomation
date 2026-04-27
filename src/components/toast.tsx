"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastContextValue = {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback<ToastContextValue["push"]>((t) => {
    const id = `t_${Math.random().toString(36).slice(2, 9)}`;
    setToasts((current) => [...current, { ...t, id }]);
    const ttl = t.kind === "error" ? 6000 : 4000;
    const timer = setTimeout(() => dismiss(id), ttl);
    timers.current.set(id, timer);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ kind: "success", title, description }),
      error: (title, description) => push({ kind: "error", title, description }),
      info: (title, description) => push({ kind: "info", title, description }),
    }),
    [push, dismiss]
  );

  // Snapshot timers for cleanup; capturing the current ref value avoids the
  // exhaustive-deps warning about ref.current changing before unmount.
  useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach((id) => clearTimeout(id));
      t.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: throw a descriptive error if Provider isn't mounted.
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const tone = {
    success: {
      icon: CheckCircle2,
      ring: "ring-emerald-200",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    error: {
      icon: TriangleAlert,
      ring: "ring-red-200",
      bg: "bg-red-50",
      iconColor: "text-red-600",
    },
    info: {
      icon: Info,
      ring: "ring-brand-200",
      bg: "bg-brand-50",
      iconColor: "text-brand-600",
    },
  }[toast.kind];
  const Icon = tone.icon;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl bg-white p-3 pr-2 shadow-lg ring-1 animate-slide-up",
        tone.ring
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 flex-none items-center justify-center rounded-lg",
          tone.bg
        )}
      >
        <Icon className={cn("h-4 w-4", tone.iconColor)} />
      </div>
      <div className="flex-1 pt-0.5">
        <div className="text-sm font-semibold text-slate-900">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-slate-600">{toast.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
