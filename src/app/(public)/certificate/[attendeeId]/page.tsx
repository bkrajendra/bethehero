"use client";
import { useQuery } from "@tanstack/react-query";
import { CertificateDownloadButton } from "./CertificatePDF";
import { useParams } from "next/navigation";

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
    <main className="min-h-screen flex items-center justify-center bg-[#070108]">
      <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading certificate…</div>
    </main>
  );

  if (error) return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <p className="text-[#ff2442]">Certificate not available. Make sure you are logged in and have donated.</p>
    </main>
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#fdf0ee]">Your Certificate</h1>
          <p className="text-[rgba(253,240,238,0.55)] mt-1">Certificate #{data.attendee.certificateNumber}</p>
        </div>
        <CertificateDownloadButton data={data} />
      </div>
    </main>
  );
}
