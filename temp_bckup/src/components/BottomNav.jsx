import { BarChart3, Settings, Utensils } from "lucide-react";

const ITEMS = [
  { id: "today", label: "Mai", icon: Utensils },
  { id: "monthly", label: "Havi", icon: BarChart3 },
  { id: "data", label: "Adatok", icon: Settings }
];

// Prémium beágyazott stílusok a navigációnak
const navStyle = {
  position: "fixed",
  left: "50%",
  bottom: "calc(12px + env(safe-area-inset-bottom))",
  zIndex: 100,
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  width: "min(calc(100% - 24px), 680px)",
  height: "72px",
  padding: "0 16px",
  backgroundColor: "rgba(22, 28, 38, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "20px",
  boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
  transform: "translateX(-50%)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)"
};

const buttonBaseStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  transition: "color 180ms ease, transform 180ms ease"
};

export function BottomNav({ activeView, onChange }) {
  return (
    <nav style={navStyle} aria-label="Alsó navigáció">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        
        return (
          <button
            key={item.id}
            type="button"
            style={{
              ...buttonBaseStyle,
              color: isActive ? "#f5b041" : "#8a99ad"
            }}
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            title={item.label}
          >
            <Icon size={22} aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}