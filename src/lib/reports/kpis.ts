interface AttendeeStatus {
  status: string;
}

export interface EventKPIs {
  registered: number;
  checkedIn: number;
  donated: number;
  deferred: number;
  noShow: number;
  conversionPct: number;
}

export function computeKPIs(attendees: AttendeeStatus[]): EventKPIs {
  const counts: Record<string, number> = {};
  for (const a of attendees) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const registered = attendees.length;
  const donated = counts["donated"] ?? 0;
  return {
    registered,
    checkedIn:    counts["checked_in"] ?? 0,
    donated,
    deferred:     counts["deferred"]   ?? 0,
    noShow:       counts["no_show"]    ?? 0,
    conversionPct: registered > 0 ? Math.round((donated / registered) * 100) : 0,
  };
}
