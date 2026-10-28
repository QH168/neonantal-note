# Bản đồ dự án — Ghi chú Sơ sinh

> Tờ đầu tiên mọi agent đọc. Chỉ đọc tờ này + thẻ tính năng liên quan, KHÔNG đọc toàn bộ mã.
> Bản đồ được kiểm bằng máy (`tests/ban-do.test.js`): mọi đường dẫn ghi trong dấu `…` phải có thật,
> và mọi file trong `src/` phải có tên trên bản đồ. Thêm/xoá file mà quên sửa bản đồ → GitHub báo lỗi.

## 1. Thông tin cố định (không bao giờ đổi)

- App web (PWA) React + Vite. Dữ liệu nằm trong từng máy (IndexedDB qua Dexie). Không có máy chủ giữ dữ liệu.
- Link: https://qh168.github.io/neonantal-note/ — giữ nguyên; đổi link là mất dữ liệu trên máy.
- Chỉ dùng mã/số giường, **không** có ô họ tên bệnh nhân.
- Tên cơ sở dữ liệu `ghichu-sosinh`, khối `db.version(1)` không được sửa. Thêm cột/bảng → thêm `db.version(2)`.
- Sao lưu: file JSON lên OneDrive; gộp theo từng dòng, bản sửa sau cùng thắng; xoá = đánh dấu `deleted`.
- Cập nhật: Claude gửi zip → bác sĩ giải nén → GitHub Add file > Upload files → Commit. GitHub Actions chạy `npm test` rồi build.
  Không gửi lại thư mục `.github`.
- Danh sách quyết định đã chốt: `doi-agent/QUYET_DINH_DA_CHOT.md`.

## 2. Khu vực tính năng

| Khu vực | File, hàm chính | Agent phụ trách | Thẻ chi tiết |
|---|---|---|---|
| Việc | `src/components/Tasks.jsx` (ZoneNav, TaskGroups, TaskForm, Calendar, byPri); `src/lib/actions.js` (addTask, toggleTask, cycleUrgency, removeTask, clearDone) | Giao diện; Thuật toán khi đổi luật sắp xếp | `doi-agent/the-tinh-nang/viec.md` |
| Khám | `src/components/Exam.jsx` (ExamActions, RoomManager, RoomList, PatientDetail, SummaryPanel); `src/lib/actions.js` (phòng, bệnh nhân, việc của bé, copyPatientsFrom) | Giao diện + Thuật toán | `doi-agent/the-tinh-nang/kham.md` |
| Tính tuần tuổi, tổng hợp y lệnh | `src/lib/clinical.js` (parseGa, parseDob, calcAge, gaFmt, buildSummary, copyText); `src/lib/dates.js` | Thuật toán | `doi-agent/the-tinh-nang/tuan-tuoi.md` |
| Sao lưu, gộp dữ liệu | `src/db.js`; `src/lib/merge.js`; `src/lib/backup.js`; `src/components/BackupPanel.jsx` | Dữ liệu và sao lưu | `doi-agent/the-tinh-nang/sao-luu.md` |
| Khung chung | `src/App.jsx`; `src/App.css`; `src/components/ui.jsx`; `src/hooks.js`; `src/main.jsx`; `index.html`; `vite.config.js` | Giao diện | `doi-agent/the-tinh-nang/khung-chung.md` |
| File không còn dùng | `src/components/TaskDemo.jsx` — bản minh hoạ cũ, App không gọi tới | (đề xuất xoá, chờ bác sĩ duyệt) | — |

## 3. Tra theo lời nói thường

| Bác sĩ nói… | Khu vực |
|---|---|
| ô tick, chấm màu, số ưu tiên, huy hiệu, NV, lịch tháng, "Xoá việc đã xong", khu NICU/CT/KAN… | Việc |
| phòng, bé, mã giường, "Lấy danh sách hôm qua", việc cần làm của bé, đã khám, xoá bé | Khám |
| tuần tuổi, ngày tuổi, tuổi thai hiệu chỉnh, 34w6d, ngày sinh 0810, tổng hợp y lệnh, sao chép | Tính tuần tuổi, tổng hợp y lệnh |
| đám mây, chấm đỏ, OneDrive, file JSON, nhập/xuất, đổi máy, mất dữ liệu | Sao lưu, gộp dữ liệu |
| sáng/tối, cỡ chữ, tiêu đề, tab Việc/Khám, giao diện PC/iPhone, icon app | Khung chung |

## 4. Dây nối — sửa chỗ này phải xem cả chỗ kia

- Thêm ô thông tin mới cho bé → `src/lib/actions.js` (addPatient, copyPatientsFrom) + `src/components/Exam.jsx` (PatientDetail)
  + `src/lib/clinical.js` (buildSummary nếu cần in ra). Không cần đổi `db.js` nếu ô đó không dùng để tìm/lọc.
- Thêm cột cần tìm/lọc hoặc bảng mới → `src/db.js` (db.version(2)) + `DATA_TABLES` + `src/lib/backup.js` + bài kiểm tra gộp. Là **việc lớn**, cần bác sĩ duyệt phiếu.
- Đổi cách tính tuổi thai/ngày tuổi → chạy lại `doi-agent/ca-chuan-lam-sang.md` và `tests/clinical.test.js`; kiểm cả `buildSummary` (in tuổi hiệu chỉnh).
- Đổi mức ưu tiên → `src/components/ui.jsx` (PRI_NAME, PRI_LEVELS, PriDot) + `src/lib/actions.js` (cycleUrgency) + `src/App.css` (--p1…--p5).
- Đổi khu vực → `src/db.js` (ZONES) — các việc cũ vẫn mang tên khu cũ.
- Đổi cỡ chữ iPhone → `src/App.css` khối "thang chữ gọn"; ô nhập phải ≥16px; vùng chạm ≥44px.
- Mọi thao tác ghi dữ liệu → qua `src/lib/actions.js` → `addRow/updateRow/softDelete` trong `src/db.js` (để có updatedAt cho gộp sao lưu).

## 5. Bài kiểm tra bảo vệ tính năng nào

| File kiểm tra | Bảo vệ |
|---|---|
| `tests/clinical.test.js` | đọc tuổi thai, ngày sinh, tính tuổi, tổng hợp y lệnh, 6 ví dụ đã thống nhất |
| `tests/ca-chuan.test.js` | bộ ca chuẩn lâm sàng trong `doi-agent/ca-chuan-lam-sang.md` (bác sĩ tự thêm ca được) |
| `tests/merge.test.js` | gộp sao lưu, định dạng file, tên file |
| `tests/luat.test.js` | luật cứng: không họ tên, không đổi CSDL, ô nhập ≥16px, màn hình không ghi thẳng CSDL, không thêm thư viện lạ, không hiện "đến 40w" |
| `tests/ban-do.test.js` | bản đồ khớp với mã thật |
| `scripts/chup-giao-dien.mjs` | (chạy trong môi trường Claude) ảnh iPhone 15 + PC, đo vùng chạm, cỡ chữ ô nhập, thử "Lấy danh sách hôm qua" |
| `scripts/kiem-pham-vi.mjs` | agent chỉ sửa đúng file ghi trong phiếu việc |

## 6. Trạng thái hiện tại

- Phiên bản: **v7.1** (v7 + bộ đội agent và harness; app trên iPhone không đổi).
- Lần sửa gần nhất: 28/10/2026 — dựng `doi-agent/`, `scripts/`, thêm 3 file kiểm tra.
- Việc còn chờ bác sĩ quyết: xem mục "Chờ duyệt" trong `doi-agent/NHAT_KY.md`.
