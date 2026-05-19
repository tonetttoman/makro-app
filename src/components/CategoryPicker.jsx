export function CategoryPicker({ categories, activeCategory, onSelect }) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Étel kategóriák">
      {categories.map((category) => {
        const isActive = category === activeCategory;
        return (
          <button
            className={`shrink-0 rounded-full border px-3 py-2 text-[0.78rem] font-semibold transition-colors ${
              isActive
                ? "border-amber-300/50 bg-amber-400/15 text-amber-300"
                : "border-slate-700/40 bg-slate-950/45 text-slate-400 hover:border-cyan-400/40"
            }`}
            key={category}
            type="button"
            onClick={() => onSelect(category)}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}