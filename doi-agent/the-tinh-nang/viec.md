# Thẻ tính năng: Việc

**Mục đích:** ghi việc trong ngày theo khu vực, có mức ưu tiên, xem theo lịch tháng.

## File và hàm
- `src/components/Tasks.jsx`
  - `byPri` — luật sắp xếp: chưa xong trước → mức ưu tiên tăng dần → thêm trước đứng trước.
  - `ZoneNav` — thanh khu vực (PC: cột; iPhone: chip vuốt ngang), số cạnh tên = việc chưa xong.
  - `TaskGroups`, `TaskRow` — danh sách theo khu, thu gọn được.
  - `TaskForm` — form thêm việc (`variant` 'pc' trên đầu / 'ph' thanh dưới iPhone).
  - `Calendar`, `monthOf` — lịch tháng, số dưới ngày = việc chưa xong.
- `src/lib/actions.js` — `addTask`, `toggleTask`, `cycleUrgency` (công thức `(u % 5) + 1`), `removeTask`, `clearDone`.
- `src/components/ui.jsx` — `CheckBtn`, `PriDot`, `PRI_NAME`, `PRI_LEVELS`, `priLabel`.
- `src/App.jsx` — tiêu đề "Việc hôm nay"/"Việc ngày dd/mm", nút "Xoá việc đã xong", dòng "Khám: còn x việc".

## Dữ liệu (bảng `tasks`)
`id, date (YYYY-MM-DD), zone, urgency (1–5), text, done, deleted, createdAt, updatedAt, deviceId`

## Quyết định đã chốt
Xem mục "Việc" trong `doi-agent/QUYET_DINH_DA_CHOT.md`.

## Điểm dễ hỏng
- `byPri` nằm trong file .jsx nên chưa có bài kiểm tra tự động bằng Node. Khi sửa luật sắp xếp: chuyển `byPri` sang `src/lib/` và thêm kiểm tra.
- Nút ưu tiên NV là chữ 2 ký tự trong hình tròn — kiểm ảnh chụp sau khi đổi cỡ chữ.
- Ngày tính theo giờ máy (`isoOf`), không dùng `toISOString` (lệch UTC+7).
