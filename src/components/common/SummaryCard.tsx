type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "good" | "warning" | "danger" | "info";
};

export function SummaryCard({ label, value, detail, tone = "neutral" }: SummaryCardProps) {
  return (
    <article className={`summary-card ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}
