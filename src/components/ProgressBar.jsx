export function ProgressBar({ value, max, tone = "green" }) {
  const percent = max > 0 ? Math.min(140, (value / max) * 100) : 0;
  return (
    <div className="progress" aria-label={`${Math.round(percent)} százalék`}>
      <span className={`progress__fill progress__fill--${tone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
