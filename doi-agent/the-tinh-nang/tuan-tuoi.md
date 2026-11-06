# Thẻ tính năng: Tính tuần tuổi và tổng hợp y lệnh

**Mục đích:** từ ngày sinh + tuổi thai lúc sinh → ngày tuổi và tuổi thai hiệu chỉnh (PMA); in vào tổng hợp y lệnh.

## File và hàm (đều là "hàm thuần", kiểm được bằng Node)
- `src/lib/clinical.js`
  - `parseGa(ga)` → `{ w, d, days }` hoặc `null`. Nhận 346, 34w6d, 34+6, 34 6, 34.6, 34,6, 34/6, 3406, 34, "34 tuần 6 ngày". Giới hạn 20–45 tuần, ngày lẻ 0–6.
  - `parseDob(dob, now)` → `{ date }` hoặc `{ err }`. Không ghi năm: năm nay, nếu tương lai thì lùi 1 năm.
  - `calcAge(p, now)` → `{ days: 'N ngày', pma: 'XwYd' }` hoặc `{ err }`. Ngày tuổi = số ngày từ ngày sinh đến hôm nay (làm tròn).
  - `ngayTinhTuoi(p)` (v9.6) — ngày tính tuổi của một dòng đã qua: ngày lịch của `createdAt` nếu muộn hơn `examDate`, không thì `examDate`. Bé sinh sau nửa đêm không bị lùi một năm. `tuoiCuaDong(p, now)` (v9.6) = `calcAge` theo ngày đó; dùng trong `tong-hop.js`, `KhamNgayTruoc.jsx`, `hai-ngay.js`. `calcAge`, `parseDob`, `parseGa` không đổi.
  - `gaFmt`, `buildSummary({ rooms, patients, todosByPid, now, ngayTruoc })`, `copyText`. `ngayTruoc` (v9.5, mặc định false): dòng hai ghi "Tuổi thai ghi là tuổi thai hiệu chỉnh ngày dd/mm.", danh sách trống ghi "ngày này"; không truyền thì văn bản như cũ.
- `src/lib/dates.js` — `p2`, `isoOf`, `todayIso`, `parseIso`, `addDays`, `fmtLong`, `fmtDM`.
- `src/lib/tong-hop.js` (v9.5) — `tongHopNhieuNgay({ tuNgay, denNgay, rooms, patients, todosByPid, cachXep })` trả `{ text, soNgay, soLuot, soMaGiuong, soBeChuaCoMa }` (`cachXep` là 'ngay' hoặc 'ma'); `phongChoXem` (phòng còn sống, rồi phòng đã xoá có bé, rồi 'Phòng đã xoá'). Tuổi mỗi dòng là `calcAge(p, parseIso(p.examDate))`.

## Nơi hiện (v9.4)
- Chi tiết bé (`PatientDetail` trong `src/components/Exam.jsx`, bảng 16b): ô nhập "Tuổi thai" là tuổi thai lúc sinh; nút "Tính tuần tuổi" bên trái, ô kết quả `be-kq` bên phải ghi "Ngày tuổi" và "Hiệu chỉnh" (= tuổi thai hiệu chỉnh). Vẫn chỉ tính khi bấm; sửa ngày sinh hoặc tuổi thai thì xoá kết quả cũ ngay. `src/lib/clinical.js` không đổi.
- Khung "Tổng hợp y lệnh" do `buildSummary` dựng; nút "Soạn lại" soạn lại từ danh sách.
- Ngày trước (v9.5, bảng 16d): dòng bé hiện tuổi thai hiệu chỉnh "hôm đó" (ví dụ "38w0d hôm đó, 1850 g"); chi tiết chỉ xem hiện "Ngày tuổi" và "Hiệu chỉnh" ghi rõ ngày. Tính sẵn theo ngày khám của chính dòng đó, không cần bấm (`soDoNgayTruoc` trong `src/components/KhamNgayTruoc.jsx`). "Tổng hợp ngày này" dùng `buildSummary` với `ngayTruoc: true`.
- Tổng hợp nhiều ngày (v9.5, bảng 16f): `tongHopNhieuNgay`. Tiêu đề "TỔNG HỢP 02/11 - 04/11/2026" (khác năm thì ghi đủ năm); nhóm theo mã giường "PHÒNG 1 - G01" hoặc theo ngày "NGÀY 02/11". Kiểm bằng `tests/tong-hop.test.js`.

## Kiểm tra
- `tests/clinical.test.js`, `tests/ca-chuan.test.js` (đọc bảng `doi-agent/ca-chuan-lam-sang.md`).
- Mọi thay đổi trong thẻ này phải kèm ca mới trong bảng ca chuẩn nếu thêm cách nhập/luật mới.
- Ca bé sinh sau nửa đêm (v9.6) đã thêm vào `doi-agent/ca-chuan-lam-sang.md`: bé ghi lúc 02:30 ngày 05/11 cho ngày sinh '0511' có ngày khám 04/11; tuổi theo ngày ghi (05/11) ra 0 ngày, không ra 364 ngày.

## Quyết định đã chốt
Xem mục "Tính tuần tuổi" trong `doi-agent/QUYET_DINH_DA_CHOT.md`. Đặc biệt: KHÔNG hiện "còn bao nhiêu ngày đến 40w".

## Điểm dễ hỏng
- Luôn tính theo ngày lịch giờ máy (bỏ giờ phút), không dùng UTC.
- `buildSummary` ghi "Tuổi thai ghi là tuổi thai hiệu chỉnh hôm nay." — đổi định dạng PMA thì tổng hợp cũng đổi.
- Tuổi ngày trước và tổng hợp nhiều ngày tính theo ngày của từng dòng (`ngayTinhTuoi`: `examDate`, hoặc ngày ghi nếu muộn hơn), không dùng hôm nay và không dùng đầu hoặc cuối khoảng. Dùng `tuoiCuaDong`, không gọi `calcAge(p, examDate)` thẳng: bé sinh sau nửa đêm sẽ bị lùi một năm. Tuổi trang hôm nay vẫn theo ngày lịch của máy. Đổi `calcAge`, `parseDob` hoặc `parseGa` thì chạy `tests/tong-hop.test.js` và `tests/clinical.test.js`.
