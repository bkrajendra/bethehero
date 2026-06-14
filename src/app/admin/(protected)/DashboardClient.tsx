"use client";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const BLOOD_GROUP_COLORS = ["#c8102e","#e8384f","#a50d27","#e8b84b","#ff6b6b","#f59e0b","#ef4444","#dc2626"];

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
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <p className="text-[10px] text-gray-300">
          Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Registered"  value={kpis.registered}      color="#c8102e" />
        <KPICard label="Checked In"  value={kpis.checkedIn}       color="#d97706" />
        <KPICard label="Donated"     value={kpis.donated}         color="#16a34a" />
        <KPICard label="Conversion"  value={kpis.conversionPct}   suffix="%" color="#c8102e" />
        <KPICard label="Confirmed"   value={kpis.confirmed}       color="#2563eb" />
        <KPICard label="Deferred"    value={kpis.deferred}        color="#dc2626" />
        <KPICard label="No-Show"     value={kpis.noShow}          color="#6b7280" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-600">Donation Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} barSize={40}>
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#c8102e" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-600">Blood Group Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {bloodGroupDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={bloodGroupDistribution} cx="50%" cy="50%" outerRadius={70}
                    dataKey="value" nameKey="name"
                    label={({ name, percent }: { name?: string; percent?: number }) => name && percent != null ? `${name} ${(percent*100).toFixed(0)}%` : ""}
                    labelLine={false} fontSize={10}>
                    {bloodGroupDistribution.map((_: { name: string; value: number }, i: number) => (
                      <Cell key={i} fill={BLOOD_GROUP_COLORS[i % BLOOD_GROUP_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-300 text-sm text-center py-8">No donations recorded yet</p>
            )}
          </CardContent>
        </Card>

        {registrationsOverTime.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-600">Registrations Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={registrationsOverTime}>
                  <XAxis dataKey="time" tick={{ fill: "#d1d5db", fontSize: 9 }} axisLine={false} tickLine={false}
                    tickFormatter={(v: string) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="#c8102e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
