"use server";
import { z } from "zod";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { getAttendeeById } from "@/lib/db/queries/attendees";
import { db } from "@/lib/db/index";
import { feedback } from "@/lib/db/schema";

const FeedbackSchema = z.object({
  attendeeId:       z.string().uuid(),
  rating:           z.coerce.number().int().min(1).max(5),
  comment:          z.string().max(500).optional(),
  wouldDonateAgain: z.boolean().optional(),
});

export async function submitFeedback(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const { donorId } = await requireDonor();
    const parsed = FeedbackSchema.safeParse({
      attendeeId:       formData.get("attendeeId"),
      rating:           formData.get("rating"),
      comment:          formData.get("comment") || undefined,
      wouldDonateAgain: formData.get("wouldDonateAgain") === "yes" ? true :
                        formData.get("wouldDonateAgain") === "no" ? false : undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const attendee = await getAttendeeById(parsed.data.attendeeId);
    if (!attendee || attendee.donorId !== donorId) return { error: "Forbidden" };
    if (attendee.status !== "donated") return { error: "Feedback is only for completed donations" };

    await db.insert(feedback).values(parsed.data).onConflictDoNothing({ target: feedback.attendeeId });
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    return { error: "Something went wrong. Please try again." };
  }
}
