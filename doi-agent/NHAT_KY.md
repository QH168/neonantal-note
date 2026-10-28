# Nhật ký thay đổi

> Mục mới nhất ở trên cùng. Agent Ghi chép thêm một mục sau mỗi lần nâng cấp.

## Chờ duyệt (bác sĩ quyết, rồi giao phiếu việc)

| # | Phát hiện | Mức | Đề xuất | Agent |
|---|---|---|---|---|
| 1 | "Lấy danh sách hôm qua" có thể **xáo thứ tự bé** trong phòng (lần thử: hôm qua G01, G03 → hôm nay G03, G01; lần khác lại đúng — tức là ngẫu nhiên). Nguyên nhân: `copyPatientsFrom` chép theo thứ tự mã id ngẫu nhiên, và các bé chép cùng lúc có cùng giờ tạo nên màn hình không phân biệt được thứ tự. | Vừa | Chép theo thứ tự nhập của hôm qua và lưu số thứ tự rõ ràng; thêm kiểm tra. Cho tới khi sửa, ảnh chụp mục Khám có thể báo "CẦN XEM" vì thứ tự đổi giữa các lần chạy. | Thuật toán |
| 2 | Khung "Tổng hợp y lệnh" chữ 15px → trên iPhone, chạm vào để sửa thì Safari **tự phóng to**. | Nhỏ | Đặt 16px cho khung này. Sửa xong bỏ `.mono` khỏi danh sách "ĐÃ BIẾT" trong `tests/luat.test.js`. | Giao diện |
| 3 | `src/components/TaskDemo.jsx` là file minh hoạ cũ, app không dùng, lại ghi thẳng vào CSDL. | Nhỏ | Xoá file (trên GitHub: mở file → thùng rác → Commit), bỏ khỏi bản đồ và danh sách "ĐÃ BIẾT". | Ghi chép |
| 4 | Nút "Khám: còn x việc" cao 40px (dưới 44px). | Lưu ý | Tăng lên 44px nếu bác sĩ thấy khó bấm. | Giao diện |
| 5 | Luật sắp xếp việc (`byPri`) nằm trong file giao diện nên chưa có kiểm tra tự động. | Lưu ý | Chuyển sang `src/lib/` + thêm kiểm tra khi có lần sửa liên quan. | Thuật toán |

## 28/10/2026 — v7.1 — Dựng đội agent và harness
- Phiếu: `doi-agent/phieu-viec/2026-10-28-dung-doi-agent.json` (bác sĩ đã duyệt kế hoạch).
- **App trên iPhone không đổi** (không file nào trong `src/` bị sửa).
- Thêm hồ sơ `doi-agent/`: bản đồ, 5 thẻ tính năng, 6 agent, quyết định đã chốt, bộ ca chuẩn lâm sàng (14 ca), mẫu phiếu việc, 9 ảnh chuẩn.
- Thêm harness:
  - `tests/luat.test.js` — 9 luật cứng kiểm bằng máy.
  - `tests/ban-do.test.js` — bản đồ khớp mã.
  - `tests/ca-chuan.test.js` — chạy bảng ca chuẩn lâm sàng.
  - `scripts/kiem-pham-vi.mjs` — chỉ sửa đúng file trong phiếu.
  - `scripts/dung-thu.mjs` — bản dựng thử khi không tải được npm.
  - `scripts/chup-giao-dien.mjs` — ảnh iPhone 15/PC sáng-tối, đo vùng chạm và ô nhập, thử "Lấy danh sách hôm qua", "Tính tuần tuổi", "Tổng hợp".
- `package.json`: lệnh `npm test` chạy thêm 3 file kiểm tra (không thêm thư viện).
- Kết quả kiểm: npm test 40/40 đạt; gài lỗi cố ý (15 kiểu, do Claude và agent Kiểm thử độc lập) → máy bắt được hết,
  trừ một kẽ hở ở luật 4 (câu import dùng nháy kép) — đã vá. Agent Kiểm thử độc lập báo ĐẠT; tự tính tay 6 ca chuẩn đều khớp.
- Bản dựng thật (`npm run build`) chưa chạy được trong môi trường Claude (mạng chặn npm) → sẽ chạy trên GitHub Actions.
