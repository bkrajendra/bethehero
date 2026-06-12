"use client";
import { useEffect, useState } from "react";
import { generateQRDataURL } from "@/lib/qr/generate";
import Link from "next/link";

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
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 text-center space-y-6"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          <div>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-3xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-[#222222]">You&apos;re registered!</h2>
            <p className="text-[#6a6a6a] text-sm mt-2">
              Show this QR code at the venue to check in. A confirmation email is on its way.
            </p>
          </div>

          {qrDataUrl ? (
            <div className="mx-auto w-48 h-48 rounded-xl overflow-hidden border border-[#dddddd] p-2 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Your badge QR code" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="mx-auto w-48 h-48 rounded-xl border border-[#ebebeb] animate-pulse bg-[#f7f7f7]" />
          )}

          <div className="flex flex-col gap-3">
            {qrDataUrl && (
              <a href={qrDataUrl} download="bethehero-badge.png"
                className="inline-flex items-center justify-center h-12 border border-[#dddddd] hover:border-[#222222] text-[#222222] font-medium rounded-lg text-sm transition-colors">
                Save Badge
              </a>
            )}
            <Link href="/login"
              className="inline-flex items-center justify-center h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg text-sm transition-colors">
              Log in to track your status →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
