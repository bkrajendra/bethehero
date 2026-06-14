"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/admin/ToastProvider";

interface DonorAttendee {
  id: string;
  status: string;
  event?: { id: string; name: string } | null;
}

interface DonorEntry {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  company: string | null;
  bloodGroup: string | null;
  dob: string | null;
  deletedAt: string | null;
  authUserId: string | null;
  createdAt: string;
  attendees?: DonorAttendee[];
}

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

const STATUS_STYLES: Record<string, string> = {
  registered: "bg-blue-50 text-blue-600 border-blue-200",
  confirmed:  "bg-yellow-50 text-yellow-600 border-yellow-200",
  checked_in: "bg-orange-50 text-orange-600 border-orange-200",
  donated:    "bg-green-50 text-green-600 border-green-200",
  deferred:   "bg-red-50 text-red-600 border-red-200",
  no_show:    "bg-gray-50 text-gray-500 border-gray-200",
};

async function donorPatch(body: object) {
  const res = await fetch("/api/admin/donors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Request failed"); }
  return res.json();
}

async function resendActivation(donorIds: string[]) {
  const res = await fetch("/api/admin/donors/resend-activation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donorIds }),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Request failed"); }
  return res.json();
}

// ── Edit Dialog ──────────────────────────────────────────────────────────────
function EditDonorDialog({ donor, onClose }: { donor: DonorEntry | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: donor?.fullName ?? "",
    mobile: donor?.mobile ?? "",
    company: donor?.company ?? "",
    bloodGroup: donor?.bloodGroup ?? "",
    dob: donor?.dob ?? "",
  });
  const [error, setError] = useState("");
  const mut = useMutation({
    mutationFn: (data: typeof form) => donorPatch({ action: "update", donorId: donor?.id, data }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminDonors"] }); onClose(); toast("Donor updated"); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open={!!donor} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-white border border-gray-100 text-gray-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Edit Donor</DialogTitle>
        </DialogHeader>
        {donor && (
          <>
            <p className="text-sm text-[#929292] -mt-2">{donor.email}</p>
            <div className="space-y-3">
              {([ ["Full Name","fullName","text"], ["Mobile","mobile","tel"], ["Company","company","text"], ["Date of Birth","dob","date"] ] as [string,string,string][]).map(([label,key,type]) => (
                <div key={key}>
                  <Label className="text-xs font-medium text-[#6a6a6a] block mb-1">{label}</Label>
                  <Input type={type} value={(form as Record<string,string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="border-[#dddddd] text-[#222222]" />
                </div>
              ))}
              <div>
                <Label className="text-xs font-medium text-[#6a6a6a] block mb-1">Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={(v) => setForm(f => ({ ...f, bloodGroup: v ?? "" }))}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Unknown" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unknown</SelectItem>
                    {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-xs text-[#c8102e]">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}
                className="flex-1 bg-[#c8102e] hover:bg-[#a50d27] text-white h-10">
                {mut.isPending ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1 border-[#dddddd] h-10">Cancel</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
type Tab = "active" | "unverified" | "deleted";

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editDonor, setEditDonor] = useState<DonorEntry | null>(null);
  const qc = useQueryClient();
  const { toast: showToast } = useToast();

  const { data: activeData,     isLoading: loadingActive }     = useQuery({ queryKey: ["adminDonors","active"],     queryFn: () => fetch("/api/admin/donors").then(r => r.json()) });
  const { data: unverifiedData, isLoading: loadingUnverified } = useQuery({ queryKey: ["adminDonors","unverified"], queryFn: () => fetch("/api/admin/donors?unverified=1").then(r => r.json()) });
  const { data: deletedData,    isLoading: loadingDeleted }    = useQuery({ queryKey: ["adminDonors","deleted"],    queryFn: () => fetch("/api/admin/donors?deleted=1").then(r => r.json()) });

  const donors: DonorEntry[] = tab === "active" ? (activeData?.donors ?? []) : tab === "unverified" ? (unverifiedData?.donors ?? []) : (deletedData?.donors ?? []);
  const isLoading = tab === "active" ? loadingActive : tab === "unverified" ? loadingUnverified : loadingDeleted;

  const filtered = useMemo(() => donors.filter(d =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    (d.company ?? "").toLowerCase().includes(search.toLowerCase())
  ), [donors, search]);

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll() { setSelected(new Set(filtered.map(d => d.id))); }
  function clearSelection() { setSelected(new Set()); }

  const mut = useMutation({
    mutationFn: donorPatch,
    onSuccess: (_, vars: Record<string,unknown>) => {
      qc.invalidateQueries({ queryKey: ["adminDonors"] });
      clearSelection();
      const action = vars.action as string;
      showToast(
        action === "soft_delete" ? "Donor(s) moved to Deleted" :
        action === "restore"     ? "Donor(s) restored" :
        action === "cleanup_all" ? "All deleted donors permanently removed" :
        action === "assign_event" ? "Donor added to active event" :
        action === "remove_event" ? "Donor removed from active event" : "Done"
      );
    },
    onError: (e: Error) => showToast(e.message, false),
  });

  const activationMut = useMutation({
    mutationFn: (ids: string[]) => resendActivation(ids),
    onSuccess: (data: { sent: number; failed: number }) => {
      qc.invalidateQueries({ queryKey: ["adminDonors","unverified"] });
      clearSelection();
      showToast(`Sent ${data.sent} activation email${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? `, ${data.failed} failed` : ""}`, data.failed === 0);
    },
    onError: (e: Error) => showToast(e.message, false),
  });

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "active",     label: "Active",              count: activeData?.donors?.length },
    { key: "unverified", label: "Pending Verification", count: unverifiedData?.donors?.length },
    { key: "deleted",    label: "Deleted",              count: deletedData?.donors?.length },
  ];

  return (
    <div className="space-y-6">
      <EditDonorDialog key={editDonor?.id ?? "none"} donor={editDonor} onClose={() => setEditDonor(null)} />

      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Donor Directory</h1>
          <p className="text-sm text-[#929292] mt-1">{donors.length} donors in this view</p>
        </div>
        {tab === "deleted" && (deletedData?.donors?.length ?? 0) > 0 && (
          <Button variant="destructive" size="sm"
            onClick={() => { if (confirm("Permanently delete ALL soft-deleted donors and their history?")) mut.mutate({ action: "cleanup_all" }); }}
            disabled={mut.isPending}>
            Cleanup All ({deletedData.donors.length})
          </Button>
        )}
        {tab === "unverified" && (unverifiedData?.donors?.length ?? 0) > 0 && (
          <Button size="sm" className="bg-[#c8102e] hover:bg-[#a50d27] text-white h-8 text-xs"
            onClick={() => { if (confirm(`Send activation emails to ALL ${unverifiedData.donors.length} unverified donors?`)) activationMut.mutate(unverifiedData.donors.map((d: DonorEntry) => d.id)); }}
            disabled={activationMut.isPending}>
            {activationMut.isPending ? "Sending…" : `Send All (${unverifiedData.donors.length})`}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelected(new Set()); setSearch(""); }}>
        <TabsList variant="line" className="w-full justify-start rounded-none bg-transparent h-auto p-0 border-b border-[#dddddd]">
          {TABS.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="rounded-none px-5 py-2.5 text-sm font-medium">
              {t.label}{(t.count ?? 0) > 0 ? ` (${t.count})` : ""}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search + bulk actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input placeholder="Search by name, email or company…" value={search} onChange={e => setSearch(e.target.value)}
          className="max-w-xs border-[#dddddd] text-[#222222] placeholder:text-[#c4c4c4]" />
        {filtered.length > 0 && (
          selected.size === 0 ?
            <button onClick={selectAll} className="text-xs text-[#929292] hover:text-[#222222] underline">Select all ({filtered.length})</button> :
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-[#929292]">{selected.size} selected</span>
              {tab === "active" && (
                <Button size="sm" variant="destructive"
                  onClick={() => { if (confirm(`Delete ${selected.size} donor(s)?`)) mut.mutate({ action: "soft_delete", donorIds: Array.from(selected) }); }}
                  disabled={mut.isPending}>Delete Selected</Button>
              )}
              {tab === "unverified" && (
                <Button size="sm" className="bg-[#c8102e] hover:bg-[#a50d27] text-white h-8 text-xs"
                  onClick={() => activationMut.mutate(Array.from(selected))}
                  disabled={activationMut.isPending}>
                  {activationMut.isPending ? "Sending…" : "Send Activation"}
                </Button>
              )}
              {tab === "deleted" && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  onClick={() => mut.mutate({ action: "restore", donorIds: Array.from(selected) })}
                  disabled={mut.isPending}>Restore Selected</Button>
              )}
              <button onClick={clearSelection} className="text-xs text-[#929292] hover:text-[#222222] underline">Clear</button>
            </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-[#f7f7f7] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-[#c4c4c4]">No donors found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const inActiveEvent = (d.attendees ?? []).some(a => a.event);
            const sel = selected.has(d.id);
            return (
              <div key={d.id}
                className={`bg-white border rounded-xl p-4 space-y-3 transition-all ${sel ? "border-[#c8102e] ring-1 ring-[#c8102e]/30" : "border-[#dddddd]"}`}
                style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px" }}>

                <div className="flex gap-3 items-start">
                  <input type="checkbox" checked={sel} onChange={() => toggleSelect(d.id)}
                    className="mt-1 accent-[#c8102e] w-4 h-4 shrink-0 cursor-pointer" />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#222222]">{d.fullName}</p>
                      {d.bloodGroup && <Badge variant="outline" className="text-[10px] bg-red-50 text-[#c8102e] border-red-100">{d.bloodGroup}</Badge>}
                      {inActiveEvent && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-100">In Active Event</Badge>}
                      {tab === "unverified" && <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-600 border-yellow-100">Not Activated</Badge>}
                    </div>
                    <p className="text-sm text-[#6a6a6a]">{d.email}</p>
                    <p className="text-xs text-[#929292]">
                      {d.mobile}{d.company ? ` · ${d.company}` : ""}
                      {d.dob ? ` · DOB: ${d.dob}` : ""}
                    </p>
                    {tab === "unverified" && (
                      <p className="text-[10px] text-[#c4c4c4] mt-0.5">
                        Registered {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                      </p>
                    )}
                    {(d.attendees?.length ?? 0) > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {d.attendees?.map(a => (
                          <Badge key={a.id} variant="outline" className={`text-[10px] capitalize ${STATUS_STYLES[a.status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {a.event?.name?.slice(0, 22)} — {a.status.replace("_"," ")}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {tab === "active" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setEditDonor(d)}
                          className="border-[#dddddd] text-[#6a6a6a] hover:bg-[#f7f7f7]">Edit</Button>
                        {inActiveEvent ? (
                          <Button variant="outline" size="sm"
                            onClick={() => { if (confirm("Remove from active event?")) mut.mutate({ action: "remove_event", donorId: d.id }); }}
                            disabled={mut.isPending}
                            className="border-orange-200 text-orange-600 hover:bg-orange-50">Remove Event</Button>
                        ) : (
                          <Button variant="outline" size="sm"
                            onClick={() => mut.mutate({ action: "assign_event", donorId: d.id })}
                            disabled={mut.isPending}
                            className="border-green-200 text-green-700 hover:bg-green-50">Add to Event</Button>
                        )}
                        <Button variant="outline" size="sm"
                          onClick={() => { if (confirm(`Delete ${d.fullName}?`)) mut.mutate({ action: "soft_delete", donorId: d.id }); }}
                          disabled={mut.isPending}
                          className="border-red-100 text-[#c8102e] hover:bg-red-50">Delete</Button>
                      </>
                    )}
                    {tab === "unverified" && (
                      <Button variant="outline" size="sm"
                        onClick={() => activationMut.mutate([d.id])}
                        disabled={activationMut.isPending}
                        className="border-[#c8102e] text-[#c8102e] hover:bg-red-50 whitespace-nowrap">
                        Send Activation
                      </Button>
                    )}
                    {tab === "deleted" && (
                      <>
                        <Button variant="outline" size="sm"
                          onClick={() => mut.mutate({ action: "restore", donorId: d.id })}
                          disabled={mut.isPending}
                          className="border-green-200 text-green-700 hover:bg-green-50">Restore</Button>
                        <Button variant="outline" size="sm"
                          onClick={() => { if (confirm(`Permanently delete ${d.fullName} and all their history?`)) mut.mutate({ action: "hard_delete", donorId: d.id }); }}
                          disabled={mut.isPending}
                          className="border-red-200 text-red-700 hover:bg-red-50">Purge</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
