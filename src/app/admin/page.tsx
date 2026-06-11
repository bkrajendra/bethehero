import { requireAdmin } from "@/lib/auth/server";

export default async function AdminDashboard() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-[rgba(253,240,238,0.55)]">Charts and live stats coming in Phase 4.</p>
    </div>
  );
}
