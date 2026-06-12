"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { checkInAction, markDonatedAction, markDeferredAction, markNoShowAction, addDonorToEventAction } from "./actions";
import { useToast } from "@/components/admin/ToastProvider";

const STATUS_STYLES: Record<string, string> = {
  registered: "bg-blue-50 text-blue-600 border border-blue-200",
  confirmed:  "bg-yellow-50 text-yellow-600 border border-yellow-200",
  checked_in: "bg-orange-50 text-orange-600 border border-orange-200",
  donated:    "bg-green-50 text-green-600 border border-green-200",
  deferred:   "bg-red-50 text-red-600 border border-red-200",
  no_show:    "bg-gray-50 text-gray-500 border border-gray-200",
};

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

interface Donor {
  fullName: string;
  email: string;
  mobile: string;
  company: string | null;
  bloodGroup: string | null;
}

interface Attendee {
  id: string;
  status: string;
  bloodGroupAtEvent: string | null;
  donor?: Donor | null;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function AddDonorDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addDonorToEventAction(fd);
      if (res.error) setError(res.error);
      else { setOpen(false); toast("Donor added to event"); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-[#c8102e] hover:bg-[#a50d27] text-white">+ Add Donor</Button>
      } />
      <DialogContent className="bg-white border border-gray-100 text-gray-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Add Donor to Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-gray-700 text-sm">Email *</Label>
            <Input name="email" type="email" required placeholder="donor@example.com"
              className="border-gray-200 text-gray-900 placeholder:text-gray-300" />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-700 text-sm">Full Name *</Label>
            <Input name="fullName" required placeholder="Full name"
              className="border-gray-200 text-gray-900 placeholder:text-gray-300" />
            <p className="text-xs text-gray-400">Used only if creating a new donor record.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-gray-700 text-sm">Mobile *</Label>
            <Input name="mobile" required placeholder="+91 98765 43210"
              className="border-gray-200 text-gray-900 placeholder:text-gray-300" />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-700 text-sm">Blood Group</Label>
            <select name="bloodGroup"
              className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none">
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#a50d27] text-white">
            {isPending ? <><Spinner /> Adding…</> : "Add to Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PendingAction = `${"checkin" | "donated" | "deferred" | "noshow"}-${string}`;

export function AttendeesClient({ attendees }: { attendees: Attendee[] }) {
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const filtered = attendees.filter(a => {
    const q = search.toLowerCase();
    return (
      a.donor?.fullName?.toLowerCase().includes(q) ||
      a.donor?.email?.toLowerCase().includes(q) ||
      a.donor?.company?.toLowerCase().includes(q) ||
      a.status.includes(q)
    );
  });

  function run(
    key: PendingAction,
    action: (fd: FormData) => Promise<{ error?: string }>,
    attendeeId: string,
    successMsg: string,
    extraFields?: Record<string, string>,
  ) {
    setPending(key);
    const fd = new FormData();
    fd.set("attendeeId", attendeeId);
    if (extraFields) Object.entries(extraFields).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const res = await action(fd);
      setPending(null);
      if (res?.error) toast(res.error, false);
      else toast(successMsg);
    });
  }

  function ActionButtons({ a, size = "sm" }: { a: Attendee; size?: "sm" }) {
    const isCheckinPending  = pending === `checkin-${a.id}`;
    const isDonatedPending  = pending === `donated-${a.id}`;
    const isDeferredPending = pending === `deferred-${a.id}`;
    const isNoShowPending   = pending === `noshow-${a.id}`;
    const anyPending = pending !== null;

    return (
      <div className="flex gap-2 flex-wrap">
        {(a.status === "registered" || a.status === "confirmed") && (
          <Button size={size} disabled={anyPending}
            className="bg-[#c8102e] hover:bg-[#a50d27] text-white h-7 text-xs min-w-[76px]"
            onClick={() => run(`checkin-${a.id}`, checkInAction, a.id, `${a.donor?.fullName ?? "Donor"} checked in`)}>
            {isCheckinPending ? <><Spinner />&nbsp;Checking in…</> : "Check In"}
          </Button>
        )}
        {a.status === "checked_in" && (
          <Button size={size} disabled={anyPending}
            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs min-w-[100px]"
            onClick={() => run(`donated-${a.id}`, markDonatedAction, a.id, `${a.donor?.fullName ?? "Donor"} marked as donated 🎉`)}>
            {isDonatedPending ? <><Spinner />&nbsp;Saving…</> : "Mark Donated"}
          </Button>
        )}
        {!["donated", "deferred", "no_show"].includes(a.status) && (
          <>
            <Button size={size} variant="outline" disabled={anyPending}
              className="border-yellow-200 text-yellow-600 hover:bg-yellow-50 h-7 text-xs min-w-[52px]"
              onClick={() => run(`deferred-${a.id}`, markDeferredAction, a.id, `${a.donor?.fullName ?? "Donor"} deferred`)}>
              {isDeferredPending ? <><Spinner />&nbsp;…</> : "Defer"}
            </Button>
            <Button size={size} variant="outline" disabled={anyPending}
              className="border-gray-200 text-gray-400 hover:bg-gray-50 h-7 text-xs min-w-[68px]"
              onClick={() => run(`noshow-${a.id}`, markNoShowAction, a.id, `${a.donor?.fullName ?? "Donor"} marked no-show`)}>
              {isNoShowPending ? <><Spinner />&nbsp;…</> : "No-Show"}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Search by name, email, company or status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs border-gray-200 text-gray-900 placeholder:text-gray-300"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{filtered.length} of {attendees.length}</span>
          <AddDonorDialog />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["Name", "Email", "Company", "Blood Group", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-300">No attendees found</td></tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{a.donor?.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.donor?.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{a.donor?.company ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{a.bloodGroupAtEvent ?? a.donor?.bloodGroup ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize whitespace-nowrap ${STATUS_STYLES[a.status] ?? "bg-gray-50 text-gray-500"}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3"><ActionButtons a={a} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center py-8 text-gray-300">No attendees found</p>
        )}
        {filtered.map(a => (
          <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{a.donor?.fullName ?? "—"}</p>
                <p className="text-xs text-gray-400">{a.donor?.email}</p>
                <p className="text-xs text-gray-400">{a.donor?.company ?? ""} · {a.bloodGroupAtEvent ?? a.donor?.bloodGroup ?? "Blood group unknown"}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${STATUS_STYLES[a.status] ?? "bg-gray-50 text-gray-500"}`}>
                {a.status.replace("_", " ")}
              </span>
            </div>
            <ActionButtons a={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
