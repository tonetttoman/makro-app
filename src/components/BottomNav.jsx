import { BarChart3, Settings, Utensils } from "lucide-react";

const ITEMS = [
  { id: "today", label: "Mai", icon: Utensils, column: 1 },
  { id: "monthly", label: "Havi", icon: BarChart3, column: 3 },
  { id: "data", label: "Adatok", icon: Settings, column: 5 }
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
            style={{ gridColumn: item.column }}
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            title={item.label}
          >
            <Icon size={20} aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
