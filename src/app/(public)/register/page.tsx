"use client";
import { useState, useTransition } from "react";
import { registerDonor, type RegisterResult } from "./actions";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import Link from "next/link";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"] as const;
const INPUT_CLS = "border-[#dddddd] text-[#222222] placeholder:text-[#929292] h-12 focus:border-[#222222] focus:ring-0 focus-visible:ring-0 focus-visible:border-[#222222]";
const SHADOW = { boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" };

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className="w-6 h-6 rounded-full bg-[#222222] text-white text-xs font-bold flex items-center justify-center">
        {step > 1 ? <Check size={12} strokeWidth={3} /> : "1"}
      </div>
      <div className="h-px w-8 bg-[#dddddd]" />
      <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
        step === 2 ? "bg-[#c8102e] text-white" : "bg-[#ebebeb] text-[#929292]"
      }`}>2</div>
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState({ email: "", fullName: "" });
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStep1({ email: fd.get("email") as string, fullName: fd.get("fullName") as string });
    setStep(2);
  }

  function handleStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("email", step1.email);
    fd.set("fullName", step1.fullName);
    startTransition(async () => {
      const res = await registerDonor(fd);
      if (res.type === "error") setError(res.message);
      else setResult(res);
    });
  }

  if (result?.type === "success") {
    return <ConfirmationScreen attendeeId={result.attendeeId} badgeToken={result.badgeToken} eventId={result.eventId} />;
  }

  if (result?.type === "no_event") {
    return (
      <PageShell>
        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 text-center space-y-4" style={SHADOW}>
          <div className="text-5xl">🩸</div>
          <h2 className="text-xl font-bold text-[#222222]">Thank you for your interest!</h2>
          <p className="text-[#6a6a6a] text-sm">No active blood donation drive right now. We&apos;ll reach out when the next drive is scheduled.</p>
          <Link href="/" className="inline-block text-sm text-[#c8102e] hover:underline font-medium">← Back to home</Link>
        </div>
      </PageShell>
    );
  }

  if (result?.type === "already_exists") {
    return (
      <PageShell>
        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 text-center space-y-4" style={SHADOW}>
          <h2 className="text-xl font-bold text-[#222222]">You&apos;re already registered!</h2>
          <p className="text-[#6a6a6a] text-sm">Log in to view your badge and donation status.</p>
          <Link href="/login"
            className="inline-flex items-center justify-center w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg transition-colors">
            Log in
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] py-12 px-6">
      <div className="max-w-md mx-auto">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <svg width="24" height="30" viewBox="0 0 54 66" fill="none">
              <path d="M27 2C27 2 3 26 3 43C3 56.25 13.75 67 27 67C40.25 67 51 56.25 51 43C51 26 27 2 27 2Z" fill="#c8102e" />
            </svg>
            <span className="font-semibold text-[#222222]">BeTheHero</span>
          </Link>
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold text-[#222222]">Register to donate</h1>
              <p className="mt-1.5 text-sm text-[#6a6a6a]">Blood Donation Drive · 17 June 2026</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#222222]">Almost there</h1>
              <p className="mt-1.5 text-sm text-[#6a6a6a]">Add optional details to complete your profile</p>
            </>
          )}
          <div className="mt-5">
            <StepIndicator step={step} />
          </div>
        </div>

        <div className="bg-white border border-[#dddddd] rounded-2xl p-6" style={SHADOW}>

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium text-[#222222]">Full name *</Label>
                <Input id="fullName" name="fullName" required defaultValue={step1.fullName}
                  placeholder="Your full name" className={INPUT_CLS} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-[#222222]">Email address *</Label>
                <Input id="email" name="email" type="email" required defaultValue={step1.email}
                  placeholder="you@example.com" className={INPUT_CLS} />
              </div>
              <Button type="submit" className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg">
                Next →
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mobile" className="text-sm font-medium text-[#222222]">Mobile</Label>
                <Input id="mobile" name="mobile" type="tel" placeholder="+91 98765 43210" className={INPUT_CLS} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-sm font-medium text-[#222222]">Company</Label>
                <Input id="company" name="company" placeholder="Your company (optional)" className={INPUT_CLS} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#222222]">Blood group</Label>
                  <select name="bloodGroup"
                    className="w-full h-12 px-3 rounded-lg border border-[#dddddd] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]">
                    <option value="">Unknown</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob" className="text-sm font-medium text-[#222222]">Date of birth</Label>
                  <Input id="dob" name="dob" type="date" className={INPUT_CLS} />
                </div>
              </div>
              <div className="flex items-start gap-3 pt-1">
                <input type="checkbox" id="consentGiven" name="consentGiven" required
                  className="mt-0.5 h-4 w-4 accent-[#c8102e] rounded" />
                <Label htmlFor="consentGiven" className="text-sm text-[#6a6a6a] leading-relaxed cursor-pointer">
                  I consent to the collection and use of my email, mobile number only for blood donation drive purposes.
                </Label>
              </div>
              {error && <p className="text-[#c13515] text-sm">{error}</p>}
              <Button type="submit" disabled={isPending}
                className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg">
                {isPending ? "Registering…" : "Register to donate →"}
              </Button>
              <button type="button" onClick={() => { setStep(1); setError(""); }}
                className="w-full text-sm text-[#6a6a6a] hover:text-[#222222] text-center py-1 transition-colors">
                ← Back
              </button>
            </form>
          )}

        </div>

        <p className="text-center text-sm text-[#6a6a6a] mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-[#c8102e] hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </main>
  );
}
