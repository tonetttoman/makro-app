export function ProgressBar({ value, max, tone = "green", className = "", fillClassName = "" }) {
  const percent = max > 0 ? Math.min(140, (value / max) * 100) : 0;
  return (
    <div className={`progress h-[5px] w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.13)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] ${className}`} aria-label={`${Math.round(percent)} százalék`}>
      <span className={`progress__fill progress__fill--${tone} block h-full rounded-[inherit] transition-[width] duration-[180ms] ease-out ${fillClassName}`} style={{ width: `${percent}%` }} />
    </div>
  );
}