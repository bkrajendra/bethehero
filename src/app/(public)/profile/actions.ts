"use server";
import { z } from "zod";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { updateDonorProfile } from "@/lib/db/queries/donors";

const ProfileSchema = z.object({
  fullName:   z.string().min(2).max(100),
  mobile:     z.string().min(10).max(15).optional(),
  company:    z.string().max(100).optional(),
  dob:        z.string().optional(),
  bloodGroup: z.enum(["A+","A-","B+","B-","AB+","AB-","O+","O-"]).optional(),
});

export type ProfileResult =
  | { type: "success" }
  | { type: "error"; message: string };

export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  try {
    const { donorId } = await requireDonor();

    const raw = {
      fullName:   formData.get("fullName"),
      mobile:     formData.get("mobile") || undefined,
      company:    formData.get("company") || undefined,
      dob:        formData.get("dob") || undefined,
      bloodGroup: formData.get("bloodGroup") || undefined,
    };

    const parsed = ProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return { type: "error", message: parsed.error.issues[0].message };
    }

    const d = parsed.data;
    await updateDonorProfile(donorId, {
      fullName:   d.fullName,
      mobile:     d.mobile ?? "",
      company:    d.company ?? null,
      dob:        d.dob ?? null,
      bloodGroup: (d.bloodGroup ?? null) as ("A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-") | null,
    });

    return { type: "success" };
  } catch (e) {
    if (e instanceof AuthError) return { type: "error", message: "Not authenticated" };
    return { type: "error", message: "Something went wrong" };
  }
}
