"use client";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const BLOOD_GROUP_COLORS = ["#c8102e","#ff2442","#850020","#e8b84b","#ff6b6b","#ffd700","#ff4444","#cc0000"];

interface KPIs {
  registered: number;
  confirmed: number;
  checkedIn: number;
  donated: number;
  deferred: number;
  noShow: number;
  conversionPct: number;
}

interface StatsData {
  kpis: KPIs;
  bloodGroupDistribution: { name: string; value: number }[];
  registrationsOverTime: { time: string; count: number }[];
}

async function fetchStats(eventId: string): Promise<StatsData> {
  const res = await fetch(`/api/admin/stats/${eventId}`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export function DashboardClient({ eventId }: { eventId: string }) {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["adminStats", eventId],
    queryFn: () => fetchStats(eventId),
    refetchInterval: 12_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[rgba(200,16,46,0.05)] animate-pulse" />
        ))}
      </div>
    );
  }

  const { kpis, bloodGroupDistribution, registrationsOverTime } = data;

  const funnelData = [
    { name: "Registered", value: kpis.registered },
    { name: "Checked In", value: kpis.checkedIn },
    { name: "Donated",    value: kpis.donated },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <p className="text-[10px] text-[rgba(253,240,238,0.2)]">
          Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Registered"  value={kpis.registered} />
        <KPICard label="Checked In"  value={kpis.checkedIn}  color="#e8b84b" />
        <KPICard label="Donated"     value={kpis.donated}    color="#22c55e" />
        <KPICard label="Conversion"  value={kpis.conversionPct} suffix="%" color="#ff2442" />
        <KPICard label="Confirmed"   value={kpis.confirmed} />
        <KPICard label="Deferred"    value={kpis.deferred}  color="#f87171" />
        <KPICard label="No-Show"     value={kpis.noShow}    color="#6b7280" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 text-[rgba(253,240,238,0.7)]">Donation Funnel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} barSize={40}>
              <XAxis dataKey="name" tick={{ fill: "rgba(253,240,238,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#0a0109", border: "1px solid rgba(200,16,46,0.3)", color: "#fdf0ee" }} />
              <Bar dataKey="value" fill="#c8102e" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 text-[rgba(253,240,238,0.7)]">Blood Group Distribution</h3>
          {bloodGroupDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bloodGroupDistribution} cx="50%" cy="50%" outerRadius={70}
                  dataKey="value" nameKey="name"
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {bloodGroupDistribution.map((_: { name: string; value: number }, i: number) => (
                    <Cell key={i} fill={BLOOD_GROUP_COLORS[i % BLOOD_GROUP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a0109", border: "1px solid rgba(200,16,46,0.3)", color: "#fdf0ee" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[rgba(253,240,238,0.3)] text-sm text-center py-8">No donations recorded yet</p>
          )}
        </div>

        {registrationsOverTime.length > 0 && (
          <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 md:col-span-2">
            <h3 className="text-sm font-semibold mb-4 text-[rgba(253,240,238,0.7)]">Registrations Over Time</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={registrationsOverTime}>
                <XAxis dataKey="time" tick={{ fill: "rgba(253,240,238,0.3)", fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0a0109", border: "1px solid rgba(200,16,46,0.3)", color: "#fdf0ee" }} />
                <Line type="monotone" dataKey="count" stroke="#c8102e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
