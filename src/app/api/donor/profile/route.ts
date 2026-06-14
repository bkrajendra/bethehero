import { NextResponse } from "next/server";
import { requireDonor, AuthError } from "@/lib/auth/server";

export async function GET() {
  try {
    const { donor } = await requireDonor();
    return NextResponse.json({
      fullName:   donor.fullName,
      email:      donor.email,
      mobile:     donor.mobile,
      gender:     donor.gender,
      company:    donor.company,
      dob:        donor.dob,
      bloodGroup: donor.bloodGroup,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
