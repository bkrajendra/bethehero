"use client";
import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";
import { Bell, Check } from "lucide-react";

type State = "loading" | "prompt" | "subscribing" | "subscribed" | "hidden";

export function PushSubscribeCard({ donorId }: { donorId: string }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    OneSignal.login(donorId).catch(() => {});
    // Give OneSignal time to finish init before reading subscription state
    const t = setTimeout(checkState, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donorId]);

  function checkState() {
    if (!("Notification" in window)) {
      setState("hidden");
      return;
    }
    if (Notification.permission === "denied") {
      setState("hidden");
      return;
    }
    try {
      if (Notification.permission === "granted" && OneSignal.User?.PushSubscription?.optedIn) {
        setState("hidden");
        return;
      }
    } catch {
      // OneSignal not ready; fall through to show prompt
    }
    setState("prompt");
  }

  async function handleSubscribe() {
    setState("subscribing");
    try {
      // Re-login in case init wasn't done when mount fired
      await OneSignal.login(donorId).catch(() => {});
      const granted = await OneSignal.Notifications.requestPermission();
      setState(granted ? "subscribed" : "hidden");
    } catch {
      setState("prompt");
    }
  }

  if (state === "loading" || state === "hidden") return null;

  if (state === "subscribed") {
    return (
      <div
        className="bg-white border border-[#dddddd] rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}
      >
        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
          <Check size={15} className="text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#222222]">Notifications enabled</p>
          <p className="text-xs text-[#6a6a6a]">We'll remind you the day before the event.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-[#dddddd] rounded-2xl p-5 space-y-4"
      style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#fff0f3] flex items-center justify-center shrink-0">
          <Bell size={16} className="text-[#c8102e]" />
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-[#222222] text-sm">Get event reminders</p>
          <p className="text-xs text-[#6a6a6a] leading-relaxed">
            Enable push notifications to receive a reminder the day before the blood drive.
          </p>
        </div>
      </div>
      <button
        onClick={handleSubscribe}
        disabled={state === "subscribing"}
        className="w-full h-10 bg-[#c8102e] hover:bg-[#a50d27] disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
      >
        {state === "subscribing" ? "Enabling…" : "Enable Notifications"}
      </button>
    </div>
  );
}
