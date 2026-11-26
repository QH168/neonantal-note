# Thẻ tính năng: Giờ (tab Giờ đợt 2 và ô giờ ở tab Khám đợt 3, 26/11/2026)

**Mục đích:** ghi giờ nhập máy của từng bé trong ngày làm việc, chia giờ nhanh cho nhiều bé, tránh trùng giờ với bé khác và với giờ người khác dùng.

## File và hàm
- `src/components/Gio.jsx` — `TabGio` (màn hình), `ThanhGioView` (thanh giờ), `ChonGioNhanh` (Đóng/Mở, Từ, Đến tự tính, bước 1/2/3/5, chip bé theo phòng, "Mã khác", câu kết quả, "Kéo dài đến", "Điền n giờ vào tab Khám" + Hoàn tác), danh sách "Trong ngày" (bé, mã khác, khoảng người khác, đoạn trống từ 5 phút), `BangKhoang`, `BangBe`, `OGio` (gõ 815 / 0815 / 8h15, −1/+1 vòng nửa đêm). Đúng bản thử lần 6 (bác sĩ duyệt 25/11/2026).
- `src/lib/gio.js` — luật thuần; đợt 2 thêm `thanhGio` (thanh chạy từ giờ đầu đến hết phút của giờ cuối, nhãn giữa trong 24–76%, vạch xem trước chỉ khi nằm trong thanh) và `beTheoPhong`. Đợt 3 thêm `xuLyGoGio` (rời ô giờ: `giu` / `xoa` / `sai` / `luu` / `hoi`), `noiDungCanhBao` (chữ hộp cảnh báo), và chuyển về đây `CHUA_MA`, `tenKhoang`, `chuLoiNgan`, `chuLoiDai` (chữ lý do trùng dùng chung tab Giờ và tab Khám).
- `src/hooks.js` — `useGioMayNgay(ngay)`. `src/App.jsx` — tab `'gio'`, trạng thái `gioQ` giữ khi đổi tab, "Xem ở tab Khám" (`xemOKham`); đợt 3: `GioKhamProvider` bọc cả PC và iPhone, nhận `gioDl.dong`, `gioDl.khoang` và mốc.
- Ghi chỉ qua `src/lib/actions.js` mục "Giờ nhập máy". Điền nhanh gửi kèm giờ màn hình đang hiện; lệch thì không ghi, báo "Dữ liệu vừa đổi, xem lại rồi bấm lần nữa.".

## Ô giờ ở tab Khám (đợt 3) — `src/components/GioKham.jsx`
- `OGioKham {p, to}`: ô giờ nhập máy của một bé. `to` = bản lớn 44px trong chi tiết bé (`PatientDetail`, trong `.be-head`, bên trái chip phòng, đồng hồ nằm trong ô); không có `to` = ô trên dòng bé (`PatientRow`, ngay sau mã).
- Lưu khi gõ đủ 4 số, Enter hoặc rời ô; rỗng = xoá giờ; chữ sai = không lưu, báo "Giờ chưa đúng nên chưa lưu. Gõ 801 hoặc 08h01."; Esc = trả giờ cũ và rời ô (Esc trong ô không đóng bảng chi tiết). Gõ lại đúng giờ cũ thì không ghi. Mỗi lần lưu/xoá có thanh Hoàn tác: "Đã lưu G03 - 08h15", "Đã xoá giờ của G01" (`datGioBe` rồi `hoanTacGioBe(id, cu)`). Dòng/bảng bị gỡ lúc đang gõ dở: lưu nốt nếu không trùng, trùng thì bỏ.
- Trùng (bé khác, mã khác trong tab Giờ, khoảng người khác — cùng `loiGio` với tab Giờ): hộp `HopCanhBao` (`role="alertdialog"`, vẽ vào body, z-index 90 trên bảng chi tiết bé 50 và thanh Hoàn tác 70): tiêu đề "Trùng giờ: G03 - 08h01", lý do (chữ như tab Giờ + dấu chấm), "Chưa lưu.", ba nút: Sửa lại (mặc định, Esc), Giữ giờ cũ hh:mm (hoặc "Bỏ, không ghi giờ" khi chưa có giờ), Vẫn lưu hh:mm. "Sửa lại" đưa con trỏ về ô với chữ đang gõ; rời ô khi chưa đổi gì vẫn hỏi lại. Không bấm nền để đóng.
- Dòng bé: nút mở chi tiết `.pat-open` là lớp nút trống (aria-label "Mở chi tiết <mã>") phủ `.pat-the`; chữ `.pat-main` có `pointer-events:none`; ô giờ `.o-gio` (vùng chạm 44px, ô thấy 34px, chữ 16px) chặn `pointerdown`/`pointerup`/`click` nên không vuốt dòng và không mở chi tiết. Ô nhập có `user-select:text` (dòng vuốt đặt `user-select:none`, Safari sẽ không cho gõ nếu thiếu). Vào ô thì bôi đen cả chữ; Safari bỏ bôi đen khi nhấc tay nên chặn `mouseup` lần đầu và bôi lại ở click đầu (chỉ khi chữ chưa đổi).
- Trạng thái ô: trống = đồng hồ chuông nét đứt 48px (`--edge`, `--muted`); có giờ = nền `--tint`, chữ `--tintInk`; trùng = nền `--errBg`, chữ `--errInk`, viền 2px `--p1`.
- Chi tiết bé: đầu chi tiết là `flex-wrap`, nút đóng ghim góc phải; mã + ô giờ nằm hàng trên, chip phòng và chip "Vào hh:mm" xuống hàng khi hết chỗ (iPhone 320 và 393). Ô mã vẫn tự focus cho bé mới (chưa có mã).
- `PatientDetail` giữ state `f` riêng và `updatePatient` chỉ ghi trường đổi nên không ghi đè `gioNhap`.
- Chế độ 2 ngày: thẻ bé có dòng hôm nay chỉ hiện chữ giờ `ChuGioKham` (cạnh mã, `--tintInk`, trùng thì `--errInk`; không có ô nhập); dòng đầu thẻ `flex-wrap` để mã không bị bẻ chữ. Chi tiết (dòng hôm nay) có ô giờ như trên.
- Nút máy tính, "Còn n việc", vuốt phải "đã khám" giữ nguyên; vuốt "đã khám" không ghi giờ.

## Luật giao diện
- Giờ của mình xanh dương (đỏ khi trùng); giờ người khác xám than `--ho*`; "Không trùng" nền bề mặt, chữ `--tintInk`, viền `--accent` (`--kt*`); thiếu giờ vàng `--note*`; trùng đỏ. Không tím, không xanh lá.
- Tab Giờ không có nút lịch, không có "2 ngày"; dải "Ngày làm việc" vẫn hiện khi trước mốc.
- Chưa làm (đợt 4): xem giờ ngày trước, chép bảng.
