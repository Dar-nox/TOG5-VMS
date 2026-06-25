type PlaceholderSectionProps = {
  title: string;
  description: string;
  items?: string[];
};

export function PlaceholderSection({ title, description, items = [] }: PlaceholderSectionProps) {
  return (
    <section className="placeholder-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {items.length > 0 ? (
        <ul className="rule-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
