"use client";
import { useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { registerDonor, type RegisterResult } from "./actions";
import { signInWithProvider } from "../login/actions";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import Link from "next/link";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

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

function RegisterPageInner() {
  const params = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState({
    email: params.get("email") ?? "",
    fullName: params.get("name") ?? "",
  });
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [oauthPending, setOauthPending] = useState<"google" | "github" | null>(null);

  async function handleOAuth(provider: "google" | "github") {
    setError("");
    setOauthPending(provider);
    const res = await signInWithProvider(provider);
    if (res.error) { setError(res.error); setOauthPending(null); return; }
    if (res.url) window.location.href = res.url;
  }

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
            <div className="space-y-4">
              {error && <p className="text-[#c13515] text-sm text-center">{error}</p>}

              {/* OAuth buttons */}
              <div className="space-y-2.5">
                <button onClick={() => handleOAuth("google")} disabled={isPending || oauthPending !== null}
                  className="w-full h-11 flex items-center justify-center gap-3 border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {oauthPending === "google" ? <Spinner /> : (
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
                    </svg>
                  )}
                  {oauthPending === "google" ? "Redirecting…" : "Sign up with Google"}
                </button>

                <button onClick={() => handleOAuth("github")} disabled={isPending || oauthPending !== null}
                  className="w-full h-11 flex items-center justify-center gap-3 border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {oauthPending === "github" ? <Spinner /> : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  )}
                  {oauthPending === "github" ? "Redirecting…" : "Sign up with GitHub"}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#ebebeb]" />
                <span className="text-xs text-[#929292]">or continue with email</span>
                <div className="flex-1 h-px bg-[#ebebeb]" />
              </div>

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
                <Button type="submit" disabled={isPending || oauthPending !== null}
                  className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg">
                  Next →
                </Button>
              </form>
            </div>
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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}
