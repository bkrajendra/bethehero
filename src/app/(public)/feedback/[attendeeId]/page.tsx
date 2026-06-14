"use client";
import { useState, useTransition } from "react";
import { submitFeedback } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 text-center space-y-4"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-3xl">🙏</div>
          <h2 className="text-xl font-bold text-[#222222]">Thank you!</h2>
          <p className="text-sm text-[#6a6a6a]">Your feedback helps us improve the experience.</p>
          <Link href="/status"
            className="inline-flex items-center justify-center w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg text-sm transition-colors">
            Back to status
          </Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-[#dddddd] rounded-2xl p-6 space-y-6"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          <h1 className="text-xl font-bold text-[#222222] text-center">Share your experience</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-sm font-medium text-[#222222] mb-3">Overall rating *</p>
              <div className="flex gap-2 justify-center">
                {RATINGS.map(r => (
                  <button key={r} type="button" onClick={() => setRating(r)}
                    className={`w-12 h-12 rounded-full text-xl transition-all border-2 ${
                      rating >= r
                        ? "bg-[#c8102e] border-[#c8102e] text-white scale-105"
                        : "bg-white border-[#dddddd] text-[#929292] hover:border-[#c8102e]"
                    }`}>
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#222222] block mb-1.5">Comments</label>
              <Textarea name="comment" rows={3} placeholder="Any comments? (optional)"
                className="border-[#dddddd] text-[#222222] placeholder:text-[#929292] resize-none" />
            </div>

            <div>
              <p className="text-sm font-medium text-[#222222] mb-2">Would you donate again?</p>
              <div className="flex gap-4">
                {(["yes", "no"] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="wouldDonateAgain" value={v} className="accent-[#c8102e]" />
                    <span className="text-sm text-[#3f3f3f] capitalize">{v}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-[#c13515] text-sm">{error}</p>}

            <Button type="submit" disabled={isPending || rating === 0}
              className="w-full h-12 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium rounded-lg disabled:opacity-50">
              {isPending ? "Submitting…" : "Submit feedback →"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
