# Ghi chú Sơ sinh

App ghi chú công việc và khám bệnh cho khoa sơ sinh, chạy trên iPhone (thêm vào Màn hình chính) và trình duyệt PC.
Dữ liệu lưu **trong từng máy** (IndexedDB), sao lưu và chuyển giữa các máy bằng **file trên OneDrive**.
Không có máy chủ nào giữ dữ liệu bệnh nhân. Chỉ dùng mã/số giường, không ghi họ tên.

## Tính năng
- **Việc:** thêm việc theo khu (NICU, CT, KAN, PS-PM, BM, DV) với mức ưu tiên 1–4 và mức 5 "NV"; đánh dấu xong; chạm số để đổi mức;
  lọc theo khu; thu gọn từng khu; lịch tháng (số việc chưa xong mỗi ngày); "Xoá việc đã xong"; dòng nhắc "Khám: còn x việc".
- **Khám:** phòng tự đặt tên; thêm bé theo phòng; hồ sơ nhanh (ngày sinh ddmm, tuổi thai 346 = 34w6d, cân nặng, ghi chú);
  việc cần làm của từng bé; đánh dấu đã khám; **Tính tuần tuổi** (ngày tuổi, tuổi thai hiệu chỉnh dạng 36w3d);
  **Lấy danh sách hôm qua** (hoặc ngày khám gần nhất); **Tổng hợp y lệnh** sửa được và sao chép.
- **Sao lưu (biểu tượng đám mây):** xuất file lên OneDrive, nhập file từ máy kia; chấm đỏ nhắc khi quá 24 giờ chưa sao lưu.
- Giao diện sáng/tối; iPhone dùng bảng trượt lên, PC dùng khung bên phải.

## Cấu trúc
```
src/App.jsx              Bố cục PC và iPhone
src/App.css              Màu sắc, kích thước
src/components/Tasks.jsx Mục Việc + Lịch
src/components/Exam.jsx  Mục Khám + chi tiết bé + Tổng hợp
src/components/BackupPanel.jsx  Sao lưu OneDrive
src/lib/clinical.js      Tính tuần tuổi, soạn tổng hợp
src/lib/actions.js       Thêm/sửa/xoá dữ liệu
src/lib/backup.js, merge.js  Xuất/nhập file, gộp dữ liệu
src/db.js                Cơ sở dữ liệu trên máy
tests/                   Kiểm thử tự động (chạy trên GitHub mỗi lần cập nhật)
```

## Đưa lên mạng (GitHub Pages)
Tải các file lên kho GitHub → GitHub tự kiểm thử, đóng gói và đăng tại
`https://<tài-khoản>.github.io/<tên-kho>/` (xem tab **Actions**: dấu ✅ là xong).
Trên iPhone: mở link bằng Safari → Chia sẻ → **Thêm vào MH chính**, và luôn mở app từ icon đó.

## Giữ dữ liệu an toàn
- Giữ nguyên một đường link; đổi link (đổi tên kho) thì app mới sẽ trống.
- Xuất sao lưu lên OneDrive mỗi ngày. Đổi máy: cài app → Sao lưu → Nhập từ file.
- Gộp dữ liệu theo từng dòng: dòng nào sửa sau thì giữ bản đó. Nhập cùng file nhiều lần không sao.
