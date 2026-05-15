export function CategoryPicker({ categories, activeCategory, onSelect }) {
  return (
    <div className="category-scroll" aria-label="Étel kategóriák">
      {categories.map((category) => (
        <button
          className={`category-pill ${category === activeCategory ? "is-active" : ""}`}
          key={category}
          type="button"
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
