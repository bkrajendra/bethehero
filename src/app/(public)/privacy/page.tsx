import Link from "next/link";

export const metadata = { title: "Privacy Policy — BeTheHero" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <Link href="/" className="text-sm text-[#c8102e] hover:underline">← Back to home</Link>
          <h1 className="text-3xl font-bold text-[#222222] mt-4">Privacy Policy</h1>
          <p className="text-sm text-[#929292] mt-1">Last updated: June 2026</p>
        </div>

        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 space-y-6 text-[#444444] text-sm leading-relaxed"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px" }}>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">1. Who we are</h2>
            <p>BeTheHero is a blood donation drive management platform operated by Confluxsys. We help donors register for blood donation events and enable organisers to manage those events.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">2. Information we collect</h2>
            <ul className="list-disc list-inside space-y-1 text-[#6a6a6a]">
              <li><strong className="text-[#444]">Account information</strong> — name, email address, mobile number</li>
              <li><strong className="text-[#444]">Health information</strong> — blood group, date of birth (used solely for donation eligibility)</li>
              <li><strong className="text-[#444]">Organisation</strong> — company or employer name (optional)</li>
              <li><strong className="text-[#444]">Event participation</strong> — donation status, check-in records, certificates issued</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">3. How we use your information</h2>
            <ul className="list-disc list-inside space-y-1 text-[#6a6a6a]">
              <li>To register you for blood donation events</li>
              <li>To send confirmation, reminder, and certificate emails</li>
              <li>To generate your QR badge for event check-in</li>
              <li>To issue your certificate of blood donation</li>
              <li>To allow event administrators to manage attendance</li>
            </ul>
            <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">4. Authentication</h2>
            <p>We use Supabase Auth for secure sign-in. You may sign in via email OTP, Google, or GitHub. We only receive your email address and public profile name from these providers — we do not access your contacts, posts, or any other data.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">5. Data storage</h2>
            <p>Your data is stored on Supabase (PostgreSQL), hosted on secure cloud infrastructure. All data is encrypted in transit (HTTPS) and at rest.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">6. Your rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href="mailto:hello@confluxsys.com" className="text-[#c8102e] hover:underline">hello@confluxsys.com</a>. Deletion of your account removes all personal data from our systems.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">7. Cookies</h2>
            <p>We use session cookies for authentication only. We do not use tracking, advertising, or analytics cookies.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">8. Contact</h2>
            <p>For any privacy-related questions, contact us at <a href="mailto:hello@confluxsys.com" className="text-[#c8102e] hover:underline">hello@confluxsys.com</a>.</p>
          </section>

        </div>
      </div>
    </main>
  );
}
