# Thẻ tính năng: Khung chung

**Mục đích:** bố cục PC/iPhone, tab Việc/Khám, giao diện Sáng/Tối/Theo máy, màu sắc, cỡ chữ, PWA.

## File
- `src/App.jsx` — trạng thái màn hình; hai bố cục: PC (`wide`, ≥900px) và iPhone. Tiêu đề, thanh tiến độ ("Đã xong x/y" ở tab Việc, "Đã khám x/y" ở tab Khám). Đầu trang iPhone (v9.1) có 3 nút tròn 44px theo thứ tự: "/a" (mở Thư viện viết tắt, `aria-label` "Thư viện viết tắt"), đám mây (mở bảng "Sao lưu và cài đặt", `aria-label` "Sao lưu và cài đặt", chấm đỏ khi quá 24 giờ), lịch (chỉ tab Việc, huy hiệu số việc quá hạn ở góc nút). Đầu trang PC chỉ có "/a" và đám mây (lịch nằm cột trái). **Không còn nút sáng/tối** — chọn Sáng/Tối/Theo máy trong bảng "Sao lưu và cài đặt" (`BackupPanel.jsx`). Dòng nhắc "Chạm 2 lần: chi tiết · Vuốt trái: xoá" ở tab Việc chỉ hiện khi `hienDongNhac` (3 lần mở app đầu hoặc danh sách của ngày trống). `VietTatProvider` bọc toàn bộ app.
- `src/App.css` — biến màu (`.th`, `.th.dark`, `--p1…--p5` cho số ưu tiên việc cũ/chấm đỏ/cảnh báo/nút xoá, `--vtAct` màu chữ/viền nút Hoàn tác trong hộp "Đã thay": sáng `#9AD3F5`, tối `#0B79B8` — hộp này đảo màu so với nền). v9.1 thêm: màu nhãn `--tNV/--tNVi`, `--tBM/--tBMi`, `--tCK/--tCKi`, `--tHC/--tHCi`, `--tXN/--tXNi` (nền nhạt + chữ đậm, bảng 16a, có cả sáng và tối); màu trạng thái (mục 1.3 đặc tả v9) `--okBg --okInk --swR --swR2 --swL --swL2 --delInk --delBg --doneLine --doneInk --noteBg --noteInk --noteLine --rangeBg --rangeEnd --rangeLine --rangeInk --chipZero` — mới khai báo, chỉ `--chipZero` đã dùng (chip khu trống), phần còn lại chờ đợt 9.2 trở đi. Khối "thang chữ gọn" cho iPhone ở cuối file là thang 5 bậc: 20 (tiêu đề) / 17 (tên bảng dưới, tên việc trong chi tiết) / 15 (nội dung, nút, chip, tên nhóm) / 13 (chữ phụ, ghi chú dưới tên việc) / 12 (ghi chú nhỏ); ô nhập 16. Không còn cỡ 12,5 / 13,5 / 14 / 18 trên iPhone; PC giữ cỡ cũ.
- `src/components/ui.jsx` — biểu tượng, `CheckBtn`, `PriDot` (việc cũ), `TagDot` (huy hiệu nhãn tròn 26px, chữ 11px đậm, việc đã xong mờ 0,5) và `mauNhan(tag)` (trả biến `--tb`/`--ti` từ `--tXX`/`--tXXi`; nhãn lạ dùng màu NV), `PencilIcon`, `SwipeRow` (xoá kiểu C: vuốt trái thì thẻ đứng yên, viền đỏ, nút "Xoá" thay phần cuối dòng gắn class `swipe-tail`; PC rê chuột hiện nút; dùng ở Việc, Khám và Thư viện viết tắt; có tham số `kind`), `Sheet` (bảng trượt lên/hộp giữa; nhận `className`, vd. `sheet-half` cao ~50%; co theo bàn phím iPhone bằng `visualViewport`; bảng điện thoại có thanh kéo nhỏ `sheet-grip` ở đỉnh, chỉ để trang trí), `SheetHead` (tiêu đề bảng 17px, nút đóng 44px).
- `src/hooks.js` — `useToday` (tự đổi ngày qua nửa đêm), `useWide`, `useGiaoDien` (chế độ Sáng/Tối/Theo máy; trả `cheDo`, `setCheDo`, `dark`; đặt class `dark` lên `<html>` và `theme-color`), `useLanMoApp` (số lần mở app, đếm một lần mỗi lần tải trang), `useAppData` (toàn bộ dữ liệu, tự cập nhật).
- `src/lib/cai-dat.js` — hàm thuần (không dùng window/localStorage): `KHOA_CHE_DO` (`theme`), `KHOA_LAN_MO` (`soLanMo`), `SO_LAN_NHAC` (3), `docCheDo`, `laToi`, `tangLanMo`, `hienDongNhac`. Bài kiểm: `tests/luat.test.js` (v9.1).
- `src/main.jsx`, `index.html`, `vite.config.js` (PWA, `BASE_PATH` do GitHub Actions đặt).

## Luật giao diện (⚙ kiểm bằng máy)
- Ô nhập (`input`, `select`, `textarea`, `.input`, `.select`, `.bare-input`, `.mono`) ≥16px.
- Ô tick, nút biểu tượng, nút ưu tiên, nút nhãn, nút "Xoá" của `SwipeRow`, nút tròn: vùng chạm ≥44px (đo trên ảnh chụp iPhone 15).
- Giữ đủ biến màu cho cả sáng và tối (kể cả màu nhãn mới và màu trạng thái; bản tối đã đo tương phản chữ ≥4,5:1, biểu tượng ≥3:1 trong `tests/luat.test.js`).
- Tab Việc/Khám, chip khu vực, nút trên đầu trang cao 44px (v9.1). Nút chọn nhãn 44px tròn.
- Đầu trang không có nút sáng/tối (⚙ `tests/luat.test.js`).

## Điểm dễ hỏng
- Chế độ giao diện (v9.1): lưu ở `localStorage` khoá `theme` với giá trị `light` | `dark` | `auto`. Chỉ ghi khi người dùng bấm chọn; người đã có `light`/`dark` từ trước giữ nguyên giao diện, chưa có gì thì là Theo máy (`auto`, theo `prefers-color-scheme`, tự đổi khi máy đổi). Không đưa vào CSDL hay file sao lưu.
- Số lần mở app (`soLanMo`) đếm theo lần tải trang: trên iPhone, app tiếp tục từ nền không tính là lần mở mới.
- Chip khu không có việc (chỉ chip iPhone): chữ và viền nhạt (`.chip.zero`), không ghi số 0. Màu chữ `--chipZero` #6B7F91 do đặc tả chốt đo 4,14:1 trên trắng, thấp hơn 4,5:1 — đang chờ bác sĩ quyết (xem "Chờ duyệt" trong `NHAT_KY.md`).
- SwipeRow (v8.4): khi kéo chỉ ghi biến CSS `--p` lên phần tử (không setState mỗi pointermove); CSS tính clip-path/opacity từ `--p`. Nút xoá cảm ứng xử lý ở `pointerup` (Chromium/Safari có thể không sinh click ngay sau cú vuốt); chuột/bàn phím dùng click. Sheet có trạng thái đang đóng: gỡ khỏi trang sau chuyển động; nút trong bảng muốn đóng có chuyển động phải dùng `DongBtn`/`useDongSheet` (vd. "Xoá việc" từ v8.5); gỡ Sheet từ bên ngoài thì bảng mất ngay. Khi đang đóng, chỉ `.sheet` tắt pointer-events, nền vẫn hứng chạm.
- `Sheet` PHẢI vẽ bằng `createPortal` vào `document.body` (⚙ luật 10). Nếu để trong vùng cuộn `.ph-main`, Safari iPhone cho phần đầu và thanh thêm việc đè lên bảng (Chromium không bị, máy chụp không bắt được). Bảng điện thoại có class `sheet-ph`; quy tắc cỡ chữ iPhone viết `:is(.phone-app,.sheet-ph) X`.
- Tiêu đề luôn một dòng (`white-space: nowrap` + `text-overflow: ellipsis`).
- `Sheet` đổi chiều cao theo `visualViewport` khi bàn phím iPhone hiện (class `kb`, đặt `top`/`height` trực tiếp); bỏ hoặc sửa mà không thử bàn phím thì ô đang gõ bị che. Chưa thử trên iPhone thật.
- `SwipeRow`: chặn click ngay sau khi vuốt (~0,4 giây); chạm nút Xoá sát sau khi vuốt có thể không ăn — nếu bị trên iPhone thì đổi nút Xoá sang `pointerup` (xem "Chờ duyệt" trong `NHAT_KY.md`). Giữ `touch-action: pan-y`.
- iPhone dùng `100dvh` và `env(safe-area-inset-*)` — đừng bỏ.
- Phông Be Vietnam Pro tải từ Google Fonts; ảnh chụp trong môi trường Claude dùng phông dự phòng nên chữ hơi khác máy thật.
