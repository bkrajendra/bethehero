"use client";
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page:      { fontFamily: "Helvetica", backgroundColor: "#fff", padding: 48, gap: 16 },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title:     { fontSize: 22, fontWeight: "bold", color: "#c8102e", textAlign: "center", marginVertical: 12 },
  subtitle:  { fontSize: 12, color: "#555", textAlign: "center" },
  divider:   { borderBottom: "1 solid #e0c8c8", marginVertical: 12 },
  label:     { fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: 1 },
  value:     { fontSize: 14, color: "#111", marginTop: 2, marginBottom: 10 },
  footer:    { flexDirection: "row", justifyContent: "space-around", marginTop: 24 },
  signatory: { alignItems: "center" },
  sigLine:   { borderTop: "1 solid #aaa", width: 120, marginBottom: 4 },
  sigName:   { fontSize: 10, fontWeight: "bold" },
  sigTitle:  { fontSize: 9, color: "#666" },
});

interface CertData {
  attendee: {
    certificateNumber: string;
    bloodGroupAtEvent: string;
    donatedAt: string;
    donor: { fullName: string; company: string };
    event: {
      name: string; venue: string; startAt: string;
      organiserName: string; bloodBankName: string;
      organiserSignatoryName: string; organiserSignatoryTitle: string;
      bloodBankSignatoryName: string; bloodBankSignatoryTitle: string;
    };
  };
}

function CertDocument({ data }: { data: CertData }) {
  const { attendee } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.divider} />
        <Text style={styles.title}>Certificate of Blood Donation</Text>
        <Text style={styles.subtitle}>This certifies that the following individual has donated blood</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Donor Name</Text>
        <Text style={styles.value}>{attendee.donor.fullName}</Text>
        <Text style={styles.label}>Company</Text>
        <Text style={styles.value}>{attendee.donor.company || "—"}</Text>
        <Text style={styles.label}>Blood Group</Text>
        <Text style={styles.value}>{attendee.bloodGroupAtEvent}</Text>
        <Text style={styles.label}>Event</Text>
        <Text style={styles.value}>{attendee.event.name}</Text>
        <Text style={styles.label}>Venue</Text>
        <Text style={styles.value}>{attendee.event.venue}</Text>
        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{new Date(attendee.event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</Text>
        <Text style={styles.label}>Certificate No.</Text>
        <Text style={styles.value}>{attendee.certificateNumber}</Text>
        <View style={styles.divider} />
        <View style={styles.footer}>
          <View style={styles.signatory}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{attendee.event.organiserSignatoryName}</Text>
            <Text style={styles.sigTitle}>{attendee.event.organiserSignatoryTitle}</Text>
          </View>
          <View style={styles.signatory}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{attendee.event.bloodBankSignatoryName}</Text>
            <Text style={styles.sigTitle}>{attendee.event.bloodBankSignatoryTitle}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function CertificateDownloadButton({ data }: { data: CertData }) {
  return (
    <PDFDownloadLink
      document={<CertDocument data={data} />}
      fileName={`certificate-${data.attendee.certificateNumber}.pdf`}
      className="inline-flex items-center justify-center rounded-md bg-[#c8102e] hover:bg-[#ff2442] text-white font-semibold px-6 py-3 text-sm transition-colors"
    >
      {({ loading }) => loading ? "Generating PDF…" : "Download Certificate (PDF)"}
    </PDFDownloadLink>
  );
}
