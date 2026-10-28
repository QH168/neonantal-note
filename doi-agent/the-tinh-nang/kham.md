# Thẻ tính năng: Khám

**Mục đích:** danh sách bé theo phòng cho buổi khám sáng; việc cần làm của từng bé; chép danh sách hôm qua; tổng hợp y lệnh.

## File và hàm
- `src/components/Exam.jsx`
  - `ExamActions` — nút "Lấy danh sách hôm qua" (hoặc "ngày dd/mm" nếu ngày khám gần nhất không phải hôm qua) + "Quản lý phòng".
  - `RoomManager`, `RoomNameInput` — thêm/đổi tên/xoá phòng (khoá xoá khi phòng đã có bé).
  - `RoomList`, `PatientRow` — danh sách theo phòng.
  - `PatientDetail` — chi tiết bé; gõ tới đâu lưu tới đó (0,4 giây); nút "Tính tuần tuổi"; xoá bé hỏi xác nhận.
  - `SummaryPanel` — khung tổng hợp sửa được + Sao chép.
- `src/lib/actions.js` — `ensureSeed` (tạo Phòng 1–3), `addRoom`, `renameRoom`, `removeRoom`, `addPatient`, `updatePatient`,
  `removePatient`, `addTodo`, `toggleTodo`, `removeTodo`, `copyPatientsFrom`.
- `src/hooks.js` — `useAppData`: `prev` (ngày khám gần nhất trước hôm nay), `roomUse` (đếm bé theo phòng).

## Dữ liệu
- `rooms`: `id, name, order, …`
- `exam_patients`: `id, examDate, roomId, code, dob, ga, wt, note, done, copiedFrom?, …`
- `patient_todos`: `id, patientId, text, done, order, …`

## Quyết định đã chốt
Xem mục "Khám" trong `doi-agent/QUYET_DINH_DA_CHOT.md`.

## Điểm dễ hỏng
- `copyPatientsFrom` chống trùng theo **phòng + mã**; bé chưa có mã ("") sẽ bị coi là trùng với bé chưa có mã khác cùng phòng.
- `roomUse` đếm bằng một truy vấn cho mỗi phòng — ổn với vài phòng; nếu nhiều phòng, agent Thuật toán có thể gộp lại.
- Tổng hợp y lệnh dùng `buildSummary` trong `src/lib/clinical.js` (xem thẻ tuần tuổi).
- Ảnh chụp tự động thử "Lấy danh sách hôm qua" 2 lần để chắc không chép trùng.
