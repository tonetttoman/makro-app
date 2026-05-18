import { BarChart3, Settings, Utensils } from "lucide-react";

const ITEMS = [
  { id: "today", label: "Mai", icon: Utensils },
  { id: "monthly", label: "Havi", icon: BarChart3 },
  { id: "data", label: "Adatok", icon: Settings }
];

export function BottomNav({ activeView, onChange }) {
  return (
    <nav
      className="fixed left-1/2 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[100] flex h-[72px] w-[min(calc(100%-24px),680px)] -translate-x-1/2 flex-row items-center justify-around rounded-[20px] border border-white/5 bg-[#161c26]/[0.92] px-4 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-[20px]"
      aria-label="Alsó navigáció"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-center border-0 bg-transparent p-0 transition-[color,transform] duration-200 ease-out ${
              isActive ? "text-[#f5b041]" : "text-[#8a99ad]"
            }`}
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