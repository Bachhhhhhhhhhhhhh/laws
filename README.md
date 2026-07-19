# Đối chiếu Văn bản Pháp luật

Website **đầy đủ** để đọc, lọc, đối chiếu và xuất dữ liệu từ **Bảng quản lý văn bản pháp luật** (Excel).

## Dữ liệu mẫu

- File: `Bang quan ly van ban_16072026 (1).xlsx`
- Sheet: `Bang quan ly van ban`
- **341** văn bản đã export → `public/data/van-ban.json`
- **22 cột** map 1:1 từ Excel

## Chức năng (8 tab)

| Tab | Nội dung |
|-----|----------|
| **Tổng quan** | 14 KPI, biểu đồ PIC / tháng / loại VB / trạng thái PH, list ưu tiên |
| **Danh sách** | Bảng đầy đủ, sort cột, phân trang, click xem chi tiết 22 trường |
| **Đối chiếu PH** | So khớp BP cần PH ↔ đã PH (thiếu / thừa / lệch / quá hạn) |
| **Hạn PH** | Kanban: quá hạn · hôm nay · 3 ngày · 7 ngày · còn hạn |
| **Bộ phận** | % hoàn thành PH, list VB thiếu theo từng BP |
| **PIC** | Workload từng PIC, ưu tiên xử lý |
| **Chất lượng DL** | % điền từng cột + VB thiếu trường core |
| **2 snapshot** | Import Excel kỳ trước, diff thêm/xóa/đổi field |

### Khác

- Import Excel `.xlsx` trên trình duyệt (SheetJS)
- Lưu dữ liệu đã import vào **localStorage**
- Xuất: CSV đối chiếu · CSV full 22 cột · Excel 2 sheet
- Filter: PIC, kỳ, tháng, tuần, loại VB, AH, trạng thái, hạn, BP, free-text, checkbox quá hạn / dự thảo / file so sánh / thiếu trường
- Modal chi tiết: đối chiếu chia sẻ ↔ cần PH ↔ đã PH + raw mọi field

## Logic đối chiếu

```
Cần PH   = bo_phan_can_phan_hoi  (tách , hoặc ;)
Đã PH    = bo_phan_phan_hoi
Chia sẻ  = bo_phan_chia_se
```

| Trạng thái | Ý nghĩa |
|------------|---------|
| Đã đủ | Hai tập Cần/Đã trùng |
| Thiếu phản hồi | Có BP trong Cần nhưng chưa Đã |
| Thừa / ngoài list | Có BP Đã không nằm trong Cần |
| Lệch | Vừa thiếu vừa thừa |
| Chưa phản hồi | Có Cần, Đã trống |
| Không yêu cầu | Cả hai trống |

**Quá hạn:** còn thiếu/chưa PH và `thoi_han_phan_hoi` &lt; hôm nay.

**Loại VB** (từ tên): Nghị định · Thông tư · Quyết định · Công văn · Dự thảo · Luật · Khác.

**Độ đầy đủ:** 12 trường core (id, pic, tên, tóm tắt, chia sẻ, ngày chia sẻ, hạn PH, BP cần, BP đã, AH, ban hành, hiệu lực).

## Cấu trúc mã

```
van-ban-doi-chieu/
├── public/data/van-ban.json
├── scripts/import-excel.mjs
├── src/
│   ├── App.tsx
│   ├── types.ts
│   ├── lib/
│   │   ├── parse.ts        # ngày, tách BP, loại VB, completeness
│   │   ├── reconcile.ts    # đối chiếu + stats + aggregate
│   │   ├── excel.ts        # import/export xlsx+csv
│   │   ├── snapshot.ts     # diff 2 file
│   │   └── storage.ts      # localStorage
│   ├── hooks/useVanBanData.ts
│   └── components/         # 12 UI modules
├── package.json
└── vite.config.ts
```

## Chạy

```bash
cd van-ban-doi-chieu
npm install
npm run dev
```

http://localhost:5173

```bash
npm run build
npm run preview
```

Re-import Excel → JSON:

```bash
npm run import-excel -- "C:\path\to\file.xlsx"
```

## Stack

React 19 · TypeScript · Vite 6 · SheetJS (`xlsx`) · không backend
