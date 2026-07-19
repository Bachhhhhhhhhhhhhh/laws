import type {
  DeadlineBucket,
  DoiChieuKetQua,
  TrangThaiDoiChieu,
  VanBan,
} from "../types";
import {
  computeCompleteness,
  daysBetween,
  detectLoaiVanBan,
  isDuThaoName,
  parseDate,
  splitDepts,
  todayStart,
} from "./parse";

function deadlineBucketOf(deadline: Date | null, ref: Date, needsAction: boolean): DeadlineBucket {
  if (!deadline) return "khong_han";
  const d = daysBetween(deadline, ref);
  if (needsAction && d < 0) return "qua_han";
  if (d === 0) return "hom_nay";
  if (d > 0 && d <= 3) return "3_ngay";
  if (d > 3 && d <= 7) return "7_ngay";
  if (d < 0 && !needsAction) return "sau"; // đã xong nhưng hạn đã qua — không flag
  return "sau";
}

/** Đối chiếu BP cần phản hồi ↔ BP đã phản hồi (+ chia sẻ) */
export function reconcileOne(vanBan: VanBan, refDate: Date = todayStart()): DoiChieuKetQua {
  const canPhanHoi = splitDepts(vanBan.bo_phan_can_phan_hoi);
  const daPhanHoi = splitDepts(vanBan.bo_phan_phan_hoi);
  const chiaSe = splitDepts(vanBan.bo_phan_chia_se);

  const canSet = new Set(canPhanHoi.map((d) => d.toUpperCase()));
  const daSet = new Set(daPhanHoi.map((d) => d.toUpperCase()));
  const csSet = new Set(chiaSe.map((d) => d.toUpperCase()));

  const thieu = canPhanHoi.filter((d) => !daSet.has(d.toUpperCase()));
  const thua = daPhanHoi.filter((d) => !canSet.has(d.toUpperCase()));
  const chiaSeKhongCanPH = chiaSe.filter((d) => canPhanHoi.length > 0 && !canSet.has(d.toUpperCase()));
  const canPHChuaChiaSe = canPhanHoi.filter((d) => !csSet.has(d.toUpperCase()));

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

  const { score, missing } = computeCompleteness(vanBan);
  const loai = detectLoaiVanBan(vanBan.ten_van_ban);

  return {
    vanBan,
    canPhanHoi,
    daPhanHoi,
    thieu,
    thua,
    chiaSe,
    chiaSeKhongCanPH,
    canPHChuaChiaSe,
    trangThai,
    quaHan,
    ngayDeadline,
    deadlineBucket: deadlineBucketOf(ngayDeadline, refDate, needsAction || quaHan),
    loaiVanBan: loai,
    isDuThao: loai === "du_thao" || isDuThaoName(vanBan.ten_van_ban),
    daCoFileSoSanh: Boolean(vanBan.ngay_gui_file_so_sanh?.trim()),
    daBanHanh: Boolean(vanBan.ngay_ban_hanh?.trim()),
    completeness: score,
    missingFields: missing,
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

export const LOAI_VB_LABEL: Record<string, string> = {
  nghi_dinh: "Nghị định",
  thong_tu: "Thông tư",
  quyet_dinh: "Quyết định",
  cong_van: "Công văn",
  du_thao: "Dự thảo",
  luat: "Luật",
  khac: "Khác",
};

export const DEADLINE_LABEL: Record<DeadlineBucket, string> = {
  qua_han: "Quá hạn",
  hom_nay: "Hết hạn hôm nay",
  "3_ngay": "Trong 3 ngày",
  "7_ngay": "Trong 7 ngày",
  sau: "Còn hạn (>7 ngày)",
  khong_han: "Không có hạn",
};

export interface BoPhanAgg {
  boPhan: string;
  canPhanHoi: number;
  daPhanHoi: number;
  thieu: number;
  quaHan: number;
  duocChiaSe: number;
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
        duocChiaSe: 0,
        vanBanThieu: [],
      };
      map.set(key, row);
    }
    return row;
  };

  for (const r of results) {
    for (const d of r.chiaSe) ensure(d).duocChiaSe += 1;
    for (const d of r.canPhanHoi) ensure(d).canPhanHoi += 1;
    for (const d of r.daPhanHoi) ensure(d).daPhanHoi += 1;
    for (const d of r.thieu) {
      const row = ensure(d);
      row.thieu += 1;
      row.vanBanThieu.push(r);
      if (r.quaHan) row.quaHan += 1;
    }
  }

  return [...map.values()].sort((a, b) => b.thieu - a.thieu || b.canPhanHoi - a.canPhanHoi);
}

export interface PicAgg {
  pic: string;
  tong: number;
  coAnhHuong: number;
  thieu: number;
  quaHan: number;
  duThao: number;
  avgCompleteness: number;
  vanBan: DoiChieuKetQua[];
}

export function aggregateByPic(results: DoiChieuKetQua[]): PicAgg[] {
  const map = new Map<string, DoiChieuKetQua[]>();
  for (const r of results) {
    const key = r.vanBan.pic || "(Không có PIC)";
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }

  return [...map.entries()]
    .map(([pic, vanBan]) => {
      const coAnhHuong = vanBan.filter((r) => /^có$/i.test(r.vanBan.danh_gia_anh_huong)).length;
      const thieu = vanBan.filter((r) =>
        ["thieu", "chua_phan_hoi", "lech"].includes(r.trangThai),
      ).length;
      const quaHan = vanBan.filter((r) => r.quaHan).length;
      const duThao = vanBan.filter((r) => r.isDuThao).length;
      const avgCompleteness = Math.round(
        vanBan.reduce((s, r) => s + r.completeness, 0) / Math.max(1, vanBan.length),
      );
      return { pic, tong: vanBan.length, coAnhHuong, thieu, quaHan, duThao, avgCompleteness, vanBan };
    })
    .sort((a, b) => b.tong - a.tong);
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
  duThao: number;
  daBanHanh: number;
  coFileSoSanh: number;
  avgCompleteness: number;
  sapDenHan3: number;
  sapDenHan7: number;
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
    duThao: 0,
    daBanHanh: 0,
    coFileSoSanh: 0,
    avgCompleteness: 0,
    sapDenHan3: 0,
    sapDenHan7: 0,
  };

  let sumComp = 0;
  for (const r of results) {
    sumComp += r.completeness;
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
    if (r.isDuThao) s.duThao += 1;
    if (r.daBanHanh) s.daBanHanh += 1;
    if (r.daCoFileSoSanh) s.coFileSoSanh += 1;
    if (r.deadlineBucket === "3_ngay" || r.deadlineBucket === "hom_nay") s.sapDenHan3 += 1;
    if (r.deadlineBucket === "7_ngay" || r.deadlineBucket === "3_ngay" || r.deadlineBucket === "hom_nay")
      s.sapDenHan7 += 1;
  }

  s.avgCompleteness = results.length ? Math.round(sumComp / results.length) : 0;
  return s;
}

export function fieldFillRates(
  list: VanBan[],
): { field: keyof VanBan; filled: number; total: number; pct: number }[] {
  const keys: (keyof VanBan)[] = [
    "id",
    "ky",
    "thang",
    "tuan",
    "pic",
    "ten_van_ban",
    "tom_tat",
    "bo_phan_chia_se",
    "ngay_chia_se",
    "thoi_han_gop_y",
    "ngay_hieu_luc",
    "ngay_ban_hanh",
    "ngay_hl_du_kien",
    "ngay_bh_du_kien",
    "thoi_han_phan_hoi",
    "bo_phan_can_phan_hoi",
    "ngay_gui_file_so_sanh",
    "bo_phan_phan_hoi",
    "danh_gia_anh_huong",
    "ngay_gui_cong_van",
    "ten_cong_van",
    "ghi_chu",
  ];
  if (!list.length) {
    return keys.map((field) => ({ field, filled: 0, total: 0, pct: 0 }));
  }
  return keys.map((field) => {
    const filled = list.filter((r) => String(r[field] ?? "").trim()).length;
    return { field, filled, total: list.length, pct: Math.round((filled / list.length) * 100) };
  });
}
