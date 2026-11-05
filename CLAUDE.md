# Ghi chú Sơ sinh — hướng dẫn cho Claude

App web (PWA) React + Vite cho bác sĩ khoa Sơ sinh. Người dùng là bác sĩ, **không** học công nghệ:
trả lời bằng tiếng Việt đơn giản, giải thích từng bước, không dùng thuật ngữ máy tính khi không cần.

## Đọc trước khi làm

1. `doi-agent/BAN_DO.md` — bản đồ dự án (luôn đọc; không đọc toàn bộ `src/`).
2. `doi-agent/QUYET_DINH_DA_CHOT.md` — điều đã chốt, không tự đổi.
3. **Mọi việc đụng tới giao diện:** `doi-agent/THIET_KE.md` (design brief) + skill `frontend-design`.
   Brief luôn thắng skill khi hai bên khác nhau.
4. Quy trình đội agent: `doi-agent/agents/dieu-phoi.md`.

## Vòng "chụp → nhìn → sửa" (bắt buộc với việc giao diện)

Không báo "xong" một thay đổi giao diện khi chưa tự xem ảnh chụp. Dùng skill `sua-giao-dien`
(gõ `/sua-giao-dien` hoặc nói "chụp màn hình rồi tự sửa giao diện").
Tóm tắt: dựng app → `node scripts/chup-giao-dien.mjs <thư-mục-dựng>` → mở ảnh trong `anh-chup/` bằng Read →
chấm theo bảng mục 6 của `doi-agent/THIET_KE.md` → sửa → lặp tối đa 3 vòng → gửi ảnh trước/sau cho bác sĩ.

## Luật cứng

- Link app `https://qh168.github.io/neonantal-note/` giữ nguyên (đổi là mất dữ liệu trên máy bác sĩ).
- Không sửa `db.version(1)`; không thêm thư viện npm khi bác sĩ chưa duyệt.
- Chỉ mã/số giường, không có thông tin nhận dạng bệnh nhân thật, kể cả trong dữ liệu mẫu và ảnh chụp.
- Đẩy lên `main` là tự triển khai: chỉ đẩy khi `npm test` đạt.
- Không lưu ảnh chuẩn mới (`--luu-chuan`) khi bác sĩ chưa duyệt giao diện.
