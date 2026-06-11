"use client";
import { useEffect } from "react";
import OneSignal from "react-onesignal";

interface Props {
  /** Pass donorId to link this browser's push subscription to the donor. */
  userId?: string;
}

export function OneSignalInit({ userId }: Props) {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    OneSignal.init({
      appId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notifyButton: { enable: false } as any,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    }).then(() => {
      if (userId) {
        OneSignal.login(userId).catch(console.error);
      }
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
