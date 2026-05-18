function cn(...values) {
  return values.filter(Boolean).join(" ");
}

const cardBase = "panel mb-3.5 rounded-[28px] border border-slate-700/40 bg-[linear-gradient(180deg,rgba(22,28,38,0.98),rgba(15,22,35,0.98))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.24)]";
const toggleBase = "flex w-full items-center justify-between rounded-[20px] border border-white/6 bg-[#0d1420] px-4 py-3 text-left text-slate-50 transition-colors hover:bg-[#111a28]";
const inputBase = "min-h-[42px] w-full rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50";

export function AppPage({ children, className = "" }) {
  return <main className={cn("page page--data pb-28", className)}>{children}</main>;
}

export function AppCard({ children, className = "" }) {
  return <section className={cn(cardBase, className)}>{children}</section>;
}

export function AppTitle({ children, className = "" }) {
  return <h1 className={cn("text-[clamp(1.9rem,7vw,2.4rem)] font-semibold tracking-[-0.05em] text-slate-50", className)}>{children}</h1>;
}

export function AppSectionTitle({ children, className = "" }) {
  return <h2 className={cn("text-sm font-semibold tracking-[-0.01em] text-slate-100", className)}>{children}</h2>;
}

export function AppMutedText({ children, className = "" }) {
  return <p className={cn("text-sm leading-6 text-slate-300", className)}>{children}</p>;
}

export function AppMetaText({ children, className = "" }) {
  return <span className={cn("text-xs leading-5 text-slate-400", className)}>{children}</span>;
}

export function AppToggleHeader({ title, summary, isOpen, onToggle, className = "" }) {
  return (
    <button className={cn(toggleBase, className)} type="button" onClick={onToggle} aria-expanded={isOpen}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        {summary ? <div className="mt-1 text-xs leading-5 text-slate-400">{summary}</div> : null}
      </div>
      <strong className="ml-4 shrink-0 text-cyan-300">{isOpen ? "▲" : "▶"}</strong>
    </button>
  );
}

export function AppButton({ children, variant = "secondary", className = "", ...props }) {
  const variantClass =
    variant === "primary"
      ? "inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#f5b041] px-4 text-sm font-semibold text-slate-950 shadow-[0_10px_24px_rgba(245,176,65,0.18)]"
      : variant === "action"
        ? "inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-400/20 bg-[#0d1420] px-4 text-sm font-semibold text-cyan-200"
      : variant === "danger"
        ? "inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-rose-400/20 bg-[#1a1116] px-4 text-sm font-semibold text-rose-200"
        : "inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-400/20 bg-[#0d1420] px-4 text-sm font-semibold text-cyan-200";

  return (
    <button className={cn(variantClass, className)} {...props}>
      {children}
    </button>
  );
}

export function AppField({ label, tone = "default", children, className = "" }) {
  const toneClass = tone === "fat" ? "text-amber-300" : tone === "macro" ? "text-cyan-300" : "text-slate-300";

  return (
    <label className={cn("grid gap-2 rounded-[20px] border border-slate-700/40 bg-[#0d1420] p-4", className)}>
      <span className={cn("text-xs font-semibold uppercase tracking-[0.16em]", toneClass)}>{label}</span>
      {children}
    </label>
  );
}

export const appInputClassName = inputBase;
