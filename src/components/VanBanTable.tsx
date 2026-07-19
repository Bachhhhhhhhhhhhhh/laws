import { useMemo, useState } from "react";
import type { DoiChieuKetQua, SortDir, SortKey } from "../types";
import { formatDate } from "../lib/parse";
import { LOAI_VB_LABEL } from "../lib/reconcile";
import { DeptChips } from "./DeptChips";
import { StatusBadge } from "./StatusBadge";

interface Props {
  rows: DoiChieuKetQua[];
  onSelect: (row: DoiChieuKetQua) => void;
  compact?: boolean;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (key: SortKey) => void;
  pageSizeOptions?: number[];
}

export function VanBanTable({
  rows,
  onSelect,
  compact,
  sortKey,
  sortDir,
  onSort,
  pageSizeOptions = [25, 50, 100, 200],
}: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 25);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = useMemo(() => {
    const p = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
    return rows.slice(p * pageSize, p * pageSize + pageSize);
  }, [rows, page, pageSize]);

  if (rows.length === 0) {
    return <div className="empty">Không có văn bản phù hợp bộ lọc.</div>;
  }

  const th = (key: SortKey, label: string) => (
    <th
      className={onSort ? "sortable" : undefined}
      onClick={onSort ? () => onSort(key) : undefined}
    >
      {label}
      {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div>
      <div className="table-toolbar">
        <span className="muted">
          Hiển thị {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, rows.length)} /{" "}
          {rows.length}
        </span>
        <label className="page-size">
          Số dòng
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {th("id", "ID")}
              {th("ten_van_ban", "Tên văn bản")}
              <th>Loại</th>
              {th("pic", "PIC")}
              {!compact && th("tuan", "Tuần")}
              {th("thoi_han_phan_hoi", "Hạn PH")}
              <th>Cần PH</th>
              <th>Đã PH</th>
              <th>Thiếu</th>
              {th("trangThai", "Trạng thái")}
              {th("danh_gia_anh_huong", "AH")}
              {th("completeness", "%")}
              {!compact && <th>File SS</th>}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr
                key={`${r.vanBan.id}-${r.vanBan.ten_van_ban.slice(0, 24)}`}
                onClick={() => onSelect(r)}
                className={r.quaHan ? "row-overdue" : undefined}
              >
                <td className="mono">{r.vanBan.id}</td>
                <td className="col-name" title={r.vanBan.ten_van_ban}>
                  {r.vanBan.ten_van_ban}
                </td>
                <td className="nowrap">{LOAI_VB_LABEL[r.loaiVanBan]}</td>
                <td>{r.vanBan.pic}</td>
                {!compact && <td className="nowrap">{r.vanBan.tuan}</td>}
                <td className="nowrap">
                  {r.vanBan.thoi_han_phan_hoi || formatDate(r.ngayDeadline)}
                </td>
                <td>
                  <DeptChips items={r.canPhanHoi} tone="info" />
                </td>
                <td>
                  <DeptChips items={r.daPhanHoi} tone="ok" />
                </td>
                <td>
                  <DeptChips items={r.thieu} tone="warn" />
                </td>
                <td>
                  <StatusBadge status={r.trangThai} quaHan={r.quaHan} />
                </td>
                <td>{r.vanBan.danh_gia_anh_huong || "—"}</td>
                <td className="mono">{r.completeness}%</td>
                {!compact && <td className="nowrap">{r.vanBan.ngay_gui_file_so_sanh || "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button
          type="button"
          className="btn ghost sm"
          disabled={safePage <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          ← Trước
        </button>
        <span className="muted">
          Trang {safePage + 1} / {totalPages}
        </span>
        <button
          type="button"
          className="btn ghost sm"
          disabled={safePage >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          Sau →
        </button>
      </div>
    </div>
  );
}
