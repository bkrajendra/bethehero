"use client";
import { useState, useTransition } from "react";
import { sendOtp, verifyOtp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await sendOtp(email);
      if (res.error) setError(res.error); else setStep("otp");
    });
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await verifyOtp(email, otp);
      if (res.error) setError(res.error); else router.push("/status");
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <svg width="24" height="30" viewBox="0 0 54 66" fill="none">
              <path d="M27 2C27 2 3 26 3 43C3 56.25 13.75 67 27 67C40.25 67 51 56.25 51 43C51 26 27 2 27 2Z" fill="#c8102e" />
            </svg>
            <span className="font-semibold text-[#222222]">BeTheHero</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#222222]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[#6a6a6a]">
            {step === "email" ? "Enter your email to receive a login code" : `We sent a code to ${email}`}
          </p>
        </div>

        <div className="bg-white border border-[#dddddd] rounded-2xl p-6"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-[#222222]">Email address</Label>
                <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-[#dddddd] text-[#222222] placeholder:text-[#929292] h-12 focus:border-[#222222] focus:ring-0 focus-visible:ring-0 focus-visible:border-[#222222]" />
              </div>
              {error && <p className="text-[#c13515] text-sm">{error}</p>}
              <Button type="submit" disabled={isPending}
                className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg">
                {isPending ? "Sending…" : "Send login code →"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-sm font-medium text-[#222222]">6-digit code</Label>
                <Input id="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" required
                  value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456"
                  className="border-[#dddddd] text-[#222222] text-center text-2xl tracking-widest h-14 focus:border-[#222222] focus:ring-0 focus-visible:ring-0 focus-visible:border-[#222222]" />
              </div>
              {error && <p className="text-[#c13515] text-sm">{error}</p>}
              <Button type="submit" disabled={isPending}
                className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg">
                {isPending ? "Verifying…" : "Verify →"}
              </Button>
              <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                className="w-full text-sm text-[#6a6a6a] hover:text-[#222222] text-center transition-colors">
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[#6a6a6a] mt-6">
          Not registered?{" "}
          <Link href="/register" className="text-[#c8102e] hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
