# Bản mô tả thiết kế (design brief) — Ghi chú Sơ sinh

> Đọc tờ này **trước** mọi thay đổi giao diện. Skill `frontend-design` (trong `.claude/skills/`) cho nguyên tắc chung;
> tờ này là lời của bác sĩ nên **luôn thắng skill**. Thứ tự ưu tiên khi mâu thuẫn:
> `doi-agent/QUYET_DINH_DA_CHOT.md` → tờ này → skill frontend-design.

## 1. Sản phẩm, người dùng, bối cảnh

- **Là gì:** sổ tay điện tử cá nhân của bác sĩ khoa Sơ sinh: danh sách việc theo khu (Việc) và danh sách bé đi buồng (Khám).
- **Ai dùng:** bác sĩ, không phải dân công nghệ. Gõ tắt, thuật ngữ y khoa Việt quen thuộc (khí máu, CRP, tuổi thai hiệu chỉnh).
- **Dùng ở đâu:** chủ yếu **iPhone 15, một tay**, vừa đi vừa xem, xen giữa các lần khám; đôi khi tay đeo găng, ánh sáng phòng NICU dịu,
  ca đêm dùng **chế độ tối**. PC ở phòng bác sĩ để soạn và tổng hợp.
- **Việc chính của giao diện (theo thứ tự):**
  1. Nhìn 2 giây là biết **còn gì chưa làm, ở khu/phòng nào**.
  2. Tick xong **một chạm**, không cần ngắm.
  3. Ghi thêm việc/bé **nhanh**, ít bước.

## 2. Tính cách

**"Tờ y lệnh gọn gàng"** — điềm tĩnh, chính xác, đáng tin. Giống một bảng theo dõi bệnh nhân được thiết kế tốt, không giống app mạng xã hội hay trang bán hàng.

- Điều duy nhất được "nổi bật": **trạng thái** (việc chưa xong, nhãn loại việc, chấm cảnh báo). Mọi thứ xung quanh yên lặng.
- Không phá cách vì thẩm mỹ. Khi lưỡng lự giữa "đẹp hơn" và "đọc nhanh hơn" → chọn đọc nhanh hơn.

## 3. Giữ nguyên (đã duyệt — không tự đổi)

- **Màu**: dùng đúng biến trong `src/App.css` (`.th` sáng, `.th.dark` tối). Không viết mã màu cứng trong component.
  - Chủ đạo xanh da trời `--accent` #0B79B8 (tối #5BB8EE); nền #F2F7FB (tối #0E151C); bề mặt thẻ trắng (tối #17212B); chữ #12202B.
  - Màu nhãn có nghĩa: NV đỏ `--p1`, BM vàng `--p2`, CK xanh lá `--p3`, HC xanh đậm `--p4`, XN tím `--p5`.
  - **Đỏ chỉ dùng cho khẩn/cảnh báo/xoá.** Không dùng đỏ để trang trí.
- **Phông**: Be Vietnam Pro (một họ chữ duy nhất, đọc tốt dấu tiếng Việt). Không thêm phông khác.
- **Cỡ chữ iPhone**: tiêu đề 20px, nội dung việc và mã giường 15px, chữ phụ 12–13px, **ô nhập ≥16px** (Safari không phóng to).
- **Vùng chạm ≥44px** cho mọi nút, ô tick, nút biểu tượng.
- **Chế độ tối** cho mọi màu mới. Tiêu đề luôn **một dòng**.
- Chuỗi số liệu nối bằng dấu chấm giữa như `25w0d · 1850 g` là **cách ghi lâm sàng đã duyệt**, giữ nguyên (skill coi đây là "dấu hiệu AI" — ở app này thì không).
- Chữ viết tắt nhãn viết hoa (NV, BM, CK, HC, XN, NICU) là **tên riêng**, giữ nguyên.

## 4. Cấm

- Gradient trang trí, bóng đổ đậm, hiệu ứng kính mờ, viền phát sáng.
- Emoji trong giao diện.
- Chuyển động tự chạy (khi mở trang, khi cuộn). Chỉ cho phép chuyển động **đáp lại thao tác** (mở/đóng bảng, vuốt xoá, tick) và phải tôn trọng `prefers-reduced-motion`.
- Thêm thư viện giao diện/npm khi phiếu việc chưa cho phép.
- Ô họ tên bệnh nhân hoặc bất kỳ thông tin nhận dạng thật nào. Chỉ mã/số giường.
- Chữ máy tính khó hiểu ("đồng bộ cơ sở dữ liệu", "submit", "error 500").

## 5. Câu chữ

- Tiếng Việt đơn giản, câu ngắn, viết như bác sĩ nói với nhau.
- Nút ghi rõ việc sẽ xảy ra: "Thêm việc", "Xoá việc", "Lấy danh sách hôm qua" — không "OK", "Xác nhận".
- Một hành động giữ một tên xuyên suốt (nút "Xoá" → thông báo "Đã xoá").
- Báo lỗi: nói cái gì sai và cách sửa; không xin lỗi, không mơ hồ. Màn hình trống: gợi ý việc nên làm tiếp.

## 6. Bảng chấm ảnh (dùng trong vòng "chụp → nhìn → sửa")

Mỗi ảnh chụp iPhone (sáng và tối) chấm 8 mục. Mục nào **Không** thì ghi lý do và sửa.

| # | Câu hỏi | Đạt khi |
|---|---|---|
| 1 | Nhìn 2 giây có thấy ngay việc/bé chưa xong? | Việc chưa xong nổi hơn việc đã xong; số đếm rõ |
| 2 | Thứ bậc rõ ràng? | Tiêu đề > tên việc/mã giường > chữ phụ; không có hai thứ cùng "hét" |
| 3 | Khoảng cách đều, thẳng hàng? | Lề trái thẳng một đường; khoảng cách giữa các thẻ bằng nhau |
| 4 | Chạm được bằng ngón cái? | Nút ≥44px, không có hai nút sát nhau dễ chạm nhầm; nút hay dùng nằm nửa dưới màn hình |
| 5 | Đọc được trong phòng tối/sáng? | Chữ trên nền đủ tương phản (≥4.5:1 chữ thường); bản tối không có mảng sáng chói |
| 6 | Không có gì bị cắt, đè, tràn? | Không chữ bị cắt giữa chừng, không phần tử đè nhau, không cuộn ngang |
| 7 | Màu có nghĩa? | Màu nào cũng mang một ý (trạng thái/nhãn); đỏ chỉ ở chỗ khẩn hoặc xoá |
| 8 | Có gì thừa không? | Bỏ thử một chi tiết trang trí — nếu không mất thông tin thì bỏ hẳn |

## 7. Ảnh tham chiếu

- Ảnh đã duyệt: `doi-agent/anh-chuan/` (iPhone sáng/tối, PC). Thay đổi giao diện phải so với bộ này.
- Bản thiết kế gốc: canvas "Ghi chú công việc theo khu vực", bảng "iPhone 15 – chữ gọn".
