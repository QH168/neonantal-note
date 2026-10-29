# Quyết định đã chốt

> Agent không được tự ý đổi các điều dưới đây. Muốn đổi phải có bác sĩ đồng ý và ghi lại ở đây kèm ngày.
> Mục có dấu ⚙ đã được kiểm bằng máy (bài kiểm tra trong `tests/`).

## Chung
- ⚙ Chỉ dùng mã/số giường, không có ô họ tên bệnh nhân.
- ⚙ Tên cơ sở dữ liệu `ghichu-sosinh`; không sửa `db.version(1)`. CSDL đang ở `db.version(2)` (thêm bảng `abbrevs`); `db.version(1)` giữ nguyên. ⚙ (luat.test.js luật 2b)
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
- ⚙ Khu vực (việc mới): NICU, CT, KAN, PS-PM, Ngoại Trú, DV, HP, HS (bác sĩ duyệt 28/10/2026). Khu cũ BM không còn trong ô chọn, chỉ hiện khi còn việc cũ mang khu BM. (luat.test.js luật 7, viec.test.js)
- ⚙ Nhãn loại việc thay mức ưu tiên: NV, BM, CK, HC, XN; chọn nhiều, có thể không nhãn; màu dùng --p1…--p5 (bác sĩ duyệt 28/10/2026). Sửa nhãn trong bảng chi tiết việc (chạm 2 lần vào việc). (viec.test.js)
- ⚙ Việc xếp: chưa xong trước, rồi theo thứ tự thêm (cả việc cũ), không xếp theo nhãn/mức. (viec.test.js)
- Chi tiết việc (bác sĩ duyệt 29/10/2026): chạm 2 lần (trong 1 giây) vào việc → bảng "chi tiết việc" (sửa tên, khu, nhãn, ghi chú; cao ~50% màn hình; không tiêu đề; không chữ "Tự lưu"); ghi chú hiện chữ nhỏ dưới tên việc. Bỏ chạm 3 lần, bảng nhãn riêng, vòng tròn nét đứt.
- Xoá việc kiểu C (bác sĩ duyệt 29/10/2026): bỏ dấu ×; vuốt trái thì thẻ đứng yên, viền đỏ, cuối dòng đổi thành nút "Xoá" đỏ, chạm nút mới xoá; PC rê chuột hiện nút "Xoá" viền đỏ cạnh nhãn. Trong chi tiết việc có nút "Xoá việc".
- Dữ liệu cũ giữ nguyên hiển thị kiểu cũ: việc cũ vẫn hiện số 1–4/NV (NV cũ tím) và chạm để đổi vòng như trước. Việc cũ mà gắn nhãn mới trong chi tiết việc thì chuyển sang kiểu mới (urgency vẫn giữ trong dữ liệu); không gắn thì giữ số cũ.
- Lịch tháng có số việc chưa xong mỗi ngày; nút "Xoá việc đã xong"; dòng "Khám: còn x việc" (bấm chuyển sang Khám).

## Khám
- Phòng tự đặt tên, mặc định Phòng 1–3; phòng đã từng có bệnh nhân thì không xoá được.
- Mỗi bé: mã/giường, ngày sinh, tuổi thai lúc sinh, cân nặng, ghi chú, việc cần làm; đánh dấu đã khám; xoá bé có hỏi xác nhận.
  Việc cần làm của bé xoá bằng vuốt trái (không còn dấu ×) (bác sĩ duyệt 28/10/2026); từ 29/10/2026 xoá kiểu C (nút "Xoá" đỏ hiện trong dòng). Việc của bé chưa có chạm 2 lần mở chi tiết (bác sĩ: chưa cần).
- "Lấy danh sách hôm qua": chép bé + việc chưa xong từ ngày khám gần nhất trước hôm nay, không trùng phòng + mã. ⚙ (ảnh chụp thử tự động)
  Giữ đúng thứ tự bé như ngày nguồn; bé thêm tay nằm cuối phòng (bác sĩ duyệt 28/10/2026). ⚙ (tests/thu-tu.test.js)
- "Tổng hợp y lệnh": văn bản sửa được, có nút Sao chép; bé không có việc mới ghi "Tiếp tục y lệnh cũ". ⚙

## Viết tắt (bác sĩ duyệt 28/10/2026)
- ⚙ Gõ "/chữ tắt" rồi dấu cách ở mọi ô gõ chữ (thêm việc, tên và ghi chú việc, việc của bé, ghi chú của bé, khung Tổng hợp y lệnh) → tự thay bằng nội dung; không phân biệt hoa/thường. (viet-tat.test.js)
- ⚙ Luật không đổi: "8/10", "1/2", "x/kmdm" (không đứng đầu từ) và key không có trong thư viện giữ nguyên. (viet-tat.test.js)
- Gõ "/km" hiện tối đa 4 gợi ý, chạm để chèn; sau khi thay có "Đã thay /key" và nút Hoàn tác khoảng 4 giây. ⚙ (viet-tat.test.js: gợi ý, chèn, hoàn tác)
- Nút "/a" trên đầu mở "Thư viện viết tắt": thêm (key trùng thì hỏi ghi đè), sửa bằng bút chì, tìm (gõ không dấu cũng ra), vuốt trái để xoá; từ 29/10/2026 xoá kiểu C (thẻ đứng yên, viền đỏ, nút "Xoá" đỏ trong dòng; bác sĩ duyệt 29/10/2026).
- ⚙ 13 mục mẫu tự thêm một lần duy nhất; mục bác sĩ đã xoá không quay lại; bác sĩ tự thêm mục khác. (viet-tat.test.js: bộ mẫu 13 mục)
- ⚙ Thư viện được sao lưu cùng dữ liệu (bảng `abbrevs` trong `DATA_TABLES`); file sao lưu cũ vẫn nhập được, `BACKUP_VERSION` giữ 1. (merge.test.js, luat.test.js luật 2b)

## Tính tuần tuổi (chỉ chạy khi bấm nút)
- Hiện "Ngày tuổi" và "Tuổi thai hiệu chỉnh" dạng đủ tuần + ngày (36w0d, 36w3d). ⚙
- ⚙ KHÔNG hiện "còn bao nhiêu ngày đến 40w".
- Ngày sinh nhận: 0810, 08/10, 8/10, 8-10, 8.10, 08/10/2026, 081026. Không ghi năm: lấy năm nay; nếu thành ngày tương lai thì lùi về năm trước. ⚙
- Tuổi thai nhận: 346, 34w6d, 34+6, 34 6, 34.6, 3406, 34 (= 34w0d); giới hạn 20–45 tuần, ngày lẻ 0–6. ⚙
- Ví dụ đã kiểm (tính ngày 21/10/2026): 05/08 + 25 tuần → 77 ngày, 36w0d; 20/09 + 32w0d → 31 ngày, 36w3d; 04/10 + 39w0d → 17 ngày, 41w3d. ⚙
