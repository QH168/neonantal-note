---
name: sua-giao-dien
description: Vòng tự sửa giao diện "chụp → nhìn → sửa" cho app Ghi chú Sơ sinh - dựng app, chụp màn hình iPhone/PC sáng-tối, tự chấm theo design brief, sửa và lặp tối đa 3 vòng, rồi gửi ảnh trước/sau cho bác sĩ. Dùng sau MỌI thay đổi giao diện, hoặc khi bác sĩ nói "chụp màn hình", "tự sửa giao diện", "nâng cấp UI", "giao diện trông chưa đẹp".
---

# Vòng "chụp → nhìn → sửa"

Mục tiêu: Claude không thiết kế "nhắm mắt". Mỗi thay đổi giao diện phải được nhìn bằng ảnh thật, chấm theo brief, rồi mới báo xong.

## 0. Chuẩn bị (một lần mỗi phiên)

- Đọc `doi-agent/THIET_KE.md` (brief + bảng chấm mục 6) và thẻ tính năng liên quan trong `doi-agent/the-tinh-nang/`.
- Nạp skill `frontend-design` nếu sắp đổi bố cục/màu/chữ. Brief thắng skill khi khác nhau.
- Ghi lại phạm vi: màn hình nào, file nào được sửa (theo phiếu việc nếu có).

## 1. Dựng app

Thử theo thứ tự, dùng cách đầu tiên chạy được:

1. `npm install` (nếu chưa có `node_modules`) rồi `npm run build` → thư mục `dist`.
2. Môi trường không tải được npm (như máy đám mây của Claude): bản dựng thử.
   ```bash
   # chỉ cần làm một lần: lấy Dexie từ GitHub
   mkdir -p /home/claude/vendor && cd /home/claude/vendor
   git clone -q --depth 1 -b releases https://github.com/dexie/Dexie.js dexie-rel
   git clone -q --depth 1 https://github.com/dexie/Dexie.js dexie-src
   cd -   # quay lại thư mục dự án
   NODE_MODULES_EXTRA=/opt/npm-tools/node_modules node scripts/dung-thu.mjs   # → dist-thu
   ```
   Nếu đường dẫn khác, xem biến môi trường ở đầu `scripts/dung-thu.mjs`.

## 2. Chụp "trước" (chỉ vòng đầu)

```bash
node scripts/chup-giao-dien.mjs <dist|dist-thu>
cp -r anh-chup /tmp/anh-truoc
```
Script dùng Playwright, khổ iPhone 15 (393×852) và PC, cả sáng và tối, ngày giả định cố định, dữ liệu mẫu giả.
Nó cũng đo lỗi cứng (ô nhập <16px, vùng chạm <44px, tiêu đề bị cắt, chức năng vuốt/viết tắt) và ghi vào `anh-chup/ket-qua.json`.

## 3. Sửa

- Chỉ sửa trong phạm vi đã ghi. Màu mới phải có cả `.th` và `.th.dark` trong `src/App.css`.
- Thay đổi nhỏ, từng bước; không viết lại cả màn hình khi chỉ cần chỉnh.

## 4. Chụp "sau" và tự chấm

1. Dựng lại (bước 1) rồi chạy lại `node scripts/chup-giao-dien.mjs <thư-mục-dựng>`.
2. Script báo `CÓ LỖI` (mã thoát 1) → sửa lỗi cứng trước, không chấm thẩm mỹ khi còn lỗi cứng.
3. **Mở ảnh bằng Read** — ít nhất bản iPhone sáng và tối của màn hình vừa đổi, thêm PC nếu đổi bố cục.
   Nhìn thật kỹ: chữ bị cắt, phần tử đè nhau, lề lệch, màu chói ở bản tối.
4. Chấm 8 mục trong bảng mục 6 của `doi-agent/THIET_KE.md`. Ghi ngắn: mục — Đạt/Không — lý do.
5. So với ảnh cùng tên trong `doi-agent/anh-chuan/` (nếu có) và với `/tmp/anh-truoc`: chỗ nào khác ngoài ý muốn là lỗi.

## 5. Lặp

- Còn mục **Không** → quay lại bước 3. Tối đa **3 vòng**.
- Vòng sau không tốt hơn vòng trước, hoặc cần đổi điều đã chốt → dừng, hỏi bác sĩ.

## 6. Báo bác sĩ

- `npm test` phải đạt (nếu chạy được trong môi trường).
- Gửi ảnh **trước/sau** (iPhone sáng + tối) bằng SendUserFile, kèm 2–4 câu lời thường: đã đổi gì, vì sao.
- Liệt kê mục chưa đạt hoặc cần bác sĩ thử trên iPhone thật (vuốt, bàn phím, phông thật).
- **Không** chạy `--luu-chuan` khi bác sĩ chưa nói "duyệt giao diện này".

## Lưu ý

- Ảnh trong môi trường Claude có thể dùng phông dự phòng thay Be Vietnam Pro → chữ hơi khác máy thật; đừng sửa vì khác biệt này.
- `anh-chup/`, `dist/`, `dist-thu/` không đưa lên GitHub (đã có trong `.gitignore`).
- Script chụp không chạy trên GitHub Actions (Actions không có Playwright).
