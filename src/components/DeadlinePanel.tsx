import type { DoiChieuKetQua } from "../types";
import { DEADLINE_LABEL } from "../lib/reconcile";
import { formatDate } from "../lib/parse";
import { StatusBadge } from "./StatusBadge";

interface Props {
  rows: DoiChieuKetQua[];
  onSelect: (row: DoiChieuKetQua) => void;
}

const ORDER = ["qua_han", "hom_nay", "3_ngay", "7_ngay", "sau", "khong_han"] as const;

export function DeadlinePanel({ rows, onSelect }: Props) {
  const groups = ORDER.map((bucket) => ({
    bucket,
    items: rows
      .filter((r) => r.deadlineBucket === bucket)
      .sort((a, b) => (a.ngayDeadline?.getTime() ?? 0) - (b.ngayDeadline?.getTime() ?? 0)),
  })).filter((g) => g.items.length > 0);

  if (!groups.length) return <div className="empty">Không có dữ liệu hạn phản hồi.</div>;

  return (
    <div className="deadline-board">
      {groups.map((g) => (
        <section key={g.bucket} className={`deadline-col bucket-${g.bucket}`}>
          <header>
            <h3>{DEADLINE_LABEL[g.bucket]}</h3>
            <span className="tab-count">{g.items.length}</span>
          </header>
          <ul>
            {g.items.map((r) => (
              <li key={`${g.bucket}-${r.vanBan.id}`}>
                <button type="button" className="deadline-card" onClick={() => onSelect(r)}>
                  <div className="deadline-card-top">
                    <span className="mono">{r.vanBan.id}</span>
                    <span className="muted">{formatDate(r.ngayDeadline)}</span>
                  </div>
                  <div className="deadline-title">{r.vanBan.ten_van_ban}</div>
                  <div className="deadline-meta">
                    <span>{r.vanBan.pic}</span>
                    <StatusBadge status={r.trangThai} quaHan={r.quaHan} />
                  </div>
                  {r.thieu.length > 0 && (
                    <div className="muted small">Thiếu: {r.thieu.join(", ")}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
