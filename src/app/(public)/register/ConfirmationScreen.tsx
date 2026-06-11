"use client";
import { useEffect, useState } from "react";
import { generateQRDataURL } from "@/lib/qr/generate";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  attendeeId: string;
  badgeToken: string;
  eventId: string;
}

export function ConfirmationScreen({ attendeeId, badgeToken }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    generateQRDataURL(badgeToken, process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin)
      .then(setQrDataUrl);
  }, [badgeToken]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl">🎉</div>
          <h2 className="text-3xl font-bold text-[#fdf0ee]">You&apos;re registered!</h2>
          <p className="text-[rgba(253,240,238,0.55)]">
            Show this QR code at the venue to check in. A confirmation email is on its way.
          </p>
        </div>

        {qrDataUrl ? (
          <div className="mx-auto w-52 h-52 rounded-xl overflow-hidden border border-[rgba(200,16,46,0.3)] p-2 bg-[#fdf0ee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Your badge QR code" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="mx-auto w-52 h-52 rounded-xl border border-[rgba(200,16,46,0.3)] animate-pulse bg-[rgba(200,16,46,0.1)]" />
        )}

        <div className="flex flex-col gap-3">
          {qrDataUrl && (
            <a href={qrDataUrl} download="bethehero-badge.png"
              className={cn(buttonVariants({ variant: "outline" }), "border-[#c8102e] text-[#fdf0ee]")}>
              Save Badge
            </a>
          )}
          <Link href="/login"
            className={cn(buttonVariants(), "bg-[#c8102e] hover:bg-[#ff2442]")}>
            Log in to track your status →
          </Link>
        </div>
      </div>
    </main>
  );
}
