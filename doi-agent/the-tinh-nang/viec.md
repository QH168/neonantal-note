# Thẻ tính năng: Việc

**Mục đích:** ghi việc trong ngày theo khu vực, gắn nhãn loại việc (NV/BM/CK/HC/XN), sửa chi tiết việc (tên, khu, nhãn, ghi chú) bằng chạm 2 lần, xem theo lịch tháng.

## File và hàm
- `src/lib/viec.js` — hàm thuần có bài kiểm (`tests/viec.test.js`): `TAGS`, `TAG_COLOR` (nhãn → màu --p1…--p5), `laViecMoi` (có mảng `tags`), `chuanHoaTags`, `batTatNhan`, `soSanhViec`, `sapViec` (chưa xong trước → createdAt → id; áp dụng cho cả việc cũ), `khuHienThi` (ZONES + khu cũ còn việc), `boDemCham`, `themCham` (đếm chạm nhanh trong 1 giây, dùng n=2), `chuanTenViec` (bỏ khoảng trắng 2 đầu; rỗng thì không lưu), `khuDeChon` (ô chọn khu của chi tiết việc; giữ khu cũ BM nếu việc đang ở đó).
- `src/components/Tasks.jsx`
  - `ZoneNav` — thanh khu vực (PC: cột; iPhone: chip vuốt ngang), số cạnh tên = việc chưa xong.
  - `TaskGroups`, `TaskRow` — danh sách theo khu, thu gọn được. `TaskRow`: chạm 2 lần thân dòng hoặc vùng nhãn → mở `TaskDetail`; cụm nhãn chỉ để xem; việc cũ hiện chấm số/NV, chạm chấm đổi vòng. Dòng bọc trong `SwipeRow` (xoá kiểu C).
  - `TaskDetail` — bảng chi tiết việc (`Sheet` cao ~50%, không tiêu đề, aria-label "Chi tiết việc"): ô tên, nút ×, ô chọn khu, 5 nút nhãn, ghi chú rộng nhất, "Xoá việc", "Xong". Tự lưu (hook `useTuLuu`: tên/ghi chú 0,4 giây; khu và nhãn lưu ngay); không hiện chữ "Tự lưu". Hỗ trợ viết tắt ở ô tên và ghi chú.
  - `TaskForm` — form thêm việc (`variant` 'pc' / 'ph'), 5 nút nhãn bật/tắt độc lập, giữ lựa chọn sau khi thêm.
  - `Calendar` — lịch tháng, số dưới ngày = việc chưa xong.
- `src/lib/actions.js` — `addTask` (có `tags`), `setTaskTags`, `setTaskNote`, `setTaskText`, `setTaskZone`, `toggleTask`, `cycleUrgency` (chỉ việc cũ, `(u % 5) + 1`), `removeTask`, `clearDone`.
- `src/db.js` — `ZONES` (NICU, CT, KAN, PS-PM, Ngoại Trú, DV, HP, HS), `LEGACY_ZONES` (BM).
- `src/components/ui.jsx` — `CheckBtn`, `TagDot`, `SwipeRow` (vuốt trái xoá kiểu C), `Sheet`, `TrashIcon`; cho việc cũ: `PriDot`, `PRI_NAME`, `PRI_LEVELS`, `priLabel`.
- `src/App.jsx` — tiêu đề "Việc hôm nay"/"Việc ngày dd/mm", nút "Xoá việc đã xong", dòng "Khám: còn x việc".

## Dữ liệu (bảng `tasks`)
`id, date (YYYY-MM-DD), zone, text, done, deleted, createdAt, updatedAt, deviceId`
- Việc mới: `tags` (mảng, có thể rỗng), `note` (chuỗi, tuỳ chọn). Đều là trường thường — không đổi CSDL, không đổi định dạng sao lưu.
- `urgency` (1–5) chỉ còn ở việc cũ; việc mới không có `urgency`. Dữ liệu cũ không bị chuyển đổi.

## Quyết định đã chốt
Xem mục "Việc" trong `doi-agent/QUYET_DINH_DA_CHOT.md`.

## Điểm dễ hỏng
- Luật sắp xếp nằm ở `sapViec` (`src/lib/viec.js`, có kiểm tra); đừng sắp lại trong `.jsx`.
- Chạm 2 lần dùng `themCham`/`boDemCham` (cửa sổ 1 giây). Dòng cần `touch-action: manipulation` để iPhone không phóng to khi chạm 2 lần. Không còn chạm 3 lần, bảng nhãn riêng, bảng ghi chú cũ, vòng nét đứt.
- Bảng chi tiết đặt ở `TaskGroups`, không đặt trong `TaskRow`: đổi khu làm dòng chuyển sang nhóm khác (`TaskRow` bị dựng lại), đặt trong dòng thì bảng đóng giữa chừng.
- `Sheet` co theo bàn phím iPhone bằng `visualViewport` (class `kb`); bỏ đi thì bàn phím che ô đang gõ. Chưa thử trên iPhone thật.
- Click sau vuốt: `SwipeRow` chặn cú click ngay sau khi vuốt (~0,4 giây) để khỏi mở chi tiết; chạm nút Xoá trong khoảng đó có thể không ăn (trình duyệt giả lập không sinh click) — nếu bị trên iPhone thì đổi nút Xoá sang `pointerup` (xem "Chờ duyệt" trong `NHAT_KY.md`).
- `SwipeRow` phải giữ `touch-action: pan-y` để không hỏng cuộn dọc. Chưa kiểm được bằng ngón tay thật (xem "Chờ duyệt" trong `NHAT_KY.md`).
- Việc cũ: gắn nhãn đầu tiên trong chi tiết thì thành việc mới (`setTaskTags`), `urgency` vẫn giữ trong dữ liệu; không gắn thì giữ nguyên số cũ.
- Tên việc rỗng không được lưu (`chuanTenViec`); khi đóng ô tên trả lại chữ cũ.
- Việc cũ vẫn hiện số 1–4/NV: NV cũ màu tím (--p5), NV mới (nhãn) màu đỏ (--p1). Đây là chủ ý, đừng "sửa" cho giống nhau.
- Khu cũ `BM` không có trong ô chọn khu khi thêm việc; chỉ hiện khi còn việc chưa xoá (`khuHienThi`).
- Chấm nhãn là chữ 2 ký tự trong hình tròn — kiểm ảnh chụp sau khi đổi cỡ chữ.
- Ngày tính theo giờ máy (`isoOf`), không dùng `toISOString` (lệch UTC+7).
