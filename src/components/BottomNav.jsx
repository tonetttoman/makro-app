import { BarChart3, CalendarDays, ClipboardList, Database, Utensils } from "lucide-react";

const ITEMS = [
  { id: "today", label: "Mai", icon: Utensils },
  { id: "daily", label: "Napi", icon: ClipboardList },
  { id: "weekly", label: "Heti", icon: BarChart3 },
  { id: "monthly", label: "Havi", icon: CalendarDays },
  { id: "data", label: "Adatok", icon: Database }
];

export function BottomNav({ activeView, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Alsó navigáció">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={activeView === item.id ? "is-active" : ""}
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
