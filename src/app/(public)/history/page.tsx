"use client";
import { useQuery } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  registered: "bg-blue-500/20 text-blue-300",
  confirmed:  "bg-yellow-500/20 text-yellow-300",
  checked_in: "bg-orange-500/20 text-orange-300",
  donated:    "bg-green-500/20 text-green-300",
  deferred:   "bg-red-500/20 text-red-300",
  no_show:    "bg-gray-500/20 text-gray-400",
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
    <main className="min-h-screen flex items-center justify-center bg-[#070108]">
      <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading…</div>
    </main>
  );

  const attendees: any[] = data?.attendees ?? [];

  return (
    <main className="min-h-screen p-6 bg-[#070108]">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-[#fdf0ee]">Donation History</h1>
        {attendees.length === 0 ? (
          <p className="text-[rgba(253,240,238,0.55)]">No donation history yet.</p>
        ) : (
          <div className="space-y-4">
            {attendees.map((a: any) => (
              <div key={a.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[#fdf0ee]">{a.event?.name}</p>
                    <p className="text-sm text-[rgba(253,240,238,0.55)]">{a.event?.venue}</p>
                    <p className="text-xs text-[rgba(253,240,238,0.3)]">
                      {new Date(a.event?.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_BADGE[a.status] ?? ""}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </div>
                {a.status === "donated" && (
                  <Link href={`/certificate/${a.id}`}
                    className={cn(buttonVariants({ size: "sm" }), "bg-[#c8102e] hover:bg-[#ff2442]")}>
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
