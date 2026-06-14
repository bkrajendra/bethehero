"use client";
import {
  Document, Page, Text, View, Image, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";

// A4 landscape in PDF points (width × height)
const W = 841.89;
const H = 595.28;

const s = StyleSheet.create({
  page:    { padding: 0 },
  canvas:  { position: "relative", width: W, height: H },
  bg:      { position: "absolute", top: 0, left: 0, width: W, height: H },
});

// Absolutely positioned text block inside the canvas View
function Abs({
  top, left = 0, width = W, align = "center", size, bold, color, spacing, children,
}: {
  top: number; left?: number; width?: number;
  align?: "left" | "center" | "right";
  size: number; bold?: boolean; color?: string; spacing?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ position: "absolute", top, left, width }}>
      <Text style={{
        fontSize: size,
        fontFamily: bold ? "Helvetica-Bold" : "Helvetica",
        color: color ?? "#222222",
        textAlign: align,
        ...(spacing ? { letterSpacing: spacing } : {}),
      }}>
        {children}
      </Text>
    </View>
  );
}

interface CertData {
  attendee: {
    certificateNumber: string | null;
    bloodGroupAtEvent: string | null;
    donatedAt: string | null;
    donor: { fullName: string; company: string | null };
    event: {
      name: string; venue: string; startAt: string;
      organiserName: string; bloodBankName: string;
      organiserSignatoryName: string; organiserSignatoryTitle: string;
      bloodBankSignatoryName: string; bloodBankSignatoryTitle: string;
    };
  };
  bgUrl: string;
}

function CertDocument({ data }: { data: CertData }) {
  const { attendee, bgUrl } = data;
  const eventDate = new Date(attendee.event.startAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });

  return (
    <Document>
      <Page size={[W, H]} style={s.page}>
        {/* Single root View — all absolute children are positioned relative to this */}
        <View style={s.canvas}>
          {/* Layer 0: background */}
          <Image src={bgUrl} style={s.bg} />

          {/* Layer 1: title */}
          <Abs top={158} size={21} bold color="#7B1B1B" spacing={1.5}>
            Certificate of Blood Donation
          </Abs>

          {/* Layer 2: subtitle */}
          <Abs top={188} size={9} color="#888" spacing={0.3}>
            This certifies that the following individual has generously donated blood
          </Abs>

          {/* Layer 3: event name & date */}
          <Abs top={216} left={60} width={W - 120} size={14} bold color="#222">
            {attendee.event.name}
          </Abs>
          <Abs top={240} size={10} color="#666">
            {eventDate}
          </Abs>

          {/* Layer 4: donor name — focal element */}
          <Abs top={278} left={60} width={W - 120} size={30} bold color="#c8102e">
            {attendee.donor.fullName}
          </Abs>

          {/* Layer 5: blood group */}
          {attendee.bloodGroupAtEvent ? (
            <Abs top={326} size={12} color="#8B1A1A">
              Blood Group: {attendee.bloodGroupAtEvent}
            </Abs>
          ) : null}

          {/* Layer 6: company */}
          {attendee.donor.company ? (
            <Abs top={352} left={60} width={W - 120} size={11} color="#444">
              {attendee.donor.company}
            </Abs>
          ) : null}

          {/* Layer 7: certificate number */}
          {attendee.certificateNumber ? (
            <Abs top={382} size={8} color="#aaa" spacing={0.5}>
              Certificate No. {attendee.certificateNumber}
            </Abs>
          ) : null}

          {/* Layer 8: signatures — inside the white box at bottom of the background */}
          <Abs top={485} left={80} width={200} size={9} bold color="#222">
            {attendee.event.organiserSignatoryName}
          </Abs>
          <Abs top={498} left={80} width={200} size={8} color="#666">
            {attendee.event.organiserSignatoryTitle}
          </Abs>

          <Abs top={485} left={560} width={200} size={9} bold color="#222">
            {attendee.event.bloodBankSignatoryName}
          </Abs>
          <Abs top={498} left={560} width={200} size={8} color="#666">
            {attendee.event.bloodBankSignatoryTitle}
          </Abs>
        </View>
      </Page>
    </Document>
  );
}

export function CertificateDownloadButton({ data, bgUrl }: { data: Omit<CertData, "bgUrl">; bgUrl: string }) {
  const name = data.attendee.donor.fullName.replace(/\s+/g, "-");
  const fileName = `certificate-${data.attendee.certificateNumber ?? name}.pdf`;
  return (
    <PDFDownloadLink
      document={<CertDocument data={{ ...data, bgUrl }} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <button
          disabled={loading}
          aria-busy={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c8102e] text-white font-semibold px-6 py-3 text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[#a50d27]"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating PDF…
            </>
          ) : (
            "Download Certificate (PDF)"
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
}
