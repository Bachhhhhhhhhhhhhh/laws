import { useMemo, useRef, useState } from "react";
import type { DoiChieuKetQua, TabId } from "./types";
import { useVanBanData } from "./hooks/useVanBanData";
import { StatCards } from "./components/StatCards";
import { FiltersBar } from "./components/FiltersBar";
import { VanBanTable } from "./components/VanBanTable";
import { BoPhanPanel } from "./components/BoPhanPanel";
import { OverviewCharts } from "./components/OverviewCharts";
import { DetailModal } from "./components/DetailModal";
import { DeadlinePanel } from "./components/DeadlinePanel";
import { PicPanel } from "./components/PicPanel";
import { QualityPanel } from "./components/QualityPanel";
import { SnapshotPanel } from "./components/SnapshotPanel";
import { CompliancePanel } from "./components/CompliancePanel";
import { downloadText, exportDoiChieuCsv, exportFullCsv, exportWorkbook } from "./lib/excel";

const TABS: { id: TabId; label: string }[] = [
  { id: "ra-soat", label: "Rà soát hồ sơ" },
  { id: "tong-quan", label: "Tổng quan" },
  { id: "danh-sach", label: "Danh sách" },
  { id: "doi-chieu", label: "Đối chiếu PH" },
  { id: "han", label: "Hạn PH" },
  { id: "bo-phan", label: "Bộ phận" },
  { id: "pic", label: "PIC" },
  { id: "chat-luong", label: "Chất lượng DL" },
  { id: "snapshot", label: "2 snapshot" },
];

export default function App() {
  const data = useVanBanData();
  const [tab, setTab] = useState<TabId>("ra-soat");
  const [selected, setSelected] = useState<DoiChieuKetQua | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const issueRows = useMemo(
    () =>
      data.filtered.filter((r) =>
        ["thieu", "chua_phan_hoi", "lech", "thua"].includes(r.trangThai),
      ),
    [data.filtered],
  );

  const incomplete = useMemo(
    () => data.filtered.filter((r) => r.missingFields.length > 0).sort((a, b) => a.completeness - b.completeness),
    [data.filtered],
  );

  const stamp = () => new Date().toISOString().slice(0, 10);

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
              {data.baseline ? ` · Baseline: ${data.baselineLabel}` : null}
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
            Reset mẫu
          </button>
          <div className="export-wrap">
            <button
              type="button"
              className="btn primary"
              disabled={!data.list.length}
              onClick={() => setExportOpen((v) => !v)}
            >
              Xuất dữ liệu ▾
            </button>
            {exportOpen && (
              <div className="export-menu">
                <button
                  type="button"
                  onClick={() => {
                    downloadText(
                      `doi-chieu-${stamp()}.csv`,
                      exportDoiChieuCsv(data.filtered),
                    );
                    setExportOpen(false);
                  }}
                >
                  CSV đối chiếu (lọc hiện tại)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadText(`van-ban-full-${stamp()}.csv`, exportFullCsv(data.list));
                    setExportOpen(false);
                  }}
                >
                  CSV đầy đủ mọi cột
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportWorkbook(data.filtered, `van-ban-doi-chieu-${stamp()}.xlsx`);
                    setExportOpen(false);
                  }}
                >
                  Excel (.xlsx) 2 sheet
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {data.error ? <div className="banner error">{data.error}</div> : null}
        {data.loading ? <div className="banner">Đang tải dữ liệu…</div> : null}

        <FiltersBar
          filters={data.filters}
          onChange={data.setFilters}
          onReset={data.resetFilters}
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
              {t.id === "doi-chieu" ? <span className="tab-count">{issueRows.length}</span> : null}
              {t.id === "danh-sach" ? (
                <span className="tab-count">{data.filtered.length}</span>
              ) : null}
              {t.id === "han" ? (
                <span className="tab-count">{data.stats.quaHan + data.stats.sapDenHan3}</span>
              ) : null}
              {t.id === "chat-luong" ? (
                <span className="tab-count">{incomplete.length}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {tab === "ra-soat" && (
          <CompliancePanel catalog={data.list} onOpenVanBan={setSelected} />
        )}

        {tab === "tong-quan" && (
          <section className="view">
            <p className="lead">
              Hệ thống đối chiếu đầy đủ từ <em>Bảng quản lý văn bản pháp luật</em>: rà soát hồ sơ
              PDF/Word/Excel, so khớp BP cần PH ↔ đã PH, hạn phản hồi, chất lượng DL, PIC, 2 snapshot.
            </p>
            <OverviewCharts results={data.filtered} />
            <div className="panel">
              <h3>Ưu tiên xử lý (thiếu / chưa PH / lệch / quá hạn)</h3>
              <VanBanTable rows={issueRows.slice(0, 20)} onSelect={setSelected} compact />
              {issueRows.length > 20 ? (
                <p className="muted center-note">
                  Hiển thị 20 / {issueRows.length} — mở tab <strong>Đối chiếu PH</strong>.
                </p>
              ) : null}
            </div>
          </section>
        )}

        {tab === "danh-sach" && (
          <section className="view panel">
            <div className="panel-head">
              <h3>Danh sách văn bản ({data.filtered.length})</h3>
              <p className="muted">Click dòng để xem đủ {Object.keys(data.list[0] ?? {}).length || 22} trường.</p>
            </div>
            <VanBanTable
              rows={data.filtered}
              onSelect={setSelected}
              sortKey={data.sortKey}
              sortDir={data.sortDir}
              onSort={data.toggleSort}
            />
          </section>
        )}

        {tab === "doi-chieu" && (
          <section className="view panel">
            <div className="panel-head">
              <h3>Đối chiếu phản hồi ({issueRows.length} lệch / {data.filtered.length} sau lọc)</h3>
              <p className="muted">
                So khớp <code>bo_phan_can_phan_hoi</code> ↔ <code>bo_phan_phan_hoi</code> · Quá hạn khi
                còn thiếu và <code>thoi_han_phan_hoi</code> &lt; hôm nay.
              </p>
            </div>
            <VanBanTable
              rows={
                data.filters.trangThai || data.filters.chiQuaHan
                  ? data.filtered
                  : issueRows.length
                    ? issueRows
                    : data.filtered
              }
              onSelect={setSelected}
              sortKey={data.sortKey}
              sortDir={data.sortDir}
              onSort={data.toggleSort}
            />
          </section>
        )}

        {tab === "han" && (
          <section className="view">
            <DeadlinePanel rows={data.filtered} onSelect={setSelected} />
          </section>
        )}

        {tab === "bo-phan" && (
          <section className="view">
            <BoPhanPanel rows={data.boPhanAgg} onOpenVanBan={setSelected} />
          </section>
        )}

        {tab === "pic" && (
          <section className="view">
            <PicPanel rows={data.picAgg} onOpenVanBan={setSelected} />
          </section>
        )}

        {tab === "chat-luong" && (
          <section className="view">
            <QualityPanel
              fillRates={data.fillRates}
              incomplete={incomplete}
              onSelect={setSelected}
            />
          </section>
        )}

        {tab === "snapshot" && (
          <SnapshotPanel
            current={data.list}
            baseline={data.baseline}
            baselineLabel={data.baselineLabel}
            onImportBaseline={(f) => void data.importBaseline(f)}
            onClearBaseline={data.clearBaseline}
          />
        )}
      </main>

      <footer className="footer">
        <span>
          22 cột Excel · 8 view · import/export · localStorage · React + Vite + TypeScript
        </span>
      </footer>

      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
