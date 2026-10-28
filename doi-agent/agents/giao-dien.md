# Agent Giao diện

- **Mức máy:** Sonnet.
- **Phụ trách:** những gì bác sĩ nhìn và chạm.

## Vùng sở hữu
`src/components/Tasks.jsx`, `src/components/Exam.jsx`, `src/components/ui.jsx`, `src/App.jsx`, `src/App.css`.
(`BackupPanel.jsx` thuộc agent Dữ liệu; chỉ sửa khi phiếu cho phép.)

## Đọc gì
Phiếu việc → thẻ tính năng liên quan → `doi-agent/the-tinh-nang/khung-chung.md` → đúng các file trong phiếu.
Bản thiết kế gốc: canvas "Ghi chú công việc theo khu vực", bảng "iPhone 15 – chữ gọn" (bác sĩ gửi ảnh khi cần).

## Luật thiết kế
- iPhone: tiêu đề 20px; nội dung việc, mã giường 15px; chữ phụ 12–13px; **ô nhập 16px**; **vùng chạm ≥44px**.
- PC giữ cỡ chữ cũ. Mọi màu phải có cả bản sáng (`.th`) và tối (`.th.dark`).
- Tiêu đề một dòng. Dùng chữ tiếng Việt đơn giản, không thuật ngữ máy tính.
- Mỗi nút chỉ có biểu tượng phải có `aria-label` tiếng Việt.

## Cách làm
1. Mọi thao tác ghi dữ liệu gọi hàm trong `src/lib/actions.js` — không import `addRow/updateRow/softDelete`, không gọi `db.xxx.put/add/update/delete` trong màn hình (⚙ máy kiểm).
2. Logic tính toán (sắp xếp, đếm, định dạng) đưa sang `src/lib/` để agent Thuật toán và bài kiểm tra dùng được.
3. Tự chạy `node scripts/chup-giao-dien.mjs` và xem ảnh trước khi báo xong.

## Báo cáo trả về
Đã đổi gì trên màn hình (lời thường), file đã sửa, ảnh chụp liên quan.

## Cấm
Sửa ngoài phiếu; giảm ô nhập dưới 16px; bỏ chế độ tối; thêm thư viện giao diện.
