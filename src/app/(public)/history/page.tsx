"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  registered: "bg-blue-50 text-blue-700 border border-blue-100",
  confirmed:  "bg-yellow-50 text-yellow-700 border border-yellow-100",
  checked_in: "bg-orange-50 text-orange-700 border border-orange-100",
  donated:    "bg-green-50 text-green-700 border border-green-100",
  deferred:   "bg-red-50 text-red-700 border border-red-100",
  no_show:    "bg-gray-50 text-gray-500 border border-gray-200",
};

export default function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["donorHistory"],
    queryFn: async () => {
      const res = await fetch("/api/donor/history");
      if (!res.ok) throw new Error("Unauthorized");
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

  const attendees: any[] = data?.attendees ?? [];

  return (
    <main className="min-h-screen bg-[#f7f7f7] py-12 px-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/status" className="text-sm text-[#6a6a6a] hover:text-[#222222]">← Back</Link>
          <h1 className="text-2xl font-bold text-[#222222]">Donation History</h1>
        </div>

        {attendees.length === 0 ? (
          <div className="bg-white border border-[#dddddd] rounded-2xl p-8 text-center">
            <p className="text-[#6a6a6a]">No donation history yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendees.map((a: any) => (
              <div key={a.id} className="bg-white border border-[#dddddd] rounded-xl p-5 space-y-3"
                style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[#222222]">{a.event?.name}</p>
                    <p className="text-sm text-[#6a6a6a]">{a.event?.venue}</p>
                    <p className="text-xs text-[#929292] mt-0.5">
                      {new Date(a.event?.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[a.status] ?? "bg-gray-50 text-gray-500"}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </div>
                {a.status === "donated" && (
                  <Link href={`/certificate/${a.id}`}
                    className="inline-flex items-center justify-center h-9 px-4 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg text-xs transition-colors">
                    Download Certificate
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
