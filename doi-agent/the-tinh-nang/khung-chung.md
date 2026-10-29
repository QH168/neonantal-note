# Thẻ tính năng: Khung chung

**Mục đích:** bố cục PC/iPhone, tab Việc/Khám, sáng/tối, màu sắc, cỡ chữ, PWA.

## File
- `src/App.jsx` — trạng thái màn hình; hai bố cục: PC (`wide`, ≥900px) và iPhone. Tiêu đề, thanh tiến độ, nút đám mây, nút "/a" (mở Thư viện viết tắt, `aria-label` "Thư viện viết tắt", vùng chạm 44px, cả iPhone và PC), nút sáng/tối. `VietTatProvider` bọc toàn bộ app.
- `src/App.css` — biến màu (`.th`, `.th.dark`, `--p1…--p5`, `--vtAct` màu chữ/viền nút Hoàn tác trong hộp "Đã thay": sáng `#9AD3F5`, tối `#0B79B8` — hộp này đảo màu so với nền), khối "thang chữ gọn" cho iPhone ở cuối file.
- `src/components/ui.jsx` — biểu tượng, `CheckBtn`, `PriDot` (việc cũ), `TagDot` (nhãn), `PencilIcon`, `SwipeRow` (xoá kiểu C: vuốt trái thì thẻ đứng yên, viền đỏ, nút "Xoá" thay phần cuối dòng gắn class `swipe-tail`; PC rê chuột hiện nút; dùng ở Việc, Khám và Thư viện viết tắt; có tham số `kind`), `Sheet` (bảng trượt lên/hộp giữa; nhận `className`, vd. `sheet-half` cao ~50%; co theo bàn phím iPhone bằng `visualViewport`), `SheetHead`.
- `src/hooks.js` — `useToday` (tự đổi ngày qua nửa đêm), `useWide`, `useAppData` (toàn bộ dữ liệu, tự cập nhật).
- `src/main.jsx`, `index.html`, `vite.config.js` (PWA, `BASE_PATH` do GitHub Actions đặt).

## Luật giao diện (⚙ kiểm bằng máy)
- Ô nhập (`input`, `select`, `textarea`, `.input`, `.select`, `.bare-input`, `.mono`) ≥16px.
- Ô tick, nút biểu tượng, nút ưu tiên, nút nhãn, nút "Xoá" của `SwipeRow`, nút tròn: vùng chạm ≥44px (đo trên ảnh chụp iPhone 15).
- Giữ đủ biến màu cho cả sáng và tối.

## Điểm dễ hỏng
- SwipeRow (v8.4): khi kéo chỉ ghi biến CSS `--p` lên phần tử (không setState mỗi pointermove); CSS tính clip-path/opacity từ `--p`. Nút xoá cảm ứng xử lý ở `pointerup` (Chromium/Safari có thể không sinh click ngay sau cú vuốt); chuột/bàn phím dùng click. Sheet có trạng thái đang đóng: gỡ khỏi trang sau chuyển động; nút trong bảng muốn đóng có chuyển động phải dùng `DongBtn`/`useDongSheet` (vd. "Xoá việc" từ v8.5); gỡ Sheet từ bên ngoài thì bảng mất ngay. Khi đang đóng, chỉ `.sheet` tắt pointer-events, nền vẫn hứng chạm.
- `Sheet` PHẢI vẽ bằng `createPortal` vào `document.body` (⚙ luật 10). Nếu để trong vùng cuộn `.ph-main`, Safari iPhone cho phần đầu và thanh thêm việc đè lên bảng (Chromium không bị, máy chụp không bắt được). Bảng điện thoại có class `sheet-ph`; quy tắc cỡ chữ iPhone viết `:is(.phone-app,.sheet-ph) X`.
- Tiêu đề luôn một dòng (`white-space: nowrap` + `text-overflow: ellipsis`).
- `Sheet` đổi chiều cao theo `visualViewport` khi bàn phím iPhone hiện (class `kb`, đặt `top`/`height` trực tiếp); bỏ hoặc sửa mà không thử bàn phím thì ô đang gõ bị che. Chưa thử trên iPhone thật.
- `SwipeRow`: chặn click ngay sau khi vuốt (~0,4 giây); chạm nút Xoá sát sau khi vuốt có thể không ăn — nếu bị trên iPhone thì đổi nút Xoá sang `pointerup` (xem "Chờ duyệt" trong `NHAT_KY.md`). Giữ `touch-action: pan-y`.
- iPhone dùng `100dvh` và `env(safe-area-inset-*)` — đừng bỏ.
- Phông Be Vietnam Pro tải từ Google Fonts; ảnh chụp trong môi trường Claude dùng phông dự phòng nên chữ hơi khác máy thật.
