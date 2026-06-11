"use client";
import { useState, useTransition } from "react";
import { registerDonor, type RegisterResult } from "./actions";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"] as const;

export default function RegisterPage() {
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registerDonor(formData);
      if (res.type === "error") setError(res.message);
      else setResult(res);
    });
  }

  if (result?.type === "success") {
    return <ConfirmationScreen attendeeId={result.attendeeId} badgeToken={result.badgeToken} eventId={result.eventId} />;
  }

  if (result?.type === "no_event") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-pulse">🩸</div>
          <h2 className="text-2xl font-bold text-[#fdf0ee]">Thank you for your interest!</h2>
          <p className="text-[rgba(253,240,238,0.55)]">
            There&apos;s no active blood donation drive right now. We&apos;ve saved your details and will reach out when the next drive is scheduled.
          </p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "border-[#c8102e] text-[#fdf0ee]")}>Close</Link>
        </div>
      </main>
    );
  }

  if (result?.type === "already_exists") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
        <div className="max-w-md w-full text-center space-y-6">
          <h2 className="text-2xl font-bold text-[#fdf0ee]">You&apos;re already registered!</h2>
          <p className="text-[rgba(253,240,238,0.55)]">Log in to view your badge and donation status.</p>
          <Link href="/login" className={cn(buttonVariants(), "bg-[#c8102e] hover:bg-[#ff2442]")}>Log In</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#fdf0ee]">Register to Donate</h1>
          <p className="mt-2 text-[rgba(253,240,238,0.55)]">Blood Donation Drive 2026</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#fdf0ee]">Email *</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-[#fdf0ee]">Mobile *</Label>
            <Input id="mobile" name="mobile" type="tel" required placeholder="+91 98765 43210"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[#fdf0ee]">Full Name *</Label>
            <Input id="fullName" name="fullName" required placeholder="Your full name"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-[#fdf0ee]">Company</Label>
            <Input id="company" name="company" placeholder="Your company (optional)"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#fdf0ee]">Blood Group</Label>
              <select name="bloodGroup" className="w-full rounded-md border border-[rgba(200,16,46,0.3)] bg-transparent text-[#fdf0ee] px-3 py-2 text-sm">
                <option value="">Select (optional)</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-[#fdf0ee]">Date of Birth</Label>
              <Input id="dob" name="dob" type="date"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee]" />
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input type="checkbox" id="consentGiven" name="consentGiven" required
              className="mt-0.5 h-4 w-4 accent-[#c8102e]" />
            <Label htmlFor="consentGiven" className="text-sm text-[rgba(253,240,238,0.55)] leading-relaxed">
              I consent to the collection and use of my personal data for this blood donation drive in accordance with the DPDP Act.
            </Label>
          </div>

          {error && <p className="text-[#ff2442] text-sm">{error}</p>}

          <Button type="submit" disabled={isPending}
            className="w-full bg-[#c8102e] hover:bg-[#ff2442] text-white font-semibold py-3">
            {isPending ? "Registering…" : "Register to Donate →"}
          </Button>
        </form>

        <p className="text-center text-sm text-[rgba(253,240,238,0.28)]">
          Already registered?{" "}
          <Link href="/login" className="text-[#c8102e] hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
