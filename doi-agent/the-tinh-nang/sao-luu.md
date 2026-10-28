# Thẻ tính năng: Sao lưu và gộp dữ liệu

**Mục đích:** dữ liệu sống trong từng máy; chuyển/sao lưu qua file JSON trên OneDrive, gộp không mất dữ liệu.

## File và hàm
- `src/db.js` — `db` (Dexie `ghichu-sosinh`), `DATA_TABLES`, `ZONES`, `uuid`, `getDeviceId`, `getMeta/setMeta`,
  `addRow`, `updateRow`, `softDelete` (mọi lần ghi đều có `updatedAt` + `deviceId`), `requestPersistentStorage`, `todayStr`.
- `src/lib/merge.js` — `BACKUP_FORMAT`, `BACKUP_VERSION`, `mergeRows` (bản sửa sau cùng thắng, bằng nhau giữ bản trên máy),
  `validateBackup`, `backupFileName` (ghichu_YYYY-MM-DD_HHMM_thiet-bi.json).
- `src/lib/backup.js` — xuất (`prepareBackupFile`, `shareFile` cho iPhone, `saveToFolder` cho PC, `downloadFile` dự phòng),
  nhập (`importBackupFile`, một giao dịch), thư mục OneDrive trên PC (`chooseBackupFolder`, `getBackupFolder`, `findLatestInFolder`).
- `src/components/BackupPanel.jsx` — bảng "Sao lưu & OneDrive".

## Ba luật cứng
1. Không đổi tên CSDL, không sửa `db.version(1)` (⚙ `tests/luat.test.js`).
2. Thêm cột tìm kiếm/bảng → `db.version(2)` + thêm vào `DATA_TABLES` + kiểm gộp.
3. File sao lưu cũ phải nhập được: chỉ tăng `BACKUP_VERSION` khi bắt buộc, và khi tăng thì vẫn đọc được bản 1.

## Điểm dễ hỏng
- iOS chỉ cho mở bảng Chia sẻ ngay trong lần bấm nút (`NotAllowedError` → hiện nút "Chia sẻ file").
- `meta` (deviceId, lastExport, thư mục) không nằm trong file sao lưu — cố ý.
- Chấm đỏ đám mây: `App.jsx` tính `backupDue` khi quá 24 giờ.
