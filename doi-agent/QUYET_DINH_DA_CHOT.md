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
- Tiêu đề: "Việc hôm nay" (ngày khác: "Việc ngày dd/mm"), "Khám bệnh hôm nay"; luôn một dòng. (Từ v9.6, "hôm nay" là ngày làm việc, mốc 07:00 mặc định; xem mục "Ngày làm việc và xem 2 ngày" dưới đây.)
- iPhone theo thang chữ 5 bậc (bác sĩ duyệt 05/11/2026, v9.1): tiêu đề 20px; tên bảng dưới 17px; nội dung việc, mã giường, nút, chip 15px; chữ phụ 13px; ghi chú nhỏ 12px; không còn cỡ 12,5 / 13,5 / 14 / 18. (Thay "chữ phụ 12–13px" của bảng "iPhone 15 – chữ gọn".) ⚙ (luat.test.js v9.1)
  Vùng chạm ≥44px ⚙ (ảnh chụp đo tự động); ⚙ ô nhập giữ 16px để Safari không phóng to. (Ô tick nhỏ 80% ở đầu dòng việc và việc của bé không còn từ 06/11/2026: xem mục "Việc".)
- PC giữ cỡ chữ cũ.

## Việc
- ⚙ Khu vực (việc mới): NICU, CT, KAN, PS-PM, Ngoại Trú, DV, HP, HS (bác sĩ duyệt 28/10/2026). Khu cũ BM không còn trong ô chọn, chỉ hiện khi còn việc cũ mang khu BM. (luat.test.js luật 7, viec.test.js)
- ⚙ Nhãn loại việc thay mức ưu tiên: NV, BM, CK, HC, XN; chọn nhiều, có thể không nhãn (bác sĩ duyệt 28/10/2026). Màu nhãn dùng bảng màu 16a: nền nhạt + chữ đậm cùng tông, biến `--tNV/--tNVi`… (NV đỏ phấn, BM vàng nhạt, CK xanh lơ, HC xanh chàm nhạt, XN tím nhạt), có cả sáng và tối; `--p1…--p5` giữ cho số ưu tiên của việc cũ, chấm đỏ đám mây, cảnh báo (bác sĩ duyệt 05/11/2026, v9.1). Thay quyết định cũ "màu nhãn dùng --p1…--p5". Sửa nhãn trong bảng chi tiết việc (chạm 2 lần vào việc). (viec.test.js, luat.test.js v9.1)
- ⚙ Việc xếp: chưa xong trước, rồi theo thứ tự thêm (cả việc cũ), không xếp theo nhãn/mức. (viec.test.js)
- Chi tiết việc (bác sĩ duyệt 29/10/2026): chạm 2 lần (trong 1 giây) vào việc → bảng "chi tiết việc" (sửa tên, khu, nhãn, ghi chú; không tiêu đề; không chữ "Tự lưu"); ghi chú hiện chữ nhỏ dưới tên việc. Bỏ chạm 3 lần, bảng nhãn riêng, vòng tròn nét đứt. (bác sĩ duyệt 05/11/2026, v9.2) Bảng cao ~76% màn hình theo bảng 15c (trước là ~50%), khu vực là hàng chip (trước là ô chọn khu; khu cũ BM vẫn hiện khi việc đang ở đó), có dòng trạng thái: "Chưa xong" + "Hoàn thành" hoặc "Đã xong lúc hh:mm" + "Bỏ đánh dấu xong"; chữ "Xoá việc" đỏ dịu #A8473D.
- Đánh dấu xong và xoá việc (bác sĩ duyệt 05/11/2026, v9.2; thay "ô tick nhỏ 80% ở đầu dòng" và "xoá kiểu C" của 29/10/2026):
  - Không còn ô tick đầu dòng việc (cũng không còn ở việc của bé); chữ sát lề trái 14px. Vuốt phải qua 1/3 chiều rộng dòng = xong: dòng trượt theo ngón tay, nền xanh nhạt không chữ không biểu tượng; qua mốc nền đậm một nấc và rung nhẹ nếu máy có (iPhone Safari không rung, chỉ đổi màu); thả trước mốc thì trượt về. Việc xong: không gạch ngang, chữ nhạt, nhãn mờ, tích xanh tròn 26px ở cuối dòng (chỉ hiển thị, không bấm), tự xuống cuối nhóm. Vuốt phải trên việc đã xong chỉ nhúc nhích rồi về. Bỏ đánh dấu xong chỉ làm trong chi tiết việc (nút "Bỏ đánh dấu xong"). Dòng BÉ ở tab Khám: xem mục "Khám".
  - Xoá bằng vuốt trái qua 1/3: dòng trượt thật, nền đỏ phấn không biểu tượng, thả là xoá mềm (`deleted`), thanh "Đã xoá: … — Hoàn tác" ở đáy màn hình 6 giây; Hoàn tác chỉ đổi `deleted` về false, giữ nguyên nhãn, ghi chú, trạng thái. Xoá tiếp việc khác thì thanh đổi sang việc mới nhất. Cuộn dọc danh sách không được vô tình đánh dấu xong hoặc xoá.
  - Nút xoá viền đỏ cũ (#C62828 / #EF5350) không còn: chỉ còn trên máy tính khi rê chuột, nền đỏ phấn #FBEAE8, biểu tượng thùng rác #A8473D, 44×44.
  - "Xoá việc" trong chi tiết việc và "Xoá việc đã xong" đều có Hoàn tác 6 giây; Hoàn tác "Xoá việc đã xong" trả lại TẤT CẢ việc vừa xoá (bác sĩ quyết 05/11/2026). Thanh ghi "Đã xoá n việc đã xong — Hoàn tác".
  - Hoàn tác xoá chữ tắt (thư viện viết tắt): nếu trong lúc chờ đã có mục sống cùng chữ tắt thì không khôi phục và báo "Đã có chữ tắt này, không khôi phục" (để không có hai mục trùng).
  - `doneAt`: đánh dấu xong ghi giờ, bỏ đánh dấu về rỗng (áp dụng cho việc, việc của bé, bé đã khám); chi tiết hiện "Đã xong lúc hh:mm". Việc cũ không có giờ chỉ ghi "Đã xong". Không đổi CSDL hay định dạng sao lưu. ⚙ (merge.test.js, viec.test.js)
- Ô thêm việc trên iPhone (bác sĩ duyệt 05/11/2026, v9.3; thay "ô chọn khu + dòng 'Nhãn (chọn được nhiều):' + nút chữ 'Thêm việc'" ở thanh dưới): thu gọn là một dòng gồm ô tròn "Ghi việc cần làm…" và nút tròn "+" 44px; chạm vào ô thì bung hàng chip khu vực (mặc định theo chip đang lọc) và hàng 5 nút nhãn (chọn nhiều, bỏ trống được) ngay trên bàn phím. Thu lại khi rời ô mà ô trống; khi thu lại nhãn về trống và khu về theo chip đang lọc, để việc sau không mang nhãn hay khu đang bị ẩn; còn chữ thì vẫn bung. Thanh Hoàn tác xoá nằm ngay trên ô thêm việc, không che. Máy tính giữ form cũ. ⚙ (viec.test.js: khuMacDinh, khiRoiOThemViec; luat.test.js v9.3)
- Dữ liệu cũ giữ nguyên hiển thị kiểu cũ: việc cũ vẫn hiện số 1–4/NV (NV cũ tím) và chạm để đổi vòng như trước. Việc cũ mà gắn nhãn mới trong chi tiết việc thì chuyển sang kiểu mới (urgency vẫn giữ trong dữ liệu); không gắn thì giữ số cũ.
- Lịch tháng có số việc chưa xong mỗi ngày; nút "Xoá việc đã xong"; dòng "Khám: còn x việc" (bấm chuyển sang Khám).

## Khám
- Phòng tự đặt tên, mặc định Phòng 1–3; phòng đã từng có bệnh nhân thì không xoá được.
- Mỗi bé: mã/giường, ngày sinh, tuổi thai lúc sinh, cân nặng, ghi chú, việc cần làm; đánh dấu đã khám; xoá bé có hỏi xác nhận.
  Việc cần làm của bé xoá bằng vuốt trái (không còn dấu ×) (bác sĩ duyệt 28/10/2026). (bác sĩ duyệt 05/11/2026, v9.2) Việc của bé dùng cùng cử chỉ với tab Việc: không còn ô tick, vuốt phải 1/3 = xong, vuốt trái 1/3 = xoá có Hoàn tác 6 giây (thay xoá kiểu C). Việc của bé CÓ chạm 2 lần (bác sĩ đưa từ đợt 9.4 lên 9.2; thay "chưa có chạm 2 lần"): mở bảng nhỏ sửa tên, dòng trạng thái ("Chưa xong" + "Hoàn thành" / "Đã xong lúc hh:mm" + "Bỏ đánh dấu xong"), "Xoá việc" có Hoàn tác 6 giây; dùng cả trên máy tính.
- Dòng bé và chi tiết bé (bác sĩ duyệt 05/11/2026, v9.4; thay "ô tick và mũi tên ở dòng bé", "ô gạch đứt thêm bệnh nhân" và chi tiết bé cũ):
  - Dòng bé: bỏ ô tick và mũi tên; vuốt phải qua 1/3 là đã khám (ghi `doneAt`); đã khám thì tích xanh cuối dòng, chữ nhạt, không gạch ngang; chạm 1 lần mở chi tiết; dòng bé không xoá bằng vuốt (không vuốt trái, không nút thùng rác); bé đã khám vuốt phải chỉ nhúc nhích. ⚙ (luat.test.js v9.4, viec.test.js)
  - Dòng phòng: nút "+" tròn thay ô gạch đứt "+ Thêm bệnh nhân"; phòng đang thu gọn thì bấm "+" tự mở phòng rồi thêm bé và mở chi tiết bé.
  - Chi tiết bé mới theo bảng 16b: mã giường ở tiêu đề (sửa được, bé mới tự đặt con trỏ vào ô mã), chip tên phòng, hàng 3 ô Ngày sinh | Tuổi thai | Cân nặng, nút "Tính tuần tuổi" + ô kết quả (Ngày tuổi, Hiệu chỉnh). VẪN CHỈ TÍNH TUỔI KHI BẤM; sửa ngày sinh hoặc tuổi thai thì xoá kết quả cũ. Trạng thái "Chưa khám" + "Hoàn tất khám" / "Đã khám lúc hh:mm" + "Bỏ đánh dấu đã khám" (bé cũ chưa có giờ chỉ ghi "Đã khám"). "Xoá khỏi hôm nay" vẫn hỏi xác nhận. Nút "Tổng hợp" đổi thành "Tổng hợp y lệnh", nút trong bảng đổi thành "Soạn lại" (nội dung tổng hợp không đổi).
  - Dữ liệu bé cũ không đổi khi mở app.
- "Lấy danh sách hôm qua": chép bé + việc chưa xong từ ngày khám gần nhất trước hôm nay, không trùng phòng + mã. ⚙ (ảnh chụp thử tự động)
  Giữ đúng thứ tự bé như ngày nguồn; bé thêm tay nằm cuối phòng (bác sĩ duyệt 28/10/2026). ⚙ (tests/thu-tu.test.js)
- "Tổng hợp y lệnh": văn bản sửa được, có nút Sao chép; bé không có việc mới ghi "Tiếp tục y lệnh cũ". ⚙

## Viết tắt (bác sĩ duyệt 28/10/2026)
- ⚙ Gõ "/chữ tắt" rồi dấu cách ở mọi ô gõ chữ (thêm việc, tên và ghi chú việc, việc của bé, ghi chú của bé, khung Tổng hợp y lệnh) → tự thay bằng nội dung; không phân biệt hoa/thường. (viet-tat.test.js)
- Khi lưu (bác sĩ đồng ý 06/11/2026, v9.4): bấm "+" hoặc Enter ở ô thêm việc (iPhone và PC) và ô thêm việc của bé cũng thay chữ tắt ở cuối trước khi lưu (thay "chỉ thay khi gõ dấu cách" cho riêng lúc lưu). Luật khi gõ dấu cách giữ nguyên; ô tên việc trong bảng chi tiết không đổi (Enter chỉ rời ô). ⚙ (viet-tat.test.js: `moRongKhiGui`; luat.test.js v9.4)
- ⚙ Luật không đổi: "8/10", "1/2", "x/kmdm" (không đứng đầu từ) và key không có trong thư viện giữ nguyên, cả lúc gõ dấu cách lẫn lúc lưu. (viet-tat.test.js)
- Gõ "/km" hiện tối đa 4 gợi ý, chạm để chèn. ⚙ (viet-tat.test.js: gợi ý, chèn, hoàn tác)
  - Gợi ý hiện thành hàng chip 44px ngay trên ô gõ, vuốt ngang được; chip đầu viền xanh là gợi ý tốt nhất (bác sĩ duyệt 05/11/2026, v9.3). Thay "Gợi ý (chạm để chèn):" cũ.
  - Sau khi thay chữ: thanh "Đã đổi /key thành nội dung" + nút Hoàn tác, giữ 6 giây (bác sĩ quyết 06/11/2026, v9.3; thay "Đã thay /key" và Hoàn tác ~4 giây của 28/10/2026, thống nhất với thanh Hoàn tác khi xoá). ⚙ (luat.test.js v9.3)
- Nút "/a" trên đầu mở "Thư viện viết tắt": thêm (key trùng thì hỏi ghi đè), sửa bằng cách chạm 2 lần vào dòng, tìm (gõ không dấu cũng ra), vuốt trái để xoá. (bác sĩ duyệt 05/11/2026, v9.2) Thư viện chỉ vuốt trái: qua 1/3 là xoá, có Hoàn tác 6 giây (thay xoá kiểu C của 29/10/2026); không vuốt phải. (bác sĩ duyệt 05/11/2026, v9.3) Thư viện không còn nút bút chì: chạm 2 lần vào dòng để sửa (thay "sửa bằng bút chì"); hàng thêm mới có nút tròn "+".
- ⚙ 13 mục mẫu tự thêm một lần duy nhất; mục bác sĩ đã xoá không quay lại; bác sĩ tự thêm mục khác. (viet-tat.test.js: bộ mẫu 13 mục)
- ⚙ Thư viện được sao lưu cùng dữ liệu (bảng `abbrevs` trong `DATA_TABLES`); file sao lưu cũ vẫn nhập được, `BACKUP_VERSION` giữ 1. (merge.test.js, luat.test.js luật 2b)

## Tính tuần tuổi (chỉ chạy khi bấm nút)
- Hiện "Ngày tuổi" và "Tuổi thai hiệu chỉnh" dạng đủ tuần + ngày (36w0d, 36w3d). ⚙
- Nhãn (bác sĩ duyệt 05/11/2026, v9.4, bảng 16b): ô kết quả ghi "Hiệu chỉnh" = tuổi thai hiệu chỉnh; ô nhập "Tuổi thai" = tuổi thai lúc sinh (ô có `aria-label` "Tuổi thai lúc sinh").
- ⚙ KHÔNG hiện "còn bao nhiêu ngày đến 40w".
- Ngày sinh nhận: 0810, 08/10, 8/10, 8-10, 8.10, 08/10/2026, 081026. Không ghi năm: lấy năm nay; nếu thành ngày tương lai thì lùi về năm trước. ⚙
- Tuổi thai nhận: 346, 34w6d, 34+6, 34 6, 34.6, 3406, 34 (= 34w0d); giới hạn 20–45 tuần, ngày lẻ 0–6. ⚙
- Ví dụ đã kiểm (tính ngày 21/10/2026): 05/08 + 25 tuần → 77 ngày, 36w0d; 20/09 + 32w0d → 31 ngày, 36w3d; 04/10 + 39w0d → 17 ngày, 41w3d. ⚙

## Chuyển động và nút xoá (bác sĩ duyệt 29/10/2026)
- Nút xoá: chỉ biểu tượng thùng rác 44×44. (bác sĩ duyệt 05/11/2026, v9.2) Chỉ còn trên máy tính khi rê chuột (hoặc Tab tới nút), nền đỏ phấn #FBEAE8, biểu tượng #A8473D; thay kiểu viền đỏ không nền (#C62828 / #EF5350).
- Vuốt bám theo ngón tay. (bác sĩ duyệt 05/11/2026, v9.2) Thay "nút hiện dần, thả quá nửa thì mở": dòng trượt thật, nền xanh nhạt (phải) hoặc đỏ phấn (trái) lộ ra sau dòng, mốc 1/3 chiều rộng dòng; thả qua mốc là xong / xoá, thả trước mốc trượt về. Thiết bị bật "giảm chuyển động": bỏ trượt, giữ kết quả.
- Chạm 2 lần: nền mờ dần rồi bảng chi tiết trượt lên; đóng: bảng trượt xuống rồi nền tắt.


## Lịch và xem ngày trước (v9.5 — bác sĩ duyệt 06/11/2026)
Các điểm dưới do Điều phối đề xuất cho đợt 9.5; bác sĩ đã duyệt đợt này sau khi được báo.
- Lịch dùng ô tròn: số ngày trong vòng tròn, số dưới vòng tròn; hôm nay viền xanh; ngày chọn tô xanh; cột CN chữ đỏ dịu. Lịch PC: cột 340px, ô ngày 47×58px (thay mục chờ #5 cũ).
- Ngày trước chỉ xem: không có nút "+", không vuốt, không quản lý phòng, không "Lấy danh sách hôm qua". Chỉ "Chép sang hôm nay" ghi dữ liệu.
- Tuổi trên dòng bé và chi tiết chỉ xem tính theo NGÀY KHÁM của chính dòng đó (bảng 16d), không có nút bấm, không tính theo hôm nay.
- Khi tổng hợp, bé không có mã không được ghép với bé khác cùng phòng: mỗi dòng một nhóm "Chưa có mã".
- Bé ở phòng đã xoá vẫn hiện khi xem và khi tổng hợp, xếp sau các phòng còn sống.
- Tổng hợp nhiều ngày có hai cách xếp, theo ngày hoặc theo mã giường (mặc định theo mã giường). Mỗi cách giữ bản sửa riêng; "Soạn lại" chỉ làm lại cách đang xem.
- Lượt khám trong tổng hợp nhiều ngày tính mọi bé có trong danh sách (tạm, chờ bác sĩ chốt: "Chờ duyệt" #36).

## Ngày làm việc và xem 2 ngày (v9.6 — bác sĩ duyệt 06/11/2026)
- ⚙ "Hôm nay" của tab Việc và tab Khám là NGÀY LÀM VIỆC: ngày lịch của (giờ máy − mốc). Mốc mặc định 07:00, chọn được 00:00 / 06:00 / 07:00 / 08:00 trong "Sao lưu và cài đặt". Thay quyết định cũ "Hôm nay theo ngày lịch 00:00" (THIET_KE_V9 mục 9). (ngay-lam-viec.test.js)
- Mốc ngày làm việc KHÔNG đưa vào file sao lưu; mỗi máy tự đặt (câu 1). File sao lưu giữ nguyên định dạng.
- "Mới đêm qua" tính từ 16:00 hôm qua tới mốc (câu 2).
- Cùng phòng, cùng mã mà hai bên ghi ngày sinh khác nhau thì KHÔNG ghép: hiện thành hai bé riêng, không tính tăng giảm cân (câu 3).
- Việc ghi trước mốc thuộc ngày làm việc trước, nằm trong "Còn từ hôm qua" nếu chưa xong (câu 4; theo đặc tả mục 7, không theo bảng 17c).
- Tuổi ở trang hôm nay, tính tuần tuổi và tổng hợp y lệnh hôm nay vẫn theo ngày lịch của máy, không theo mốc (đặc tả mục 7). Tuổi dòng đã qua tính theo ngày ghi nếu muộn hơn ngày khám (bé sinh sau nửa đêm).
- "Dời hết sang hôm nay" và "Dời sang hôm nay" có Hoàn tác 6 giây, trả đúng ngày cũ.
