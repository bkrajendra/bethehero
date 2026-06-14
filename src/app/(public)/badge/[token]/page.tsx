import { getAttendeeByBadgeToken } from "@/lib/db/queries/attendees";
import { generateQRDataURL } from "@/lib/qr/generate";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const attendee = await getAttendeeByBadgeToken(token);
  return {
    title: attendee ? `${attendee.donor.fullName} — BeTheHero Badge` : "Badge Not Found — BeTheHero",
  };
}

export default async function BadgePage({ params }: Props) {
  const { token } = await params;
  const attendee = await getAttendeeByBadgeToken(token);

  if (!attendee) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white border border-[#dddddd] rounded-2xl p-8 text-center space-y-4"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>
          <div className="text-4xl">🔍</div>
          <h1 className="text-xl font-bold text-[#222222]">Badge not found</h1>
          <p className="text-sm text-[#6a6a6a]">This badge link may be expired or invalid.</p>
          <Link href="/" className="inline-block text-sm text-[#c8102e] hover:underline font-medium">← Back to home</Link>
        </div>
      </main>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bethehero.confluxsys.uk";
  const qrDataUrl = await generateQRDataURL(token, appUrl);

  const { donor, event } = attendee;
  const bloodGroup = attendee.bloodGroupAtEvent ?? donor.bloodGroup;

  const IST = { timeZone: "Asia/Kolkata" } as const;
  const eventDate = new Date(event.startAt).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", ...IST,
  });

  return (
    <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">

        {/* Badge card */}
        <div className="bg-white border border-[#dddddd] rounded-2xl overflow-hidden"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px" }}>

          {/* Red header strip */}
          <div className="bg-[#c8102e] px-6 pt-5 pb-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Image src="/logo.png" alt="BeTheHero" width={22} height={22} className="object-contain brightness-0 invert" />
              <span className="text-sm font-semibold opacity-90">BeTheHero</span>
            </div>
            <h1 className="text-xl font-bold leading-tight">{donor.fullName}</h1>
            {donor.company && (
              <p className="text-sm opacity-80 mt-0.5">{donor.company}</p>
            )}
            {bloodGroup && (
              <div className="inline-flex items-center mt-2 px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold tracking-wide">
                {bloodGroup}
              </div>
            )}
          </div>

          {/* QR code */}
          <div className="px-6 py-5 flex flex-col items-center gap-3">
            <div className="w-48 h-48 rounded-xl overflow-hidden border border-[#ebebeb] p-2 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Badge QR code" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-[#929292] text-center">Show this QR code at the event entrance</p>
          </div>

          {/* Event info */}
          <div className="border-t border-[#ebebeb] px-6 py-4 space-y-1">
            <p className="text-xs font-semibold text-[#222222]">{event.name}</p>
            <p className="text-xs text-[#6a6a6a]">{eventDate} · {event.venue}</p>
          </div>
        </div>

        <p className="text-center text-xs text-[#929292]">
          Already registered?{" "}
          <Link href="/login" className="text-[#c8102e] hover:underline">Log in to track your status</Link>
        </p>
      </div>
    </main>
  );
}
