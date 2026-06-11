"use client";
import { useState, useTransition } from "react";
import { sendOtp, verifyOtp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#fdf0ee]">Welcome back</h1>
          <p className="mt-2 text-[rgba(253,240,238,0.55)]">
            {step === "email" ? "Enter your email to receive a login code" : `Check ${email} for your 6-digit code`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#fdf0ee]">Email</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
            </div>
            {error && <p className="text-[#ff2442] text-sm">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
              {isPending ? "Sending…" : "Send Login Code →"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-[#fdf0ee]">6-Digit Code</Label>
              <Input id="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" required
                value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] text-center text-2xl tracking-widest" />
            </div>
            {error && <p className="text-[#ff2442] text-sm">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
              {isPending ? "Verifying…" : "Verify →"}
            </Button>
            <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              className="w-full text-sm text-[rgba(253,240,238,0.28)] hover:text-[rgba(253,240,238,0.55)]">
              Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
