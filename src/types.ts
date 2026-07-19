/** Một dòng văn bản pháp luật từ Bảng quản lý văn bản */
export interface VanBan {
  id: string;
  ky: string;
  thang: string;
  tuan: string;
  pic: string;
  ten_van_ban: string;
  tom_tat: string;
  bo_phan_chia_se: string;
  ngay_chia_se: string;
  thoi_han_gop_y: string;
  ngay_hieu_luc: string;
  ngay_ban_hanh: string;
  ngay_hl_du_kien: string;
  ngay_bh_du_kien: string;
  thoi_han_phan_hoi: string;
  bo_phan_can_phan_hoi: string;
  ngay_gui_file_so_sanh: string;
  bo_phan_phan_hoi: string;
  danh_gia_anh_huong: string;
  ngay_gui_cong_van: string;
  ten_cong_van: string;
  ghi_chu: string;
}

/** Nhãn tiếng Việt cho từng field */
export const VAN_BAN_FIELD_LABELS: Record<keyof VanBan, string> = {
  id: "ID",
  ky: "Kỳ",
  thang: "Tháng",
  tuan: "Tuần",
  pic: "PIC",
  ten_van_ban: "Tên văn bản",
  tom_tat: "Tóm tắt nội dung / Phân tích",
  bo_phan_chia_se: "Bộ phận được chia sẻ",
  ngay_chia_se: "Ngày chia sẻ",
  thoi_han_gop_y: "Thời hạn góp ý CQNN",
  ngay_hieu_luc: "Ngày hiệu lực",
  ngay_ban_hanh: "Ngày ban hành",
  ngay_hl_du_kien: "Ngày hiệu lực (dự kiến)",
  ngay_bh_du_kien: "Ngày ban hành (dự kiến)",
  thoi_han_phan_hoi: "Thời hạn phản hồi",
  bo_phan_can_phan_hoi: "Bộ phận cần phản hồi",
  ngay_gui_file_so_sanh: "Ngày gửi file so sánh",
  bo_phan_phan_hoi: "Bộ phận phản hồi",
  danh_gia_anh_huong: "Đánh giá ảnh hưởng",
  ngay_gui_cong_van: "Ngày gửi công văn",
  ten_cong_van: "Tên công văn",
  ghi_chu: "Ghi chú",
};

export const VAN_BAN_FIELD_ORDER = Object.keys(VAN_BAN_FIELD_LABELS) as (keyof VanBan)[];

/** Kết quả đối chiếu phản hồi theo bộ phận */
export type TrangThaiDoiChieu =
  | "da_du"
  | "thieu"
  | "thua"
  | "lech"
  | "khong_yeu_cau"
  | "chua_phan_hoi";

export type LoaiVanBan =
  | "nghi_dinh"
  | "thong_tu"
  | "quyet_dinh"
  | "cong_van"
  | "du_thao"
  | "luat"
  | "khac";

export type DeadlineBucket =
  | "qua_han"
  | "hom_nay"
  | "3_ngay"
  | "7_ngay"
  | "sau"
  | "khong_han";

export interface DoiChieuKetQua {
  vanBan: VanBan;
  canPhanHoi: string[];
  daPhanHoi: string[];
  thieu: string[];
  thua: string[];
  /** BP được chia sẻ */
  chiaSe: string[];
  /** BP chia sẻ nhưng không nằm trong cần PH */
  chiaSeKhongCanPH: string[];
  /** BP cần PH nhưng không có trong danh sách chia sẻ */
  canPHChuaChiaSe: string[];
  trangThai: TrangThaiDoiChieu;
  quaHan: boolean;
  ngayDeadline: Date | null;
  deadlineBucket: DeadlineBucket;
  loaiVanBan: LoaiVanBan;
  isDuThao: boolean;
  daCoFileSoSanh: boolean;
  daBanHanh: boolean;
  completeness: number;
  missingFields: (keyof VanBan)[];
}

export type TabId =
  | "tong-quan"
  | "danh-sach"
  | "doi-chieu"
  | "bo-phan"
  | "han"
  | "pic"
  | "chat-luong"
  | "snapshot"
  | "ra-soat";

export interface Filters {
  q: string;
  pic: string;
  thang: string;
  tuan: string;
  ky: string;
  anhHuong: string;
  trangThai: string;
  boPhan: string;
  loaiVanBan: string;
  deadlineBucket: string;
  chiQuaHan: boolean;
  chiDuThao: boolean;
  chiCoFileSoSanh: boolean;
  chiThieuTruong: boolean;
}

export type SnapshotChangeType =
  | "them_moi"
  | "xoa"
  | "doi_ph"
  | "doi_anh_huong"
  | "doi_han"
  | "doi_khac"
  | "khong_doi";

export interface SnapshotDiff {
  id: string;
  ten: string;
  changeType: SnapshotChangeType;
  before?: VanBan;
  after?: VanBan;
  fieldChanges: { field: keyof VanBan; from: string; to: string }[];
}

export type SortKey =
  | "id"
  | "ten_van_ban"
  | "pic"
  | "thang"
  | "tuan"
  | "ngay_chia_se"
  | "thoi_han_phan_hoi"
  | "trangThai"
  | "completeness"
  | "danh_gia_anh_huong";

export type SortDir = "asc" | "desc";
