# Nhật ký thay đổi

> Mục mới nhất ở trên cùng. Agent Ghi chép thêm một mục sau mỗi lần nâng cấp.

## Chờ duyệt (bác sĩ quyết, rồi giao phiếu việc)

| # | Phát hiện | Mức | Đề xuất | Agent |
|---|---|---|---|---|
| 1 | Cuộn dọc danh sách và vuốt trái (SwipeRow kiểu C) bằng ngón tay thật, cùng bàn phím iPhone thật với bảng chi tiết việc, chưa kiểm được bằng máy (Chromium headless) — bác sĩ thử trên iPhone. | Lưu ý | Bác sĩ thử vuốt dọc/trái và gõ trong chi tiết việc trên iPhone; nếu vướng thì giao phiếu chỉnh. | Giao diện |
| 2 | Ảnh chuẩn `doi-agent/anh-chuan/` chưa cập nhật cho v8. | Lưu ý | Cập nhật sau khi bác sĩ xem giao diện v8 trên máy thật. | Kiểm thử |
| 3 | Ô thêm việc một dòng: gõ "/ctm" rồi Enter thì gửi luôn, không thay chữ (phiếu chỉ yêu cầu dấu cách). | Lưu ý | Hỏi bác sĩ có muốn Enter cũng thay chữ trước khi gửi không. | Giao diện |
| 4 | Bản tối: hộp thông báo "Đã thay" nền sáng, đọc rõ nhưng sáng hơn phần còn lại. | Lưu ý | Bác sĩ xem trên máy thật; nếu chói thì chỉnh màu `--vtAct` và nền hộp. | Giao diện |
| 5 | PC: ô lịch tháng 39×48px (có từ trước, không phải do v8.1). | Lưu ý | Phóng to ô nếu bác sĩ dùng chuột/chạm trên PC. | Giao diện |
| 6 | Thiết kế có dòng chữ "MỚI" dưới nút "/a" nhưng chưa làm vì đè thanh tiến độ. | Lưu ý | Hỏi bác sĩ có cần dòng "MỚI" không; nếu cần thì chọn chỗ đặt khác. | Giao diện |
| 7 | Chạm nút Xoá trong vòng ~0,5 giây sau khi vuốt có thể không ăn (trình duyệt giả lập không sinh click; trang trống cũng vậy). | Lưu ý | Bác sĩ thử trên iPhone; nếu bị thì đổi nút Xoá sang xử lý pointerup (SwipeRow, ui.jsx). | Giao diện |

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
