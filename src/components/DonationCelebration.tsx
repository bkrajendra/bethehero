"use client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function DonationCelebration({ attendeeId }: { attendeeId: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="text-7xl">👑</div>
        <div>
          <h2 className="text-3xl font-bold text-[#fdf0ee]">You&apos;re a Hero!</h2>
          <p className="mt-2 text-[rgba(253,240,238,0.55)]">
            Thank you for donating blood. Your gift saves lives.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href={`/certificate/${attendeeId}`}
            className={cn(buttonVariants(), "bg-[#c8102e] hover:bg-[#ff2442]")}>
            Download Certificate
          </Link>
          <Link href={`/feedback/${attendeeId}`}
            className={cn(buttonVariants({ variant: "outline" }), "border-[rgba(200,16,46,0.3)] text-[#fdf0ee]")}>
            Share Feedback
          </Link>
        </div>
      </div>
    </main>
  );
}
