"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { updateProfile, type ProfileResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"] as const;
const GENDERS = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
] as const;
const INPUT_CLS = "border-[#dddddd] text-[#222222] placeholder:text-[#929292] h-12 focus:border-[#222222] focus:ring-0 focus-visible:ring-0 focus-visible:border-[#222222]";

async function fetchProfile() {
  const res = await fetch("/api/donor/profile");
  if (!res.ok) throw new Error("Not authenticated");
  return res.json() as Promise<{
    fullName: string;
    email: string;
    mobile: string;
    gender: string | null;
    company: string | null;
    dob: string | null;
    bloodGroup: string | null;
  }>;
}

export default function ProfilePage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["donorProfile"], queryFn: fetchProfile });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res: ProfileResult = await updateProfile(fd);
      if (res.type === "success") setSaved(true);
      else setFormError(res.message);
    });
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#dddddd] animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-[#6a6a6a]">Please log in to view your profile.</p>
          <Link href="/login"
            className="inline-flex items-center justify-center h-12 px-6 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg text-sm transition-colors">
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] py-12 px-6">
      <div className="max-w-md mx-auto">

        <div className="mb-8">
          <Link href="/status" className="inline-flex items-center gap-1.5 text-sm text-[#6a6a6a] hover:text-[#222222] transition-colors mb-6">
            <ArrowLeft size={15} /> Back to status
          </Link>
          <h1 className="text-2xl font-bold text-[#222222]">Your profile</h1>
          <p className="text-sm text-[#6a6a6a] mt-1">Update your details for future donation drives.</p>
        </div>

        <div className="bg-white border border-[#dddddd] rounded-2xl p-6 space-y-5"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#222222]">Email address</Label>
            <div className="h-12 px-3 flex items-center rounded-lg border border-[#ebebeb] bg-[#f7f7f7] text-sm text-[#6a6a6a]">
              {data.email}
            </div>
            <p className="text-xs text-[#929292]">Email cannot be changed.</p>
          </div>

          <div className="border-t border-[#ebebeb]" />

          <form key={data.email} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium text-[#222222]">Full name *</Label>
              <Input id="fullName" name="fullName" required defaultValue={data.fullName} className={INPUT_CLS} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-sm font-medium text-[#222222]">Mobile</Label>
              <Input id="mobile" name="mobile" type="tel" defaultValue={data.mobile}
                placeholder="+91 98765 43210" className={INPUT_CLS} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-sm font-medium text-[#222222]">Company</Label>
              <Input id="company" name="company" defaultValue={data.company ?? ""}
                placeholder="Your company (optional)" className={INPUT_CLS} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#222222]">Gender</Label>
              <Select name="gender" defaultValue={data.gender ?? ""}>
                <SelectTrigger className={INPUT_CLS}>
                  <SelectValue placeholder="Prefer not to say" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Prefer not to say</SelectItem>
                  {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[#222222]">Blood group</Label>
                <select name="bloodGroup" defaultValue={data.bloodGroup ?? ""}
                  className="w-full h-12 px-3 rounded-lg border border-[#dddddd] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]">
                  <option value="">Unknown</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-sm font-medium text-[#222222]">Date of birth</Label>
                <Input id="dob" name="dob" type="date" defaultValue={data.dob ?? ""} className={INPUT_CLS} />
              </div>
            </div>

            {formError && <p className="text-[#c13515] text-sm">{formError}</p>}

            {saved && (
              <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                <Check size={14} strokeWidth={2.5} />
                Profile saved successfully.
              </div>
            )}

            <Button type="submit" disabled={isPending}
              className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg">
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>

        </div>
      </div>
    </main>
  );
}
