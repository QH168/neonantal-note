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
- 2 tab: Việc / Khám. Biểu tượng đám mây mở bảng "Sao lưu và cài đặt", chấm đỏ khi quá 24 giờ chưa sao lưu.
- Giao diện Sáng / Tối / Theo máy chọn trong bảng "Sao lưu và cài đặt"; đầu trang không còn nút sáng/tối (bác sĩ duyệt 05/11/2026, v9.1). Lưu ở máy (localStorage khoá `theme`: light|dark|auto), người đã chọn sáng/tối từ trước giữ nguyên, chưa chọn thì Theo máy; không vào sao lưu. ⚙ (luat.test.js v9.1) Thay quyết định cũ "đầu trang có nút sáng/tối".
- Đầu trang iPhone còn 3 nút: "/a", đám mây, lịch (PC: "/a", đám mây) (bác sĩ duyệt 05/11/2026, v9.1). Tab Việc/Khám, chip khu, nút đầu trang cao 44px; chip khu không có việc chữ nhạt, không ghi số 0 (bác sĩ duyệt 05/11/2026, v9.1).
- Dòng nhắc cử chỉ ở tab Việc chỉ hiện trong 3 lần mở app đầu hoặc khi danh sách của ngày trống (bác sĩ duyệt 05/11/2026, v9.1).
- Tiêu đề: "Việc hôm nay" (ngày khác: "Việc ngày dd/mm"), "Khám bệnh hôm nay"; luôn một dòng. ("Hôm nay" hiện vẫn theo ngày lịch 00:00; sẽ thay ở đợt 9.6 theo THIET_KE_V9 mục 9.)
- iPhone theo thang chữ 5 bậc (bác sĩ duyệt 05/11/2026, v9.1): tiêu đề 20px; tên bảng dưới 17px; nội dung việc, mã giường, nút, chip 15px; chữ phụ 13px; ghi chú nhỏ 12px; không còn cỡ 12,5 / 13,5 / 14 / 18. (Thay "chữ phụ 12–13px" của bảng "iPhone 15 – chữ gọn".) ⚙ (luat.test.js v9.1)
  Ô tick nhỏ còn 80% nhưng vùng chạm ≥44px ⚙ (ảnh chụp đo tự động) — sẽ thay ở đợt 9.2 theo THIET_KE_V9 mục 9 (bỏ ô tick); ⚙ ô nhập giữ 16px để Safari không phóng to.
- PC giữ cỡ chữ cũ.

## Việc
- ⚙ Khu vực (việc mới): NICU, CT, KAN, PS-PM, Ngoại Trú, DV, HP, HS (bác sĩ duyệt 28/10/2026). Khu cũ BM không còn trong ô chọn, chỉ hiện khi còn việc cũ mang khu BM. (luat.test.js luật 7, viec.test.js)
- ⚙ Nhãn loại việc thay mức ưu tiên: NV, BM, CK, HC, XN; chọn nhiều, có thể không nhãn (bác sĩ duyệt 28/10/2026). Màu nhãn dùng bảng màu 16a: nền nhạt + chữ đậm cùng tông, biến `--tNV/--tNVi`… (NV đỏ phấn, BM vàng nhạt, CK xanh lơ, HC xanh chàm nhạt, XN tím nhạt), có cả sáng và tối; `--p1…--p5` giữ cho số ưu tiên của việc cũ, chấm đỏ đám mây, cảnh báo (bác sĩ duyệt 05/11/2026, v9.1). Thay quyết định cũ "màu nhãn dùng --p1…--p5". Sửa nhãn trong bảng chi tiết việc (chạm 2 lần vào việc). (viec.test.js, luat.test.js v9.1)
- ⚙ Việc xếp: chưa xong trước, rồi theo thứ tự thêm (cả việc cũ), không xếp theo nhãn/mức. (viec.test.js)
- Chi tiết việc (bác sĩ duyệt 29/10/2026): chạm 2 lần (trong 1 giây) vào việc → bảng "chi tiết việc" (sửa tên, khu, nhãn, ghi chú; cao ~50% màn hình; không tiêu đề; không chữ "Tự lưu"); ghi chú hiện chữ nhỏ dưới tên việc. Bỏ chạm 3 lần, bảng nhãn riêng, vòng tròn nét đứt.
- Xoá việc kiểu C (bác sĩ duyệt 29/10/2026): bỏ dấu ×; vuốt trái thì thẻ đứng yên, viền đỏ, cuối dòng đổi thành nút "Xoá" đỏ, chạm nút mới xoá; PC rê chuột hiện nút "Xoá" viền đỏ cạnh nhãn. Trong chi tiết việc có nút "Xoá việc". (Sẽ thay ở đợt 9.2 theo THIET_KE_V9 mục 9: vuốt trái 1/3 xoá + Hoàn tác 6 giây. Hiện vẫn đúng như trên.)
- Dữ liệu cũ giữ nguyên hiển thị kiểu cũ: việc cũ vẫn hiện số 1–4/NV (NV cũ tím) và chạm để đổi vòng như trước. Việc cũ mà gắn nhãn mới trong chi tiết việc thì chuyển sang kiểu mới (urgency vẫn giữ trong dữ liệu); không gắn thì giữ số cũ.
- Lịch tháng có số việc chưa xong mỗi ngày; nút "Xoá việc đã xong"; dòng "Khám: còn x việc" (bấm chuyển sang Khám).

## Khám
- Phòng tự đặt tên, mặc định Phòng 1–3; phòng đã từng có bệnh nhân thì không xoá được.
- Mỗi bé: mã/giường, ngày sinh, tuổi thai lúc sinh, cân nặng, ghi chú, việc cần làm; đánh dấu đã khám; xoá bé có hỏi xác nhận.
  Việc cần làm của bé xoá bằng vuốt trái (không còn dấu ×) (bác sĩ duyệt 28/10/2026); từ 29/10/2026 xoá kiểu C (nút "Xoá" đỏ hiện trong dòng). Việc của bé chưa có chạm 2 lần mở chi tiết (bác sĩ: chưa cần). (Sẽ thay ở đợt 9.4 theo THIET_KE_V9 mục 9: chạm 2 lần để sửa / bỏ đánh dấu. Hiện vẫn đúng như trên.)
- "Lấy danh sách hôm qua": chép bé + việc chưa xong từ ngày khám gần nhất trước hôm nay, không trùng phòng + mã. ⚙ (ảnh chụp thử tự động)
  Giữ đúng thứ tự bé như ngày nguồn; bé thêm tay nằm cuối phòng (bác sĩ duyệt 28/10/2026). ⚙ (tests/thu-tu.test.js)
- "Tổng hợp y lệnh": văn bản sửa được, có nút Sao chép; bé không có việc mới ghi "Tiếp tục y lệnh cũ". ⚙

## Viết tắt (bác sĩ duyệt 28/10/2026)
- ⚙ Gõ "/chữ tắt" rồi dấu cách ở mọi ô gõ chữ (thêm việc, tên và ghi chú việc, việc của bé, ghi chú của bé, khung Tổng hợp y lệnh) → tự thay bằng nội dung; không phân biệt hoa/thường. (viet-tat.test.js)
- ⚙ Luật không đổi: "8/10", "1/2", "x/kmdm" (không đứng đầu từ) và key không có trong thư viện giữ nguyên. (viet-tat.test.js)
- Gõ "/km" hiện tối đa 4 gợi ý, chạm để chèn; sau khi thay có "Đã thay /key" và nút Hoàn tác khoảng 4 giây. ⚙ (viet-tat.test.js: gợi ý, chèn, hoàn tác)
- Nút "/a" trên đầu mở "Thư viện viết tắt": thêm (key trùng thì hỏi ghi đè), sửa bằng bút chì (sẽ thay ở đợt 9.3 theo THIET_KE_V9 mục 9: chạm 2 lần để sửa; hiện vẫn là bút chì), tìm (gõ không dấu cũng ra), vuốt trái để xoá; từ 29/10/2026 xoá kiểu C (thẻ đứng yên, viền đỏ, nút "Xoá" đỏ trong dòng; bác sĩ duyệt 29/10/2026).
- ⚙ 13 mục mẫu tự thêm một lần duy nhất; mục bác sĩ đã xoá không quay lại; bác sĩ tự thêm mục khác. (viet-tat.test.js: bộ mẫu 13 mục)
- ⚙ Thư viện được sao lưu cùng dữ liệu (bảng `abbrevs` trong `DATA_TABLES`); file sao lưu cũ vẫn nhập được, `BACKUP_VERSION` giữ 1. (merge.test.js, luat.test.js luật 2b)

## Tính tuần tuổi (chỉ chạy khi bấm nút)
- Hiện "Ngày tuổi" và "Tuổi thai hiệu chỉnh" dạng đủ tuần + ngày (36w0d, 36w3d). ⚙
- ⚙ KHÔNG hiện "còn bao nhiêu ngày đến 40w".
- Ngày sinh nhận: 0810, 08/10, 8/10, 8-10, 8.10, 08/10/2026, 081026. Không ghi năm: lấy năm nay; nếu thành ngày tương lai thì lùi về năm trước. ⚙
- Tuổi thai nhận: 346, 34w6d, 34+6, 34 6, 34.6, 3406, 34 (= 34w0d); giới hạn 20–45 tuần, ngày lẻ 0–6. ⚙
- Ví dụ đã kiểm (tính ngày 21/10/2026): 05/08 + 25 tuần → 77 ngày, 36w0d; 20/09 + 32w0d → 31 ngày, 36w3d; 04/10 + 39w0d → 17 ngày, 41w3d. ⚙

## Chuyển động và nút xoá (bác sĩ duyệt 29/10/2026)
- Nút xoá khi vuốt: chỉ biểu tượng thùng rác, viền đỏ, không nền, 44×44 (sáng #C62828, tối #EF5350). (Sẽ thay ở đợt 9.2 theo THIET_KE_V9 mục 9: nút xoá chỉ còn trên PC, nền đỏ phấn. Hiện vẫn đúng như trên.)
- Vuốt xoá bám theo ngón tay: nút hiện dần từ phải sang trái, nhãn mờ dần; thả quá nửa thì mở. (Sẽ thay ở đợt 9.2 theo THIET_KE_V9 mục 9. Hiện vẫn đúng như trên.)
- Chạm 2 lần: nền mờ dần rồi bảng chi tiết trượt lên; đóng: bảng trượt xuống rồi nền tắt.
