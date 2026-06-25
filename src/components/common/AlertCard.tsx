type AlertCardProps = {
  title: string;
  message: string;
  status: "Due soon" | "Overdue" | "Warning" | "Reminder" | "Info";
};

export function AlertCard({ title, message, status }: AlertCardProps) {
  return (
    <article className={`alert-card ${status.toLowerCase().replace(" ", "-")}`}>
      <span>{status}</span>
      <h3>{title}</h3>
      <p>{message}</p>
    </article>
  );
}
