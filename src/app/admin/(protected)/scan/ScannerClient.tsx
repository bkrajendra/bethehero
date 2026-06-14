"use client";
import { useRef, useState, useTransition } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { checkInAction, markDonatedAction } from "../attendees/actions";

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
          <button onClick={startScanner}
            className="flex-1 h-11 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-xl text-sm transition-colors">
            Start Scanner
          </button>
        ) : (
          <button onClick={stopScanner}
            className="flex-1 h-11 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl text-sm transition-colors">
            Stop Scanner
          </button>
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
                  <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${s.cls}`}>
                    {s.label}
                  </span>
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-[#c8102e] text-xs font-bold border border-red-100">
                      {donor.bloodGroup}
                    </span>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Not set</p>
                  )}
                </div>
              </div>
              <button onClick={() => setEditMode(true)}
                className="text-xs text-[#c8102e] hover:underline font-medium">
                Edit details
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Full name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Mobile</label>
                  <input value={mobile} onChange={e => setMobile(e.target.value)} type="tel"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Blood group</label>
                  <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400">
                    <option value="">Unknown</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Company</label>
                  <input value={company} onChange={e => setCompany(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveDetails} disabled={isSaving}
                  className="flex-1 h-9 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                  {isSaving ? <><Spinner /> Saving…</> : "Save"}
                </button>
                <button onClick={() => setEditMode(false)}
                  className="h-9 px-4 border border-gray-200 hover:border-gray-300 text-gray-600 text-sm rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-5 pb-5">
            {(donor.status === "registered" || donor.status === "confirmed") && (
              <button onClick={handleCheckIn} disabled={isProcessing || !bloodGroup}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessing ? <><Spinner /> Processing…</> : "Check In"}
              </button>
            )}
            {donor.status === "checked_in" && (
              <button onClick={handleMarkDonated} disabled={isProcessing}
                className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50">
                {isProcessing ? <><Spinner /> Processing…</> : "Mark as Donated"}
              </button>
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
