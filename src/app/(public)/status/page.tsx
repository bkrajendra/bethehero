"use client";
import { useQuery } from "@tanstack/react-query";
import { StatusTimeline } from "@/components/StatusTimeline";
import { DonationCelebration } from "@/components/DonationCelebration";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

async function fetchStatus() {
  const res = await fetch("/api/donor/status");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function StatusPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["donorStatus"],
    queryFn: fetchStatus,
    refetchInterval: 20_000,
  });

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070108]">
        <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading…</div>
      </main>
    );
  }

  if (error || !data?.attendee) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
        <div className="text-center space-y-4">
          <p className="text-[rgba(253,240,238,0.55)]">No active registration found.</p>
          <Link href="/register" className={cn(buttonVariants(), "bg-[#c8102e] hover:bg-[#ff2442]")}>
            Register Now
          </Link>
        </div>
      </main>
    );
  }

  const { attendee, event } = data;

  if (attendee.status === "donated") {
    return <DonationCelebration attendeeId={attendee.id} />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-[#fdf0ee]">Your Donation Status</h1>
          <p className="text-[rgba(253,240,238,0.55)] mt-1">{event.name}</p>
        </div>
        <StatusTimeline status={attendee.status} />
        <div className="text-sm text-[rgba(253,240,238,0.3)]">
          {event.venue} · {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <Link href="/history"
          className={cn(buttonVariants({ variant: "outline" }), "border-[rgba(200,16,46,0.3)] text-[#fdf0ee]")}>
          View donation history
        </Link>
      </div>
    </main>
  );
}
