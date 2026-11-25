# Thẻ tính năng: Giờ (tab Giờ, đợt 2, 26/11/2026)

**Mục đích:** ghi giờ nhập máy của từng bé trong ngày làm việc, chia giờ nhanh cho nhiều bé, tránh trùng giờ với bé khác và với giờ người khác dùng.

## File và hàm
- `src/components/Gio.jsx` — `TabGio` (màn hình), `ThanhGioView` (thanh giờ), `ChonGioNhanh` (Đóng/Mở, Từ, Đến tự tính, bước 1/2/3/5, chip bé theo phòng, "Mã khác", câu kết quả, "Kéo dài đến", "Điền n giờ vào tab Khám" + Hoàn tác), danh sách "Trong ngày" (bé, mã khác, khoảng người khác, đoạn trống từ 5 phút), `BangKhoang`, `BangBe`, `OGio` (gõ 815 / 0815 / 8h15, −1/+1 vòng nửa đêm). Đúng bản thử lần 6 (bác sĩ duyệt 25/11/2026).
- `src/lib/gio.js` — luật thuần; đợt 2 thêm `thanhGio` (thanh chạy từ giờ đầu đến hết phút của giờ cuối, nhãn giữa trong 24–76%, vạch xem trước chỉ khi nằm trong thanh) và `beTheoPhong`.
- `src/hooks.js` — `useGioMayNgay(ngay)`. `src/App.jsx` — tab `'gio'`, trạng thái `gioQ` giữ khi đổi tab, "Xem ở tab Khám" (`xemOKham`).
- Ghi chỉ qua `src/lib/actions.js` mục "Giờ nhập máy". Điền nhanh gửi kèm giờ màn hình đang hiện; lệch thì không ghi, báo "Dữ liệu vừa đổi, xem lại rồi bấm lần nữa.".

## Luật giao diện
- Giờ của mình xanh dương (đỏ khi trùng); giờ người khác xám than `--ho*`; "Không trùng" nền bề mặt, chữ `--tintInk`, viền `--accent` (`--kt*`); thiếu giờ vàng `--note*`; trùng đỏ. Không tím, không xanh lá.
- Tab Giờ không có nút lịch, không có "2 ngày"; dải "Ngày làm việc" vẫn hiện khi trước mốc.
- Chưa làm (đợt 3, 4): ô giờ trong tab Khám và chi tiết bé; xem giờ ngày trước, chép bảng.
