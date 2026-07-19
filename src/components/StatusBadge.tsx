import type { TrangThaiDoiChieu } from "../types";
import { TRANG_THAI_COLOR, TRANG_THAI_LABEL } from "../lib/reconcile";

export function StatusBadge({
  status,
  quaHan,
}: {
  status: TrangThaiDoiChieu;
  quaHan?: boolean;
}) {
  return (
    <span className="badge-row">
      <span className={`badge badge-${TRANG_THAI_COLOR[status]}`}>
        {TRANG_THAI_LABEL[status]}
      </span>
      {quaHan ? <span className="badge badge-danger">Quá hạn</span> : null}
    </span>
  );
}
