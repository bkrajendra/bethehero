"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["adminDonors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/donors");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const allDonors: any[] = data?.donors ?? [];
  const filtered = allDonors.filter((d: any) =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Donor Directory</h1>
        <span className="text-sm text-[rgba(253,240,238,0.3)]">{allDonors.length} total</span>
      </div>
      <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
        className="max-w-sm bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
      <div className="space-y-3">
        {filtered.map((d: any) => (
          <div key={d.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold text-[#fdf0ee]">{d.fullName}</p>
                <p className="text-sm text-[rgba(253,240,238,0.55)]">{d.email}</p>
                <p className="text-xs text-[rgba(253,240,238,0.3)]">{d.mobile} · {d.company ?? "No company"} · {d.bloodGroup ?? "Blood group unknown"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[rgba(253,240,238,0.3)]">{d.attendees?.length ?? 0} events</p>
              </div>
            </div>
            {d.attendees?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {d.attendees.map((a: any) => (
                  <span key={a.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(200,16,46,0.1)] text-[rgba(253,240,238,0.5)]">
                    {a.event?.name?.slice(0, 20)} — {a.status.replace("_"," ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
