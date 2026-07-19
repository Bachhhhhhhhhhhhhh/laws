import type { DashboardStats } from "../lib/reconcile";

interface Props {
  stats: DashboardStats;
}

export function StatCards({ stats }: Props) {
  const cards = [
    { label: "Tổng văn bản", value: stats.tong, tone: "primary" },
    { label: "Có ảnh hưởng", value: stats.coAnhHuong, tone: "danger" },
    { label: "Không ảnh hưởng", value: stats.khongAnhHuong, tone: "ok" },
    { label: "Chưa đánh giá AH", value: stats.chuaDanhGia, tone: "muted" },
    { label: "Yêu cầu phản hồi", value: stats.coYeuCauPH, tone: "info" },
    { label: "Đã đủ PH", value: stats.daDu, tone: "ok" },
    { label: "Thiếu / lệch PH", value: stats.thieu + stats.chuaPhanHoi, tone: "warn" },
    { label: "Chưa phản hồi", value: stats.chuaPhanHoi, tone: "warn" },
    { label: "Quá hạn PH", value: stats.quaHan, tone: "danger" },
    { label: "Hết hạn ≤3 ngày", value: stats.sapDenHan3, tone: "warn" },
    { label: "Dự thảo", value: stats.duThao, tone: "info" },
    { label: "Đã ban hành", value: stats.daBanHanh, tone: "ok" },
    { label: "Có file so sánh", value: stats.coFileSoSanh, tone: "info" },
    { label: "Độ đầy đủ TB", value: `${stats.avgCompleteness}%`, tone: "primary" },
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
