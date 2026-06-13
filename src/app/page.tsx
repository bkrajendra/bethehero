import Link from "next/link";
import { getActiveEvent } from "@/lib/db/queries/events";

export default async function Home() {
  const event = await getActiveEvent();

  const IST = { timeZone: "Asia/Kolkata" } as const;
  const eventDate = event
    ? new Date(event.startAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", ...IST })
    : null;
  const eventTime = event
    ? `${new Date(event.startAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", ...IST })} – ${new Date(event.endAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", ...IST })}`
    : null;
  const eventHeroBadge = event
    ? `${new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", ...IST })} · ${event.venue}`
    : null;
  const dos: string[] = Array.isArray(event?.instructionsDos) && event.instructionsDos.length > 0
    ? event.instructionsDos as string[]
    : ["Eat a healthy meal 2–3 hours before", "Drink plenty of water", "Get a good night's sleep", "Carry a valid photo ID"];
  const donts: string[] = Array.isArray(event?.instructionsDonts) && event.instructionsDonts.length > 0
    ? event.instructionsDonts as string[]
    : ["Avoid alcohol 24 hours before", "Don't donate on an empty stomach", "Avoid fatty food before donating", "Don't donate if you feel unwell"];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-[#dddddd] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <svg width="28" height="34" viewBox="0 0 54 66" fill="none">
            <path d="M27 2C27 2 3 26 3 43C3 56.25 13.75 67 27 67C40.25 67 51 56.25 51 43C51 26 27 2 27 2Z"
              fill="url(#hg)" />
            <defs>
              <linearGradient id="hg" x1="27" y1="2" x2="27" y2="67" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e8384f" />
                <stop offset="100%" stopColor="#a50d27" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-semibold text-[#222222] text-lg tracking-tight">BeTheHero</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-[#6a6a6a] hover:text-[#222222] transition-colors">
            Log in
          </Link>
          <Link href="/register"
            className="text-sm font-medium bg-[#c8102e] hover:bg-[#a50d27] text-white px-4 py-2 rounded-lg transition-colors">
            Register
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#c8102e] text-xs font-semibold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c8102e] animate-pulse" />
          {eventHeroBadge ?? "Blood Donation Drive"}
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-[#222222] leading-tight mb-6 tracking-tight">
          Give blood.<br />
          <span className="text-[#c8102e]">Save lives.</span>
        </h1>
        <p className="text-xl text-[#6a6a6a] max-w-lg mx-auto leading-relaxed mb-10">
          {event
            ? `Join the ${event.name} and help save up to three lives with a single donation.`
            : "Join our blood donation drive and help save up to three lives with a single donation."}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="inline-flex items-center justify-center gap-2 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium px-8 py-3.5 rounded-lg text-base transition-colors shadow-sm">
            Register to Donate
            <span>→</span>
          </Link>
          <Link href="/login"
            className="inline-flex items-center justify-center gap-2 border border-[#dddddd] hover:border-[#222222] text-[#222222] font-medium px-8 py-3.5 rounded-lg text-base transition-colors">
            Check My Status
          </Link>
        </div>
      </section>

      {/* Impact numbers */}
      <section className="border-y border-[#ebebeb] bg-[#f7f7f7]">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "3", label: "Lives saved per donation" },
            { value: "1 day", label: "All it takes" },
            { value: "500+", label: "Expected donors" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold text-[#c8102e]">{value}</p>
              <p className="text-sm text-[#6a6a6a] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Event details */}
      {event && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#222222] mb-8">Event Details</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: "📅", title: "Date",  detail: eventDate! },
              { icon: "⏰", title: "Time",  detail: eventTime! },
              { icon: "📍", title: "Venue", detail: event.address },
            ].map(({ icon, title, detail }) => (
              <div key={title} className="border border-[#ebebeb] rounded-xl p-6 bg-white"
                style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
                <div className="text-2xl mb-3">{icon}</div>
                <p className="text-xs text-[#929292] uppercase tracking-widest font-medium mb-1">{title}</p>
                <p className="text-[#222222] font-medium">{detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Eligibility */}
      <section className="bg-[#f7f7f7] border-t border-[#ebebeb]">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#222222] mb-8">Before you donate</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-[#222222] mb-4 flex items-center gap-2">
                <span className="text-green-600">✓</span> Do&apos;s
              </h3>
              <ul className="space-y-3">
                {dos.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#3f3f3f]">
                    <span className="text-green-500 mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#222222] mb-4 flex items-center gap-2">
                <span className="text-[#c8102e]">✕</span> Don&apos;ts
              </h3>
              <ul className="space-y-3">
                {donts.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#3f3f3f]">
                    <span className="text-[#c8102e] mt-0.5">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-[#222222] mb-4">Ready to be a hero?</h2>
        <p className="text-[#6a6a6a] mb-8 max-w-md mx-auto">Register now to secure your spot. It takes less than a minute.</p>
        <Link href="/register"
          className="inline-flex items-center gap-2 bg-[#c8102e] hover:bg-[#a50d27] text-white font-medium px-10 py-4 rounded-lg text-base transition-colors">
          Register to Donate
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ebebeb] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="24" viewBox="0 0 54 66" fill="none">
              <path d="M27 2C27 2 3 26 3 43C3 56.25 13.75 67 27 67C40.25 67 51 56.25 51 43C51 26 27 2 27 2Z" fill="#c8102e" />
            </svg>
            <span className="text-sm font-medium text-[#222222]">BeTheHero</span>
          </div>
          <p className="text-xs text-[#929292] text-center">
            {event ? (
              <>Organised by <strong className="text-[#6a6a6a]">{event.organiserName}</strong> in association with <strong className="text-[#6a6a6a]">{event.bloodBankName}</strong></>
            ) : "BeTheHero Blood Donation Platform"}
          </p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-[#929292]">© 2026 BeTheHero</p>
            <Link href="/privacy" className="text-xs text-[#929292] hover:text-[#c8102e] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-[#929292] hover:text-[#c8102e] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
