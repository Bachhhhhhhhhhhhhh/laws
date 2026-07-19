import type { DoiChieuKetQua, TrangThaiDoiChieu, VanBan } from "../types";
import { parseDate, splitDepts, todayStart } from "./parse";

/** Đối chiếu BP cần phản hồi ↔ BP đã phản hồi */
export function reconcileOne(vanBan: VanBan, refDate: Date = todayStart()): DoiChieuKetQua {
  const canPhanHoi = splitDepts(vanBan.bo_phan_can_phan_hoi);
  const daPhanHoi = splitDepts(vanBan.bo_phan_phan_hoi);

  const canSet = new Set(canPhanHoi.map((d) => d.toUpperCase()));
  const daSet = new Set(daPhanHoi.map((d) => d.toUpperCase()));

  const thieu = canPhanHoi.filter((d) => !daSet.has(d.toUpperCase()));
  const thua = daPhanHoi.filter((d) => !canSet.has(d.toUpperCase()));

  let trangThai: TrangThaiDoiChieu;
  if (canPhanHoi.length === 0 && daPhanHoi.length === 0) {
    trangThai = "khong_yeu_cau";
  } else if (canPhanHoi.length > 0 && daPhanHoi.length === 0) {
    trangThai = "chua_phan_hoi";
  } else if (thieu.length === 0 && thua.length === 0) {
    trangThai = "da_du";
  } else if (thieu.length > 0 && thua.length === 0) {
    trangThai = "thieu";
  } else if (thieu.length === 0 && thua.length > 0) {
    trangThai = "thua";
  } else {
    trangThai = "lech";
  }

  const ngayDeadline = parseDate(vanBan.thoi_han_phan_hoi);
  const needsAction =
    trangThai === "thieu" ||
    trangThai === "chua_phan_hoi" ||
    trangThai === "lech";
  const quaHan =
    needsAction && ngayDeadline != null && ngayDeadline.getTime() < refDate.getTime();

  return {
    vanBan,
    canPhanHoi,
    daPhanHoi,
    thieu,
    thua,
    trangThai,
    quaHan,
    ngayDeadline,
  };
}

export function reconcileAll(list: VanBan[], refDate?: Date): DoiChieuKetQua[] {
  return list.map((vb) => reconcileOne(vb, refDate));
}

export const TRANG_THAI_LABEL: Record<TrangThaiDoiChieu, string> = {
  da_du: "Đã đủ",
  thieu: "Thiếu phản hồi",
  thua: "Thừa / ngoài list",
  lech: "Lệch (thiếu + thừa)",
  khong_yeu_cau: "Không yêu cầu",
  chua_phan_hoi: "Chưa phản hồi",
};

export const TRANG_THAI_COLOR: Record<TrangThaiDoiChieu, string> = {
  da_du: "ok",
  thieu: "warn",
  thua: "info",
  lech: "danger",
  khong_yeu_cau: "muted",
  chua_phan_hoi: "warn",
};

/** Tổng hợp theo bộ phận: bao nhiêu VB cần PH / đã PH / thiếu */
export interface BoPhanAgg {
  boPhan: string;
  canPhanHoi: number;
  daPhanHoi: number;
  thieu: number;
  quaHan: number;
  vanBanThieu: DoiChieuKetQua[];
}

export function aggregateByBoPhan(results: DoiChieuKetQua[]): BoPhanAgg[] {
  const map = new Map<string, BoPhanAgg>();

  const ensure = (name: string) => {
    const key = name.toUpperCase();
    let row = map.get(key);
    if (!row) {
      row = {
        boPhan: name,
        canPhanHoi: 0,
        daPhanHoi: 0,
        thieu: 0,
        quaHan: 0,
        vanBanThieu: [],
      };
      map.set(key, row);
    }
    return row;
  };

  for (const r of results) {
    for (const d of r.canPhanHoi) {
      const row = ensure(d);
      row.canPhanHoi += 1;
    }
    for (const d of r.daPhanHoi) {
      const row = ensure(d);
      row.daPhanHoi += 1;
    }
    for (const d of r.thieu) {
      const row = ensure(d);
      row.thieu += 1;
      row.vanBanThieu.push(r);
      if (r.quaHan) row.quaHan += 1;
    }
  }

  return [...map.values()].sort((a, b) => b.thieu - a.thieu || b.canPhanHoi - a.canPhanHoi);
}

export interface DashboardStats {
  tong: number;
  coAnhHuong: number;
  khongAnhHuong: number;
  chuaDanhGia: number;
  daDu: number;
  thieu: number;
  chuaPhanHoi: number;
  lech: number;
  quaHan: number;
  coYeuCauPH: number;
}

export function computeStats(results: DoiChieuKetQua[]): DashboardStats {
  const s: DashboardStats = {
    tong: results.length,
    coAnhHuong: 0,
    khongAnhHuong: 0,
    chuaDanhGia: 0,
    daDu: 0,
    thieu: 0,
    chuaPhanHoi: 0,
    lech: 0,
    quaHan: 0,
    coYeuCauPH: 0,
  };

  for (const r of results) {
    const ah = r.vanBan.danh_gia_anh_huong.trim().toLowerCase();
    if (ah === "có" || ah === "co") s.coAnhHuong += 1;
    else if (ah === "không" || ah === "khong") s.khongAnhHuong += 1;
    else s.chuaDanhGia += 1;

    if (r.canPhanHoi.length > 0) s.coYeuCauPH += 1;
    if (r.trangThai === "da_du") s.daDu += 1;
    if (r.trangThai === "thieu" || r.trangThai === "lech") s.thieu += 1;
    if (r.trangThai === "chua_phan_hoi") s.chuaPhanHoi += 1;
    if (r.trangThai === "lech") s.lech += 1;
    if (r.quaHan) s.quaHan += 1;
  }

  return s;
}
