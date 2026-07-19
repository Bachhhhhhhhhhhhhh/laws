import type { DoiChieuKetQua } from "../types";
import { LOAI_VB_LABEL, TRANG_THAI_LABEL } from "../lib/reconcile";
import type { TrangThaiDoiChieu } from "../types";

interface Props {
  results: DoiChieuKetQua[];
}

export function OverviewCharts({ results }: Props) {
  const byStatus = new Map<TrangThaiDoiChieu, number>();
  const byPic = new Map<string, number>();
  const byThang = new Map<string, number>();
  const byLoai = new Map<string, number>();

  for (const r of results) {
    byStatus.set(r.trangThai, (byStatus.get(r.trangThai) ?? 0) + 1);
    if (r.vanBan.pic) byPic.set(r.vanBan.pic, (byPic.get(r.vanBan.pic) ?? 0) + 1);
    if (r.vanBan.thang) byThang.set(r.vanBan.thang, (byThang.get(r.vanBan.thang) ?? 0) + 1);
    byLoai.set(r.loaiVanBan, (byLoai.get(r.loaiVanBan) ?? 0) + 1);
  }

  const maxStatus = Math.max(1, ...byStatus.values());
  const maxPic = Math.max(1, ...byPic.values());
  const maxThang = Math.max(1, ...byThang.values());
  const maxLoai = Math.max(1, ...byLoai.values());

  return (
    <div className="charts">
      <BarPanel
        title="Trạng thái đối chiếu PH"
        rows={[...byStatus.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => ({ label: TRANG_THAI_LABEL[k], v, max: maxStatus, cls: "" }))}
      />
      <BarPanel
        title="Theo PIC"
        rows={[...byPic.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => ({ label: k, v, max: maxPic, cls: "bar-fill-alt" }))}
      />
      <BarPanel
        title="Theo tháng"
        rows={[...byThang.entries()]
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([k, v]) => ({ label: `Tháng ${k}`, v, max: maxThang, cls: "bar-fill-soft" }))}
      />
      <BarPanel
        title="Theo loại văn bản"
        rows={[...byLoai.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => ({
            label: LOAI_VB_LABEL[k] ?? k,
            v,
            max: maxLoai,
            cls: "bar-fill",
          }))}
      />
    </div>
  );
}

function BarPanel({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; v: number; max: number; cls: string }[];
}) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="bar-list">
        {rows.map((r) => (
          <div key={r.label} className="bar-row">
            <span className="bar-label">{r.label}</span>
            <div className="bar-track">
              <div
                className={`bar-fill ${r.cls}`.trim()}
                style={{ width: `${(r.v / r.max) * 100}%` }}
              />
            </div>
            <span className="bar-value">{r.v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
