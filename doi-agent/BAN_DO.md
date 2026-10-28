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
| Việc | `src/components/Tasks.jsx` (ZoneNav, TaskGroups, TaskRow, TagSheet, NoteSheet, TaskForm, Calendar); `src/lib/actions.js` (addTask, setTaskTags, setTaskNote, toggleTask, cycleUrgency, removeTask, clearDone); `src/lib/viec.js` (TAGS, TAG_COLOR, laViecMoi, chuanHoaTags, batTatNhan, soSanhViec, sapViec, khuHienThi, boDemCham, themCham) | Giao diện; Thuật toán khi đổi luật sắp xếp | `doi-agent/the-tinh-nang/viec.md` |
| Khám | `src/components/Exam.jsx` (ExamActions, RoomManager, RoomList, PatientDetail, SummaryPanel); `src/lib/actions.js` (phòng, bệnh nhân, việc của bé, copyPatientsFrom); `src/lib/thu-tu.js` (soSanhBe, sapBe, orderTiepTheo — thứ tự bé) | Giao diện + Thuật toán | `doi-agent/the-tinh-nang/kham.md` |
| Tính tuần tuổi, tổng hợp y lệnh | `src/lib/clinical.js` (parseGa, parseDob, calcAge, gaFmt, buildSummary, copyText); `src/lib/dates.js` | Thuật toán | `doi-agent/the-tinh-nang/tuan-tuoi.md` |
| Sao lưu, gộp dữ liệu | `src/db.js` (bảng `abbrevs` ở db.version(2)); `src/lib/merge.js`; `src/lib/backup.js`; `src/components/BackupPanel.jsx` | Dữ liệu và sao lưu | `doi-agent/the-tinh-nang/sao-luu.md` |
| Viết tắt (v8.1) | `src/lib/viet-tat.js` (chuanKey, taoMap, moRong, hoanTac, goiY, chenGoiY, BO_MAU — hàm thuần); `src/lib/actions.js` (addAbbrev, updateAbbrev, removeAbbrev, seedAbbrevs); `src/hooks.js` (useAbbrevs); bảng `abbrevs` trong `src/db.js`; giao diện: `src/components/VietTat.jsx` (VietTatProvider, useVietTat — thay chữ, dải gợi ý, Hoàn tác cho mọi ô gõ), `src/components/ThuVien.jsx` (bảng Thư viện viết tắt), nút "/a" và VietTatProvider bọc app trong `src/App.jsx`; hàm `PencilIcon` trong `src/components/ui.jsx` | Dữ liệu (hàm + bảng); Giao diện (màn hình) | `doi-agent/the-tinh-nang/viet-tat.md` |
| Khung chung | `src/App.jsx`; `src/App.css`; `src/components/ui.jsx` (SwipeRow, TagDot, Sheet); `src/hooks.js`; `src/main.jsx`; `index.html`; `vite.config.js` | Giao diện | `doi-agent/the-tinh-nang/khung-chung.md` |

## 3. Tra theo lời nói thường

| Bác sĩ nói… | Khu vực |
|---|---|
| ô tick, nhãn NV/BM/CK/HC/XN, chạm 2 lần ghi chú, chạm 3 lần sửa nhãn, vuốt trái xoá việc, thùng rác, chấm số 1–4 (việc cũ), lịch tháng, "Xoá việc đã xong", khu NICU/CT/KAN/PS-PM/Ngoại Trú/DV/HP/HS | Việc |
| phòng, bé, mã giường, "Lấy danh sách hôm qua", việc cần làm của bé (vuốt trái để xoá), đã khám, xoá bé | Khám |
| tuần tuổi, ngày tuổi, tuổi thai hiệu chỉnh, 34w6d, ngày sinh 0810, tổng hợp y lệnh, sao chép | Tính tuần tuổi, tổng hợp y lệnh |
| đám mây, chấm đỏ, OneDrive, file JSON, nhập/xuất, đổi máy, mất dữ liệu | Sao lưu, gộp dữ liệu |
| sáng/tối, cỡ chữ, tiêu đề, tab Việc/Khám, giao diện PC/iPhone, icon app | Khung chung |
| viết tắt, gõ /, gõ "/kmdm" rồi dấu cách, gợi ý khi gõ /, "Đã thay", Hoàn tác, thư viện viết tắt, nút "/a", thêm/sửa/xoá chữ tắt | Viết tắt |

## 4. Dây nối — sửa chỗ này phải xem cả chỗ kia

- Thêm ô thông tin mới cho bé → `src/lib/actions.js` (addPatient, copyPatientsFrom) + `src/components/Exam.jsx` (PatientDetail)
  + `src/lib/clinical.js` (buildSummary nếu cần in ra). Không cần đổi `db.js` nếu ô đó không dùng để tìm/lọc.
- Thêm cột cần tìm/lọc hoặc bảng mới → `src/db.js` (thêm khối `db.version(n+1)`, đừng sửa khối cũ; ví dụ: bảng `abbrevs` ở `db.version(2)`) + `DATA_TABLES` + `src/lib/backup.js` + bài kiểm tra gộp. Là **việc lớn**, cần bác sĩ duyệt phiếu.
- Thêm ô gõ chữ mới (input/textarea) → phải dùng `useVietTat` trong `src/components/VietTat.jsx` để có viết tắt; dải `strip` đặt NGOÀI thẻ `label` bọc ô. Xem `doi-agent/the-tinh-nang/viet-tat.md`.
- Đổi cách tính tuổi thai/ngày tuổi → chạy lại `doi-agent/ca-chuan-lam-sang.md` và `tests/clinical.test.js`; kiểm cả `buildSummary` (in tuổi hiệu chỉnh).
- Đổi nhãn loại việc (NV/BM/CK/HC/XN) → `src/lib/viec.js` (TAGS, TAG_COLOR) + `src/components/ui.jsx` (TagDot) + `src/App.css` (--p1…--p5). Việc cũ (không có `tags`) vẫn dùng mức 1–5: `src/components/ui.jsx` (PRI_NAME, PRI_LEVELS, PriDot) + `src/lib/actions.js` (cycleUrgency); NV cũ màu tím (--p5), NV mới màu đỏ (--p1) — đúng yêu cầu, không gộp.
- Đổi khu vực → `src/db.js` (ZONES cho việc mới, LEGACY_ZONES cho khu cũ như BM) + `src/lib/viec.js` (khuHienThi: khu cũ chỉ hiện khi còn việc chưa xoá).
- Vuốt trái để xoá (Việc + việc của bé) dùng chung `SwipeRow` trong `src/components/ui.jsx`; sửa chỗ này phải xem cả `src/components/Tasks.jsx` và `src/components/Exam.jsx`.
- Đổi cỡ chữ iPhone → `src/App.css` khối "thang chữ gọn"; ô nhập phải ≥16px; vùng chạm ≥44px.
- Thêm bé / chép bé phải gán `order` qua `orderTiepTheo`/`sapBe` (`src/lib/thu-tu.js`); danh sách hiển thị sắp bằng `sapBe` trong `src/hooks.js`.
- Mọi thao tác ghi dữ liệu → qua `src/lib/actions.js` → `addRow/updateRow/softDelete` trong `src/db.js` (để có updatedAt cho gộp sao lưu).

## 5. Bài kiểm tra bảo vệ tính năng nào

| File kiểm tra | Bảo vệ |
|---|---|
| `tests/clinical.test.js` | đọc tuổi thai, ngày sinh, tính tuổi, tổng hợp y lệnh, 6 ví dụ đã thống nhất |
| `tests/ca-chuan.test.js` | bộ ca chuẩn lâm sàng trong `doi-agent/ca-chuan-lam-sang.md` (bác sĩ tự thêm ca được) |
| `tests/merge.test.js` | gộp sao lưu, định dạng file, tên file |
| `tests/luat.test.js` | luật cứng: không họ tên, không đổi CSDL, ô nhập ≥16px, màn hình không ghi thẳng CSDL, không thêm thư viện lạ, không hiện "đến 40w" |
| `tests/ban-do.test.js` | bản đồ khớp với mã thật |
| `tests/viec.test.js` | nhãn việc, sắp xếp việc, khu hiển thị, đếm chạm |
| `tests/viet-tat.test.js` | thay chữ '/key ', gợi ý, chèn gợi ý, hoàn tác, bộ mẫu 13 mục |
| `tests/thu-tu.test.js` | thứ tự bé trong ngày khám (order, createdAt, id; bé cũ; bé thêm tay) |
| `scripts/chup-giao-dien.mjs` | (chạy trong môi trường Claude) ảnh iPhone 15 + PC, đo vùng chạm, cỡ chữ ô nhập, thử "Lấy danh sách hôm qua" |
| `scripts/kiem-pham-vi.mjs` | agent chỉ sửa đúng file ghi trong phiếu việc |

## 6. Trạng thái hiện tại

- Phiên bản: **v8.1** (đợt 2 của v8: viết tắt).
- Lần sửa gần nhất: 29/10/2026 — viết tắt: gõ "/chữ tắt" rồi dấu cách ở mọi ô gõ chữ thì tự thay; gợi ý tối đa 4 mục, Hoàn tác ~4 giây; nút "/a" mở Thư viện viết tắt (thêm, sửa, tìm, vuốt xoá, 13 mục mẫu); bảng `abbrevs` ở `db.version(2)`, có trong sao lưu.
- Việc tiếp theo: không còn việc dở trong kế hoạch; việc chờ bác sĩ quyết xem bên dưới.
- Việc còn chờ bác sĩ quyết: xem mục "Chờ duyệt" trong `doi-agent/NHAT_KY.md`.
