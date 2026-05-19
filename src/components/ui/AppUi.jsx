function cn(...values) {
  return values.filter(Boolean).join(" ");
}

export const appPageClassName = "mx-auto w-full max-w-[var(--page-max-width)] p-[var(--page-padding)] pb-28";
export const appCardClassName = "mb-2.5 overflow-hidden rounded-[28px] border border-slate-700/40 bg-[linear-gradient(180deg,rgba(22,28,38,0.98),rgba(15,22,35,0.98))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.24)]";
export const appNestedCardClassName = "rounded-[22px] border border-slate-700/40 bg-[#0d1420] p-4";
export const appNestedPanelClassName = "rounded-[22px] border border-slate-700/40 bg-[#0f1623] p-4";
export const appFlushCardClassName = "overflow-hidden rounded-[22px] border border-slate-700/40 bg-[#0d1420]";
export const appToggleHeaderClassName = "flex w-full items-center justify-between rounded-[20px] border border-white/6 bg-[#0d1420] px-4 py-3 text-left text-slate-50 transition-colors hover:bg-[#111a28]";
export const appInputClassName = "min-h-[42px] w-full rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50";
export const appSearchInputClassName = `${appInputClassName} pl-10 pr-3`;
export const appListRowClassName = "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors";
export const appRecipeOptionClassName = "grid gap-1 rounded-[18px] border px-4 py-3 text-left transition-colors";

export const appTypography = {
  title: "text-[clamp(1.9rem,7vw,2.4rem)] font-semibold tracking-[-0.05em] text-slate-50",
  sectionTitle: "text-sm font-semibold tracking-[-0.01em] text-slate-100",
  muted: "text-sm leading-6 text-slate-300",
  meta: "text-xs leading-5 text-slate-400",
  toggleTitle: "text-sm font-semibold text-slate-100",
  toggleSummary: "mt-1 text-xs leading-5 text-slate-400",
  fieldLabel: "text-xs font-semibold uppercase tracking-[0.16em]",
  number: "tabular-nums text-slate-50"
};

export const appButtonClassNames = {
  primary: "inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#f5b041] px-4 text-sm font-semibold text-slate-950 shadow-[0_10px_24px_rgba(245,176,65,0.18)]",
  action: "inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-400/20 bg-[#0d1420] px-4 text-sm font-semibold text-cyan-200",
  danger: "inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-rose-400/20 bg-[#1a1116] px-4 text-sm font-semibold text-rose-200",
  secondary: "inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-400/20 bg-[#0d1420] px-4 text-sm font-semibold text-cyan-200"
};

export function AppPage({ children, className = "" }) {
  return <main className={cn(appPageClassName, className)}>{children}</main>;
}

export function AppCard({ children, className = "" }) {
  return <section className={cn(appCardClassName, className)}>{children}</section>;
}

export function AppNestedCard({ children, className = "" }) {
  return <div className={cn(appNestedCardClassName, className)}>{children}</div>;
}

export function AppTitle({ children, className = "" }) {
  return <h1 className={cn(appTypography.title, className)}>{children}</h1>;
}

export function AppSectionTitle({ children, className = "" }) {
  return <h2 className={cn(appTypography.sectionTitle, className)}>{children}</h2>;
}

export function AppMutedText({ children, className = "" }) {
  return <p className={cn(appTypography.muted, className)}>{children}</p>;
}

export function AppMetaText({ children, className = "" }) {
  return <span className={cn(appTypography.meta, className)}>{children}</span>;
}

export function AppToggleHeader({ title, summary, isOpen, onToggle, className = "" }) {
  return (
    <button className={cn(appToggleHeaderClassName, className)} type="button" onClick={onToggle} aria-expanded={isOpen}>
      <div className="min-w-0">
        <div className={appTypography.toggleTitle}>{title}</div>
        {summary ? <div className={appTypography.toggleSummary}>{summary}</div> : null}
      </div>
      <strong className="ml-4 shrink-0 text-cyan-300">{isOpen ? "\u25B2" : "\u25B6"}</strong>
    </button>
  );
}

export function AppButton({ children, variant = "secondary", className = "", ...props }) {
  const variantClass = appButtonClassNames[variant] || appButtonClassNames.secondary;

  return (
    <button className={cn(variantClass, className)} {...props}>
      {children}
    </button>
  );
}

export function AppActionButton({ children, className = "", ...props }) {
  return (
    <AppButton className={className} variant="action" {...props}>
      {children}
    </AppButton>
  );
}

export function AppSecondaryButton({ children, className = "", ...props }) {
  return (
    <AppButton className={className} variant="secondary" {...props}>
      {children}
    </AppButton>
  );
}

export function AppDangerButton({ children, className = "", ...props }) {
  return (
    <AppButton className={className} variant="danger" {...props}>
      {children}
    </AppButton>
  );
}

export function AppInput({ as: Component = "input", className = "", ...props }) {
  return <Component className={cn(appInputClassName, className)} {...props} />;
}

export function AppSearchInput({ icon, className = "", ...props }) {
  return (
    <div className="relative">
      {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span> : null}
      <input className={cn(icon ? appSearchInputClassName : appInputClassName, className)} type="search" {...props} />
    </div>
  );
}

export function AppField({ label, tone = "default", children, className = "" }) {
  const toneClass = tone === "fat" ? "text-amber-300" : tone === "macro" ? "text-cyan-300" : "text-slate-300";

  return (
    <label className={cn("grid gap-2 rounded-[20px] border border-slate-700/40 bg-[#0d1420] p-4", className)}>
      <span className={cn(appTypography.fieldLabel, toneClass)}>{label}</span>
      {children}
    </label>
  );
}

export function AppListRow({ children, active = false, className = "", ...props }) {
  const stateClass = active ? "bg-cyan-400/8" : "bg-transparent hover:bg-slate-900/35";
  return (
    <button className={cn(appListRowClassName, stateClass, className)} type="button" {...props}>
      {children}
    </button>
  );
}

export function AppRecipeOption({ children, active = false, className = "", ...props }) {
  const stateClass = active ? "border-cyan-400/35 bg-cyan-400/10" : "border-slate-700/40 bg-[#0c131e] hover:bg-slate-900/60";
  return (
    <button className={cn(appRecipeOptionClassName, stateClass, className)} type="button" {...props}>
      {children}
    </button>
  );
}
