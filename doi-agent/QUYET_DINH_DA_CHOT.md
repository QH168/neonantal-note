# Quyết định đã chốt

> Agent không được tự ý đổi các điều dưới đây. Muốn đổi phải có bác sĩ đồng ý và ghi lại ở đây kèm ngày.
> Mục có dấu ⚙ đã được kiểm bằng máy (bài kiểm tra trong `tests/`).

## Chung
- ⚙ Chỉ dùng mã/số giường, không có ô họ tên bệnh nhân.
- ⚙ Tên cơ sở dữ liệu `ghichu-sosinh`; không sửa `db.version(1)`.
- Link app giữ nguyên: https://qh168.github.io/neonantal-note/
- ⚙ Không thêm thư viện npm mới nếu phiếu việc không cho phép.
- Sao lưu JSON lên OneDrive; gộp theo dòng, bản sửa sau cùng thắng; xoá = đánh dấu `deleted`. ⚙ (merge.test.js)

## Giao diện
- 2 tab: Việc / Khám. Có sáng/tối. Biểu tượng đám mây để sao lưu, chấm đỏ khi quá 24 giờ chưa sao lưu.
- Tiêu đề: "Việc hôm nay" (ngày khác: "Việc ngày dd/mm"), "Khám bệnh hôm nay"; luôn một dòng.
- iPhone theo bảng "iPhone 15 – chữ gọn": tiêu đề 20px; nội dung việc và mã giường 15px; chữ phụ 12–13px;
  ô tick nhỏ còn 80% nhưng vùng chạm ≥44px ⚙ (ảnh chụp đo tự động); ⚙ ô nhập giữ 16px để Safari không phóng to.
- PC giữ cỡ chữ cũ.

## Việc
- ⚙ Khu vực: NICU, CT, KAN, PS-PM, BM, DV.
- ⚙ Mức ưu tiên: 1 đỏ, 2 vàng, 3 xanh lá, 4 xanh dương, 5 "NV" (tím, hình tròn). Chạm để đổi vòng 1→2→3→4→NV→1.
- Việc chưa xong xếp trước, rồi theo mức.
- Lịch tháng có số việc chưa xong mỗi ngày; nút "Xoá việc đã xong"; dòng "Khám: còn x việc" (bấm chuyển sang Khám).

## Khám
- Phòng tự đặt tên, mặc định Phòng 1–3; phòng đã từng có bệnh nhân thì không xoá được.
- Mỗi bé: mã/giường, ngày sinh, tuổi thai lúc sinh, cân nặng, ghi chú, việc cần làm; đánh dấu đã khám; xoá bé có hỏi xác nhận.
- "Lấy danh sách hôm qua": chép bé + việc chưa xong từ ngày khám gần nhất trước hôm nay, không trùng phòng + mã. ⚙ (ảnh chụp thử tự động)
  Giữ đúng thứ tự bé như ngày nguồn; bé thêm tay nằm cuối phòng (bác sĩ duyệt 28/10/2026). ⚙ (tests/thu-tu.test.js)
- "Tổng hợp y lệnh": văn bản sửa được, có nút Sao chép; bé không có việc mới ghi "Tiếp tục y lệnh cũ". ⚙

## Tính tuần tuổi (chỉ chạy khi bấm nút)
- Hiện "Ngày tuổi" và "Tuổi thai hiệu chỉnh" dạng đủ tuần + ngày (36w0d, 36w3d). ⚙
- ⚙ KHÔNG hiện "còn bao nhiêu ngày đến 40w".
- Ngày sinh nhận: 0810, 08/10, 8/10, 8-10, 8.10, 08/10/2026, 081026. Không ghi năm: lấy năm nay; nếu thành ngày tương lai thì lùi về năm trước. ⚙
- Tuổi thai nhận: 346, 34w6d, 34+6, 34 6, 34.6, 3406, 34 (= 34w0d); giới hạn 20–45 tuần, ngày lẻ 0–6. ⚙
- Ví dụ đã kiểm (tính ngày 21/10/2026): 05/08 + 25 tuần → 77 ngày, 36w0d; 20/09 + 32w0d → 31 ngày, 36w3d; 04/10 + 39w0d → 17 ngày, 41w3d. ⚙
