# Bộ ca chuẩn lâm sàng

> Bác sĩ có thể tự thêm ca: sửa file này trên GitHub (bấm biểu tượng bút chì), thêm một dòng vào bảng, Commit.
> Lần cập nhật sau GitHub sẽ tự kiểm app có tính đúng ca đó không (`tests/ca-chuan.test.js`).
>
> Cách ghi:
> - **Ngày tính**: ngày giả định là "hôm nay", ghi dd/mm/yyyy.
> - **Ngày sinh**, **Tuổi thai**: ghi đúng như gõ vào app (ví dụ 0810, 08/10, 346, 34+6).
> - **Ngày tuổi**, **Tuổi hiệu chỉnh**: kết quả mong đợi. Ca mà app phải báo lỗi thì ghi `LỖI` ở cả hai cột.

| Ngày tính | Ngày sinh | Tuổi thai | Ngày tuổi | Tuổi hiệu chỉnh | Ghi chú |
|---|---|---|---|---|---|
| 21/10/2026 | 0508 | 25 | 77 | 36w0d | ví dụ đã thống nhất |
| 21/10/2026 | 2110 | 346 | 0 | 34w6d | sinh hôm nay |
| 21/10/2026 | 1410 | 286 | 7 | 29w6d | ví dụ đã thống nhất |
| 21/10/2026 | 0109 | 240 | 50 | 31w1d | ví dụ đã thống nhất |
| 21/10/2026 | 2009 | 320 | 31 | 36w3d | ví dụ đã thống nhất |
| 21/10/2026 | 0410 | 390 | 17 | 41w3d | ví dụ đã thống nhất |
| 21/10/2026 | 20/09/2026 | 32 | 31 | 36w3d | ghi đủ năm, tuổi thai không ghi ngày lẻ |
| 05/01/2027 | 2812 | 300 | 8 | 31w1d | qua năm mới: 28/12 hiểu là năm trước |
| 01/03/2028 | 2902 | 280 | 1 | 28w1d | năm nhuận, 29/02 có thật |
| 01/03/2027 | 2902 | 280 | LỖI | LỖI | năm không nhuận, 29/02 không có thật |
| 21/10/2026 | 3102 | 346 | LỖI | LỖI | ngày không có thật |
| 21/10/2026 | 0810 | 347 | LỖI | LỖI | ngày lẻ tuổi thai > 6 |
| 21/10/2026 | 0810 | 19 | LỖI | LỖI | dưới 20 tuần |
| 21/10/2026 | 01/12/2026 | 346 | LỖI | LỖI | ghi đủ năm nhưng sau hôm nay |
| 05/11/2026 | 0511 | 342 | 0 | 34w2d | v9.6 bé sinh sau nửa đêm, ghi lúc 02:30 ngày 05/11 nên lưu ngày khám 04/11: ngày tính là ngày lịch của giờ tạo (05/11), không phải 04/11 (tính theo 04/11 sẽ ra 364 ngày) |
| 01/01/2027 | 3112 | 300 | 1 | 30w1d | v9.6 như trên, qua năm: lưu ngày khám 31/12/2026, ngày tính 01/01/2027 |
| 29/02/2028 | 2902 | 280 | 0 | 28w0d | v9.6 như trên, ngày nhuận: lưu ngày khám 28/02/2028, ngày tính 29/02/2028 |
| 01/03/2026 | 2802 | 320 | 1 | 32w1d | v9.6 như trên, qua tháng, năm không nhuận: lưu ngày khám 28/02/2026, ngày tính 01/03/2026 |
