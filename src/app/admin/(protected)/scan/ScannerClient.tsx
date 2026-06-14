"use client";
import { useRef, useState, useTransition } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { checkInAction, markDonatedAction } from "../attendees/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DonorInfo {
  attendeeId: string;
  donorId: string;
  status: string;
  fullName: string;
  company: string | null;
  mobile: string;
  bloodGroup: string | null;
}

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [donor, setDonor] = useState<DonorInfo | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Editable fields
  const [bloodGroup, setBloodGroup] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [company, setCompany] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [isProcessing, startTransition] = useTransition();
  const [isSaving, setSaving] = useState(false);

  function playBeep() {
    const audio = new Audio("/beep.mp3");
    audio.play().catch(() => {});
  }

  function scheduleAutoDismiss() {
    setTimeout(() => {
      setDonor(null);
      setSuccessMsg("");
    }, 2000);
  }

  async function startScanner() {
    setScanning(true);
    setFetching(false);
    setDonor(null);
    setError("");
    setSuccessMsg("");
    setEditMode(false);

    const reader = new BrowserQRCodeReader();
    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const deviceId = devices[devices.length - 1]?.deviceId;

      const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current!, async (result) => {
        if (result) {
          setScanning(false);
          controls?.stop();
          setFetching(true);

          const url = result.getText();
          const token = url.split("/badge/")[1]?.split("?")[0];
          if (!token) { setFetching(false); setError("Invalid QR code format"); return; }

          const res = await fetch("/api/admin/resolve-badge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badgeToken: token }),
          });
          const data = await res.json();
          setFetching(false);
          if (!res.ok) { setError(data.error); return; }
          playBeep();
          setDonor(data);
          setBloodGroup(data.bloodGroup ?? "");
          setFullName(data.fullName ?? "");
          setMobile(data.mobile ?? "");
          setGender(data.gender ?? "");
          setCompany(data.company ?? "");
        }
      });
      controlsRef.current = controls;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Camera error");
      setScanning(false);
    }
  }

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  async function handleSaveDetails() {
    if (!donor) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/donors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          donorId: donor.donorId,
          data: {
            fullName: fullName.trim(),
            mobile: mobile.trim(),
            gender: gender || null,
            company: company.trim() || null,
            bloodGroup: bloodGroup || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setDonor(prev => prev ? { ...prev, fullName: fullName.trim(), mobile: mobile.trim(), company: company.trim() || null, bloodGroup: bloodGroup || null } : prev);
      setSuccessMsg("Details updated");
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCheckIn() {
    if (!donor) return;
    startTransition(async () => {
      setError("");
      const fd = new FormData();
      fd.set("attendeeId", donor.attendeeId);
      fd.set("bloodGroup", bloodGroup);
      const res = await checkInAction(fd);
      if (res.error) setError(res.error);
      else {
        setSuccessMsg("Checked in successfully");
        setDonor(prev => prev ? { ...prev, status: "checked_in" } : prev);
        scheduleAutoDismiss();
      }
    });
  }

  function handleMarkDonated() {
    if (!donor) return;
    startTransition(async () => {
      setError("");
      const fd = new FormData();
      fd.set("attendeeId", donor.attendeeId);
      const res = await markDonatedAction(fd);
      if (res.error) setError(res.error);
      else { setSuccessMsg("Marked as donated!"); setDonor(prev => prev ? { ...prev, status: "donated" } : prev); }
    });
  }

  const statusLabel: Record<string, { label: string; cls: string }> = {
    registered:  { label: "Registered",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
    confirmed:   { label: "Confirmed",   cls: "bg-green-50 text-green-700 border-green-200" },
    checked_in:  { label: "Checked In",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
    donated:     { label: "Donated",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Camera viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3] border border-gray-200"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <video ref={videoRef} className={`w-full h-full object-cover ${scanning ? "block" : "hidden"}`} />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-2 border-white/70 rounded-xl relative">
              <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#c8102e] rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#c8102e] rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#c8102e] rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#c8102e] rounded-br-lg" />
            </div>
          </div>
        )}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a1 1 0 011-1h3M21 9V6a1 1 0 00-1-1h-3M3 15v3a1 1 0 001 1h3M21 15v3a1 1 0 01-1 1h-3M9 9h6v6H9z" />
            </svg>
            <p className="text-sm">Camera inactive</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!scanning ? (
          <Button onClick={startScanner} className="flex-1 h-11 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-xl">
            Start Scanner
          </Button>
        ) : (
          <Button variant="outline" onClick={stopScanner} className="flex-1 h-11 rounded-xl">
            Stop Scanner
          </Button>
        )}
      </div>

      {/* Fetching indicator */}
      {fetching && (
        <div className="flex items-center justify-center gap-3 py-6 text-gray-500 text-sm">
          <Spinner />
          <span>Looking up donor…</span>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <span className="shrink-0">✕</span>{error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-medium">
          <span className="shrink-0">✓</span>{successMsg}
        </div>
      )}

      {/* Donor card */}
      {donor && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)" }}>

          {/* Card header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#fdf0ee] flex items-center justify-center text-[#c8102e] font-bold text-base">
              {donor.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{donor.fullName}</p>
              {donor.company && <p className="text-xs text-gray-500 truncate">{donor.company}</p>}
              {(() => {
                const s = statusLabel[donor.status] ?? { label: donor.status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                return (
                  <Badge variant="outline" className={`mt-1 whitespace-nowrap ${s.cls}`}>
                    {s.label}
                  </Badge>
                );
              })()}
            </div>
          </div>

          {/* Details grid */}
          {!editMode ? (
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Mobile</p>
                  <p className="text-gray-800 font-medium">{donor.mobile || <span className="text-gray-400 italic">—</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Blood Group</p>
                  {donor.bloodGroup ? (
                    <Badge variant="outline" className="bg-red-50 text-[#c8102e] border-red-100 font-bold">
                      {donor.bloodGroup}
                    </Badge>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Not set</p>
                  )}
                </div>
              </div>
              <Button variant="link" size="sm" onClick={() => setEditMode(true)}
                className="h-auto p-0 text-xs text-[#c8102e] font-medium">
                Edit details
              </Button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Full name</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="h-9 border-gray-200 text-gray-900" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Mobile</Label>
                  <Input type="tel" value={mobile} onChange={e => setMobile(e.target.value)}
                    className="h-9 border-gray-200 text-gray-900" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Blood group</Label>
                  <Select value={bloodGroup} onValueChange={(v) => setBloodGroup(v ?? "")}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Unknown" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unknown</SelectItem>
                      {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Gender</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Company</Label>
                  <Input value={company} onChange={e => setCompany(e.target.value)}
                    className="h-9 border-gray-200 text-gray-900" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveDetails} disabled={isSaving}
                  className="flex-1 h-9 bg-gray-900 hover:bg-gray-700 text-white">
                  {isSaving ? <><Spinner /> Saving…</> : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)} className="h-9 px-4">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-5 pb-5">
            {(donor.status === "registered" || donor.status === "confirmed") && (
              <Button onClick={handleCheckIn} disabled={isProcessing || !bloodGroup}
                className="w-full h-11 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-xl disabled:opacity-50">
                {isProcessing ? <><Spinner /> Processing…</> : "Check In"}
              </Button>
            )}
            {donor.status === "checked_in" && (
              <Button onClick={handleMarkDonated} disabled={isProcessing}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl">
                {isProcessing ? <><Spinner /> Processing…</> : "Mark as Donated"}
              </Button>
            )}
            {donor.status === "donated" && (
              <div className="w-full h-11 flex items-center justify-center text-emerald-600 text-sm font-medium">
                ✓ Donation recorded
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
