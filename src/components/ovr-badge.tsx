export function OvrBadge({ value, compact = false }: { value: number; compact?: boolean }) {
  const tone = value >= 70 ? "from-[#f5cf56] to-[#b88716] text-[#181205]" : value >= 65 ? "from-[#8b5cf6] to-[#5630a8] text-white" : "from-[#ef626c] to-[#9d2835] text-white";
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tone} ${compact ? "h-12 w-12" : "h-16 w-16"}`}>
      <div className="text-center leading-none">
        <div className={compact ? "text-xl font-black" : "text-3xl font-black"}>{value}</div>
        <div className="mt-0.5 text-[0.48rem] font-black tracking-[0.15em]">OVR</div>
      </div>
    </div>
  );
}
