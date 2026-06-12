"use client";
import { useState, useTransition } from "react";
import { sendAdminOtp, verifyAdminOtp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [step, setStep] = useState<"email"|"otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleEmail(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const res = await sendAdminOtp(email);
      if (res.error) setError(res.error); else setStep("otp");
    });
  }

  function handleOtp(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const res = await verifyAdminOtp(email, otp);
      if (res.error) setError(res.error); else router.push("/admin");
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c8102e] text-white text-2xl mb-4 shadow-lg shadow-red-100">
            🩸
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="mt-1 text-sm text-gray-400">BeTheHero Admin Panel</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {step === "email" ? (
            <form onSubmit={handleEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-sm">Admin Email</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="border-gray-200 text-gray-900 placeholder:text-gray-300" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#a50d27] text-white">
                {isPending ? "Sending…" : "Send Login Code →"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-sm">6-Digit Code</Label>
                <p className="text-xs text-gray-400">Sent to {email}</p>
                <Input type="text" inputMode="numeric" pattern="[0-9]{6}" required
                  value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456"
                  className="border-gray-200 text-gray-900 text-center text-2xl tracking-widest" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#a50d27] text-white">
                {isPending ? "Verifying…" : "Verify →"}
              </Button>
              <button type="button" onClick={() => setStep("email")}
                className="w-full text-xs text-gray-400 hover:text-gray-600 text-center mt-2">
                ← Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
