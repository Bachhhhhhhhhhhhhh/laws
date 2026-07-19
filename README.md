# Đối chiếu Văn bản Pháp luật

Website đối chiếu dữ liệu từ **Bảng quản lý văn bản pháp luật** (Excel).

## Dữ liệu nguồn

File mẫu đã import:

- `Bang quan ly van ban_16072026 (1).xlsx`
- Sheet: `Bang quan ly van ban`
- **341** văn bản (PIC: Le Quynh Chi, Do Ha Chi, Le Thi Ha My, Le Hoai Thu…)

### Cột chính (map Excel → model)

| Cột Excel | Field |
|-----------|--------|
| ID | `id` |
| Kỳ / Tháng / Tuần | `ky`, `thang`, `tuan` |
| PIC | `pic` |
| Tên văn bản | `ten_van_ban` |
| Tóm tắt nội dung | `tom_tat` |
| Bộ phận được chia sẻ / Ngày chia sẻ | `bo_phan_chia_se`, `ngay_chia_se` |
| Ngày hiệu lực / ban hành | `ngay_hieu_luc`, `ngay_ban_hanh` |
| Thời hạn phản hồi | `thoi_han_phan_hoi` |
| Bộ phận cần phản hồi | `bo_phan_can_phan_hoi` |
| Ngày gửi file so sánh | `ngay_gui_file_so_sanh` |
| Bộ phận phản hồi | `bo_phan_phan_hoi` |
| Đánh giá ảnh hưởng | `danh_gia_anh_huong` |
| Công văn liên quan | `ngay_gui_cong_van`, `ten_cong_van` |
| Ghi chú | `ghi_chu` |

Dữ liệu JSON sẵn: `public/data/van-ban.json`.

## Logic đối chiếu

So khớp hai tập bộ phận (tách bằng dấu phẩy / chấm phẩy):

1. **Cần phản hồi** ← `bo_phan_can_phan_hoi`
2. **Đã phản hồi** ← `bo_phan_phan_hoi`

| Trạng thái | Ý nghĩa |
|------------|---------|
| Đã đủ | Hai tập trùng khớp |
| Thiếu phản hồi | Có BP trong “cần” nhưng chưa có trong “đã” |
| Thừa / ngoài list | Có BP phản hồi không nằm trong “cần” |
| Lệch | Vừa thiếu vừa thừa |
| Chưa phản hồi | Có yêu cầu PH nhưng cột phản hồi trống |
| Không yêu cầu | Cả hai cột trống |

**Quá hạn**: còn thiếu/chưa PH và `thoi_han_phan_hoi` &lt; hôm nay.

## Chức năng website

- **Tổng quan**: thẻ KPI, biểu đồ PIC / tháng / trạng thái, danh sách ưu tiên
- **Danh sách VB**: bảng đầy đủ + filter + chi tiết
- **Đối chiếu PH**: tập trung VB lệch / thiếu / quá hạn
- **Theo bộ phận**: % hoàn thành, danh sách VB còn thiếu theo từng BP
- **Import Excel** (`.xlsx`) ngay trên trình duyệt
- **Xuất CSV** kết quả đối chiếu

## Cấu trúc mã nguồn

```
van-ban-doi-chieu/
├── public/data/van-ban.json     # dữ liệu đã export
├── scripts/import-excel.mjs     # re-export JSON từ Excel (Node)
├── src/
│   ├── App.tsx                  # shell UI + tabs
│   ├── types.ts                 # VanBan, DoiChieuKetQua, Filters
│   ├── lib/
│   │   ├── parse.ts             # tách BP, parse ngày
│   │   ├── reconcile.ts         # đối chiếu + aggregate + stats
│   │   └── excel.ts             # đọc xlsx (SheetJS) + export CSV
│   ├── hooks/useVanBanData.ts   # load/import/filter state
│   └── components/              # StatCards, Filters, Table, Modal…
├── package.json
└── vite.config.ts
```

## Chạy local

```bash
cd van-ban-doi-chieu
npm install
npm run dev
```

Mở http://localhost:5173

Build production:

```bash
npm run build
npm run preview
```

## Re-import Excel → JSON (CLI)

```bash
# Cần Node 18+
npm run import-excel -- "C:\Users\user\Downloads\Bang quan ly van ban_16072026 (1).xlsx"
```

## Stack

- React 19 + TypeScript + Vite 6
- SheetJS (`xlsx`) đọc Excel phía client
- Không backend — chạy tĩnh sau `npm run build`
