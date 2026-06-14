"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusTimeline } from "@/components/StatusTimeline";
import { DonationCelebration } from "@/components/DonationCelebration";
import { PushSubscribeCard } from "@/components/PushSubscribeCard";
import { UserRound, X, Maximize2 } from "lucide-react";
import Link from "next/link";

function QRThumbnail({ qrDataUrl }: { qrDataUrl: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="shrink-0 relative group rounded-lg border border-[#ebebeb] overflow-hidden focus:outline-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Badge QR code" width={100} height={100} className="block" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 size={18} className="text-[#222222] opacity-0 group-hover:opacity-70 transition-opacity" />
        </div>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}>
          <div className="relative bg-white rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-[#929292] hover:text-[#222222] transition-colors">
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Badge QR code" width={260} height={260} className="rounded-lg" />
            <p className="text-xs text-[#929292] text-center">Show this QR at the event entrance</p>
          </div>
        </div>
      )}
    </>
  );
}

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

  const { attendee, event, qrDataUrl } = data;

  if (attendee.status === "donated") {
    return <DonationCelebration attendeeId={attendee.id} />;
  }

  const bloodGroup = attendee.bloodGroupAtEvent ?? attendee.donor?.bloodGroup;

  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3">

        {/* Profile link */}
        <div className="flex justify-end">
          <Link href="/profile"
            className="inline-flex items-center gap-1.5 text-xs text-[#6a6a6a] hover:text-[#222222] transition-colors py-1">
            <UserRound size={13} />
            Edit profile
          </Link>
        </div>

        {/* Badge card */}
        <div className="bg-white border border-[#dddddd] rounded-2xl overflow-hidden"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>

          {/* Red header strip */}
          <div className="bg-[#c8102e] px-5 py-3 flex items-center justify-between">
            <span className="text-white font-bold text-sm tracking-wide">BeTheHero</span>
            {bloodGroup && (
              <span className="bg-white text-[#c8102e] font-bold text-sm px-2.5 py-0.5 rounded-full">
                {bloodGroup}
              </span>
            )}
          </div>

          {/* Donor info + QR */}
          <div className="px-5 py-5 flex items-center gap-5">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-bold text-[#222222] text-base leading-tight">{attendee.donor?.fullName}</p>
              {attendee.donor?.company && (
                <p className="text-xs text-[#6a6a6a] truncate">{attendee.donor.company}</p>
              )}
              <p className="text-[10px] text-[#929292] mt-2">{event.name}</p>
              <p className="text-[10px] text-[#929292]">{event.venue}</p>
            </div>

            {qrDataUrl && (
              <QRThumbnail qrDataUrl={qrDataUrl} />
            )}
          </div>

          <p className="text-center text-[10px] text-[#929292] pb-3">
            Tap QR to expand · Show at event entrance
          </p>
        </div>

        {/* Status card */}
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

        {(attendee.status === "registered" || attendee.status === "confirmed") && (
          <PushSubscribeCard donorId={attendee.donorId} />
        )}

        <div className="text-center">
          <Link href="/history" className="text-sm text-[#c8102e] hover:underline font-medium">
            View donation history →
          </Link>
        </div>
      </div>
    </main>
  );
}
