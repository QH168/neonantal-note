# Thẻ tính năng: Khung chung

**Mục đích:** bố cục PC/iPhone, tab Việc/Khám, sáng/tối, màu sắc, cỡ chữ, PWA.

## File
- `src/App.jsx` — trạng thái màn hình; hai bố cục: PC (`wide`, ≥900px) và iPhone. Tiêu đề, thanh tiến độ, nút đám mây, nút "/a" (mở Thư viện viết tắt, `aria-label` "Thư viện viết tắt", vùng chạm 44px, cả iPhone và PC), nút sáng/tối. `VietTatProvider` bọc toàn bộ app.
- `src/App.css` — biến màu (`.th`, `.th.dark`, `--p1…--p5`, `--vtAct` màu chữ/viền nút Hoàn tác trong hộp "Đã thay": sáng `#9AD3F5`, tối `#0B79B8` — hộp này đảo màu so với nền), khối "thang chữ gọn" cho iPhone ở cuối file.
- `src/components/ui.jsx` — biểu tượng, `CheckBtn`, `PriDot` (việc cũ), `TagDot` (nhãn), `PencilIcon`, `SwipeRow` (vuốt trái để xoá, dùng ở Việc, Khám và Thư viện viết tắt; có tham số `kind`), `Sheet` (bảng trượt lên/hộp giữa; nhận `className`), `SheetHead`.
- `src/hooks.js` — `useToday` (tự đổi ngày qua nửa đêm), `useWide`, `useAppData` (toàn bộ dữ liệu, tự cập nhật).
- `src/main.jsx`, `index.html`, `vite.config.js` (PWA, `BASE_PATH` do GitHub Actions đặt).

## Luật giao diện (⚙ kiểm bằng máy)
- Ô nhập (`input`, `select`, `textarea`, `.input`, `.select`, `.bare-input`, `.mono`) ≥16px.
- Ô tick, nút biểu tượng, nút ưu tiên, nút nhãn, nút thùng rác của `SwipeRow`, nút tròn: vùng chạm ≥44px (đo trên ảnh chụp iPhone 15).
- Giữ đủ biến màu cho cả sáng và tối.

## Điểm dễ hỏng
- Tiêu đề luôn một dòng (`white-space: nowrap` + `text-overflow: ellipsis`).
- iPhone dùng `100dvh` và `env(safe-area-inset-*)` — đừng bỏ.
- Phông Be Vietnam Pro tải từ Google Fonts; ảnh chụp trong môi trường Claude dùng phông dự phòng nên chữ hơi khác máy thật.
