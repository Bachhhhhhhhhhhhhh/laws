import { useMemo, useRef, useState } from "react";
import type { DoiChieuKetQua, TabId } from "./types";
import { useVanBanData } from "./hooks/useVanBanData";
import { StatCards } from "./components/StatCards";
import { FiltersBar } from "./components/FiltersBar";
import { VanBanTable } from "./components/VanBanTable";
import { BoPhanPanel } from "./components/BoPhanPanel";
import { OverviewCharts } from "./components/OverviewCharts";
import { DetailModal } from "./components/DetailModal";
import { downloadText, exportDoiChieuCsv } from "./lib/excel";
import { TRANG_THAI_LABEL } from "./lib/reconcile";
import { formatDate } from "./lib/parse";

const TABS: { id: TabId; label: string }[] = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "danh-sach", label: "Danh sách VB" },
  { id: "doi-chieu", label: "Đối chiếu PH" },
  { id: "bo-phan", label: "Theo bộ phận" },
];

export default function App() {
  const data = useVanBanData();
  const [tab, setTab] = useState<TabId>("tong-quan");
  const [selected, setSelected] = useState<DoiChieuKetQua | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doiChieuRows = useMemo(
    () =>
      data.filtered.filter(
        (r) =>
          r.trangThai !== "khong_yeu_cau" ||
          r.canPhanHoi.length > 0 ||
          r.daPhanHoi.length > 0,
      ),
    [data.filtered],
  );

  const issueRows = useMemo(
    () =>
      data.filtered.filter((r) =>
        ["thieu", "chua_phan_hoi", "lech", "thua"].includes(r.trangThai),
      ),
    [data.filtered],
  );

  const onExport = () => {
    const csv = exportDoiChieuCsv(
      data.filtered.map((r) => ({
        id: r.vanBan.id,
        ten: r.vanBan.ten_van_ban,
        pic: r.vanBan.pic,
        trangThai: TRANG_THAI_LABEL[r.trangThai],
        thieu: r.thieu.join("; "),
        thua: r.thua.join("; "),
        deadline: r.vanBan.thoi_han_phan_hoi || formatDate(r.ngayDeadline),
        quaHan: r.quaHan ? "Có" : "Không",
      })),
    );
    downloadText(`doi-chieu-van-ban-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">VB</div>
          <div>
            <h1>Đối chiếu Văn bản Pháp luật</h1>
            <p className="subtitle">
              Nguồn: <strong>{data.sourceLabel}</strong>
              {data.list.length > 0 ? ` · ${data.list.length} bản ghi` : null}
            </p>
          </div>
        </div>

        <div className="top-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void data.importFile(f);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import Excel
          </button>
          <button type="button" className="btn ghost" onClick={() => void data.reload()}>
            Tải lại mẫu
          </button>
          <button type="button" className="btn primary" onClick={onExport} disabled={!data.list.length}>
            Xuất CSV đối chiếu
          </button>
        </div>
      </header>

      <main className="main">
        {data.error ? <div className="banner error">{data.error}</div> : null}
        {data.loading ? <div className="banner">Đang tải dữ liệu…</div> : null}

        <FiltersBar
          filters={data.filters}
          onChange={data.setFilters}
          options={data.filterOptions}
        />

        <StatCards stats={data.stats} />

        <nav className="tabs" aria-label="Chế độ xem">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "doi-chieu" ? (
                <span className="tab-count">{issueRows.length}</span>
              ) : null}
              {t.id === "danh-sach" ? (
                <span className="tab-count">{data.filtered.length}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {tab === "tong-quan" && (
          <section className="view">
            <p className="lead">
              Website đối chiếu dữ liệu từ <em>Bảng quản lý văn bản pháp luật</em>: so khớp{" "}
              <strong>Bộ phận cần phản hồi</strong> với <strong>Bộ phận phản hồi</strong>, theo dõi
              hạn phản hồi, ảnh hưởng và tiến độ theo PIC / bộ phận.
            </p>
            <OverviewCharts results={data.filtered} />
            <div className="panel">
              <h3>Ưu tiên xử lý (thiếu / chưa PH / lệch / quá hạn)</h3>
              <VanBanTable
                rows={issueRows.slice(0, 15)}
                onSelect={setSelected}
                compact
              />
              {issueRows.length > 15 ? (
                <p className="muted center-note">
                  Hiển thị 15 / {issueRows.length} — mở tab <strong>Đối chiếu PH</strong> để xem hết.
                </p>
              ) : null}
            </div>
          </section>
        )}

        {tab === "danh-sach" && (
          <section className="view panel">
            <div className="panel-head">
              <h3>Danh sách văn bản ({data.filtered.length})</h3>
            </div>
            <VanBanTable rows={data.filtered} onSelect={setSelected} />
          </section>
        )}

        {tab === "doi-chieu" && (
          <section className="view panel">
            <div className="panel-head">
              <h3>Đối chiếu phản hồi ({doiChieuRows.length})</h3>
              <p className="muted">
                Logic: so sánh tập <code>bo_phan_can_phan_hoi</code> và{" "}
                <code>bo_phan_phan_hoi</code> (tách theo dấu phẩy). Quá hạn khi còn thiếu/chưa PH
                và <code>thoi_han_phan_hoi</code> &lt; hôm nay.
              </p>
            </div>
            <VanBanTable
              rows={
                data.filters.trangThai || data.filters.chiQuaHan
                  ? data.filtered
                  : issueRows.length
                    ? issueRows
                    : doiChieuRows
              }
              onSelect={setSelected}
            />
          </section>
        )}

        {tab === "bo-phan" && (
          <section className="view">
            <BoPhanPanel rows={data.boPhanAgg} onOpenVanBan={setSelected} />
          </section>
        )}
      </main>

      <footer className="footer">
        <span>
          Cấu trúc dữ liệu map từ sheet <code>Bang quan ly van ban</code> · React + Vite + TypeScript
        </span>
      </footer>

      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
