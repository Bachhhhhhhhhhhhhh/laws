import type { LoaiVanBan, VanBan } from "../types";

/** Tách danh sách bộ phận (dấu phẩy / chấm phẩy) */
export function splitDepts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw).replace(/;/g, ",").split(",")) {
    const t = part.trim();
    if (!t) continue;
    const key = t.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Parse ngày dạng DD/MM/YYYY hoặc ISO */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;

  const dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]) - 1;
    const y = Number(dmy[3]);
    const dt = new Date(y, m, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const dt = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatDate(d: Date | null): string {
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function todayStart(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function detectLoaiVanBan(ten: string): LoaiVanBan {
  const t = (ten || "").toLowerCase();
  if (/dự\s*thảo|du\s*thao/.test(t)) return "du_thao";
  if (/nghị\s*định|nghi\s*dinh|nđ-cp|nd-cp/.test(t)) return "nghi_dinh";
  if (/thông\s*tư|thong\s*tu|tt-/.test(t)) return "thong_tu";
  if (/quyết\s*định|quyet\s*dinh|qđ-|qd-/.test(t)) return "quyet_dinh";
  if (/công\s*văn|cong\s*van/.test(t)) return "cong_van";
  if (/^luật\b|^\s*luat\b|luật\s/.test(t)) return "luat";
  return "khac";
}

export function isDuThaoName(ten: string): boolean {
  return /dự\s*thảo|du\s*thao/i.test(ten || "");
}

export function normalizeVanBan(raw: Partial<VanBan> | Record<string, unknown>): VanBan {
  const g = (k: string) => {
    const v = (raw as Record<string, unknown>)[k];
    if (v == null) return "";
    if (v instanceof Date) {
      const dd = String(v.getDate()).padStart(2, "0");
      const mm = String(v.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${v.getFullYear()}`;
    }
    return String(v).trim();
  };

  return {
    id: g("id"),
    ky: g("ky"),
    thang: g("thang"),
    tuan: g("tuan"),
    pic: g("pic"),
    ten_van_ban: g("ten_van_ban"),
    tom_tat: g("tom_tat"),
    bo_phan_chia_se: g("bo_phan_chia_se"),
    ngay_chia_se: g("ngay_chia_se"),
    thoi_han_gop_y: g("thoi_han_gop_y"),
    ngay_hieu_luc: g("ngay_hieu_luc"),
    ngay_ban_hanh: g("ngay_ban_hanh"),
    ngay_hl_du_kien: g("ngay_hl_du_kien"),
    ngay_bh_du_kien: g("ngay_bh_du_kien"),
    thoi_han_phan_hoi: g("thoi_han_phan_hoi"),
    bo_phan_can_phan_hoi: g("bo_phan_can_phan_hoi"),
    ngay_gui_file_so_sanh: g("ngay_gui_file_so_sanh"),
    bo_phan_phan_hoi: g("bo_phan_phan_hoi"),
    danh_gia_anh_huong: g("danh_gia_anh_huong"),
    ngay_gui_cong_van: g("ngay_gui_cong_van"),
    ten_cong_van: g("ten_cong_van"),
    ghi_chu: g("ghi_chu"),
  };
}

/** Các field quan trọng khi chấm độ đầy đủ hồ sơ */
export const CORE_FIELDS: (keyof VanBan)[] = [
  "id",
  "pic",
  "ten_van_ban",
  "tom_tat",
  "bo_phan_chia_se",
  "ngay_chia_se",
  "thoi_han_phan_hoi",
  "bo_phan_can_phan_hoi",
  "bo_phan_phan_hoi",
  "danh_gia_anh_huong",
  "ngay_ban_hanh",
  "ngay_hieu_luc",
];

export function computeCompleteness(vb: VanBan): {
  score: number;
  missing: (keyof VanBan)[];
} {
  const missing: (keyof VanBan)[] = [];
  for (const f of CORE_FIELDS) {
    if (!String(vb[f] ?? "").trim()) missing.push(f);
  }
  const score = Math.round(((CORE_FIELDS.length - missing.length) / CORE_FIELDS.length) * 100);
  return { score, missing };
}
