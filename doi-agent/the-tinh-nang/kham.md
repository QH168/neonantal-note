# Thẻ tính năng: Khám

**Mục đích:** danh sách bé theo phòng cho buổi khám sáng; việc cần làm của từng bé; chép danh sách hôm qua; tổng hợp y lệnh.

## File và hàm
- `src/components/Exam.jsx`
  - `ExamActions` — nút "Lấy danh sách hôm qua" (hoặc "ngày dd/mm" nếu ngày khám gần nhất không phải hôm qua) + "Quản lý phòng".
  - `RoomManager`, `RoomNameInput` — thêm/đổi tên/xoá phòng (khoá xoá khi phòng đã có bé).
  - `RoomList`, `PatientRow` — danh sách theo phòng. Dòng bé vẫn còn ô tick `CheckBtn` và mũi tên tới đợt 9.4 (đánh dấu đã khám qua `setPatientDone`, ghi `doneAt`); chưa vuốt phải.
  - `PatientDetail` — chi tiết bé; gõ tới đâu lưu tới đó (0,4 giây); nút "Tính tuần tuổi"; xoá bé hỏi xác nhận; "Hoàn tất khám" / "Đã khám xong (bấm để bỏ)" qua `setPatientDone`. Nhận thêm `wide` (PC) từ `src/App.jsx` để mở bảng nhỏ giữa màn hình.
  - `TodoRow` (v9.2) — việc cần làm của bé: không còn ô tick (chữ sát lề trái 14px); vuốt phải qua 1/3 = xong (`toggleTodo`, ghi `doneAt`); vuốt trái qua 1/3 = xoá mềm + thanh Hoàn tác 6 giây (`khoiPhucTodo`); việc xong chữ `--muted`, không gạch ngang, `TickOk` cuối dòng; chạm 2 lần (`themCham`/`boDemCham`, cũng dùng trên PC) mở `TodoDetail`. Dùng `SwipeRow` trong `src/components/ui.jsx`.
  - `TodoDetail` (v9.2) — bảng nhỏ (`Sheet` `sheet-todo`, cao theo nội dung, mở chồng lên chi tiết bé): ô tên sửa được (tự lưu, `setTodoText`, tên rỗng không lưu, có viết tắt), dòng trạng thái `TrangThaiXong` ("Chưa xong" + "Hoàn thành" / "Đã xong lúc hh:mm" + "Bỏ đánh dấu xong"), "Xoá việc" (có Hoàn tác 6 giây), "Xong". Esc chỉ đóng bảng trên cùng.
  - `SummaryPanel` — khung tổng hợp sửa được + Sao chép.
- `src/lib/actions.js` — `ensureSeed` (tạo Phòng 1–3), `addRoom`, `renameRoom`, `removeRoom`, `addPatient`, `updatePatient`,
  `setPatientDone` (đã khám / bỏ; qua `phanDoiXong`, ghi `doneAt`), `removePatient`, `addTodo`, `toggleTodo` (ghi `doneAt`), `removeTodo`, `khoiPhucTodo` (Hoàn tác xoá), `setTodoText`, `copyPatientsFrom` (không mang `doneAt` sang ngày mới).
- `src/lib/thu-tu.js` — hàm thuần `soSanhBe`, `sapBe`, `orderTiepTheo`: thứ tự bé trong phòng (theo `order`, rồi giờ tạo, rồi id).
- `src/hooks.js` — `useAppData`: `prev` (ngày khám gần nhất trước hôm nay), `roomUse` (đếm bé theo phòng); danh sách bé sắp bằng `sapBe`.

## Dữ liệu
- `rooms`: `id, name, order, …`
- `exam_patients`: `id, examDate, roomId, code, dob, ga, wt, note, done, doneAt?, order, copiedFrom?, …` (`order`, `doneAt` là trường thường, không phải chỉ mục)
- `patient_todos`: `id, patientId, text, done, doneAt?, order, …`
- `doneAt` (v9.2): giờ đánh dấu xong / đã khám, null khi bỏ đánh dấu; dòng cũ không có thì chỉ hiện "Đã xong". Bé chép sang hôm nay không mang `doneAt`.

## Quyết định đã chốt
Xem mục "Khám" trong `doi-agent/QUYET_DINH_DA_CHOT.md`.

## Điểm dễ hỏng
- `copyPatientsFrom` chống trùng theo **phòng + mã**; bé chưa có mã ("") sẽ bị coi là trùng với bé chưa có mã khác cùng phòng.
- Thứ tự bé: `copyPatientsFrom` sắp bé nguồn rồi gán `order`; `addPatient` gán `order` để bé thêm tay nằm cuối. Bé cũ không có `order` vẫn xếp theo giờ tạo. Đừng bỏ `sapBe` khi đổi cách hiển thị (kiểm bằng `tests/thu-tu.test.js`).
- `roomUse` đếm bằng một truy vấn cho mỗi phòng — ổn với vài phòng; nếu nhiều phòng, agent Thuật toán có thể gộp lại.
- Tổng hợp y lệnh dùng `buildSummary` trong `src/lib/clinical.js` (xem thẻ tuần tuổi).
- Việc của bé: `SwipeRow` chặn click ngay sau khi vuốt (~0,4 giây) để khỏi tính thành chạm 2 lần. `TodoDetail` mở chồng lên chi tiết bé; trên iPhone, thanh Hoàn tác 6 giây che nút "Hoàn tất khám" ở đáy chi tiết bé (xem "Chờ duyệt" trong `NHAT_KY.md`).
- Dòng bé ở tab Khám chưa đổi sang cử chỉ mới (còn ô tick, mũi tên): làm ở đợt 9.4.
- Ảnh chụp tự động thử "Lấy danh sách hôm qua" 2 lần để chắc không chép trùng.
