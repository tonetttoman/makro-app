export function PlaceholderView({ title, children }) {
  return (
    <main className="page">
      <section className="panel placeholder">
        <p className="eyebrow">Előkészített modul</p>
        <h1>{title}</h1>
        <p>{children}</p>
      </section>
    </main>
  );
}
