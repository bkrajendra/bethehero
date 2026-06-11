"use client";
import { useState, useTransition } from "react";
import { submitFeedback } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function FeedbackPage() {
  const { attendeeId } = useParams<{ attendeeId: string }>();
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("attendeeId", attendeeId);
    formData.set("rating", String(rating));
    startTransition(async () => {
      const res = await submitFeedback(formData);
      if (res.error) setError(res.error);
      else setSubmitted(true);
    });
  }

  if (submitted) return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="text-center space-y-4">
        <div className="text-5xl">🙏</div>
        <h2 className="text-2xl font-bold text-[#fdf0ee]">Thank you for your feedback!</h2>
        <Link href="/status" className={cn(buttonVariants(), "bg-[#c8102e] hover:bg-[#ff2442]")}>
          Back to status
        </Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full space-y-6">
        <h1 className="text-2xl font-bold text-[#fdf0ee] text-center">Share Your Experience</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-[#fdf0ee] mb-3">How was your experience? *</p>
            <div className="flex gap-3 justify-center">
              {RATINGS.map(r => (
                <button key={r} type="button" onClick={() => setRating(r)}
                  className={`w-12 h-12 rounded-full text-xl transition-all ${rating >= r ? "bg-[#c8102e] scale-110" : "bg-[rgba(200,16,46,0.15)]"}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <textarea name="comment" rows={3} placeholder="Any comments? (optional)"
              className="w-full rounded-md border border-[rgba(200,16,46,0.3)] bg-transparent text-[#fdf0ee] px-3 py-2 text-sm placeholder:text-[rgba(253,240,238,0.28)] resize-none" />
          </div>
          <div>
            <p className="text-[#fdf0ee] mb-2">Would you donate again?</p>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="wouldDonateAgain" value={v} className="accent-[#c8102e]" />
                  <span className="text-[rgba(253,240,238,0.55)] capitalize">{v}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-[#ff2442] text-sm">{error}</p>}
          <Button type="submit" disabled={isPending || rating === 0}
            className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
            {isPending ? "Submitting…" : "Submit Feedback →"}
          </Button>
        </form>
      </div>
    </main>
  );
}
