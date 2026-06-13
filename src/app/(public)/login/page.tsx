"use client";
import { useState, useTransition, Suspense } from "react";
import { sendOtp, verifyOtp, signInWithProvider } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function LoginPageInner() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [oauthPending, setOauthPending] = useState<"google" | "github" | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  // Show auth_failed error if redirected back from callback
  const urlError = params.get("error");

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

  async function handleOAuth(provider: "google" | "github") {
    setError("");
    setOauthPending(provider);
    const res = await signInWithProvider(provider);
    if (res.error) { setError(res.error); setOauthPending(null); return; }
    if (res.url) window.location.href = res.url;
  }

  const anyPending = isPending || oauthPending !== null;

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
            {step === "email" ? "Sign in to view your donation status" : `We sent a code to ${email}`}
          </p>
        </div>

        <div className="bg-white border border-[#dddddd] rounded-2xl p-6 space-y-4"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>

          {(urlError || error) && (
            <p className="text-[#c13515] text-sm text-center">
              {urlError === "auth_failed" ? "Sign-in failed. Please try again." : error}
            </p>
          )}

          {step === "email" ? (
            <>
              {/* OAuth buttons */}
              <div className="space-y-2.5">
                <button onClick={() => handleOAuth("google")} disabled={anyPending}
                  className="w-full h-11 flex items-center justify-center gap-3 border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {oauthPending === "google" ? <Spinner /> : (
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
                    </svg>
                  )}
                  {oauthPending === "google" ? "Redirecting…" : "Continue with Google"}
                </button>

                <button onClick={() => handleOAuth("github")} disabled={anyPending}
                  className="w-full h-11 flex items-center justify-center gap-3 border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {oauthPending === "github" ? <Spinner /> : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  )}
                  {oauthPending === "github" ? "Redirecting…" : "Continue with GitHub"}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#ebebeb]" />
                <span className="text-xs text-[#929292]">or continue with email</span>
                <div className="flex-1 h-px bg-[#ebebeb]" />
              </div>

              {/* OTP form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-[#222222]">Email address</Label>
                  <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="border-[#dddddd] text-[#222222] placeholder:text-[#929292] h-12 focus:border-[#222222] focus:ring-0 focus-visible:ring-0 focus-visible:border-[#222222]" />
                </div>
                <Button type="submit" disabled={anyPending}
                  className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg">
                  {isPending ? <><Spinner /> Sending…</> : "Send login code →"}
                </Button>
              </form>
            </>
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
                {isPending ? <><Spinner /> Verifying…</> : "Verify →"}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
