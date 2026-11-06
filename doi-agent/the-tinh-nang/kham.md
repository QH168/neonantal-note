# Thẻ tính năng: Khám

**Mục đích:** danh sách bé theo phòng cho buổi khám sáng; việc cần làm của từng bé; chép danh sách hôm qua; tổng hợp y lệnh.

## File và hàm
- `src/components/Exam.jsx`
  - `ExamActions` — nút "Lấy danh sách hôm qua" (hoặc "ngày dd/mm" nếu ngày khám gần nhất không phải hôm qua) + "Quản lý phòng".
  - `RoomManager`, `RoomNameInput` — thêm/đổi tên/xoá phòng (khoá xoá khi phòng đã có bé).
  - `RoomList` (v9.4) — mỗi dòng phòng có nút "+" tròn 32px viền xanh (vùng chạm 44px, `room-add`, `aria-label` "Thêm bé vào <tên phòng>") căn phải, nằm NGOÀI nút thu gọn nên chạm "+" không thu gọn phòng. Bấm "+" thì thêm bé (`addPatient`) rồi mở chi tiết bé; phòng đang thu gọn thì tự mở trước. Không còn ô gạch đứt "+ Thêm bệnh nhân". Áp cả PC.
  - `PatientRow` (v9.4) — dòng bé là `SwipeRow` chỉ vuốt phải: không ô tick, không mũi tên, không vuốt trái, không nút thùng rác. Vuốt phải qua 1/3 = đã khám (`setPatientDone`, ghi `doneAt`); bé đã khám vuốt phải chỉ nhúc nhích. Đã khám: chữ nhạt `--muted`, KHÔNG gạch ngang, `TickOk` cuối dòng; "Còn n việc" vẫn hiện khi đã khám. Số đo dạng "25w0d, 1850 g". Chạm 1 lần mở chi tiết (nút `pat-open`; `SwipeRow` chặn click ngay sau khi vuốt). Việc của bé hiện thành chữ, việc xong chữ nhạt.
  - `PatientDetail` (v9.4, bảng 16b) — chi tiết bé; gõ tới đâu lưu tới đó (0,4 giây). Tiêu đề: ô mã giường sửa được (bé mới tự đặt con trỏ vào ô mã), chip tên phòng (`phong`), nút đóng. Hàng 3 ô: Ngày sinh | Tuổi thai (`aria-label` "Tuổi thai lúc sinh") | Cân nặng, g. Nút "Tính tuần tuổi" bên trái, ô kết quả `be-kq` bên phải (Ngày tuổi, Hiệu chỉnh); VẪN CHỈ TÍNH KHI BẤM, sửa ngày sinh hoặc tuổi thai thì xoá kết quả cũ, lỗi hiện rõ. Việc cần làm: tiêu đề + "Còn x/y", ô thêm tròn + nút "+" 44px (`aria-label` "Thêm việc của bé"; bấm "+" hoặc Enter thay chữ tắt ở cuối qua `vt.chot` rồi mới lưu). Ghi chú tự lưu, có viết tắt. Dòng trạng thái `TrangThaiXong`: "Chưa khám" + "Hoàn tất khám" / "Đã khám lúc hh:mm" + "Bỏ đánh dấu đã khám" (bé cũ chưa có giờ chỉ ghi "Đã khám"). "Xoá khỏi hôm nay" đỏ dịu, VẪN hỏi xác nhận; "Xong" đóng bảng và lưu nốt. Nhận thêm `wide` (PC) từ `src/App.jsx` để mở bảng nhỏ giữa màn hình.
  - `TodoRow` (v9.2) — việc cần làm của bé: không còn ô tick (chữ sát lề trái 14px); vuốt phải qua 1/3 = xong (`toggleTodo`, ghi `doneAt`); vuốt trái qua 1/3 = xoá mềm + thanh Hoàn tác 6 giây (`khoiPhucTodo`); việc xong chữ `--muted`, không gạch ngang, `TickOk` cuối dòng; chạm 2 lần (`themCham`/`boDemCham`, cũng dùng trên PC) mở `TodoDetail`. Dùng `SwipeRow` trong `src/components/ui.jsx`.
  - `TodoDetail` (v9.2) — bảng nhỏ (`Sheet` `sheet-todo`, cao theo nội dung, mở chồng lên chi tiết bé): ô tên sửa được (tự lưu, `setTodoText`, tên rỗng không lưu, có viết tắt), dòng trạng thái `TrangThaiXong` ("Chưa xong" + "Hoàn thành" / "Đã xong lúc hh:mm" + "Bỏ đánh dấu xong"), "Xoá việc" (có Hoàn tác 6 giây), "Xong". Esc chỉ đóng bảng trên cùng.
  - `SummaryPanel` — khung "Tổng hợp y lệnh" sửa được + "Sao chép" + "Soạn lại" (soạn lại từ danh sách; v9.4 đổi tên nút, nội dung tổng hợp không đổi). Nút mở bảng ở `src/App.jsx` ghi "Tổng hợp y lệnh".
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
- Việc của bé: `SwipeRow` chặn click ngay sau khi vuốt (~0,4 giây) để khỏi tính thành chạm 2 lần. `TodoDetail` mở chồng lên chi tiết bé; trong chi tiết bé iPhone, thanh Hoàn tác 6 giây còn che phần đáy (xem "Chờ duyệt" trong `NHAT_KY.md`).
- Dòng bé (v9.4): `SwipeRow` không truyền `onDelete` nên không vuốt trái (`opts.duocTrai: false` trong `src/lib/vuot.js`); dòng bé KHÔNG được xoá bằng vuốt, chỉ xoá trong chi tiết ("Xoá khỏi hôm nay", có hỏi). Cuộn dọc danh sách không được đánh dấu đã khám nhầm. Vuốt phải đã nhận là ngang thì lệch dọc tới 60px vẫn đánh dấu (xem "Chờ duyệt" trong `NHAT_KY.md`).
- Nút "+" trên dòng phòng bấm hai lần nhanh có thể tạo bé rỗng thừa (xoá bằng "Xoá khỏi hôm nay"); bé mới tự đặt con trỏ vào ô mã, Safari iPhone có thể không bật bàn phím (xem "Chờ duyệt").
- Ô "Tuổi thai" ở hàng 3 ô là tuổi thai lúc sinh; "Hiệu chỉnh" ở ô kết quả là tuổi thai hiệu chỉnh. Đừng đổi nhãn một bên mà quên bên kia. Sau khi xoá việc của bé trong chi tiết bé, thanh Hoàn tác che "Xoá khỏi hôm nay" và "Xong" 6 giây, nút Hoàn tác đè lên nút "Xong" (xem "Chờ duyệt").
- Ảnh chụp tự động thử "Lấy danh sách hôm qua" 2 lần để chắc không chép trùng.
