export function ProgressBar({ value, max, tone = "green", className = "", fillClassName = "" }) {
  const percent = max > 0 ? Math.min(140, (value / max) * 100) : 0;
  const fillToneClass = tone === "amber"
    ? "bg-[linear-gradient(90deg,#f59e0b,var(--amber))] shadow-[0_0_16px_rgba(251,191,36,0.18)]"
    : "bg-[linear-gradient(90deg,#0891b2,var(--cyan))] shadow-[0_0_16px_rgba(56,189,248,0.22)]";

  return (
    <div className={`h-[5px] w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.13)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] ${className}`} aria-label={`${Math.round(percent)} százalék`}>
      <span className={`block h-full rounded-[inherit] transition-[width] duration-[180ms] ease-[ease] ${fillToneClass} ${fillClassName}`} style={{ width: `${percent}%` }} />
    </div>
  );
}