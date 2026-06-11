import ExcelJS from "exceljs";

interface AttendeeRow {
  donor: { fullName: string; company: string | null; bloodGroup: string | null };
  bloodGroupAtEvent: string | null;
  status: string;
  checkedInAt: Date | null;
  donatedAt: Date | null;
  certificateNumber: string | null;
}

export async function buildEventXlsx(
  eventName: string,
  attendees: AttendeeRow[],
  kpis: {
    registered: number; checkedIn: number; donated: number;
    deferred: number; noShow: number; conversionPct: number;
  },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BeTheHero";

  const ws = wb.addWorksheet("Attendees");
  ws.columns = [
    { header: "Full Name",   key: "fullName",    width: 24 },
    { header: "Company",     key: "company",     width: 22 },
    { header: "Blood Group", key: "bloodGroup",  width: 14 },
    { header: "Status",      key: "status",      width: 14 },
    { header: "Check-In",    key: "checkedInAt", width: 22 },
    { header: "Donated At",  key: "donatedAt",   width: 22 },
    { header: "Certificate", key: "certNumber",  width: 22 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
  headerRow.alignment = { vertical: "middle" };

  for (const a of attendees) {
    ws.addRow({
      fullName:    a.donor.fullName,
      company:     a.donor.company ?? "",
      bloodGroup:  a.bloodGroupAtEvent ?? a.donor.bloodGroup ?? "",
      status:      a.status.replace("_", " "),
      checkedInAt: a.checkedInAt ? new Date(a.checkedInAt).toLocaleString("en-IN") : "",
      donatedAt:   a.donatedAt   ? new Date(a.donatedAt).toLocaleString("en-IN")   : "",
      certNumber:  a.certificateNumber ?? "",
    });
  }

  const ws2 = wb.addWorksheet("Summary");
  ws2.getColumn(1).width = 22;
  ws2.getColumn(2).width = 12;
  ws2.addRow(["Event", eventName]);
  ws2.addRow(["Generated", new Date().toLocaleString("en-IN")]);
  ws2.addRow([]);
  ws2.addRow(["KPI", "Count"]);
  for (const [k, v] of [
    ["Registered",  kpis.registered],
    ["Checked In",  kpis.checkedIn],
    ["Donated",     kpis.donated],
    ["Deferred",    kpis.deferred],
    ["No-Show",     kpis.noShow],
    ["Conversion %", `${kpis.conversionPct}%`],
  ]) ws2.addRow([k, v]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
