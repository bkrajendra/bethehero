"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface DonorAttendee {
  id: string;
  status: string;
  event?: { name: string } | null;
}

interface DonorEntry {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  company: string | null;
  bloodGroup: string | null;
  attendees?: DonorAttendee[];
}

const STATUS_STYLES: Record<string, string> = {
  registered: "bg-blue-50 text-blue-600",
  confirmed:  "bg-yellow-50 text-yellow-600",
  checked_in: "bg-orange-50 text-orange-600",
  donated:    "bg-green-50 text-green-600",
  deferred:   "bg-red-50 text-red-600",
  no_show:    "bg-gray-50 text-gray-500",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["adminDonors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/donors");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? res.statusText ?? "Failed to load donors");
      }
      return res.json();
    },
  });

  const allDonors: DonorEntry[] = data?.donors ?? [];
  const filtered = allDonors.filter((d: DonorEntry) =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    (d.company ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Donor Directory</h1>
        <p className="text-sm text-gray-400 mt-1">{allDonors.length} total donors</p>
      </div>

      <Input
        placeholder="Search by name, email or company…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm border-gray-200 text-gray-900 placeholder:text-gray-300"
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center py-10 text-gray-300">No donors found</p>
          )}
          {filtered.map((d: DonorEntry) => (
            <div key={d.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{d.fullName}</p>
                  <p className="text-sm text-gray-500">{d.email}</p>
                  <p className="text-xs text-gray-400">{d.mobile}{d.company ? ` · ${d.company}` : ""}{d.bloodGroup ? ` · ${d.bloodGroup}` : ""}</p>
                </div>
                <span className="text-xs text-gray-400">{d.attendees?.length ?? 0} event{(d.attendees?.length ?? 0) !== 1 ? "s" : ""}</span>
              </div>
              {(d.attendees?.length ?? 0) > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {d.attendees?.map((a: DonorAttendee) => (
                    <span key={a.id} className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[a.status] ?? "bg-gray-50 text-gray-500"}`}>
                      {a.event?.name?.slice(0, 20)} — {a.status.replace("_"," ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
