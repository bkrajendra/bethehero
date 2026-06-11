"use client";
import { useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [donor, setDonor] = useState<DonorInfo | null>(null);
  const [error, setError] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function startScanner() {
    setScanning(true);
    setDonor(null);
    setError("");
    setSuccessMsg("");

    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;

    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const deviceId = devices[devices.length - 1]?.deviceId;

      await reader.decodeFromVideoDevice(deviceId, videoRef.current!, async (result) => {
        if (result) {
          setScanning(false);
          reader.reset();

          const url = result.getText();
          const token = url.split("/badge/")[1]?.split("?")[0];
          if (!token) { setError("Invalid QR code format"); return; }

          const res = await fetch("/api/admin/resolve-badge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badgeToken: token }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error); return; }
          setDonor(data);
          setBloodGroup(data.bloodGroup ?? "");
        }
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Camera error");
      setScanning(false);
    }
  }

  function stopScanner() {
    readerRef.current?.reset();
    setScanning(false);
  }

  async function handleCheckIn() {
    if (!donor) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.set("attendeeId", donor.attendeeId);
    formData.set("bloodGroup", bloodGroup);
    const res = await checkInAction(formData);
    setIsProcessing(false);
    if (res.error) setError(res.error);
    else { setSuccessMsg("Checked in!"); setDonor(prev => prev ? { ...prev, status: "checked_in" } : prev); }
  }

  async function handleMarkDonated() {
    if (!donor) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.set("attendeeId", donor.attendeeId);
    const res = await markDonatedAction(formData);
    setIsProcessing(false);
    if (res.error) setError(res.error);
    else { setSuccessMsg("Marked as donated!"); setDonor(prev => prev ? { ...prev, status: "donated" } : prev); }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="relative aspect-square rounded-xl overflow-hidden border border-[rgba(200,16,46,0.3)] bg-black">
        <video ref={videoRef} className={`w-full h-full object-cover ${scanning ? "block" : "hidden"}`} />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[rgba(253,240,238,0.3)]">Camera inactive</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!scanning ? (
          <Button onClick={startScanner} className="flex-1 bg-[#c8102e] hover:bg-[#ff2442]">Start Scanner</Button>
        ) : (
          <Button onClick={stopScanner} variant="outline" className="flex-1 border-[rgba(200,16,46,0.3)]">Stop Scanner</Button>
        )}
      </div>

      {error && <p className="text-[#ff2442] text-sm">{error}</p>}
      {successMsg && <p className="text-green-400 text-sm font-semibold">{successMsg}</p>}

      {donor && (
        <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 space-y-4">
          <div>
            <p className="font-bold text-lg text-[#fdf0ee]">{donor.fullName}</p>
            <p className="text-sm text-[rgba(253,240,238,0.55)]">{donor.company ?? "—"}</p>
            <p className="text-sm text-[rgba(253,240,238,0.3)]">{donor.mobile}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(200,16,46,0.15)] text-[#ff2442] capitalize">
              {donor.status.replace("_", " ")}
            </span>
          </div>
          <div className="space-y-2">
            <Label className="text-[#fdf0ee]">Blood Group</Label>
            <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}
              className="w-full rounded-md border border-[rgba(200,16,46,0.3)] bg-transparent text-[#fdf0ee] px-3 py-2 text-sm">
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            {(donor.status === "registered" || donor.status === "confirmed") && (
              <Button onClick={handleCheckIn} disabled={isProcessing || !bloodGroup}
                className="flex-1 bg-[#c8102e] hover:bg-[#ff2442]">
                {isProcessing ? "Processing…" : "Check In"}
              </Button>
            )}
            {donor.status === "checked_in" && (
              <Button onClick={handleMarkDonated} disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-500">
                {isProcessing ? "Processing…" : "Mark Donated"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
