import { requireAdmin } from "@/lib/auth/server";
import { ScannerClient } from "./ScannerClient";

export default async function ScanPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Badge Scanner</h1>
        <p className="text-sm text-gray-400 mt-1">Point the camera at a donor&apos;s badge QR to check them in.</p>
      </div>
      <ScannerClient />
    </div>
  );
}
