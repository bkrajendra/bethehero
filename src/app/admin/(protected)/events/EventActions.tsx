"use client";
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/admin/ToastProvider";
import { setActiveEventAction, activateEventAction, closeEventAction } from "./actions";

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function EventActions({
  eventId,
  status,
  isCurrentEvent,
}: {
  eventId: string;
  status: string;
  isCurrentEvent: boolean;
}) {
  const [pending, setPending] = useState<"setActive" | "activate" | "close" | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  function run(type: typeof pending, action: () => Promise<unknown>, successMsg: string) {
    setPending(type);
    startTransition(async () => {
      try {
        await action();
        toast(successMsg);
      } catch {
        toast("Action failed", false);
      } finally {
        setPending(null);
      }
    });
  }

  return (
    <div className="flex gap-2 flex-wrap shrink-0">
      {!isCurrentEvent && (
        <Button variant="outline" size="sm"
          disabled={pending !== null}
          className="border-gray-200 text-gray-600 hover:bg-gray-50 min-w-[100px]"
          onClick={() => run("setActive", () => setActiveEventAction(eventId), "Active event updated")}>
          {pending === "setActive" ? <><Spinner />&nbsp;Setting…</> : "Set as Active"}
        </Button>
      )}
      {status === "draft" && (
        <Button size="sm"
          disabled={pending !== null}
          className="bg-[#c8102e] hover:bg-[#a50d27] text-white min-w-[76px]"
          onClick={() => run("activate", () => activateEventAction(eventId), "Event activated")}>
          {pending === "activate" ? <><Spinner />&nbsp;Activating…</> : "Activate"}
        </Button>
      )}
      {status === "active" && (
        <Button variant="destructive" size="sm"
          disabled={pending !== null}
          className="min-w-[68px]"
          onClick={() => run("close", () => closeEventAction(eventId), "Event closed")}>
          {pending === "close" ? <><Spinner />&nbsp;Closing…</> : "Close"}
        </Button>
      )}
    </div>
  );
}
