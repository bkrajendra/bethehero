"use client";
import Link from "next/link";

export function DonationCelebration({ attendeeId }: { attendeeId: string }) {
  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 text-center space-y-6"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 text-4xl">🦸</div>
          <div>
            <h2 className="text-2xl font-bold text-[#222222]">You&apos;re a Hero!</h2>
            <p className="mt-2 text-[#6a6a6a] text-sm leading-relaxed">
              Thank you for donating blood. Your gift can save up to three lives.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href={`/certificate/${attendeeId}`}
              className="inline-flex items-center justify-center h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg text-sm transition-colors">
              Download Certificate
            </Link>
            <Link href={`/feedback/${attendeeId}`}
              className="inline-flex items-center justify-center h-12 border border-[#dddddd] hover:border-[#222222] text-[#222222] font-medium rounded-lg text-sm transition-colors">
              Share Feedback
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
