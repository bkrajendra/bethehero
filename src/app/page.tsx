import ParticleCanvas from "@/components/ParticleCanvas";

export default function Home() {
  return (
    <>
      {/* ── Background layers ── */}
      <div className="scene" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="grid-overlay" />
      <div className="grain" />
      <ParticleCanvas />

      {/* ── ECG top ── */}
      <svg className="ecg ecg-top" viewBox="0 0 1400 46" preserveAspectRatio="none">
        <path
          className="ep"
          d="M-10,23 L180,23 L210,5 L230,42 L250,5 L270,42 L290,23
             L460,23 L490,2 L512,44 L534,2 L556,44 L578,23
             L760,23 L792,7 L812,38 L832,7 L852,38 L872,23
             L1050,23 L1080,5 L1100,42 L1120,5 L1140,42 L1160,23 L1410,23"
        />
      </svg>

      {/* ── ECG bottom ── */}
      <svg className="ecg ecg-bot" viewBox="0 0 1400 46" preserveAspectRatio="none">
        <path
          className="ep ep2"
          d="M-10,23 L160,23 L188,40 L208,6 L228,40 L248,6 L268,23
             L440,23 L470,43 L492,3 L514,43 L536,3 L558,23
             L740,23 L772,41 L794,5 L816,41 L838,5 L860,23
             L1040,23 L1068,38 L1088,8 L1108,38 L1128,8 L1148,23 L1410,23"
        />
      </svg>

      {/* ── Main content ── */}
      <main className="page">

        {/* Live badge */}
        <div className="badge">
          <div className="badge-dot" />
          <span>Blood Donation Drive 2026</span>
        </div>

        {/* Blood drop icon */}
        <div className="drop-wrap">
          <svg
            className="drop-svg"
            viewBox="0 0 54 66"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M27 2C27 2 3 26 3 43C3 56.25 13.75 67 27 67C40.25 67 51 56.25 51 43C51 26 27 2 27 2Z"
              fill="url(#dg)"
              stroke="rgba(255,100,100,.18)"
              strokeWidth="0.8"
            />
            <path
              d="M27 13C27 13 11 31 11 43C11 51 17.5 58 25.5 59.5"
              stroke="rgba(255,255,255,.18)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <defs>
              <linearGradient id="dg" x1="27" y1="2" x2="27" y2="67" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#ff4460" />
                <stop offset="55%"  stopColor="#c8102e" />
                <stop offset="100%" stopColor="#700016" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Headline */}
        <h1 className="headline">
          <span className="hl-1">DONATE</span>
          <span className="hl-2">BLOOD</span>
        </h1>

        <p className="subtitle">One act of courage. Countless lives reborn.</p>

        {/* Date */}
        <div className="date-strip">
          <div className="dl dl-l" />
          <div>
            <div className="date-main">17 JUNE 2026</div>
            <div className="date-sub">Pune, Maharashtra</div>
          </div>
          <div className="dl dl-r" />
        </div>

        {/* Organizers */}
        <div className="orgs">
          <span className="org">Confluxsys Pvt Ltd</span>
          <div className="org-sep" />
          <span className="org">Janakalyan Rakta Pedhi</span>
        </div>

        {/* CTA */}
        <div className="cta-wrap">
          <a href="/register" className="cta">
            <div className="pr" />
            <div className="pr pr2" />
            <span className="cta-text">Register to Donate</span>
            <svg
              className="cta-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3 8H13M9 4l4 4-4 4"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        {/* Location */}
        <div className="loc">
          <svg
            className="loc-icon"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Confluxsys Pvt Ltd, Pune, Maharashtra
        </div>

      </main>
    </>
  );
}
