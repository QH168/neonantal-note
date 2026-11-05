# Nhật ký thay đổi

> Mục mới nhất ở trên cùng. Agent Ghi chép thêm một mục sau mỗi lần nâng cấp.

## Chờ duyệt (bác sĩ quyết, rồi giao phiếu việc)

| # | Phát hiện | Mức | Đề xuất | Agent |
|---|---|---|---|---|
| 1 | Cuộn dọc danh sách và cử chỉ mới (vuốt phải/trái 1/3 trên Việc, việc của bé, thư viện) bằng ngón tay thật, cùng bàn phím iPhone thật với bảng chi tiết việc, chưa kiểm được bằng máy (Chromium headless) — bác sĩ thử trên iPhone. | Lưu ý | Bác sĩ thử cuộn dọc, vuốt phải/trái và gõ trong chi tiết việc trên iPhone; nếu vướng thì giao phiếu chỉnh. | Giao diện |
| 3 | Ô thêm việc một dòng: gõ "/ctm" rồi Enter thì gửi luôn, không thay chữ (phiếu chỉ yêu cầu dấu cách). | Lưu ý | Hỏi bác sĩ có muốn Enter cũng thay chữ trước khi gửi không. | Giao diện |
| 4 | Bản tối: hộp thông báo "Đã thay" nền sáng, đọc rõ nhưng sáng hơn phần còn lại. | Lưu ý | Bác sĩ xem trên máy thật; nếu chói thì chỉnh màu `--vtAct` và nền hộp. | Giao diện |
| 5 | PC: ô lịch tháng 39×48px (có từ trước, không phải do v8.1). | Lưu ý | Phóng to ô nếu bác sĩ dùng chuột/chạm trên PC. | Giao diện |
| 8 | Chữ chip khu trống `#6B7F91` do đặc tả chốt đo 4,14:1 trên trắng và 3,84:1 trên nền trang, dưới 4,5:1. | Lưu ý | Đề xuất đổi `--chipZero` (sáng) sang `#5E7183` (5,04:1 trên trắng, 4,67:1 trên nền trang). Hỏi bác sĩ. | Giao diện |
| 9 | Dòng nhắc cử chỉ hiện cả khi danh sách của ngày trống, kể cả sau 3 lần mở đầu (đúng chữ đặc tả mục 2.3, khác hành vi cũ là ẩn khi trống). | Lưu ý | Hỏi bác sĩ giữ theo đặc tả hay chỉ hiện trong 3 lần mở đầu. | Giao diện |
| 10 | Đếm "3 lần mở" tính theo lần tải trang; trên iPhone, app tiếp tục từ nền không tính là lần mở mới. | Lưu ý | Chấp nhận; nếu bác sĩ muốn đếm cả lần quay lại từ nền thì đổi `useLanMoApp` (sự kiện `visibilitychange`). | Giao diện |
| 11 | Chi tiết bé: thanh kéo mới làm nội dung tụt ~19px, nút "Hoàn tất khám" trong ảnh chụp bị cắt ở đáy (vẫn cuộn tới được). | Lưu ý | Đợt 9.4 làm lại màn chi tiết bé nên xử lý ở đó. | Giao diện |
| 12 | Chromium headless nuốt cú chạm đầu tiên sau khi đóng Thư viện viết tắt (script chụp đã vòng qua bằng cách chạm vùng trống trước). | Lưu ý | Bác sĩ thử trên iPhone: đóng Thư viện viết tắt rồi chạm 2 lần vào một việc, xem có bị mất cú chạm đầu không. | Giao diện |
| 13 | Màu nền vuốt trái qua mốc ở bản tối `--swL2` `#7A3A33` chỉ 1,92:1 so với bề mặt và 2,17:1 so với nền trang; bước từ `--swL` sang `--swL2` là 1,36:1, nhìn thấy nhưng nhẹ. Giữ vì đó không phải chữ và dòng đang chuyển động kèm theo. | Lưu ý | Hỏi bác sĩ: nếu khó nhận ra mốc ở bản tối thì làm đậm `--swL2` hoặc thêm dấu hiệu khác. | Giao diện |
| 14 | Ở màn 320px, huy hiệu số việc quá hạn đè nhẹ lên góc nút lịch. | Lưu ý | Chỉnh vị trí huy hiệu nếu bác sĩ dùng máy nhỏ; không ảnh hưởng iPhone 15. | Giao diện |
| 15 | Thanh Hoàn tác che đáy màn hình trong 6 giây: trên tab Việc che nút "Thêm việc"; trong chi tiết bé che nút "Hoàn tất khám". | Lưu ý | Đợt 9.3 (ô thêm việc 1 dòng) sẽ giảm phần che ở tab Việc. Hỏi bác sĩ sau khi dùng thật xem có vướng không. | Giao diện |
| 16 | Thanh Hoàn tác dùng `position: fixed`, không theo `visualViewport`: khi bàn phím iPhone đang mở có thể che thanh trong khi hẹn giờ 6 giây vẫn chạy. Chưa thử trên máy thật. | Lưu ý | Nếu bác sĩ gặp, cho thanh co theo `visualViewport` như `Sheet`. | Giao diện |
| 17 | Vuốt chéo nghiêng ngang (tới 45° so với phương ngang, đã đo thử ở khoảng 35°) vẫn tính là vuốt (`huongCuChi` trong `src/lib/vuot.js`), nên có thể vô tình xong hoặc xoá khi cuộn bằng ngón cái. | Lưu ý | Bác sĩ thử cuộn bằng ngón cái trên iPhone; nếu vướng thì siết góc trong `src/lib/vuot.js`. | Giao diện |
| 18 | iPhone không rung khi qua mốc 1/3 vì Safari không hỗ trợ `navigator.vibrate`; chỉ đổi màu nền. | Lưu ý | Chấp nhận (không có cách khác trên Safari); nhắc bác sĩ để khỏi tưởng lỗi. | Giao diện |
| 19 | Dòng trạng thái "Đã xong lúc hh:mm" trong chi tiết chỉ có chữ xám; canvas có tích xanh và chữ xanh. Lệch nhỏ so với thiết kế. | Lưu ý | Chỉnh màu và thêm tích xanh nếu bác sĩ muốn. | Giao diện |

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
- Ảnh chuẩn chưa lưu lại, chờ bác sĩ duyệt ảnh 9.2. Các điểm cần bác sĩ quyết xem bảng "Chờ duyệt" (#1, #13, #15–#19).
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
