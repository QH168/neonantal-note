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
  **Từ 05/11/2026** Claude có thể đẩy trực tiếp lên `main` từ máy bác sĩ khi `npm test` đạt (không cần gửi zip).
- Danh sách quyết định đã chốt: `doi-agent/QUYET_DINH_DA_CHOT.md`.
- Thiết kế giao diện: brief `doi-agent/THIET_KE.md` (đặc tả v9 đang áp dụng dần: `doi-agent/thiet-ke-v9/THIET_KE_V9.md`) + skill `.claude/skills/frontend-design/SKILL.md`; vòng chụp → nhìn → sửa: skill `.claude/skills/sua-giao-dien/SKILL.md` (dùng `scripts/chup-giao-dien.mjs`).

## 2. Khu vực tính năng

| Khu vực | File, hàm chính | Agent phụ trách | Thẻ chi tiết |
|---|---|---|---|
| Việc | `src/components/Tasks.jsx` (ZoneNav, TaskGroups, TaskRow, TaskDetail, TaskForm, Calendar); `src/lib/actions.js` (addTask, setTaskTags, setTaskNote, setTaskText, setTaskZone, toggleTask, cycleUrgency, removeTask, clearDone); `src/lib/viec.js` (TAGS, TAG_COLOR, laViecMoi, chuanHoaTags, batTatNhan, soSanhViec, sapViec, khuHienThi, boDemCham, themCham, chuanTenViec, khuDeChon) | Giao diện; Thuật toán khi đổi luật sắp xếp | `doi-agent/the-tinh-nang/viec.md` |
| Khám | `src/components/Exam.jsx` (ExamActions, RoomManager, RoomList, PatientDetail, SummaryPanel); `src/lib/actions.js` (phòng, bệnh nhân, việc của bé, copyPatientsFrom); `src/lib/thu-tu.js` (soSanhBe, sapBe, orderTiepTheo — thứ tự bé) | Giao diện + Thuật toán | `doi-agent/the-tinh-nang/kham.md` |
| Tính tuần tuổi, tổng hợp y lệnh | `src/lib/clinical.js` (parseGa, parseDob, calcAge, gaFmt, buildSummary, copyText); `src/lib/dates.js` | Thuật toán | `doi-agent/the-tinh-nang/tuan-tuoi.md` |
| Sao lưu, gộp dữ liệu | `src/db.js` (bảng `abbrevs` ở db.version(2)); `src/lib/merge.js`; `src/lib/backup.js`; `src/components/BackupPanel.jsx` (bảng "Sao lưu và cài đặt": sao lưu như cũ + nút gạt Sáng / Tối / Theo máy) | Dữ liệu và sao lưu; Giao diện (phần chọn giao diện) | `doi-agent/the-tinh-nang/sao-luu.md` |
| Viết tắt (v8.1) | `src/lib/viet-tat.js` (chuanKey, taoMap, moRong, hoanTac, goiY, chenGoiY, BO_MAU — hàm thuần); `src/lib/actions.js` (addAbbrev, updateAbbrev, removeAbbrev, seedAbbrevs); `src/hooks.js` (useAbbrevs); bảng `abbrevs` trong `src/db.js`; giao diện: `src/components/VietTat.jsx` (VietTatProvider, useVietTat — thay chữ, dải gợi ý, Hoàn tác cho mọi ô gõ), `src/components/ThuVien.jsx` (bảng Thư viện viết tắt), nút "/a" và VietTatProvider bọc app trong `src/App.jsx`; hàm `PencilIcon` trong `src/components/ui.jsx` | Dữ liệu (hàm + bảng); Giao diện (màn hình) | `doi-agent/the-tinh-nang/viet-tat.md` |
| Khung chung | `src/App.jsx`; `src/App.css`; `src/components/ui.jsx` (SwipeRow kiểu C, TagDot, mauNhan — màu nhãn từ biến mới, Sheet — thanh kéo, co theo visualViewport, SheetHead); `src/hooks.js` (useToday, useWide, useGiaoDien — chế độ Sáng/Tối/Theo máy, useLanMoApp — đếm lần mở app, useAppData); `src/lib/cai-dat.js` (docCheDo, laToi, tangLanMo, hienDongNhac — hàm thuần, không dùng window); `src/main.jsx`; `index.html`; `vite.config.js` | Giao diện | `doi-agent/the-tinh-nang/khung-chung.md` |

## 3. Tra theo lời nói thường

| Bác sĩ nói… | Khu vực |
|---|---|
| ô tick, nhãn NV/BM/CK/HC/XN, chạm 2 lần mở chi tiết việc, sửa tên việc, đổi khu của việc, ghi chú việc, vuốt trái hiện nút Xoá đỏ trong dòng, nút "Xoá việc" trong chi tiết, chấm số 1–4 (việc cũ), lịch tháng, "Xoá việc đã xong", khu NICU/CT/KAN/PS-PM/Ngoại Trú/DV/HP/HS | Việc |
| phòng, bé, mã giường, "Lấy danh sách hôm qua", việc cần làm của bé (vuốt trái hiện nút Xoá đỏ; chưa có chạm 2 lần), đã khám, xoá bé | Khám |
| tuần tuổi, ngày tuổi, tuổi thai hiệu chỉnh, 34w6d, ngày sinh 0810, tổng hợp y lệnh, sao chép | Tính tuần tuổi, tổng hợp y lệnh |
| đám mây, chấm đỏ, OneDrive, file JSON, nhập/xuất, đổi máy, mất dữ liệu, bảng "Sao lưu và cài đặt", nút gạt Sáng / Tối / Theo máy | Sao lưu, gộp dữ liệu (phần Giao diện: Khung chung) |
| Sáng / Tối / Theo máy (không còn nút sáng/tối trên đầu trang), cỡ chữ, màu nhãn, đầu trang 3 nút, chip khu nhạt, dòng nhắc "Chạm 2 lần: chi tiết", thanh kéo của bảng dưới, tiêu đề, tab Việc/Khám, giao diện PC/iPhone, icon app | Khung chung |
| viết tắt, gõ /, gõ "/kmdm" rồi dấu cách, gợi ý khi gõ /, "Đã thay", Hoàn tác, thư viện viết tắt, nút "/a", thêm/sửa/xoá chữ tắt | Viết tắt |

## 4. Dây nối — sửa chỗ này phải xem cả chỗ kia

- Thêm ô thông tin mới cho bé → `src/lib/actions.js` (addPatient, copyPatientsFrom) + `src/components/Exam.jsx` (PatientDetail)
  + `src/lib/clinical.js` (buildSummary nếu cần in ra). Không cần đổi `db.js` nếu ô đó không dùng để tìm/lọc.
- Thêm cột cần tìm/lọc hoặc bảng mới → `src/db.js` (thêm khối `db.version(n+1)`, đừng sửa khối cũ; ví dụ: bảng `abbrevs` ở `db.version(2)`) + `DATA_TABLES` + `src/lib/backup.js` + bài kiểm tra gộp. Là **việc lớn**, cần bác sĩ duyệt phiếu.
- Thêm ô gõ chữ mới (input/textarea) → phải dùng `useVietTat` trong `src/components/VietTat.jsx` để có viết tắt; dải `strip` đặt NGOÀI thẻ `label` bọc ô. Xem `doi-agent/the-tinh-nang/viet-tat.md`.
- Đổi cách tính tuổi thai/ngày tuổi → chạy lại `doi-agent/ca-chuan-lam-sang.md` và `tests/clinical.test.js`; kiểm cả `buildSummary` (in tuổi hiệu chỉnh).
- Đổi nhãn loại việc (NV/BM/CK/HC/XN) → `src/lib/viec.js` (TAGS) + `src/components/ui.jsx` (TagDot, mauNhan) + `src/components/Tasks.jsx` (TagBtns, nút chọn nhãn) + `src/App.css` (biến màu nhãn mới `--tNV`/`--tNVi`… cho cả `.th` và `.th.dark`, bảng 16a). Từ v9.1 màu nhãn KHÔNG còn lấy từ `--p1…--p5`; `TAG_COLOR` trong `src/lib/viec.js` còn giữ (có bài kiểm) nhưng giao diện không dùng. `--p1…--p5` giữ cho số ưu tiên của việc cũ, chấm đỏ đám mây, cảnh báo, nút xoá. Việc cũ (không có `tags`) vẫn dùng mức 1–5: `src/components/ui.jsx` (PRI_NAME, PRI_LEVELS, PriDot) + `src/lib/actions.js` (cycleUrgency); NV cũ màu tím (--p5), NV mới màu đỏ phấn (--tNV) — đúng yêu cầu, không gộp.
- Đổi khu vực → `src/db.js` (ZONES cho việc mới, LEGACY_ZONES cho khu cũ như BM) + `src/lib/viec.js` (khuHienThi: khu cũ chỉ hiện khi còn việc chưa xoá).
- Xoá kiểu C (vuốt trái: thẻ đứng yên, viền đỏ, nút "Xoá" thay phần cuối dòng; PC rê chuột hiện nút) dùng chung `SwipeRow` trong `src/components/ui.jsx` cho Việc, việc của bé và thư viện viết tắt; sửa chỗ này phải xem cả `src/components/Tasks.jsx`, `src/components/Exam.jsx`, `src/components/ThuVien.jsx` và `src/App.css`. Phần cuối dòng muốn bị thay bằng nút thì gắn class `swipe-tail`.
- Chi tiết việc (chạm 2 lần): `TaskDetail` trong `src/components/Tasks.jsx` (đặt ở `TaskGroups`) ghi qua `setTaskText`, `setTaskZone`, `setTaskTags`, `setTaskNote`, `removeTask` (`src/lib/actions.js`); tên rỗng lọc bằng `chuanTenViec`, ô chọn khu dùng `khuDeChon` (`src/lib/viec.js`); khung là `Sheet` (`className="sheet-half"`) co theo bàn phím iPhone qua visualViewport.
- Đổi cỡ chữ iPhone → `src/App.css` khối "thang chữ gọn"; từ v9.1 là thang 5 bậc 20/17/15/13/12 (bỏ 12,5/13,5/14/18), PC giữ cỡ cũ; ô nhập phải ≥16px; vùng chạm ≥44px.
- Chế độ giao diện Sáng/Tối/Theo máy → `src/lib/cai-dat.js` (hàm thuần: docCheDo, laToi) + `src/hooks.js` (useGiaoDien: đọc/ghi localStorage khoá `theme` = light|dark|auto, đặt class `dark` lên `<html>`) + nút gạt trong `src/components/BackupPanel.jsx` (nhận `cheDo`, `onDoiCheDo` từ `src/App.jsx`). Không lưu vào CSDL, không sao lưu.
- Dòng nhắc cử chỉ ở tab Việc → `hienDongNhac` (`src/lib/cai-dat.js`) + `useLanMoApp` (`src/hooks.js`, đếm theo lần tải trang, localStorage khoá `soLanMo`) + `src/App.jsx`. Đổi chữ cử chỉ khi làm đợt 9.2.
- Màu trạng thái mới (tích xong, nền vuốt, nút xoá dịu, dải ngày trước, khoảng ngày…) đã khai báo sẵn trong `src/App.css` (`--okBg`, `--swR`, `--delInk`, `--noteBg`, `--rangeBg`, `--chipZero`…) nhưng chưa áp vào giao diện nào ngoài chip khu trống; các đợt sau mới dùng.
- Thêm bé / chép bé phải gán `order` qua `orderTiepTheo`/`sapBe` (`src/lib/thu-tu.js`); danh sách hiển thị sắp bằng `sapBe` trong `src/hooks.js`.
- Mọi thao tác ghi dữ liệu → qua `src/lib/actions.js` → `addRow/updateRow/softDelete` trong `src/db.js` (để có updatedAt cho gộp sao lưu).

## 5. Bài kiểm tra bảo vệ tính năng nào

| File kiểm tra | Bảo vệ |
|---|---|
| `tests/clinical.test.js` | đọc tuổi thai, ngày sinh, tính tuổi, tổng hợp y lệnh, 6 ví dụ đã thống nhất |
| `tests/ca-chuan.test.js` | bộ ca chuẩn lâm sàng trong `doi-agent/ca-chuan-lam-sang.md` (bác sĩ tự thêm ca được) |
| `tests/merge.test.js` | gộp sao lưu, định dạng file, tên file |
| `tests/luat.test.js` | luật cứng: không họ tên, không đổi CSDL, ô nhập ≥16px, màn hình không ghi thẳng CSDL, không thêm thư viện lạ, không hiện "đến 40w"; v9.1: chế độ giao diện + dòng nhắc, `cai-dat.js` thuần, màu nhãn mới (sáng/tối, tương phản), màu trạng thái, đầu trang 3 nút, thang chữ iPhone 5 bậc |
| `tests/ban-do.test.js` | bản đồ khớp với mã thật |
| `tests/viec.test.js` | nhãn việc, sắp xếp việc, khu hiển thị, đếm chạm |
| `tests/viet-tat.test.js` | thay chữ '/key ', gợi ý, chèn gợi ý, hoàn tác, bộ mẫu 13 mục |
| `tests/thu-tu.test.js` | thứ tự bé trong ngày khám (order, createdAt, id; bé cũ; bé thêm tay) |
| `scripts/chup-giao-dien.mjs` | (chạy trong môi trường Claude) ảnh iPhone 15 + PC, đo vùng chạm, cỡ chữ ô nhập, thử "Lấy danh sách hôm qua" |
| `scripts/kiem-pham-vi.mjs` | agent chỉ sửa đúng file ghi trong phiếu việc |

## 6. Trạng thái hiện tại

- Phiên bản: **v9.1** (đợt 1/6 của v9: token, đầu trang 3 nút, bảng "Sao lưu và cài đặt").
- Lần sửa gần nhất: 05/11/2026 — v9.1: màu nhãn mới (bảng 16a) qua biến `--tNV`…; thang chữ iPhone 5 bậc; tab, chip, nút đầu trang cao 44px, chip khu trống chữ nhạt không ghi số 0; đầu trang iPhone còn /a, đám mây, lịch (bỏ nút sáng/tối); bảng "Sao lưu và cài đặt" có Sáng / Tối / Theo máy; dòng nhắc cử chỉ chỉ 3 lần mở đầu hoặc khi danh sách trống; bảng dưới có thanh kéo, tiêu đề 17px; khai báo sẵn màu trạng thái (chưa dùng). Trước đó 29/10/2026 — v8.5: "Xoá việc" trong chi tiết việc dùng DongBtn (bảng trượt xuống rồi mới xoá); khi bảng đang đóng, nền vẫn hứng cú chạm (`.sheet-wrap.out .sheet{pointer-events:none}`). Trước đó (v8.4): vuốt xoá bám theo ngón tay (biến CSS `--p` trên dòng, không render lại danh sách; nút lộ dần từ phải sang trái, nhãn mờ dần; thả quá nửa thì mở); nút xoá chỉ biểu tượng thùng rác viền đỏ, không nền (`--p1`, `--p1rgb`), cảm ứng xoá ở `pointerup`; dòng thu gọn 260ms rồi mới xoá; mọi Sheet có chuyển động mở/đóng (nền mờ dần, bảng trượt lên; đóng xong mới gỡ); tôn trọng prefers-reduced-motion. Trước đó (v8.3): mọi bảng dưới (Sheet) vẽ thẳng vào `<body>` bằng createPortal để không bị phần đầu/thanh thêm việc che trên Safari iPhone; bảng điện thoại mang class `sheet-ph` để giữ cỡ chữ gọn; ô tên việc trong chi tiết việc xuống tối đa 3 dòng. Trước đó (v8.2): vuốt trái thì thẻ đứng yên, viền đỏ, nút "Xoá" đỏ hiện trong dòng (Việc, việc của bé, thư viện viết tắt; PC rê chuột hiện nút); chạm 2 lần vào việc mở bảng "chi tiết việc" cao ~50% (sửa tên, khu, nhãn, ghi chú, xoá); bỏ chạm 3 lần, bảng nhãn riêng, bảng ghi chú cũ, vòng nét đứt. Trước đó (v8.1): viết tắt, bảng `abbrevs` ở `db.version(2)`.
- Việc tiếp theo: **đợt 9.2** (cử chỉ mới: bỏ ô tick, vuốt phải 1/3 xong, vuốt trái 1/3 xoá + Hoàn tác, tích xanh, `doneAt`). Bác sĩ đã duyệt ảnh 9.1 (05/11/2026). Phiếu `doi-agent/phieu-viec/2026-11-05-v9-2-cu-chi-moi.json` **phải được bác sĩ duyệt trước khi sửa mã** (9.2 là việc lớn). Các đợt 9.3–9.6 theo kế hoạch sau đó. Thiết kế v9: đặc tả `doi-agent/thiet-ke-v9/THIET_KE_V9.md`, kế hoạch `doi-agent/phieu-viec/2026-11-05-v9-ke-hoach.json` (6 đợt 9.1–9.6), bản sao canvas `doi-agent/thiet-ke-v9/canvas/`. Đặc tả v9 thắng các quyết định cũ ghi ở mục 9 của nó.
- Việc còn chờ bác sĩ quyết: xem mục "Chờ duyệt" trong `doi-agent/NHAT_KY.md`.
