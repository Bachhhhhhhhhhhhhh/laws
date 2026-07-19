import type { DashboardStats } from "../lib/reconcile";

interface Props {
  stats: DashboardStats;
}

export function StatCards({ stats }: Props) {
  const cards = [
    { label: "Tổng văn bản", value: stats.tong, tone: "primary" },
    { label: "Có ảnh hưởng", value: stats.coAnhHuong, tone: "danger" },
    { label: "Không ảnh hưởng", value: stats.khongAnhHuong, tone: "ok" },
    { label: "Yêu cầu phản hồi", value: stats.coYeuCauPH, tone: "info" },
    { label: "Đã đủ PH", value: stats.daDu, tone: "ok" },
    { label: "Thiếu / lệch PH", value: stats.thieu + stats.chuaPhanHoi, tone: "warn" },
    { label: "Chưa phản hồi", value: stats.chuaPhanHoi, tone: "warn" },
    { label: "Quá hạn phản hồi", value: stats.quaHan, tone: "danger" },
  ];

  return (
    <div className="stat-grid">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card tone-${c.tone}`}>
          <div className="stat-value">{c.value}</div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
