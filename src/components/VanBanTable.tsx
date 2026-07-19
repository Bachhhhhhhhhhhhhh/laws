import type { DoiChieuKetQua } from "../types";
import { formatDate } from "../lib/parse";
import { DeptChips } from "./DeptChips";
import { StatusBadge } from "./StatusBadge";

interface Props {
  rows: DoiChieuKetQua[];
  onSelect: (row: DoiChieuKetQua) => void;
  compact?: boolean;
}

export function VanBanTable({ rows, onSelect, compact }: Props) {
  if (rows.length === 0) {
    return <div className="empty">Không có văn bản phù hợp bộ lọc.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên văn bản</th>
            <th>PIC</th>
            {!compact && <th>Tuần</th>}
            <th>Hạn PH</th>
            <th>Cần PH</th>
            <th>Đã PH</th>
            <th>Thiếu</th>
            <th>Trạng thái</th>
            <th>AH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.vanBan.id}-${r.vanBan.ten_van_ban.slice(0, 24)}`}
              onClick={() => onSelect(r)}
              className={r.quaHan ? "row-overdue" : undefined}
            >
              <td className="mono">{r.vanBan.id}</td>
              <td className="col-name" title={r.vanBan.ten_van_ban}>
                {r.vanBan.ten_van_ban}
              </td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
