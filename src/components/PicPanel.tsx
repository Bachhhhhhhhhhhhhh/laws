import type { PicAgg } from "../lib/reconcile";
import type { DoiChieuKetQua } from "../types";

interface Props {
  rows: PicAgg[];
  onOpenVanBan: (row: DoiChieuKetQua) => void;
}

export function PicPanel({ rows, onOpenVanBan }: Props) {
  if (!rows.length) return <div className="empty">Không có dữ liệu PIC.</div>;

  return (
    <div className="bophan-list">
      {rows.map((p) => (
        <article key={p.pic} className="bophan-card">
          <header className="bophan-header">
            <h3>{p.pic}</h3>
            <div className="bophan-metrics">
              <span>
                Tổng VB: <strong>{p.tong}</strong>
              </span>
              <span>
                Ảnh hưởng: <strong>{p.coAnhHuong}</strong>
              </span>
              <span className={p.thieu ? "text-warn" : "text-ok"}>
                Thiếu/chưa PH: <strong>{p.thieu}</strong>
              </span>
              <span className={p.quaHan ? "text-danger" : undefined}>
                Quá hạn: <strong>{p.quaHan}</strong>
              </span>
              <span>
                Dự thảo: <strong>{p.duThao}</strong>
              </span>
              <span>
                Đầy đủ TB: <strong>{p.avgCompleteness}%</strong>
              </span>
            </div>
          </header>
          <div className="progress">
            <div
              className="progress-bar"
              style={{
                width: `${Math.round(((p.tong - p.thieu) / Math.max(1, p.tong)) * 100)}%`,
              }}
            />
          </div>
          <div className="progress-label">
            {Math.round(((p.tong - p.thieu) / Math.max(1, p.tong)) * 100)}% VB không còn thiếu PH
          </div>

          <details className="bophan-details" open={p.quaHan > 0 || p.thieu > 0}>
            <summary>
              Ưu tiên xử lý ({p.vanBan.filter((r) => r.quaHan || ["thieu", "chua_phan_hoi", "lech"].includes(r.trangThai)).length})
            </summary>
            <ul>
              {p.vanBan
                .filter((r) => r.quaHan || ["thieu", "chua_phan_hoi", "lech"].includes(r.trangThai))
                .slice(0, 40)
                .map((r) => (
                  <li key={`${p.pic}-${r.vanBan.id}`}>
                    <button type="button" className="linkish" onClick={() => onOpenVanBan(r)}>
                      <span className="mono">{r.vanBan.id}</span> — {r.vanBan.ten_van_ban}
                      {r.quaHan ? " · quá hạn" : ""}
                    </button>
                  </li>
                ))}
            </ul>
          </details>
        </article>
      ))}
    </div>
  );
}
