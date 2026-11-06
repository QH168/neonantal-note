# Nhật ký thay đổi

> Mục mới nhất ở trên cùng. Agent Ghi chép thêm một mục sau mỗi lần nâng cấp.

## Chờ duyệt (bác sĩ quyết, rồi giao phiếu việc)

| # | Phát hiện | Mức | Đề xuất | Agent |
|---|---|---|---|---|
| 1 | Cuộn dọc danh sách và cử chỉ mới (vuốt phải/trái 1/3 trên Việc, việc của bé, thư viện) bằng ngón tay thật, cùng bàn phím iPhone thật với bảng chi tiết việc, chưa kiểm được bằng máy (Chromium headless) — bác sĩ thử trên iPhone. | Lưu ý | Bác sĩ thử cuộn dọc, vuốt phải/trái và gõ trong chi tiết việc trên iPhone; nếu vướng thì giao phiếu chỉnh. | Giao diện |
| 8 | Chữ chip khu trống `#6B7F91` do đặc tả chốt đo 4,14:1 trên trắng và 3,84:1 trên nền trang, dưới 4,5:1. | Lưu ý | Đề xuất đổi `--chipZero` (sáng) sang `#5E7183` (5,04:1 trên trắng, 4,67:1 trên nền trang). Hỏi bác sĩ. | Giao diện |
| 9 | Dòng nhắc cử chỉ hiện cả khi danh sách của ngày trống, kể cả sau 3 lần mở đầu (đúng chữ đặc tả mục 2.3, khác hành vi cũ là ẩn khi trống). | Lưu ý | Hỏi bác sĩ giữ theo đặc tả hay chỉ hiện trong 3 lần mở đầu. | Giao diện |
| 10 | Đếm "3 lần mở" tính theo lần tải trang; trên iPhone, app tiếp tục từ nền không tính là lần mở mới. | Lưu ý | Chấp nhận; nếu bác sĩ muốn đếm cả lần quay lại từ nền thì đổi `useLanMoApp` (sự kiện `visibilitychange`). | Giao diện |
| 12 | Chromium headless nuốt cú chạm đầu tiên sau khi đóng Thư viện viết tắt (script chụp đã vòng qua bằng cách chạm vùng trống trước). | Lưu ý | Bác sĩ thử trên iPhone: đóng Thư viện viết tắt rồi chạm 2 lần vào một việc, xem có bị mất cú chạm đầu không. | Giao diện |
| 13 | Màu nền vuốt trái qua mốc ở bản tối `--swL2` `#7A3A33` chỉ 1,92:1 so với bề mặt và 2,17:1 so với nền trang; bước từ `--swL` sang `--swL2` là 1,36:1, nhìn thấy nhưng nhẹ. Giữ vì đó không phải chữ và dòng đang chuyển động kèm theo. | Lưu ý | Hỏi bác sĩ: nếu khó nhận ra mốc ở bản tối thì làm đậm `--swL2` hoặc thêm dấu hiệu khác. | Giao diện |
| 14 | Ở màn 320px, huy hiệu số việc quá hạn đè nhẹ lên góc nút lịch. | Lưu ý | Chỉnh vị trí huy hiệu nếu bác sĩ dùng máy nhỏ; không ảnh hưởng iPhone 15. | Giao diện |
| 17 | Vuốt chéo nghiêng ngang (tới 45° so với phương ngang, đã đo thử ở khoảng 35°) vẫn tính là vuốt (`huongCuChi` trong `src/lib/vuot.js`), nên có thể vô tình xong hoặc xoá khi cuộn bằng ngón cái. | Lưu ý | Bác sĩ thử cuộn bằng ngón cái trên iPhone; nếu vướng thì siết góc trong `src/lib/vuot.js`. | Giao diện |
| 18 | iPhone không rung khi qua mốc 1/3 vì Safari không hỗ trợ `navigator.vibrate`; chỉ đổi màu nền. | Lưu ý | Chấp nhận (không có cách khác trên Safari); nhắc bác sĩ để khỏi tưởng lỗi. | Giao diện |
| 19 | Dòng trạng thái "Đã xong lúc hh:mm" trong chi tiết chỉ có chữ xám; canvas có tích xanh và chữ xanh. Lệch nhỏ so với thiết kế. | Lưu ý | Chỉnh màu và thêm tích xanh nếu bác sĩ muốn. | Giao diện |
| 21 | Lọc khu BM cũ rồi thêm việc: việc mới vào khu mặc định (khu đầu của danh sách), không hiện dưới bộ lọc BM. Giống trước 9.3. | Lưu ý | Chấp nhận, hoặc hỏi bác sĩ có muốn việc thêm lúc đang lọc BM hiện luôn ở BM không. | Giao diện |
| 22 | Ô thêm việc đã có chữ, đã chọn khu, rồi chạm chip lọc khác ở trên: khu của form tự đổi theo chip mới, nhãn giữ. | Lưu ý | Hỏi bác sĩ có muốn khu đã chọn tay được giữ không. | Giao diện |
| 23 | Đổi sang tab Khám rồi quay về: chữ đang gõ dở trong ô thêm việc bị mất. | Lưu ý | Hỏi bác sĩ có muốn giữ chữ gõ dở không. | Giao diện |
| 24 | Chạm lại vào ô thêm việc đúng lúc ô đang thu lại (khoảng ~80ms): cú chạm có thể trượt, không tạo việc, không có nhãn ẩn. | Lưu ý | Chấp nhận; bác sĩ thử trên iPhone, nếu gặp nhiều thì chỉnh thời gian hoãn. | Giao diện |
| 25 | Chạm vào chip, nhãn, "+", Hoàn tác khi bàn phím iPhone thật đang mở: bàn phím có tụt không và thanh thêm việc có sát trên bàn phím không, chưa kiểm được (chỉ thử bằng `visualViewport` giả). | Lưu ý | Bác sĩ thử trên iPhone; nếu vướng thì giao phiếu chỉnh. | Giao diện |
| 26 | Trong chi tiết bé, sau khi xoá việc của bé, thanh Hoàn tác che "Xoá khỏi hôm nay" và "Xong" trong 6 giây; nút Hoàn tác nằm đè lên nút "Xong", chạm vào đó sẽ khôi phục việc vừa xoá thay vì đóng bảng. Hướng an toàn, không mất việc. (Gộp từ #11 và #20 cũ về thanh Hoàn tác che nút đáy chi tiết bé.) | Lưu ý | Hướng an toàn, không mất việc. Hỏi bác sĩ có chấp nhận như hiện nay không. | Giao diện |
| 27 | Bấm "+" trên dòng phòng hai lần nhanh có thể tạo bé rỗng thừa, nhất là nhấp đúp trên PC; xoá được bằng "Xoá khỏi hôm nay". | Lưu ý | Đề xuất chống bấm đôi (bỏ qua lần bấm thứ hai trong lúc đang thêm). | Giao diện |
| 28 | Trong chi tiết bé iPhone, bấm "+" thêm việc liên tiếp rất nhanh (dưới ~450ms) có thể trượt khi bảng đang giãn, chữ cũ nằm lại và nối với chữ gõ tiếp. Đo trên Chromium giả lập; chờ bình thường không gặp. | Lưu ý | Bác sĩ thử trên máy thật; nếu gặp thì giao phiếu chỉnh. | Giao diện |
| 29 | Ô nhập ghi "Tuổi thai" (tuổi thai lúc sinh), ô kết quả ghi "Hiệu chỉnh"; đúng canvas 16b nhưng đọc nhanh có thể nhầm. | Lưu ý | Hỏi bác sĩ khi dùng thật có muốn đổi nhãn ô nhập thành "Tuổi thai lúc sinh" không. | Giao diện |
| 30 | Vuốt phải đã nhận là ngang thì lệch dọc tới 60px vẫn đánh dấu đã khám. Cuộn dọc không bị nhầm. | Lưu ý | Bác sĩ thử trên máy thật; nếu vướng thì siết góc trong `src/lib/vuot.js` (liên quan #17). | Giao diện |
| 31 | Bé mới tự đặt con trỏ vào ô mã: Safari iPhone có thể không bật bàn phím. | Lưu ý | Bác sĩ thử trên iPhone; nếu không bật thì bỏ tự đặt con trỏ hoặc thêm cách khác. | Giao diện |
| 32 | Ngày sinh không ghi năm mà ra ngày tương lai thì lùi về năm trước, theo luật đã chốt: gõ 0711 khi hôm nay 06/11 ra 364 ngày, không báo lỗi. | Lưu ý | Hỏi bác sĩ có muốn cảnh báo khi tuổi lớn bất thường không (đụng thuật toán, cần bác sĩ chốt). | Thuật toán |
| 33 | Mã chỉ toàn dấu cách: dòng bé ngày trước hiện mã trống thay vì "Chưa có mã"; "Tổng hợp ngày này" in dòng bắt đầu bằng dấu cách. Không mất bé. | Lưu ý | Cắt khoảng trắng khi hiện. | Giao diện |
| 34 | "Chép sang hôm nay" so trùng đúng từng ký tự (dùng nguyên `copyPatientsFrom`): "g01 " không coi là trùng "G01"; bé không mã bị bỏ nếu hôm nay đã có bé không mã cùng phòng; bé ở phòng đã xoá không chép; hai bé trùng mã cùng ngày nguồn đều được chép; thông báo chỉ nêu số bé chép được, không nói số bị bỏ. | Lưu ý | Hỏi bác sĩ có muốn báo số bé bị bỏ. | Thuật toán |
| 35 | Bấm "Chép sang hôm nay" lần nữa sau khi xong thì dòng báo đổi thành "Không có bé nào cần chép", đúng nhưng dễ hiểu lầm. | Lưu ý | Hỏi bác sĩ có muốn đổi chữ báo không. | Giao diện |
| 36 | Lượt khám và tổng hợp nhiều ngày tính mọi bé trong danh sách, kể cả bé chưa đánh dấu đã khám; số dưới ngày ở lịch chỉ tính bé đã khám, nên hai số có thể lệch. | Lưu ý | Hỏi bác sĩ: lượt khám tính mọi bé hay chỉ bé đã khám. | Thuật toán |
| 37 | Dòng bé ngày trước và chi tiết chỉ xem hiện tuổi sẵn theo ngày đó (bảng 16d); khác luật "chỉ tính khi bấm" ở trang hôm nay vì trang này chỉ xem. | Lưu ý | Hỏi bác sĩ có chấp nhận khác biệt này không. | Giao diện |
| 38 | Màn 320px: ô lịch rộng khoảng 41px, dưới 44px vì 7 cột không đủ chỗ; iPhone 15 khoảng 52px. | Lưu ý | Chấp nhận, trừ khi bác sĩ dùng máy 320px. | Giao diện |
| 39 | `scripts/kiem-pham-vi.mjs` so tên file đúng từng chữ nên ghi chú trong tên file ở phiếu làm báo lỗi giả; đã bỏ ghi chú khỏi fileDuocSua của phiếu 9.5. | Lưu ý | Lưu ý cho người viết phiếu: không ghi chú trong tên file. | Điều phối |

## 06/11/2026 — v9.5 — Lịch mới, xem lại ngày trước, tổng hợp nhiều ngày
- Phiếu: `doi-agent/phieu-viec/2026-11-06-v9-5-lich-xem-ngay-truoc-tong-hop.json` (đợt 5/6 của v9; đặc tả `doi-agent/thiet-ke-v9/THIET_KE_V9.md` mục 1.3, 4.3, 5.4, 5.5, 5.6). Chưa có bác sĩ duyệt ảnh 9.5.
- Đã đổi (lời thường):
  1. Tab Việc: lịch ô tròn. Số dưới ngày là việc chưa xong; ngày đã qua còn việc sót thì nền vàng nhạt. Dòng "Còn sót n việc ở các ngày trước" bấm để tới ngày sót gần nhất (ẩn khi hết sót). Có nút "Về hôm nay".
  2. Tab Khám: lịch có số bé đã khám dưới mỗi ngày, và nút gạt "Xem một ngày / Tổng hợp nhiều ngày".
  3. Xem một ngày: chạm ngày trước hôm nay để xem lại danh sách bé ngày đó. Trang này chỉ xem, không thêm bé, không vuốt, không sửa; chạm bé để xem chi tiết chỉ xem. Có "Chép sang hôm nay" và "Tổng hợp ngày này".
  4. Tổng hợp nhiều ngày: chạm ngày đầu rồi ngày cuối, có "Chọn lại" và nút "Xem tổng hợp n ngày". Bảng có hai cách xếp "Theo ngày" và "Theo mã giường", văn bản sửa được, có "Sao chép" và "Soạn lại". Tuổi mỗi dòng tính theo ngày khám của dòng đó.
  5. Bé không có mã không bị ghép với bé khác; bé ở phòng đã xoá vẫn hiện. Lịch trên PC: cột 340px, ô ngày 47×58px (sửa mục chờ #5 cũ).
  6. Ảnh chuẩn 9.5 chưa lưu, chờ bác sĩ duyệt.
- Kỹ thuật: `src/lib/lich.js` và `src/lib/tong-hop.js` mới (hàm thuần); `src/lib/clinical.js` thêm tuỳ chọn `ngayTruoc` cho `buildSummary` (mặc định không đổi); `src/hooks.js` thêm `useBeKhoang`, `useBeNgay`, `useDaKhamThang` (chỉ đọc, theo chỉ mục `examDate` và `patientId`); `src/components/Lich.jsx` và `src/components/KhamNgayTruoc.jsx` mới; `Tasks.jsx`, `Exam.jsx`, `App.jsx`, `App.css` sửa theo; `tests/lich.test.js` và `tests/tong-hop.test.js` mới; thêm bài trong `tests/clinical.test.js` và `tests/luat.test.js`; `scripts/chup-giao-dien.mjs` thêm phép kiểm và ảnh. Không đổi CSDL, `calcAge`, `parseDob`, `parseGa`, `actions.js` (`copyPatientsFrom` giữ nguyên), `backup.js`, `merge.js`. `package.json` chỉ thêm hai bộ kiểm mới vào lệnh test, không đổi thư viện.
- Kết quả kiểm: kiểm thử độc lập ĐẠT, không vòng sửa nào; `npm test` 163/163 (gồm `tests/lich.test.js`, `tests/tong-hop.test.js`, 35 bài); script chụp ĐẠT 88 ảnh; tính tay 8 nhóm ca tuổi khớp app, gồm qua tháng, qua năm, năm nhuận, lẻ ngày, sinh có năm.
- Chưa thử trên iPhone thật. Chưa kiểm được: sao lưu xuất nhập chưa chạy lại (không đổi file sao lưu); so ảnh chuẩn bị bỏ qua vì máy không có `sharp`. Ảnh chuẩn chưa lưu lại, chờ bác sĩ duyệt ảnh 9.5.
- Việc tiếp theo: đợt 9.6 sau khi bác sĩ duyệt ảnh 9.5 (mốc ngày làm việc 07:00, chế độ 2 ngày, giao tour).
- Dọn "Chờ duyệt": bỏ #5 (đã sửa: cột PC 340px, ô lịch 47×58); thêm #33–#39.

## 06/11/2026 — v9.4 — Khám: nút "+" trên dòng phòng, đã khám bằng vuốt phải, chi tiết bé mới
- Phiếu: `doi-agent/phieu-viec/2026-11-06-v9-4-kham.json` (đợt 4/6 của v9; đặc tả `doi-agent/thiet-ke-v9/THIET_KE_V9.md` mục 3, 5, 9). Bác sĩ đồng ý thêm ngày 06/11/2026: bấm "+" hoặc Enter ở ô thêm việc cũng thay chữ tắt ở cuối.
- Đã đổi (lời thường):
  1. Dòng phòng có nút "+" tròn thay ô gạch đứt "+ Thêm bệnh nhân". Phòng đang thu gọn thì bấm "+" tự mở phòng, thêm bé và mở chi tiết bé.
  2. Dòng bé không còn ô tick và mũi tên. Vuốt phải qua 1/3 là đã khám; đã khám thì chữ nhạt, không gạch ngang, có tích xanh cuối dòng. Chạm 1 lần mở chi tiết. Dòng bé không vuốt trái, không xoá bằng vuốt. Số đo ghi dạng "25w0d, 1850 g", việc của bé hiện thành chữ.
  3. Chi tiết bé làm lại theo bảng 16b: mã giường ở tiêu đề (bé mới tự đặt con trỏ vào ô mã), chip tên phòng, hàng 3 ô Ngày sinh | Tuổi thai | Cân nặng, nút "Tính tuần tuổi" bên trái và ô kết quả (Ngày tuổi, Hiệu chỉnh) bên phải. Vẫn chỉ tính tuổi khi bấm; sửa ngày sinh hoặc tuổi thai thì kết quả cũ mất ngay.
  4. Dòng trạng thái "Chưa khám" + "Hoàn tất khám", hoặc "Đã khám lúc hh:mm" + "Bỏ đánh dấu đã khám" (bé cũ chưa có giờ chỉ ghi "Đã khám"). "Xoá khỏi hôm nay" vẫn hỏi xác nhận.
  5. Nút "Tổng hợp" đổi thành "Tổng hợp y lệnh"; nút trong bảng đổi thành "Soạn lại". Nội dung tổng hợp không đổi.
  6. Gõ "/ctm" rồi bấm "+" hoặc Enter ở ô thêm việc (iPhone, PC) và ô thêm việc của bé thì chữ tắt ở cuối được thay trước khi lưu. Ô tên việc trong bảng chi tiết không đổi.
- Kỹ thuật: `src/lib/viet-tat.js` thêm `moRongKhiGui`; `VietTat.jsx` trả thêm `chot`; `src/lib/vuot.js` thêm `opts.duocTrai` (mặc định true, không đổi hành vi cũ); `ui.jsx` (SwipeRow chỉ vuốt phải khi không có `onDelete`, `TrangThaiXong` nhận nhãn, xoá `CheckBtn`); `Exam.jsx`, `Tasks.jsx`, `HoanTac.jsx`, `App.jsx`, `App.css` sửa theo; `tests/viec.test.js`, `tests/viet-tat.test.js`, `tests/luat.test.js` thêm bài kiểm; `scripts/chup-giao-dien.mjs` thêm phép kiểm và ảnh. Không đổi `clinical.js`, `dates.js`, `db.js`, `actions.js`, `backup.js`, `merge.js`, `package.json`.
- Kết quả kiểm: kiểm thử độc lập ĐẠT, không vòng sửa nào; `npm test` 122/122; script chụp ĐẠT 67 ảnh. Tính tay 6 ca tuổi khớp app (sinh cuối tháng, ngày lẻ tuổi thai, lùi năm). Sửa ngày sinh làm hỏng rồi sửa lại thì kết quả cũ xoá ngay. Dữ liệu bé cũ không đổi khi mở app.
- Agent Giao diện sửa thêm một lỗi: trên PC bấm "Thêm việc" khi hàng gợi ý viết tắt đang hiện thì nút bị trượt.
- Chưa thử trên iPhone thật. Bác sĩ đã duyệt 06/11/2026; ảnh chuẩn 9.4 đã lưu.
- Dọn "Chờ duyệt": bỏ #3 (đã làm); gộp #11 và #20 thành #26; thêm #26–#32 (thanh Hoàn tác đè nút "Xong" trong chi tiết bé, bấm "+" hai lần nhanh, "+" thêm việc liên tiếp rất nhanh, nhãn "Tuổi thai"/"Hiệu chỉnh", lệch dọc khi vuốt phải, bàn phím cho bé mới, ngày sinh lùi năm).
- Việc tiếp theo: đợt 9.5 sau khi bác sĩ duyệt ảnh 9.4 (lịch mới, lịch trong tab Khám, xem ngày trước, tổng hợp nhiều ngày; việc lớn, đụng thuật toán).

## 06/11/2026 — v9.3 — Ô thêm việc 1 dòng, viết tắt và thư viện kiểu mới
- Phiếu: `doi-agent/phieu-viec/2026-11-06-v9-3-o-them-viec-viet-tat.json` (đợt 3/6 của v9; đặc tả `doi-agent/thiet-ke-v9/THIET_KE_V9.md` mục 4.1, 6, 9). Bác sĩ quyết thêm ngày 06/11/2026: thanh "Đã đổi … thành …" giữ 6 giây (thay ~4 giây).
- Đã đổi (lời thường):
  1. Ô thêm việc trên iPhone chỉ còn một dòng: ô tròn "Ghi việc cần làm…" và nút tròn "+". Bỏ ô chọn khu, bỏ chữ "Nhãn (chọn được nhiều):", bỏ nút chữ "Thêm việc". Máy tính giữ form cũ.
  2. Chạm vào ô thì bung hàng chip khu và hàng 5 nút nhãn ngay trên bàn phím. Chạm chip, nhãn hay "+" không làm mất bàn phím. Thêm xong, con trỏ vẫn ở trong ô để gõ tiếp.
  3. Rời ô mà ô trống thì thu lại; lúc đó nhãn về trống và khu về theo chip đang lọc, nên việc sau không mang nhãn hay khu đang bị ẩn. Còn chữ trong ô thì vẫn bung.
  4. Gợi ý viết tắt là hàng chip 44px ngay trên ô gõ, vuốt ngang được; bỏ chữ "Gợi ý (chạm để chèn):". Sau khi thay chữ hiện thanh tối "Đã đổi /key thành nội dung" + "Hoàn tác", giữ 6 giây; bản tối không còn hộp sáng chói.
  5. Thư viện viết tắt: hàng thêm mới có nút tròn "+", ô tìm tròn, dòng đếm "n mục"; bỏ nút bút chì, chạm 2 lần vào dòng để sửa (máy tính nhấp đúp; Tab rồi Enter cũng mở sửa).
  6. Thanh Hoàn tác khi xoá nay nằm ngay trên ô thêm việc, không che; bàn phím iPhone mở thì thanh theo bàn phím.
- Kỹ thuật: `src/hooks.js` thêm `khungBanPhim`, `theoDoiBanPhim`, `useBanPhim` (một chỗ tính bàn phím, `Sheet`, ô thêm việc và thanh Hoàn tác dùng chung); `src/lib/viec.js` thêm `khuMacDinh`, `khiRoiOThemViec` (luật thuần, có bài kiểm); `ui.jsx` thêm `PlusIcon` (xoá hàm bút chì cũ); `Tasks.jsx`, `VietTat.jsx`, `ThuVien.jsx`, `HoanTac.jsx`, `App.jsx`, `App.css` sửa theo; `tests/viec.test.js`, `tests/luat.test.js` thêm bài kiểm. Không đổi CSDL, sao lưu, `actions.js`, `package.json`.
- Kết quả kiểm: kiểm thử độc lập ĐẠT sau 2 vòng sửa; `npm test` 108/108; script chụp ĐẠT 56 ảnh.
  - Vòng 1: thanh Hoàn tác xoá che trọn ô thêm việc; nay nằm ngay trên ô.
  - Vòng 2: chạm "Hoàn tác" khi ô đang bung và trống bị trượt vì ô thu lại ngay dưới ngón tay; nay việc thu lại hoãn tới sau khi nhấc ngón, và script dùng cú chạm thật.
- Chưa thử trên iPhone thật; `visualViewport` giả không phải bàn phím thật. Bác sĩ duyệt giao diện 9.3 ngày 06/11/2026; ảnh chuẩn đã lưu lại.
- Không làm: không hiện dòng chú thích nhỏ dưới hàng nhãn và dưới ô gõ ở bảng 15b và bảng 5 (đặc tả không yêu cầu, chỗ trên bàn phím chật); đã báo bác sĩ.
- Dọn "Chờ duyệt": bỏ #4 (hộp "Đã thay" sáng ở bản tối, đã hết), #15 và #16 (thanh Hoàn tác che ô thêm việc; bàn phím che thanh, đã xử lý); giữ ý còn lại ở #20. Thêm #20–#25.
- Việc tiếp theo: đợt 9.4 (Khám: nút "+" trên dòng phòng, đã khám bằng vuốt phải, chi tiết bé mới) sau khi bác sĩ duyệt ảnh 9.3.

## 06/11/2026 — v9.2 — Cử chỉ mới: vuốt phải xong, vuốt trái xoá, Hoàn tác
- Phiếu: `doi-agent/phieu-viec/2026-11-05-v9-2-cu-chi-moi.json` (đợt 2/6 của v9; bác sĩ duyệt phiếu và cả 4 đề xuất ngày 05/11/2026; đặc tả `doi-agent/thiet-ke-v9/THIET_KE_V9.md`).
- Đã đổi (lời thường):
  1. Việc và việc của bé không còn ô tick đầu dòng; chữ sát lề trái. Vuốt phải qua 1/3 dòng là xong, vuốt trái qua 1/3 là xoá. Dòng trượt theo ngón tay, phía sau lộ nền xanh nhạt (xong) hoặc đỏ phấn (xoá), không chữ; qua mốc nền đậm hơn một nấc. Thả trước mốc thì dòng trượt về.
  2. Việc xong không còn gạch ngang: chữ nhạt, có tích xanh tròn ở cuối dòng, tự xuống cuối nhóm. Vuốt phải trên việc đã xong chỉ nhúc nhích rồi về. Muốn bỏ đánh dấu thì chạm 2 lần mở chi tiết, bấm "Bỏ đánh dấu xong".
  3. Xoá có thanh "Đã xoá: … — Hoàn tác" ở đáy màn hình 6 giây. Có cho vuốt trái, nút "Xoá việc" trong chi tiết (cả việc của bé), thư viện viết tắt và "Xoá việc đã xong" (Hoàn tác trả lại tất cả việc vừa xoá). Khôi phục chữ tắt mà đã có chữ tắt trùng thì không khôi phục và báo.
  4. Chi tiết việc có dòng trạng thái: "Chưa xong" + "Hoàn thành", hoặc "Đã xong lúc hh:mm" + "Bỏ đánh dấu xong"; việc cũ không có giờ chỉ ghi "Đã xong". Bảng cao ~76%, khu vực là hàng chip; chữ "Xoá việc" đỏ dịu.
  5. Việc của bé có chạm 2 lần (bác sĩ đưa lên 9.2): bảng nhỏ sửa tên, trạng thái, xoá. Dùng cả trên máy tính.
  6. Máy tính: rê chuột vào dòng hiện nút thùng rác nền đỏ phấn. Bảng cài đặt có mục "Cử chỉ" 4 dòng; dòng nhắc đổi thành "Vuốt phải: xong · Vuốt trái: xoá · Chạm 2 lần: chi tiết". Dòng BÉ ở tab Khám giữ ô tick tới 9.4 (chỉ thêm ghi giờ khi đánh dấu đã khám).
- Kỹ thuật: `src/lib/vuot.js` và `src/components/HoanTac.jsx` mới; `ui.jsx` (SwipeRow viết lại, thêm `TickOk`, `TrangThaiXong`, ngăn xếp `Sheet`); `actions.js` (`phanDoiXong`, `phanKhoiPhuc`, `khoiPhuc*`, `setPatientDone`, `setTodoText`, `clearDone` trả danh sách id); `viec.js` (`gioXong`); `Tasks.jsx`, `Exam.jsx`, `ThuVien.jsx`, `BackupPanel.jsx`, `App.jsx`, `App.css` sửa theo. `doneAt` là trường thường: không đổi CSDL, `BACKUP_VERSION` (vẫn 1), `merge.js`, `backup.js`. Bài kiểm mới trong `tests/viec.test.js` và `tests/merge.test.js`.
- Kết quả kiểm: kiểm thử độc lập ĐẠT, không vòng sửa nào; `npm test` 100/100; script chụp ĐẠT 45 ảnh; đo an toàn dữ liệu trên bản dựng thật 52/52 đạt (dữ liệu cũ không đổi khi mở app, file sao lưu cũ nhập được, Hoàn tác trả đúng dòng). Chưa thử trên iPhone thật.
- Thay đổi trong script chụp `scripts/chup-giao-dien.mjs`: các phép kiểm kiểu C được thay vì thiết kế đã đổi (không phải bỏ bớt kiểm). Ngưỡng khung ghi chú trong chi tiết việc đổi từ ≥35% xuống ≥30% (bảng cao hơn nhưng thêm chip khu và dòng trạng thái) và thêm điều kiện cao hơn 2 lần mọi ô khác.
- Bác sĩ duyệt giao diện 9.2 ngày 06/11/2026; ảnh chuẩn đã lưu lại. Các điểm cần bác sĩ quyết xem bảng "Chờ duyệt" (#1, #13, #15–#19).
- Việc tiếp theo: đợt 9.3 (ô thêm việc 1 dòng, gợi ý chip trên ô gõ viết tắt, thư viện bỏ bút chì) sau khi bác sĩ duyệt ảnh 9.2.

## 05/11/2026 — v9.1 — Màu nhãn mới, đầu trang 3 nút, bảng Sao lưu và cài đặt
- Phiếu: `doi-agent/phieu-viec/2026-11-05-v9-1-token-dau-trang-cai-dat.json` (đợt 1/6 của v9; thiết kế do bác sĩ duyệt 05/11/2026, đặc tả `doi-agent/thiet-ke-v9/THIET_KE_V9.md`).
- Đã đổi (lời thường):
  1. Đầu trang iPhone còn 3 nút: "/a", đám mây, lịch; nút sáng/tối bỏ (iPhone và PC). Tab Việc/Khám, chip khu, nút trên đầu cao 44px. Chữ tiến độ tab Việc thành "Đã xong x/y".
  2. Nút đám mây mở bảng "Sao lưu và cài đặt": phần sao lưu giữ nguyên chức năng, thêm nút gạt Sáng / Tối / Theo máy (Theo máy đi theo máy và tự đổi). Ai đã chọn sáng hoặc tối từ trước giữ nguyên giao diện; chưa chọn thì Theo máy. Lựa chọn chỉ nằm trên máy, không vào sao lưu.
  3. Màu nhãn NV/BM/CK/HC/XN theo bảng màu mới: nền nhạt, chữ đậm cùng tông, có bản sáng và tối. Huy hiệu nhãn trong dòng tròn 26px; nút chọn nhãn 44px tròn (tắt: viền mảnh, bật: nền nhạt viền đậm); việc đã xong thì nhãn mờ. Việc cũ vẫn hiện số 1–4 và NV tím như trước; chấm đỏ đám mây và cảnh báo không đổi màu.
  4. Chip khu không có việc: chữ nhạt, không ghi số 0; chỉ chip đang chọn có nền xanh.
  5. Chữ iPhone theo thang 5 bậc 20/17/15/13/12 (bỏ cỡ 12,5/13,5/14/18); ô nhập vẫn 16px; PC giữ cỡ cũ.
  6. Dòng nhắc "Chạm 2 lần: chi tiết · Vuốt trái: xoá" chỉ hiện trong 3 lần mở app đầu hoặc khi danh sách của ngày trống.
  7. Bảng trượt lên có thanh kéo nhỏ ở đỉnh (chỉ trang trí), tiêu đề 17px, nút đóng 44px.
  8. Khai báo sẵn màu trạng thái của v9 (tích xong, nền vuốt, nút xoá dịu, dải ngày trước, khoảng ngày) cho cả sáng và tối; chưa dùng, trừ màu chữ chip khu trống.
- Kỹ thuật: `src/lib/cai-dat.js` mới (hàm thuần); `src/hooks.js` thêm `useGiaoDien`, `useLanMoApp`; `ui.jsx` thêm `mauNhan` (`TAG_COLOR` còn trong `viec.js`, giao diện không dùng); biến màu mới trong `App.css`; `BackupPanel.jsx`, `App.jsx`, `Tasks.jsx` sửa theo; `tests/luat.test.js` thêm bài kiểm v9.1. Không đổi CSDL, sao lưu, `actions.js`, `package.json`.
- Sửa nhỏ `scripts/chup-giao-dien.mjs`: chạm vùng trống trước khi mở chi tiết việc "Gọi người nhà giường 12" (Chromium headless nuốt cú chạm đầu sau khi đóng Thư viện viết tắt). Ngoài ra script được cập nhật cho khớp: đổi sáng/tối qua bảng cài đặt, thêm ảnh iPhone cài đặt sáng/tối, kiểm 3 chế độ Sáng/Tối/Theo máy.
- Kết quả kiểm: kiểm thử độc lập ĐẠT, không vòng sửa nào; `npm test` 83/83; script chụp ĐẠT 34 ảnh. Chưa thử trên iPhone thật. So ảnh chuẩn tự động chưa chạy (máy chụp không có `sharp`), đã so bằng mắt. Bác sĩ duyệt giao diện 9.1 ngày 05/11/2026; ảnh chuẩn đã lưu lại bằng `--luu-chuan` (34 ảnh). Các điểm cần bác sĩ quyết xem bảng "Chờ duyệt" (#8–#14).
- Việc tiếp theo: đợt 9.2 (cử chỉ mới) — phiếu `doi-agent/phieu-viec/2026-11-05-v9-2-cu-chi-moi.json` chờ bác sĩ duyệt, chưa sửa mã.

## 05/11/2026 — Đóng gói thiết kế v9 (chưa đổi app)
- Bác sĩ duyệt toàn bộ canvas "Ghi chú Sơ sinh v8 — thiết kế" (25 bảng): bỏ ô tick, vuốt phải/trái 1/3 để xong/xoá (có Hoàn tác), màu nhãn dịu cùng tông, thang chữ 5 bậc, đầu trang 3 nút, Sao lưu và cài đặt (Sáng/Tối/Theo máy, ngày làm việc bắt đầu 07:00), ô thêm việc 1 dòng, Khám có nút + trên dòng phòng và chi tiết bé mới, lịch ô tròn, xem lại ngày trước, tổng hợp nhiều ngày, xem 2 ngày để giao tour.
- Thêm `doi-agent/thiet-ke-v9/` (đặc tả + bản sao canvas) và phiếu kế hoạch `2026-11-05-v9-ke-hoach.json`. Chưa sửa file nào trong `src/`.

## 05/11/2026 — Công cụ thiết kế cho Claude (không đổi app)
- Bác sĩ yêu cầu: bật skill frontend-design, viết design brief, và cho Claude tự chụp màn hình để sửa giao diện.
- Đã thêm: `CLAUDE.md` (Claude tự đọc khi mở dự án); `doi-agent/THIET_KE.md` (brief + bảng chấm 8 mục);
  skill `frontend-design` chính thức của Anthropic (giấy phép Apache 2.0) và skill `sua-giao-dien` (vòng chụp → nhìn → sửa) trong `.claude/skills/`;
  lệnh `npm run chup`; `.gitignore` chặn ảnh chụp và bản dựng. Agent Giao diện và bản đồ đã trỏ tới các file này.
- Mã app không đổi. Kiểm: npm test đạt; chụp thử 32 ảnh, ĐẠT.

## 29/10/2026 — v8.5 — Làm mượt đóng bảng
- Phiếu: `doi-agent/phieu-viec/2026-10-29-v8-5-lam-muot-dong-bang.json` (bác sĩ yêu cầu làm nốt 2 ghi chú của v8.4).
- Đã đổi (lời thường): bấm "Xoá việc" trong chi tiết việc thì bảng trượt xuống trước rồi việc mới biến mất; chạm vào danh sách khi bảng đang đóng thì không có gì xảy ra (không còn bị tính là lần chạm thứ nhất).
- Kết quả kiểm: kiểm thử độc lập ĐẠT; npm test 76/76; xoá đúng một lần; 12 tổ hợp đóng × thời điểm chạm đều không lọt xuống danh sách.

## 29/10/2026 — v8.4 — Chuyển động mượt, nút xoá chỉ biểu tượng
- Phiếu: `doi-agent/phieu-viec/2026-10-29-v8-4-chuyen-dong-nut-icon.json` (bác sĩ duyệt mô phỏng canvas bảng 10 và bảng 11).
- Đã đổi (lời thường):
  1. Vuốt trái để xoá bám theo ngón tay: nút thùng rác hiện dần từ phải sang trái, nhãn mờ dần; thả quá nửa thì mở, chưa tới thì trả về. Bấm xoá: dòng thu gọn mượt rồi mới biến mất.
  2. Nút xoá chỉ còn biểu tượng thùng rác, viền đỏ, không nền (sáng/tối); chạm nhanh ngay sau khi vuốt vẫn xoá được.
  3. Mọi bảng trượt lên: nền mờ dần rồi bảng trượt lên; đóng thì bảng trượt xuống rồi nền sáng lại. Máy tính: hộp hiện dần.
  4. Thiết bị bật "giảm chuyển động" thì tắt hiệu ứng.
- Kết quả kiểm: kiểm thử độc lập ĐẠT; npm test 76/76; đo từng bước kéo tăng đơn điệu, các dòng khác không vẽ lại khi kéo; chạm nút ở 100/300/600ms đều xoá đúng một lần; mọi bảng mở/đóng có chuyển động và gỡ sau khi đóng. Ghi chú: "Xoá việc" trong chi tiết việc đóng bảng ngay (không hoạt ảnh); trong lúc bảng đang đóng (~0,36 giây) cú chạm rơi xuống dòng phía sau. Chưa kiểm cảm giác ngón tay thật trên iPhone.

## 29/10/2026 — v8.3 — Sửa lỗi bảng dưới bị che trên iPhone
- Phiếu: `doi-agent/phieu-viec/2026-10-29-v8-3-sua-loi-bang-duoi.json` (bác sĩ gửi ảnh iPhone báo lỗi).
- Đã đổi (lời thường):
  1. Bảng chi tiết việc (và mọi bảng trượt lên khác) giờ luôn nằm trên cùng: không còn bị thanh "Thêm việc" che nút "Xoá việc", "Xong"; nền mờ phủ cả phần đầu trang.
  2. Tên việc dài hiện đủ (tối đa 3 dòng, dài hơn thì cuộn trong ô); Enter không xuống dòng.
- Kỹ thuật: `Sheet` (ui.jsx) dùng `createPortal(…, document.body)`; bảng điện thoại có class `sheet-ph`, CSS `.phone-app X` → `:is(.phone-app,.sheet-ph) X`; ô tên là textarea; luật 10 mới trong `tests/luat.test.js`.
- Nguyên nhân: trên Safari iPhone, bảng nằm trong vùng cuộn `.ph-main` bị kẹt lớp; Chromium giả lập không bị nên các lần kiểm trước không thấy.
- Kết quả kiểm: kiểm thử độc lập vòng 1 LỖI (bộ chụp dừng vì ô tên thành textarea; tên 68 ký tự mất dòng 3; cỡ chữ trong bảng to hơn 1px) → Điều phối sửa → vòng 2 ĐẠT; npm test 76/76; cỡ chữ trong 6 bảng giống v8.2 từng phần tử. Chưa kiểm trên Safari iPhone thật — nhờ bác sĩ xác nhận.

## 29/10/2026 — v8.2 — Nút xoá kiểu C, chi tiết việc
- Phiếu: `doi-agent/phieu-viec/2026-10-29-v8-2-xoa-c-chi-tiet-viec.json` (bác sĩ duyệt canvas "Ghi chú Sơ sinh v8 — thiết kế" bảng 8 và 9 ngày 29/10/2026).
- Đã đổi (lời thường):
  1. Nút xoá kiểu C: vuốt trái thì thẻ đứng yên, viền đỏ, nhãn cuối dòng đổi thành nút "Xoá" đỏ trong dòng (tab Việc, việc của bé ở Khám, thư viện viết tắt); PC rê chuột hiện nút "Xoá" viền đỏ cạnh nhãn.
  2. Chạm 2 lần vào việc mở bảng "chi tiết việc" cao ~50% màn hình (không tiêu đề): sửa tên, khu, nhãn, ghi chú rộng (lớn nhất), nút "Xoá việc" và "Xong"; tự lưu (tên rỗng không lưu).
  3. Bỏ chạm 3 lần, bảng nhãn riêng, bảng ghi chú cũ, vòng tròn nét đứt.
  4. Việc cũ: gắn nhãn mới trong bảng chi tiết thì chuyển sang kiểu mới (urgency vẫn giữ trong dữ liệu); không gắn thì giữ số cũ.
  5. Bảng dưới tự co trên bàn phím iPhone (visualViewport). Gợi ý trên tab Việc: "Chạm 2 lần: chi tiết · Vuốt trái: xoá".
  - Kỹ thuật: `ui.jsx` (SwipeRow kiểu C, Sheet cao ~50% + visualViewport); `Tasks.jsx` (TaskDetail đặt ở TaskGroups); `ThuVien.jsx`; `App.jsx`; `App.css`; `actions.js` (setTaskText, setTaskZone); `viec.js` (chuanTenViec, khuDeChon) + `tests/viec.test.js`.
- Kết quả kiểm: Kiểm thử độc lập ĐẠT; npm test 75/75; dựng thử thành công; bộ chụp tự động 0 lỗi; vùng chạm ≥44px, ô nhập ≥16px; thẻ không dịch khi vuốt, xoá = deleted ở 4 loại dòng sáng/tối; bảng 452px (53% màn hình); sửa tên/khu/nhãn/ghi chú/xoá đều đúng; việc cũ đúng; bàn phím giả lập đúng. Chưa kiểm được trên máy thật: bàn phím iPhone thật, vuốt cảm ứng thật.
- Quan sát: ghi vào Chờ duyệt mục 7 (mức Lưu ý); mục 1 cập nhật cho SwipeRow kiểu C và bàn phím iPhone.
- Ảnh chuẩn chưa cập nhật (xem Chờ duyệt mục 2).

## 29/10/2026 — v8.1 — Đợt 2: viết tắt
- Phiếu: `doi-agent/phieu-viec/2026-10-28-v8-dot2-viet-tat.json` (bác sĩ duyệt bản thiết kế v8 ngày 28/10/2026).
- Đã đổi (lời thường):
  1. Gõ "/chữ tắt" rồi dấu cách ở mọi ô gõ chữ (thêm việc, ghi chú việc, việc của bé, ghi chú của bé, khung Tổng hợp y lệnh) → tự thay bằng nội dung; không phân biệt hoa/thường; "8/10", "1/2", "x/kmdm" không đổi.
  2. Gõ "/km" hiện tối đa 4 gợi ý, chạm để chèn; sau khi thay có "Đã thay /key" và nút Hoàn tác khoảng 4 giây.
  3. Nút "/a" trên đầu mở "Thư viện viết tắt": thêm (trùng thì hỏi ghi đè), sửa bằng bút chì, tìm (gõ không dấu cũng ra), vuốt trái để xoá.
  4. 13 mục mẫu tự thêm một lần; mục đã xoá không quay lại. Thư viện được sao lưu cùng dữ liệu.
  - Kỹ thuật: bảng mới `abbrevs` qua `db.version(2)` (version(1) không đổi), có trong `DATA_TABLES`; `BACKUP_VERSION` giữ 1 (bảng tuỳ chọn: file cũ nhập được, app cũ nhập file mới được); file mới `src/lib/viet-tat.js`, `src/components/VietTat.jsx`, `src/components/ThuVien.jsx`; thẻ mới `doi-agent/the-tinh-nang/viet-tat.md`.
- Kết quả kiểm: Kiểm thử độc lập ĐẠT; npm test 73/73; dựng thử thành công (`npm run build` thật chạy trên GitHub Actions); vùng chạm ≥44px, ô nhập 16px, tiêu đề một dòng cả 2 tab; nâng cấp CSDL tại chỗ (bản đợt 1 → bản mới, cùng hồ sơ trình duyệt): dữ liệu cũ giống hệt từng byte, 13 mục mẫu, mở lại không nhân đôi, mục đã xoá không quay lại; sao lưu xuất/nhập qua giao diện đạt, nhập file kiểu cũ không lỗi; thay chữ đạt ở cả 5 loại ô; hồi quy đợt 1 và Khám đạt; tính tay 2 ca tuổi khớp.
- Quan sát: ghi vào Chờ duyệt mục 3–6 (mức Lưu ý).
- Ảnh chuẩn chưa cập nhật (xem Chờ duyệt mục 2).

## 28/10/2026 — v8.0 — Đợt 1: nhãn loại việc, khu mới, ghi chú, vuốt xoá
- Phiếu: `doi-agent/phieu-viec/2026-10-28-v8-dot1-viec.json` (bác sĩ duyệt bản thiết kế v8 ngày 28/10/2026).
- Đã đổi (lời thường):
  1. Tab Việc: 5 nhãn loại việc NV, BM, CK, HC, XN thay cho mức ưu tiên; chọn nhiều hoặc không chọn; sửa nhãn bằng chạm nhanh 3 lần vào cụm nhãn.
  2. Khu vực mới: NICU, CT, KAN, PS-PM, Ngoại Trú, DV, HP, HS. Khu cũ BM chỉ hiện khi còn việc cũ.
  3. Việc xếp: chưa xong trước, rồi theo thứ tự thêm (cả việc cũ). Luật nằm trong `src/lib/viec.js` có bài kiểm `tests/viec.test.js`.
  4. Chạm 2 lần vào dòng việc → ghi chú, hiện chữ nhỏ dưới tên việc.
  5. Bỏ dấu ×; vuốt trái → thùng rác (tab Việc và việc cần làm của bé trong Khám); PC rê chuột hiện thùng rác.
  6. Dữ liệu cũ giữ nguyên: việc cũ vẫn hiện số 1–4/NV (NV cũ màu tím, NV mới màu đỏ — đúng yêu cầu), chạm đổi vòng như trước.
  - Kỹ thuật: trường mới `tags`, `note` trên `tasks` là trường thường — không đổi CSDL hay định dạng sao lưu. Mục "byPri" trong Chờ duyệt đã xử lý xong (chuyển sang `sapViec`, có kiểm tra).
- Kết quả kiểm: Kiểm thử độc lập ĐẠT; npm test 55/55; dựng thử thành công; vùng chạm ≥44px, ô nhập ≥16px; kịch bản riêng 33/34 (dữ liệu cũ không đổi từng byte, chạm 1/2/3 lần đúng cả biên 1 giây, vuốt ngắn không mở, xoá = đánh dấu deleted); tương phản bản tối ≥4,5:1. Chưa kiểm được cuộn dọc bằng ngón tay thật; `npm run build` sẽ chạy trên GitHub Actions.
- Ảnh chuẩn chưa cập nhật, chờ bác sĩ xem trên máy thật.
- Việc tiếp theo: đợt 2 — viết tắt (phiếu `2026-10-28-v8-dot2-viet-tat.json` đã duyệt, chưa làm).

## 28/10/2026 — v7.2 — Sửa 4 mục chờ duyệt
- Phiếu: `doi-agent/phieu-viec/2026-10-28-sua-cho-duyet-1-4.json` (bác sĩ yêu cầu sửa mục 1–4 bảng "Chờ duyệt").
- Đã đổi (lời thường):
  1. "Lấy danh sách hôm qua" giờ giữ đúng thứ tự bé như hôm qua; bé thêm tay nằm cuối phòng. Thêm file `src/lib/thu-tu.js` và bài kiểm `tests/thu-tu.test.js` (7 bài). Bé của các ngày cũ vẫn xếp theo giờ tạo như trước; không đổi cơ sở dữ liệu hay định dạng sao lưu.
  2. Khung "Tổng hợp y lệnh" chữ 15px → 16px (Safari không còn tự phóng to khi chạm sửa).
  3. Xoá file minh hoạ cũ `src/components/TaskDemo.jsx`.
  4. Nút "Khám: còn x việc" cao 40px → 44px.
- Kết quả kiểm: Kiểm thử độc lập ĐẠT; npm test 47/47; dựng thử thành công; thứ tự bé đúng 6/6 lần chạy; lấy danh sách 2 lần không trùng; bảo mật đạt. `npm run build` chưa chạy được ở đây (mạng chặn npm) — sẽ chạy trên GitHub Actions.
- Trên GitHub cần xoá tay `src/components/TaskDemo.jsx` (tải lên không tự xoá file cũ).
- Ảnh chuẩn chưa cập nhật, chờ bác sĩ xem giao diện (nút cao hơn, chữ khung Tổng hợp lớn hơn).

## 28/10/2026 — v7.1 — Dựng đội agent và harness
- Phiếu: `doi-agent/phieu-viec/2026-10-28-dung-doi-agent.json` (bác sĩ đã duyệt kế hoạch).
- **App trên iPhone không đổi** (không file nào trong `src/` bị sửa).
- Thêm hồ sơ `doi-agent/`: bản đồ, 5 thẻ tính năng, 6 agent, quyết định đã chốt, bộ ca chuẩn lâm sàng (14 ca), mẫu phiếu việc, 9 ảnh chuẩn.
- Thêm harness:
  - `tests/luat.test.js` — 9 luật cứng kiểm bằng máy.
  - `tests/ban-do.test.js` — bản đồ khớp mã.
  - `tests/ca-chuan.test.js` — chạy bảng ca chuẩn lâm sàng.
  - `scripts/kiem-pham-vi.mjs` — chỉ sửa đúng file trong phiếu.
  - `scripts/dung-thu.mjs` — bản dựng thử khi không tải được npm.
  - `scripts/chup-giao-dien.mjs` — ảnh iPhone 15/PC sáng-tối, đo vùng chạm và ô nhập, thử "Lấy danh sách hôm qua", "Tính tuần tuổi", "Tổng hợp".
- `package.json`: lệnh `npm test` chạy thêm 3 file kiểm tra (không thêm thư viện).
- Kết quả kiểm: npm test 40/40 đạt; gài lỗi cố ý (15 kiểu, do Claude và agent Kiểm thử độc lập) → máy bắt được hết,
  trừ một kẽ hở ở luật 4 (câu import dùng nháy kép) — đã vá. Agent Kiểm thử độc lập báo ĐẠT; tự tính tay 6 ca chuẩn đều khớp.
- Bản dựng thật (`npm run build`) chưa chạy được trong môi trường Claude (mạng chặn npm) → sẽ chạy trên GitHub Actions.
