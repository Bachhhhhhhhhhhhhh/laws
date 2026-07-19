export function DeptChips({
  items,
  tone = "default",
  empty = "—",
}: {
  items: string[];
  tone?: "default" | "ok" | "warn" | "danger" | "info";
  empty?: string;
}) {
  if (!items.length) return <span className="muted">{empty}</span>;
  return (
    <span className="chip-row">
      {items.map((d) => (
        <span key={d} className={`chip chip-${tone}`}>
          {d}
        </span>
      ))}
    </span>
  );
}
