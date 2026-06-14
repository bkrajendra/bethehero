"use client";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BloodBagChart } from "@/components/BloodBagChart";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const BLOOD_GROUP_COLORS = ["#c8102e","#e8384f","#a50d27","#e8b84b","#ff6b6b","#f59e0b","#ef4444","#dc2626"];
const GENDER_COLORS = ["#3b82f6", "#ec4899", "#a855f7"];

interface KPIs {
  registered: number;
  confirmed: number;
  checkedIn: number;
  donated: number;
  deferred: number;
  noShow: number;
  conversionPct: number;
  maleCount: number;
  femaleCount: number;
  bloodCollectedL: number;
}

interface StatsData {
  kpis: KPIs;
  genderDistribution: { name: string; value: number }[];
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

  const { kpis, genderDistribution, bloodGroupDistribution, registrationsOverTime } = data;

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



      <div className="grid grid-cols-1 md:grid-cols-[70%_30%] gap-6">
        {/* Blood collection featured card — 70% */}
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm font-semibold text-gray-600">Blood Collection</CardTitle>
          </CardHeader>
          <BloodBagChart
            donated={kpis.donated}
            registered={kpis.registered}
            bloodCollectedL={kpis.bloodCollectedL}
          />
        </Card>

        {/* Right side — 30%: three charts stacked vertically */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">Donation Funnel</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={funnelData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#c8102e" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">Blood Group Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {bloodGroupDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={bloodGroupDistribution} cx="50%" cy="50%" outerRadius={55}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }: { name?: string; percent?: number }) => name && percent != null ? `${name} ${(percent*100).toFixed(0)}%` : ""}
                      labelLine={false} fontSize={9}>
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600">Donor Gender Split</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {genderDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={genderDistribution} cx="50%" cy="50%"
                      innerRadius={38} outerRadius={58}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }: { name?: string; percent?: number }) => name && percent != null ? `${name} ${(percent*100).toFixed(0)}%` : ""}
                      labelLine={false} fontSize={9}>
                      {genderDistribution.map((_: { name: string; value: number }, i: number) => (
                        <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const v = Number(value);
                        const n = String(name);
                        const ml = n === "Male" ? v * 450 : n === "Female" ? v * 350 : v * 400;
                        return [`${v} donors · ${(ml / 1000).toFixed(2)} L`, n];
                      }}
                      contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", color: "#111", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-300 text-sm text-center py-8">No gender data yet</p>
              )}
            </CardContent>
          </Card>
        </div>{/* end right 30% column */}
      </div>{/* end 70/30 grid */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Registered"  value={kpis.registered}      color="#c8102e" />
        <KPICard label="Checked In"  value={kpis.checkedIn}       color="#d97706" />
        <KPICard label="Donated"     value={kpis.donated}         color="#16a34a" />
        <KPICard label="Conversion"  value={kpis.conversionPct}   suffix="%" color="#c8102e" />
        <KPICard label="Confirmed"   value={kpis.confirmed}       color="#2563eb" />
        <KPICard label="Deferred"    value={kpis.deferred}        color="#dc2626" />
        <KPICard label="No-Show"     value={kpis.noShow}          color="#6b7280" />
        <KPICard label="Blood Collected" value={kpis.bloodCollectedL} suffix=" L" color="#16a34a" />
        <KPICard label="Male Donors"     value={kpis.maleCount}   color="#3b82f6" />
        <KPICard label="Female Donors"   value={kpis.femaleCount} color="#ec4899" />
      </div>
      
      {registrationsOverTime.length > 0 && (
        <Card>
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
  );
}
