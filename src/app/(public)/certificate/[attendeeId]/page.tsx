"use client";
import { useQuery } from "@tanstack/react-query";
import { CertificateDownloadButton } from "./CertificatePDF";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CertificatePage() {
  const { attendeeId } = useParams<{ attendeeId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["certificate", attendeeId],
    queryFn: async () => {
      const res = await fetch(`/api/donor/certificate/${attendeeId}`);
      if (!res.ok) throw new Error("Certificate not available");
      return res.json();
    },
  });

  if (isLoading) return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
      <div className="flex gap-1">
        {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-[#dddddd] animate-pulse" style={{ animationDelay: `${i*150}ms` }} />)}
      </div>
    </main>
  );

  if (error) return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <p className="text-[#c13515] text-sm">Certificate not available. Make sure you are logged in and have donated.</p>
        <Link href="/login" className="text-sm text-[#c8102e] hover:underline">Log in →</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 text-center space-y-6"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-3xl">🏅</div>
          <div>
            <h1 className="text-xl font-bold text-[#222222]">Your Certificate</h1>
            <p className="text-xs text-[#929292] mt-1 font-mono">#{data.attendee.certificateNumber}</p>
          </div>
          <CertificateDownloadButton data={data} />
          <Link href="/status" className="block text-sm text-[#6a6a6a] hover:text-[#222222] transition-colors">
            ← Back to status
          </Link>
        </div>
      </div>
    </main>
  );
}
