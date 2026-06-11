const STAGES = ["registered", "confirmed", "checked_in", "donated"] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<Stage, string> = {
  registered: "Registered",
  confirmed:  "Confirmed",
  checked_in: "Checked In",
  donated:    "Donated",
};

export function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STAGES.indexOf(status as Stage);

  return (
    <div className="flex items-center gap-2 w-full max-w-sm mx-auto">
      {STAGES.map((stage, idx) => (
        <div key={stage} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${idx < currentIdx  ? "bg-[#c8102e] text-white" : ""}
              ${idx === currentIdx ? "bg-[#ff2442] text-white ring-2 ring-[#ff2442] ring-offset-2 ring-offset-[#070108]" : ""}
              ${idx > currentIdx  ? "bg-[rgba(200,16,46,0.15)] text-[rgba(253,240,238,0.3)]" : ""}
            `}>
              {idx < currentIdx ? "✓" : idx + 1}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${idx === currentIdx ? "text-[#ff2442]" : "text-[rgba(253,240,238,0.3)]"}`}>
              {STAGE_LABELS[stage]}
            </span>
          </div>
          {idx < STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mb-5 ${idx < currentIdx ? "bg-[#c8102e]" : "bg-[rgba(200,16,46,0.15)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
