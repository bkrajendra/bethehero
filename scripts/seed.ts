import "dotenv/config";
import { db } from "../src/lib/db/index";
import { donors, events, eventAttendees, admins, appSettings } from "../src/lib/db/schema";
import { nanoid } from "nanoid";

async function seed() {
  console.log("🌱 Seeding database...");

  const [event] = await db.insert(events).values({
    name: "Confluxsys Blood Donation Drive 2026",
    venue: "Confluxsys Pvt Ltd",
    address: "803-804, Supreme Headquarters, Pune",
    startAt: new Date("2026-06-17T09:00:00+05:30"),
    endAt: new Date("2026-06-17T17:00:00+05:30"),
    donationOpenAt: new Date("2026-06-17T09:00:00+05:30"),
    donationCloseAt: new Date("2026-06-17T16:30:00+05:30"),
    status: "active",
    organiserName: "Confluxsys Pvt Ltd",
    bloodBankName: "Janakalyan Rakta Pedhi",
    organiserSignatoryName: "Rajendra Khope",
    organiserSignatoryTitle: "CEO, Confluxsys Pvt Ltd",
    bloodBankSignatoryName: "Dr. Priya Sharma",
    bloodBankSignatoryTitle: "Medical Director, Janakalyan Rakta Pedhi",
    instructionsDos: ["Eat a full meal 2-3 hours before donating", "Drink plenty of water", "Get a good night's sleep"],
    instructionsDonts: ["Avoid alcohol for 24 hours before donating", "Avoid smoking before donating", "Don't donate on an empty stomach"],
  }).returning();
  console.log("✓ Event created:", event.id);

  await db.insert(appSettings).values({
    key: "singleton",
    currentEventId: event.id,
    defaultInstructionsDos: ["Eat well", "Stay hydrated", "Sleep well"],
    defaultInstructionsDonts: ["No alcohol", "No smoking", "Not on empty stomach"],
  }).onConflictDoNothing();
  console.log("✓ App settings created");

  const sampleDonors = [
    { email: "alice@example.com", mobile: "+919876543210", fullName: "Alice Sharma", bloodGroup: "O+" as const, company: "Confluxsys Pvt Ltd" },
    { email: "bob@example.com", mobile: "+919876543211", fullName: "Bob Patel", bloodGroup: "A+" as const, company: "Confluxsys Pvt Ltd" },
  ];

  for (const d of sampleDonors) {
    const [donor] = await db.insert(donors).values({
      ...d, consentGiven: true, consentAt: new Date(), consentVersion: "v1.0",
    }).onConflictDoNothing().returning();
    if (donor) {
      await db.insert(eventAttendees).values({
        eventId: event.id, donorId: donor.id, badgeToken: nanoid(24), status: "registered",
      }).onConflictDoNothing();
      console.log("✓ Donor + attendee:", donor.email);
    }
  }

  const adminEmail = process.env.ADMIN_ALLOWLIST?.split(",")[0]?.trim();
  if (adminEmail) {
    await db.insert(admins).values({
      authUserId: "00000000-0000-0000-0000-000000000000",
      email: adminEmail,
      name: "Admin",
      role: "super",
      active: true,
    }).onConflictDoNothing();
    console.log("✓ Admin seeded:", adminEmail);
  }

  console.log("✅ Seed complete");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
