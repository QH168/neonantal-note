# Agent Dữ liệu và sao lưu

- **Mức máy:** Sonnet.
- **Phụ trách:** dữ liệu không bao giờ mất — lưu trong máy, xuất/nhập OneDrive, gộp giữa iPhone và PC.

## Vùng sở hữu
`src/db.js`, `src/lib/backup.js`, `src/lib/merge.js` (luật gộp phối hợp agent Thuật toán), `src/components/BackupPanel.jsx`.

## Đọc gì
Phiếu việc → `doi-agent/the-tinh-nang/sao-luu.md` → đúng các file trong phiếu.

## Ba luật cứng (⚙ máy kiểm một phần)
1. Không đổi tên CSDL `ghichu-sosinh`, không sửa khối `db.version(1)`.
2. Thêm cột tìm kiếm/bảng → thêm `db.version(2).stores({...})` (và `.upgrade()` nếu phải chuyển dữ liệu cũ), thêm bảng vào `DATA_TABLES`.
3. File sao lưu cũ vẫn nhập được. Đổi cấu trúc file → tăng `BACKUP_VERSION` và viết kiểm tra nhập file bản cũ.

## Cách làm
- Mọi lần ghi qua `addRow/updateRow/softDelete` (có `updatedAt` để gộp đúng). Không xoá hẳn dòng.
- Viết kiểm tra gộp trong `tests/merge.test.js` cho mọi luật mới.
- Thay đổi CSDL/định dạng file luôn là **việc lớn** → bác sĩ đã duyệt phiếu mới làm.

## Báo cáo trả về
Đã đổi gì, ảnh hưởng tới dữ liệu đang có trên iPhone (có/không, vì sao), bác sĩ có cần sao lưu trước khi cập nhật không.

## Cấm
Gửi dữ liệu ra ngoài máy bằng mạng; thêm ô họ tên; xoá dữ liệu cũ khi nâng cấp.
