import Link from "next/link";

export const metadata = { title: "Terms of Service — BeTheHero" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <Link href="/" className="text-sm text-[#c8102e] hover:underline">← Back to home</Link>
          <h1 className="text-3xl font-bold text-[#222222] mt-4">Terms of Service</h1>
          <p className="text-sm text-[#929292] mt-1">Last updated: June 2026</p>
        </div>

        <div className="bg-white border border-[#dddddd] rounded-2xl p-8 space-y-6 text-[#444444] text-sm leading-relaxed"
          style={{ boxShadow: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px" }}>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">1. Acceptance</h2>
            <p>By registering on BeTheHero, you agree to these Terms of Service. If you do not agree, please do not use this platform.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">2. What BeTheHero is</h2>
            <p>BeTheHero is a platform that facilitates blood donation drive registration and management. It is operated by Confluxsys and used by organisations to run donation camps. We are not a medical provider or blood bank.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">3. Eligibility</h2>
            <p>You must be at least 18 years old and medically eligible to donate blood under applicable guidelines. By registering, you confirm you meet the eligibility criteria set by the event organiser and blood bank.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">4. Your account</h2>
            <p>You are responsible for keeping your login credentials secure. You must provide accurate information during registration. We reserve the right to remove accounts with false or misleading information.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">5. Consent to contact</h2>
            <p>By registering, you consent to receive transactional emails related to your donation — confirmation, reminders, and your certificate. You will not receive marketing emails.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">6. Health information</h2>
            <p>You voluntarily provide your blood group and date of birth to facilitate donation. This information is used solely for event management and certificate generation and is not shared with third parties.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">7. Certificates</h2>
            <p>Donation certificates are issued based on records captured by event administrators. BeTheHero and Confluxsys are not liable for certificate disputes — please contact the event organiser directly.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">8. Limitation of liability</h2>
            <p>BeTheHero provides this platform as-is. We are not liable for any damages arising from your participation in a donation event, use of the platform, or reliance on information displayed on this site.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">9. Changes</h2>
            <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">10. Contact</h2>
            <p>For any questions about these terms, contact us at <a href="mailto:hello@confluxsys.com" className="text-[#c8102e] hover:underline">hello@confluxsys.com</a>.</p>
          </section>

        </div>
      </div>
    </main>
  );
}
