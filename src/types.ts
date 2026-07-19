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

/** Kết quả đối chiếu phản hồi theo bộ phận */
export type TrangThaiDoiChieu =
  | "da_du"
  | "thieu"
  | "thua"
  | "lech"
  | "khong_yeu_cau"
  | "chua_phan_hoi";

export interface DoiChieuKetQua {
  vanBan: VanBan;
  canPhanHoi: string[];
  daPhanHoi: string[];
  thieu: string[];
  thua: string[];
  trangThai: TrangThaiDoiChieu;
  quaHan: boolean;
  ngayDeadline: Date | null;
}

export type TabId = "tong-quan" | "danh-sach" | "doi-chieu" | "bo-phan";

export interface Filters {
  q: string;
  pic: string;
  thang: string;
  tuan: string;
  anhHuong: string;
  trangThai: string;
  boPhan: string;
  chiQuaHan: boolean;
}
