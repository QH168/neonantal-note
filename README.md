# Ghi chú Sơ sinh – Phương án B (React + lưu trên máy + sao lưu OneDrive bằng file)

App chạy hoàn toàn trên trình duyệt (iPhone và PC), dữ liệu nằm trong IndexedDB của từng máy.
OneDrive chỉ chứa các **file sao lưu JSON** do bạn xuất ra. Không có máy chủ nào giữ dữ liệu bệnh nhân.

```
src/
  db.js                  Cơ sở dữ liệu trên máy (Dexie): bảng, addRow/updateRow/softDelete
  lib/merge.js           Gộp dữ liệu khi nhập file ("bản sửa sau cùng thắng"), kiểm tra file
  lib/backup.js          Xuất (Chia sẻ iPhone / ghi thư mục OneDrive trên PC / tải về), nhập
  components/TaskDemo.jsx    Mục Việc rút gọn – mẫu cách nối giao diện với IndexedDB
  components/BackupPanel.jsx Màn hình Sao lưu
tests/merge.test.js      Kiểm thử logic gộp
.github/workflows/deploy.yml  Tự build và đưa lên GitHub Pages
```

## Bước 0 – Cài công cụ (một lần, trên PC)
1. Cài **Node.js LTS** (nodejs.org) → mở Terminal/PowerShell, gõ `node -v` thấy số phiên bản là được.
2. Cài **VS Code** để sửa mã; cài **Git** và tạo tài khoản **GitHub** (để đưa app lên mạng có HTTPS).
3. Cài app **OneDrive** trên iPhone (đăng nhập), và OneDrive trên PC (thường có sẵn trên Windows).
4. Tạo thư mục `GhiChuSoSinh` trong OneDrive.

## Bước 1 – Chạy thử trên PC
```bash
cd ghichu-sosinh
npm install        # tải thư viện, tạo package-lock.json
npm test           # kiểm thử logic gộp (5 bài phải "pass")
npm run dev        # mở http://localhost:5173
```
Thử: thêm vài việc → tải lại trang → việc vẫn còn (đã lưu trong IndexedDB).
Trên Chrome/Edge: tab **Sao lưu** → **Chọn thư mục OneDrive** → chọn `OneDrive\GhiChuSoSinh` → **Xuất sao lưu**.

## Bước 2 – Đưa lên mạng (bắt buộc để dùng trên iPhone)
iPhone chỉ cho cài PWA, dùng bảng Chia sẻ file và `crypto.randomUUID` khi trang chạy qua **HTTPS**.
1. Tạo repo mới trên GitHub, ví dụ `ghichu-sosinh` (có thể để Private nếu tài khoản cho phép Pages với repo private; không thì Public – mã nguồn không chứa dữ liệu bệnh nhân).
2. Trong thư mục dự án:
   ```bash
   git init && git add . && git commit -m "Phiên bản đầu"
   git branch -M main
   git remote add origin https://github.com/<tên-bạn>/ghichu-sosinh.git
   git push -u origin main
   ```
3. Trên GitHub: **Settings → Pages → Source: GitHub Actions**. Mỗi lần `git push`, workflow tự build và đăng tại
   `https://<tên-bạn>.github.io/ghichu-sosinh/`.

## Bước 3 – Cài lên iPhone
Mở link trên bằng **Safari** → nút Chia sẻ → **Thêm vào MH chính** → luôn mở app từ icon này.
(Mở trong tab Safari thường, iOS có thể xoá dữ liệu nếu 7 ngày không dùng; bản trên Màn hình chính không bị.)

## Bước 4 – Quy trình hằng ngày
| Việc | iPhone | PC |
|---|---|---|
| Sao lưu | Sao lưu → **Xuất sao lưu** → bảng Chia sẻ → OneDrive → `GhiChuSoSinh` | **Xuất sao lưu** → ghi thẳng vào thư mục OneDrive |
| Lấy dữ liệu máy kia | **Nhập từ file…** → Duyệt → OneDrive → chọn file mới nhất của PC | **Lấy bản mới nhất từ iPhone** (tự tìm file `_iphone.json` mới nhất) |
| Khôi phục khi đổi máy | Cài app → Nhập file sao lưu mới nhất | như trên |

Gộp theo từng dòng: dòng nào sửa sau thì giữ bản đó; dòng đã xoá được đánh dấu `deleted` nên không "sống lại".
Nhập cùng một file nhiều lần không sao (lần sau chỉ "giữ nguyên").

## Bước 5 – Ghép vào prototype của bạn
1. Chép các component của prototype vào `src/components/`.
2. Ở chỗ đang giữ dữ liệu bằng `useState([...])`, thay bằng `useLiveQuery(() => db.<bảng>...)` (xem `TaskDemo.jsx`).
3. Mọi thao tác thêm/sửa/xoá gọi `addRow`, `updateRow`, `softDelete` – **không** ghi thẳng `db.table.put`, để luôn có `updatedAt`.
4. Mục Khám: `rooms`, `exam_patients` (lọc theo `examDate`, `roomId`), `patient_todos` (theo `patientId`). Tuổi thai lưu bằng số ngày (346 → 34×7+6 = 244).
5. Thêm cột/bảng mới sau này: viết thêm `db.version(2).stores({...})` trong `db.js`, không sửa version(1).

## Lưu ý
- Thử trên iPhone qua `npm run dev` (http://IP-máy:5173) được giao diện, nhưng Chia sẻ file và cài PWA chỉ chạy trên bản HTTPS ở Bước 2.
- File sao lưu chưa mã hoá. Không ghi họ tên bé; hỏi đơn vị về việc lưu trên OneDrive cá nhân. Mã hoá bằng mật khẩu và đồng bộ tự động là bước nâng cấp lên phương án A.
- Dữ liệu chữ rất nhẹ (vài MB/năm), một file sao lưu toàn bộ vẫn nhỏ. Có thể xoá bớt file cũ trong OneDrive, giữ khoảng 30 bản gần nhất.
