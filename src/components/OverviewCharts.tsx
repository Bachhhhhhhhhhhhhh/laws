import type { DoiChieuKetQua } from "../types";
import { TRANG_THAI_LABEL } from "../lib/reconcile";
import type { TrangThaiDoiChieu } from "../types";

interface Props {
  results: DoiChieuKetQua[];
}

export function OverviewCharts({ results }: Props) {
  const byStatus = new Map<TrangThaiDoiChieu, number>();
  const byPic = new Map<string, number>();
  const byThang = new Map<string, number>();

  for (const r of results) {
    byStatus.set(r.trangThai, (byStatus.get(r.trangThai) ?? 0) + 1);
    if (r.vanBan.pic) byPic.set(r.vanBan.pic, (byPic.get(r.vanBan.pic) ?? 0) + 1);
    if (r.vanBan.thang) byThang.set(r.vanBan.thang, (byThang.get(r.vanBan.thang) ?? 0) + 1);
  }

  const maxStatus = Math.max(1, ...byStatus.values());
  const maxPic = Math.max(1, ...byPic.values());
  const maxThang = Math.max(1, ...byThang.values());

  return (
    <div className="charts">
      <section className="panel">
        <h3>Phân bố trạng thái đối chiếu</h3>
        <div className="bar-list">
          {[...byStatus.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => (
              <div key={k} className="bar-row">
                <span className="bar-label">{TRANG_THAI_LABEL[k]}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(v / maxStatus) * 100}%` }} />
                </div>
                <span className="bar-value">{v}</span>
              </div>
            ))}
        </div>
      </section>

      <section className="panel">
        <h3>Theo PIC</h3>
        <div className="bar-list">
          {[...byPic.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => (
              <div key={k} className="bar-row">
                <span className="bar-label">{k}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill-alt"
                    style={{ width: `${(v / maxPic) * 100}%` }}
                  />
                </div>
                <span className="bar-value">{v}</span>
              </div>
            ))}
        </div>
      </section>

      <section className="panel">
        <h3>Theo tháng</h3>
        <div className="bar-list">
          {[...byThang.entries()]
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([k, v]) => (
              <div key={k} className="bar-row">
                <span className="bar-label">Tháng {k}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill-soft"
                    style={{ width: `${(v / maxThang) * 100}%` }}
                  />
                </div>
                <span className="bar-value">{v}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
