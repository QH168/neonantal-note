# Thẻ tính năng: Việc

**Mục đích:** ghi việc trong ngày theo khu vực, gắn nhãn loại việc (NV/BM/CK/HC/XN), đánh dấu xong bằng vuốt phải, xoá bằng vuốt trái (có Hoàn tác 6 giây), sửa chi tiết việc (tên, khu, nhãn, ghi chú, trạng thái) bằng chạm 2 lần, xem theo lịch tháng.

## File và hàm
- `src/lib/viec.js` — hàm thuần có bài kiểm (`tests/viec.test.js`): `TAGS`, `TAG_COLOR` (nhãn → số 1–5, còn giữ và có bài kiểm; từ v9.1 giao diện không dùng nữa — màu nhãn lấy từ biến `--tNV`… qua `mauNhan` trong `ui.jsx`), `laViecMoi` (có mảng `tags`), `chuanHoaTags`, `batTatNhan`, `soSanhViec`, `sapViec` (chưa xong trước → createdAt → id; áp dụng cho cả việc cũ), `khuHienThi` (ZONES + khu cũ còn việc), `boDemCham`, `themCham` (đếm chạm nhanh trong 1 giây, dùng n=2), `chuanTenViec` (bỏ khoảng trắng 2 đầu; rỗng thì không lưu), `khuDeChon` (danh sách chip khu vực của chi tiết việc; giữ khu cũ BM nếu việc đang ở đó), `gioXong` (v9.2: `doneAt` → "hh:mm" theo giờ máy; việc cũ không có `doneAt` thì trả rỗng, giao diện chỉ ghi "Đã xong").
- `src/lib/vuot.js` (v9.2) — hàm thuần cho cử chỉ: `huongCuChi`, `duocVuot`, `doDich`, `quaMoc` (mốc 1/3 chiều rộng dòng), `nenHien`, `ketQuaKhiTha`; bài kiểm `vuot:` trong `tests/viec.test.js`.
- `src/components/Tasks.jsx`
  - `ZoneNav` — thanh khu vực (PC: cột; iPhone: chip 44px vuốt ngang), số cạnh tên = việc chưa xong. Chip iPhone của khu không có việc: chữ nhạt, không ghi số 0.
  - `TaskGroups`, `TaskRow` — danh sách theo khu, thu gọn được. `TaskRow`: không còn ô tick đầu dòng, chữ sát lề trái 14px; vuốt phải qua 1/3 = xong (`toggleTask`, ghi `doneAt`); vuốt trái qua 1/3 = xoá mềm + thanh Hoàn tác 6 giây; chạm 2 lần thân dòng hoặc vùng nhãn → mở `TaskDetail`; cụm nhãn chỉ để xem; việc cũ hiện chấm số/NV, chạm chấm đổi vòng. Việc đã xong: chữ `--muted`, KHÔNG gạch ngang, nhãn mờ, `TickOk` (tích xanh tròn 26px, chỉ để hiển thị) ở cuối dòng, tự xuống cuối nhóm; vuốt phải trên việc đã xong chỉ nhúc nhích rồi về. Dòng bọc trong `SwipeRow` (xem `khung-chung.md`).
  - `TaskDetail` — bảng chi tiết việc (`Sheet` `sheet-half` cao ~76% theo bảng 15c, không tiêu đề, aria-label "Chi tiết việc"): ô tên, nút ×, hàng chip khu vực (cuộn ngang, chip đang chọn nền xanh, lưu ngay khi chạm), 5 nút nhãn (44px tròn; tắt: viền 1,5px chữ màu nhãn; bật: nền nhạt của nhãn, viền 2px), ghi chú, dòng trạng thái `TrangThaiXong` ("Chưa xong" + "Hoàn thành", hoặc "Đã xong lúc hh:mm" + "Bỏ đánh dấu xong"; việc cũ không có giờ chỉ ghi "Đã xong"), "Xoá việc" (chữ đỏ dịu `--delInk`; bảng trượt xuống rồi xoá, có Hoàn tác 6 giây), "Xong". Tự lưu (hook `useTuLuu`: tên/ghi chú 0,4 giây; khu và nhãn lưu ngay); không hiện chữ "Tự lưu". Hỗ trợ viết tắt ở ô tên và ghi chú. Đây là chỗ DUY NHẤT để bỏ đánh dấu xong.
  - `TaskForm` — form thêm việc (`variant` 'pc' / 'ph'), 5 nút nhãn (44px tròn) bật/tắt độc lập, giữ lựa chọn sau khi thêm.
  - `Calendar` — lịch tháng, số dưới ngày = việc chưa xong.
- `src/lib/actions.js` — `addTask` (có `tags`), `setTaskTags`, `setTaskNote`, `setTaskText`, `setTaskZone`, `toggleTask` (qua `phanDoiXong`: xong ghi `doneAt` = giờ, bỏ xong `doneAt` = null; có `updatedAt` mới), `cycleUrgency` (chỉ việc cũ, `(u % 5) + 1`), `removeTask`, `khoiPhucTask` (chỉ đổi `deleted` true thành false), `clearDone` (trả về mảng id đã xoá; `src/App.jsx` `xoaDaXong` dùng để Hoàn tác trả lại tất cả bằng `khoiPhucNhieu`).
- `src/db.js` — `ZONES` (NICU, CT, KAN, PS-PM, Ngoại Trú, DV, HP, HS), `LEGACY_ZONES` (BM).
- `src/components/ui.jsx` — `TagDot`, `TickOk`, `TrangThaiXong`, `SwipeRow` (vuốt phải xong, vuốt trái xoá), `Sheet`, `TrashIcon`; cho việc cũ: `PriDot`, `PRI_NAME`, `PRI_LEVELS`, `priLabel`. (`CheckBtn` không còn dùng ở tab Việc; chỉ còn ở dòng bé tab Khám.)
- `src/components/HoanTac.jsx` — thanh Hoàn tác 6 giây (xem `khung-chung.md`).
- `src/App.jsx` — tiêu đề "Việc hôm nay"/"Việc ngày dd/mm", chữ tiến độ iPhone "Đã xong x/y", nút "Xoá việc đã xong" (có Hoàn tác trả lại tất cả), dòng "Khám: còn x việc", dòng nhắc cử chỉ "Vuốt phải: xong · Vuốt trái: xoá · Chạm 2 lần: chi tiết" (chỉ 3 lần mở app đầu hoặc khi danh sách của ngày trống).

## Dữ liệu (bảng `tasks`)
`id, date (YYYY-MM-DD), zone, text, done, deleted, createdAt, updatedAt, deviceId`
- `doneAt` (v9.2, số mili giây hoặc null): giờ đánh dấu xong. Trường thường, không dùng để tìm/lọc, không đổi CSDL hay định dạng sao lưu. Việc cũ không có `doneAt` vẫn là đã xong (`done: true`), chỉ không có giờ → hiện "Đã xong". Không bao giờ suy `doneAt` từ `updatedAt`.
- Việc mới: `tags` (mảng, có thể rỗng), `note` (chuỗi, tuỳ chọn). Đều là trường thường — không đổi CSDL, không đổi định dạng sao lưu.
- `urgency` (1–5) chỉ còn ở việc cũ; việc mới không có `urgency`. Dữ liệu cũ không bị chuyển đổi.

## Quyết định đã chốt
Xem mục "Việc" trong `doi-agent/QUYET_DINH_DA_CHOT.md`.

## Điểm dễ hỏng
- Luật sắp xếp nằm ở `sapViec` (`src/lib/viec.js`, có kiểm tra); đừng sắp lại trong `.jsx`.
- Chạm 2 lần dùng `themCham`/`boDemCham` (cửa sổ 1 giây). Dòng cần `touch-action: manipulation` để iPhone không phóng to khi chạm 2 lần. Không còn chạm 3 lần, bảng nhãn riêng, bảng ghi chú cũ, vòng nét đứt.
- Bảng chi tiết đặt ở `TaskGroups`, không đặt trong `TaskRow`: đổi khu làm dòng chuyển sang nhóm khác (`TaskRow` bị dựng lại), đặt trong dòng thì bảng đóng giữa chừng.
- `Sheet` co theo bàn phím iPhone bằng `visualViewport` (class `kb`); bỏ đi thì bàn phím che ô đang gõ. Chưa thử trên iPhone thật.
- Click sau vuốt: `SwipeRow` chặn cú click ngay sau khi vuốt (~0,4 giây) để khỏi tính thành chạm 2 lần mở chi tiết. Nút thùng rác chỉ có trên PC (rê chuột), dùng click thường.
- `SwipeRow` phải giữ `touch-action: pan-y` để không hỏng cuộn dọc; cử chỉ chỉ nhận khi dịch ngang ≥8px và |dx| ≥ |dy| (`huongCuChi`) — vuốt chéo nghiêng ngang vẫn tính là vuốt. Chưa kiểm được bằng ngón tay thật (xem "Chờ duyệt" trong `NHAT_KY.md`).
- Hoàn tác: nơi xoá phải gọi `useHoanTac().hien(...)`; hẹn giờ 6 giây nằm ở `HoanTacProvider`, không nằm trên dòng (dòng bị gỡ khỏi trang vẫn không làm hỏng thanh). Thanh `position: fixed` ở đáy che "Thêm việc" trong 6 giây.- Việc cũ: gắn nhãn đầu tiên trong chi tiết thì thành việc mới (`setTaskTags`), `urgency` vẫn giữ trong dữ liệu; không gắn thì giữ nguyên số cũ.
- Tên việc rỗng không được lưu (`chuanTenViec`); khi đóng ô tên trả lại chữ cũ.
- Việc cũ vẫn hiện số 1–4/NV: NV cũ màu tím (--p5), NV mới (nhãn) màu đỏ phấn (nền `--tNV`, chữ `--tNVi`; trước v9.1 là đỏ --p1). Đây là chủ ý, đừng "sửa" cho giống nhau; `PriDot` của việc cũ vẫn dùng --p1…--p5.
- Khu cũ `BM` không có trong ô chọn khu khi thêm việc; chỉ hiện khi còn việc chưa xoá (`khuHienThi`).
- Huy hiệu nhãn là chữ 2 ký tự trong hình tròn 26px, chữ 11px đậm (iPhone và PC cùng cỡ từ v9.1); việc đã xong mờ 0,5 — kiểm ảnh chụp sau khi đổi cỡ chữ.
- Ngày tính theo giờ máy (`isoOf`), không dùng `toISOString` (lệch UTC+7).
