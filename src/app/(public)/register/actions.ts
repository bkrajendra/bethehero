"use server";
import { z } from "zod";
import { upsertDonorByEmail } from "@/lib/db/queries/donors";
import { getActiveEvent } from "@/lib/db/queries/events";
import { createAttendee } from "@/lib/db/queries/attendees";
import { enqueueNotification } from "@/lib/db/queries/notifications";
import { generateBadgeToken } from "@/lib/qr/generate";

const RegisterSchema = z.object({
  email:        z.string().email().toLowerCase(),
  mobile:       z.string().min(10).max(15),
  fullName:     z.string().min(2).max(100),
  company:      z.string().max(100).optional(),
  bloodGroup:   z.enum(["A+","A-","B+","B-","AB+","AB-","O+","O-"]).optional(),
  dob:          z.string().optional(),
  consentGiven: z.literal(true, { message: "Consent is required" }),
});

export type RegisterResult =
  | { type: "success"; attendeeId: string; badgeToken: string; eventId: string }
  | { type: "no_event"; donorId: string }
  | { type: "already_exists" }
  | { type: "error"; message: string };

export async function registerDonor(formData: FormData): Promise<RegisterResult> {
  const raw = {
    email:        formData.get("email"),
    mobile:       formData.get("mobile"),
    fullName:     formData.get("fullName"),
    company:      formData.get("company") || undefined,
    bloodGroup:   formData.get("bloodGroup") || undefined,
    dob:          formData.get("dob") || undefined,
    consentGiven: formData.get("consentGiven") === "on" ? true : undefined,
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { type: "error", message: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  const { donor, created } = await upsertDonorByEmail({
    email:          data.email,
    mobile:         data.mobile,
    fullName:       data.fullName,
    company:        data.company ?? null,
    bloodGroup:     (data.bloodGroup ?? null) as "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | null,
    dob:            data.dob ?? null,
    consentGiven:   true,
    consentAt:      new Date(),
    consentVersion: "v1.0",
  });
  if (!created) return { type: "already_exists" };

  const event = await getActiveEvent();
  const now = new Date();
  if (!event || event.status !== "active" || now > new Date(event.endAt)) {
    return { type: "no_event", donorId: donor.id };
  }

  const badgeToken = generateBadgeToken();
  const attendee = await createAttendee({
    eventId:    event.id,
    donorId:    donor.id,
    badgeToken,
    status:     "registered",
  });

  await enqueueNotification({
    attendeeId:  attendee.id,
    type:        "confirmation",
    channel:     "email",
    scheduledAt: new Date(),
    dedupeKey:   `confirmation-email-${attendee.id}`,
  });

  return { type: "success", attendeeId: attendee.id, badgeToken, eventId: event.id };
}
