"use client";
import { useQuery } from "@tanstack/react-query";
import { StatusTimeline } from "@/components/StatusTimeline";
import { DonationCelebration } from "@/components/DonationCelebration";
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
      <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="flex gap-1">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-[#dddddd] animate-pulse" style={{ animationDelay: `${i*150}ms` }} />)}
        </div>
      </main>
    );
  }

  if (error || !data?.attendee) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-[#6a6a6a]">No active registration found.</p>
          <Link href="/register"
            className="inline-flex items-center justify-center h-12 px-6 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg text-sm transition-colors">
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
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 space-y-8"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#222222]">Your Donation Status</h1>
            <p className="text-sm text-[#6a6a6a] mt-1">{event.name}</p>
          </div>

          <StatusTimeline status={attendee.status} />

          <div className="text-center text-xs text-[#929292] border-t border-[#ebebeb] pt-4">
            {event.venue} · {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
          </div>
        </div>

        <div className="text-center mt-4">
          <Link href="/history" className="text-sm text-[#c8102e] hover:underline font-medium">
            View donation history →
          </Link>
        </div>
      </div>
    </main>
  );
}
