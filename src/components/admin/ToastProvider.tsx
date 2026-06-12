"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface Toast { id: number; msg: string; ok: boolean }
interface ToastCtx { toast: (msg: string, ok?: boolean) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, ok = true) => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, ok }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium shadow-lg border flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 ${
              t.ok
                ? "bg-white border-green-200 text-green-700"
                : "bg-white border-red-200 text-[#c8102e]"
            }`}>
            <span>{t.ok ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
