import type { ReactNode } from "react";
import type { DoiChieuKetQua } from "../types";
import { formatDate } from "../lib/parse";
import { DeptChips } from "./DeptChips";
import { StatusBadge } from "./StatusBadge";

interface Props {
  item: DoiChieuKetQua | null;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function DetailModal({ item, onClose }: Props) {
  if (!item) return null;
  const vb = item.vanBan;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <div className="modal-id">ID {vb.id || "—"}</div>
            <h2 id="detail-title">{vb.ten_van_ban || "(Không có tên)"}</h2>
          </div>
          <button type="button" className="btn ghost" onClick={onClose}>
            Đóng
          </button>
        </header>

        <div className="modal-body">
          <div className="detail-status">
            <StatusBadge status={item.trangThai} quaHan={item.quaHan} />
          </div>

          <dl className="detail-grid">
            <Row label="PIC">{vb.pic || "—"}</Row>
            <Row label="Kỳ / Tháng / Tuần">
              {[vb.ky, vb.thang ? `T${vb.thang}` : "", vb.tuan].filter(Boolean).join(" · ") ||
                "—"}
            </Row>
            <Row label="Ngày chia sẻ">{vb.ngay_chia_se || "—"}</Row>
            <Row label="Ngày ban hành">{vb.ngay_ban_hanh || "—"}</Row>
            <Row label="Ngày hiệu lực">{vb.ngay_hieu_luc || "—"}</Row>
            <Row label="Hạn phản hồi">
              {vb.thoi_han_phan_hoi || formatDate(item.ngayDeadline)}
              {item.quaHan ? " (quá hạn)" : ""}
            </Row>
            <Row label="Ảnh hưởng">{vb.danh_gia_anh_huong || "Chưa đánh giá"}</Row>
            <Row label="Ngày gửi file so sánh">{vb.ngay_gui_file_so_sanh || "—"}</Row>
          </dl>

          <section className="detail-section">
            <h3>Đối chiếu phản hồi bộ phận</h3>
            <div className="compare-box">
              <div>
                <div className="compare-label">Cần phản hồi</div>
                <DeptChips items={item.canPhanHoi} tone="info" empty="Không yêu cầu" />
              </div>
              <div>
                <div className="compare-label">Đã phản hồi</div>
                <DeptChips items={item.daPhanHoi} tone="ok" empty="Chưa có" />
              </div>
              <div>
                <div className="compare-label">Thiếu</div>
                <DeptChips items={item.thieu} tone="warn" empty="Không thiếu" />
              </div>
              <div>
                <div className="compare-label">Thừa / ngoài list</div>
                <DeptChips items={item.thua} tone="danger" empty="Không thừa" />
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h3>Bộ phận được chia sẻ</h3>
            <p className="prewrap">{vb.bo_phan_chia_se || "—"}</p>
          </section>

          <section className="detail-section">
            <h3>Tóm tắt / Phân tích</h3>
            <p className="prewrap">{vb.tom_tat || "—"}</p>
          </section>

          {(vb.ten_cong_van || vb.ngay_gui_cong_van) && (
            <section className="detail-section">
              <h3>Công việc liên quan</h3>
              <p>
                {vb.ngay_gui_cong_van ? `${vb.ngay_gui_cong_van} — ` : ""}
                {vb.ten_cong_van || "—"}
              </p>
            </section>
          )}

          {vb.ghi_chu ? (
            <section className="detail-section">
              <h3>Ghi chú</h3>
              <p className="prewrap">{vb.ghi_chu}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
