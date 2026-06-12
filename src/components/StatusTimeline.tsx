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
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2
              ${idx < currentIdx  ? "bg-[#c8102e] border-[#c8102e] text-white" : ""}
              ${idx === currentIdx ? "bg-[#c8102e] border-[#c8102e] text-white ring-2 ring-[#c8102e]/20 ring-offset-2" : ""}
              ${idx > currentIdx  ? "bg-white border-[#dddddd] text-[#929292]" : ""}
            `}>
              {idx < currentIdx ? "✓" : idx + 1}
            </div>
            <span className={`text-[10px] whitespace-nowrap font-medium
              ${idx === currentIdx ? "text-[#c8102e]" : idx < currentIdx ? "text-[#222222]" : "text-[#929292]"}`}>
              {STAGE_LABELS[stage]}
            </span>
          </div>
          {idx < STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mb-5 ${idx < currentIdx ? "bg-[#c8102e]" : "bg-[#ebebeb]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
