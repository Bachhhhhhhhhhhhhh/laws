import type { DoiChieuKetQua, VanBan } from "../types";
import { VAN_BAN_FIELD_LABELS } from "../types";

interface FillRate {
  field: keyof VanBan;
  filled: number;
  total: number;
  pct: number;
}

interface Props {
  fillRates: FillRate[];
  incomplete: DoiChieuKetQua[];
  onSelect: (row: DoiChieuKetQua) => void;
}

export function QualityPanel({ fillRates, incomplete, onSelect }: Props) {
  return (
    <div className="quality-grid">
      <section className="panel">
        <h3>Tỷ lệ điền từng cột (toàn bộ dữ liệu đã load)</h3>
        <div className="bar-list">
          {fillRates.map((f) => (
            <div key={f.field} className="bar-row">
              <span className="bar-label" title={f.field}>
                {VAN_BAN_FIELD_LABELS[f.field]}
              </span>
              <div className="bar-track">
                <div
                  className={`bar-fill ${f.pct < 50 ? "bar-fill-danger" : f.pct < 90 ? "bar-fill-soft" : "bar-fill-alt"}`}
                  style={{ width: `${f.pct}%` }}
                />
              </div>
              <span className="bar-value">
                {f.pct}% ({f.filled})
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>VB thiếu trường core (theo bộ lọc) — {incomplete.length}</h3>
        {incomplete.length === 0 ? (
          <div className="empty">Tất cả VB trong bộ lọc đã đủ trường core.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>PIC</th>
                  <th>%</th>
                  <th>Thiếu</th>
                </tr>
              </thead>
              <tbody>
                {incomplete.slice(0, 100).map((r) => (
                  <tr key={r.vanBan.id} onClick={() => onSelect(r)}>
                    <td className="mono">{r.vanBan.id}</td>
                    <td className="col-name">{r.vanBan.ten_van_ban}</td>
                    <td>{r.vanBan.pic}</td>
                    <td className="mono">{r.completeness}%</td>
                    <td className="muted small">
                      {r.missingFields.map((f) => VAN_BAN_FIELD_LABELS[f]).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
