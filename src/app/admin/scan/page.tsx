import { requireAdmin } from "@/lib/auth/server";
import { ScannerClient } from "./ScannerClient";

export default async function ScanPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Badge Scanner</h1>
      <p className="text-[rgba(253,240,238,0.55)] text-sm">Point the camera at a donor&apos;s badge QR to check them in.</p>
      <ScannerClient />
    </div>
  );
}
