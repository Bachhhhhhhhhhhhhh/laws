import type { BoPhanAgg } from "../lib/reconcile";
import type { DoiChieuKetQua } from "../types";

interface Props {
  rows: BoPhanAgg[];
  onOpenVanBan: (row: DoiChieuKetQua) => void;
}

export function BoPhanPanel({ rows, onOpenVanBan }: Props) {
  if (rows.length === 0) {
    return <div className="empty">Không có dữ liệu bộ phận theo bộ lọc hiện tại.</div>;
  }

  return (
    <div className="bophan-list">
      {rows.map((bp) => {
        const doneRate =
          bp.canPhanHoi === 0 ? 100 : Math.round(((bp.canPhanHoi - bp.thieu) / bp.canPhanHoi) * 100);
        return (
          <article key={bp.boPhan} className="bophan-card">
            <header className="bophan-header">
              <h3>{bp.boPhan}</h3>
              <div className="bophan-metrics">
                <span>
                  Cần PH: <strong>{bp.canPhanHoi}</strong>
                </span>
                <span>
                  Đã ghi nhận: <strong>{bp.daPhanHoi}</strong>
                </span>
                <span className={bp.thieu ? "text-warn" : "text-ok"}>
                  Thiếu: <strong>{bp.thieu}</strong>
                </span>
                <span className={bp.quaHan ? "text-danger" : undefined}>
                  Quá hạn: <strong>{bp.quaHan}</strong>
                </span>
              </div>
            </header>

            <div className="progress">
              <div className="progress-bar" style={{ width: `${doneRate}%` }} />
            </div>
            <div className="progress-label">{doneRate}% hoàn thành phản hồi (theo VB được giao)</div>

            {bp.vanBanThieu.length > 0 && (
              <details className="bophan-details">
                <summary>Văn bản còn thiếu phản hồi ({bp.vanBanThieu.length})</summary>
                <ul>
                  {bp.vanBanThieu.slice(0, 30).map((r) => (
                    <li key={`${bp.boPhan}-${r.vanBan.id}`}>
                      <button type="button" className="linkish" onClick={() => onOpenVanBan(r)}>
                        <span className="mono">{r.vanBan.id}</span> — {r.vanBan.ten_van_ban}
                        {r.quaHan ? " · quá hạn" : ""}
                      </button>
                    </li>
                  ))}
                  {bp.vanBanThieu.length > 30 ? (
                    <li className="muted">… và {bp.vanBanThieu.length - 30} VB khác</li>
                  ) : null}
                </ul>
              </details>
            )}
          </article>
        );
      })}
    </div>
  );
}
