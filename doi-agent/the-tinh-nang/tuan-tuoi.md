# Thẻ tính năng: Tính tuần tuổi và tổng hợp y lệnh

**Mục đích:** từ ngày sinh + tuổi thai lúc sinh → ngày tuổi và tuổi thai hiệu chỉnh (PMA); in vào tổng hợp y lệnh.

## File và hàm (đều là "hàm thuần", kiểm được bằng Node)
- `src/lib/clinical.js`
  - `parseGa(ga)` → `{ w, d, days }` hoặc `null`. Nhận 346, 34w6d, 34+6, 34 6, 34.6, 34,6, 34/6, 3406, 34, "34 tuần 6 ngày". Giới hạn 20–45 tuần, ngày lẻ 0–6.
  - `parseDob(dob, now)` → `{ date }` hoặc `{ err }`. Không ghi năm: năm nay, nếu tương lai thì lùi 1 năm.
  - `calcAge(p, now)` → `{ days: 'N ngày', pma: 'XwYd' }` hoặc `{ err }`. Ngày tuổi = số ngày từ ngày sinh đến hôm nay (làm tròn).
  - `gaFmt`, `buildSummary({ rooms, patients, todosByPid, now })`, `copyText`.
- `src/lib/dates.js` — `p2`, `isoOf`, `todayIso`, `parseIso`, `addDays`, `fmtLong`, `fmtDM`.

## Nơi hiện (v9.4)
- Chi tiết bé (`PatientDetail` trong `src/components/Exam.jsx`, bảng 16b): ô nhập "Tuổi thai" là tuổi thai lúc sinh; nút "Tính tuần tuổi" bên trái, ô kết quả `be-kq` bên phải ghi "Ngày tuổi" và "Hiệu chỉnh" (= tuổi thai hiệu chỉnh). Vẫn chỉ tính khi bấm; sửa ngày sinh hoặc tuổi thai thì xoá kết quả cũ ngay. `src/lib/clinical.js` không đổi.
- Khung "Tổng hợp y lệnh" do `buildSummary` dựng; nút "Soạn lại" soạn lại từ danh sách.

## Kiểm tra
- `tests/clinical.test.js`, `tests/ca-chuan.test.js` (đọc bảng `doi-agent/ca-chuan-lam-sang.md`).
- Mọi thay đổi trong thẻ này phải kèm ca mới trong bảng ca chuẩn nếu thêm cách nhập/luật mới.

## Quyết định đã chốt
Xem mục "Tính tuần tuổi" trong `doi-agent/QUYET_DINH_DA_CHOT.md`. Đặc biệt: KHÔNG hiện "còn bao nhiêu ngày đến 40w".

## Điểm dễ hỏng
- Luôn tính theo ngày lịch giờ máy (bỏ giờ phút), không dùng UTC.
- `buildSummary` ghi "Tuổi thai ghi là tuổi thai hiệu chỉnh hôm nay." — đổi định dạng PMA thì tổng hợp cũng đổi.
