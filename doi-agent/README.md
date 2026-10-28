# Đội agent — hướng dẫn cho bác sĩ

## Mỗi lần muốn nâng cấp app
Mở cuộc trò chuyện mới với Claude và gõ:

> Đọc `doi-agent/BAN_DO.md` trong kho QH168/neonantal-note và làm theo `doi-agent/agents/dieu-phoi.md`.
> Yêu cầu: [mô tả bằng lời thường, kèm ảnh chụp màn hình nếu có].

Không cần dán bản tóm tắt dài nữa.

## Điều sẽ xảy ra
1. Điều phối viết **phiếu việc** (khu vực, file được sửa, tiêu chí đạt).
   Việc lớn (thêm loại thông tin cho bé, đổi cơ sở dữ liệu, đổi cách tính lâm sàng, thêm thư viện) → gửi bạn duyệt trước.
2. Agent chuyên trách sửa đúng các file trong phiếu.
3. Agent Kiểm thử (độc lập) chạy toàn bộ kiểm tra, chụp ảnh iPhone/PC. Lỗi → trả về sửa, tối đa 2 vòng.
4. Agent Ghi chép cập nhật bản đồ, nhật ký, đóng zip.
5. Bạn tải zip lên GitHub như mọi lần.

## Thư mục này có gì
| File | Dùng để |
|---|---|
| `BAN_DO.md` | mục lục: tính năng nào nằm ở đâu, ai phụ trách |
| `the-tinh-nang/` | thẻ chi tiết từng khu vực |
| `agents/` | bản mô tả nhiệm vụ 6 agent |
| `QUYET_DINH_DA_CHOT.md` | những điều đã chốt, agent không được tự đổi |
| `ca-chuan-lam-sang.md` | bộ ca chuẩn tính tuổi — **bạn tự thêm ca được** ngay trên GitHub |
| `phieu-viec/` | phiếu việc của từng lần nâng cấp |
| `NHAT_KY.md` | nhật ký thay đổi và việc chờ bạn quyết |
| `anh-chuan/` | ảnh màn hình chuẩn để so sau mỗi lần sửa |

Thư mục này chỉ để agent đọc; không ảnh hưởng tới app trên iPhone.
