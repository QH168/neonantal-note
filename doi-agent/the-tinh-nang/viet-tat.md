# Thẻ tính năng: Viết tắt

**Mục đích:** gõ "/chữ tắt" rồi dấu cách ở mọi ô gõ chữ thì tự thay bằng nội dung đầy đủ (vd. `/kmdm ` → "Khí máu động mạch "); bác sĩ tự quản thư viện viết tắt.

## File và hàm
- `src/lib/viet-tat.js` — hàm thuần (không import db/React): `chuanKey`, `taoMap`, `moRong` (thay khi vừa gõ dấu cách/xuống dòng), `hoanTac`, `goiY` (tối đa 4, khớp đầu key), `chenGoiY`, `BO_MAU` (13 mục mẫu).
- `src/lib/actions.js` — `addAbbrev` (key trùng thì báo để hỏi ghi đè), `updateAbbrev`, `removeAbbrev`, `khoiPhucAbbrev` (v9.2, Hoàn tác xoá: nếu trong lúc chờ đã có mục sống cùng chữ tắt thì KHÔNG khôi phục, trả `{ trung: true }` và thanh Hoàn tác báo "Đã có chữ tắt này, không khôi phục"; ngược lại chỉ đổi `deleted` true thành false), `seedAbbrevs` (gọi trong `ensureSeed`).
- `src/hooks.js` — `useAbbrevs`.
- `src/components/VietTat.jsx` — `VietTatProvider` (bọc App, đọc thư viện một lần), `useVietTat(value, setValue, {onBlur})` → `{ props, strip }`: rải `props` vào ô, đặt `strip` (dải gợi ý + hộp "Đã thay /key" + Hoàn tác ~4 giây).
- `src/components/ThuVien.jsx` — bảng "Thư viện viết tắt": thêm, sửa (bút chì, còn tới đợt 9.3), tìm (gõ không dấu cũng ra), xoá bằng vuốt trái (v9.2: dòng trượt thật, nền đỏ phấn, thả qua 1/3 là xoá, thanh "Đã xoá: /key — Hoàn tác" 6 giây; thư viện chỉ vuốt trái, không truyền `onDone`; PC rê chuột hiện nút thùng rác).
- `src/App.jsx` — nút "/a" mở thư viện; `src/components/ui.jsx` — `PencilIcon`, `SwipeRow` (`kind`), `Sheet` (`className`, co theo bàn phím iPhone qua visualViewport). Ô tên và ghi chú trong bảng chi tiết việc (`TaskDetail`) cũng dùng `useVietTat`.
- Đã gắn `useVietTat` ở các ô: thêm việc, tên việc và ghi chú việc (bảng chi tiết việc), việc cần làm của bé, ghi chú của bé, khung Tổng hợp y lệnh.

## Dữ liệu
- Bảng `abbrevs` (id, key, text, updatedAt, deleted) ở `db.version(2)`; có trong `DATA_TABLES` → được sao lưu/gộp. Chi tiết: `doi-agent/the-tinh-nang/sao-luu.md`.
- `key` lưu chữ thường, không có "/". 13 mục mẫu gieo một lần (id `mau-<key>`, meta `abbrevSeeded`); mục đã xoá không quay lại.

## Quyết định (bác sĩ duyệt 28/10/2026, xem `doi-agent/QUYET_DINH_DA_CHOT.md`)
- Chỉ thay khi gõ dấu cách; không phân biệt hoa/thường; "8/10", "1/2", "x/kmdm" không đổi (chỉ tính "/key" đứng đầu chuỗi hoặc sau khoảng trắng).
- Gợi ý khi gõ "/km"; thay xong có Hoàn tác ~4 giây; không gửi dữ liệu ra mạng, không thêm thư viện.

## Điểm dễ hỏng
- `strip` phải đặt NGOÀI thẻ `label` bọc ô: nút nằm trong `label` thì chạm nút sẽ kích hoạt lại ô nhập.
- Sau khi thay chữ, con trỏ đặt lại bằng `setSelectionRange` trong `useLayoutEffect`; bỏ hoặc đổi thứ tự là con trỏ nhảy về cuối.
- iPhone: nút gợi ý/Hoàn tác dùng `preventDefault` ở `onPointerDown`/`onMouseDown` để không mất bàn phím; chỉ thay khi `inputType` là kiểu chèn (không thay khi xoá/hoàn tác của hệ thống).
- Ô một dòng (thêm việc): gõ "/ctm" rồi Enter thì gửi luôn mà không thay chữ (chỉ dấu cách thay) — đang chờ bác sĩ quyết (NHAT_KY, Chờ duyệt).
- Thư viện: `SwipeRow` chặn click ngay sau khi vuốt (~0,4 giây). Hoàn tác xoá chữ tắt phải qua `khoiPhucAbbrev` (không đổi `deleted` thẳng), nếu không sẽ có hai mục trùng chữ tắt. Hoàn tác ~4 giây của "Đã thay" (thay chữ khi gõ) là cơ chế riêng trong `VietTat.jsx`, khác thanh Hoàn tác 6 giây của xoá (`HoanTac.jsx`).
- Bảng chi tiết việc dùng `Sheet` co theo bàn phím (visualViewport); `strip` của viết tắt vẫn phải nằm ngoài `label`.
- Thêm ô gõ chữ mới mà không dùng `useVietTat` thì ô đó không có viết tắt.
