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
  2. Đánh dấu xong **một cú vuốt phải** (từ v9.2; trước đó là tick một chạm), không cần ngắm.
  3. Ghi thêm việc/bé **nhanh**, ít bước.

## 2. Tính cách

**"Tờ y lệnh gọn gàng"** — điềm tĩnh, chính xác, đáng tin. Giống một bảng theo dõi bệnh nhân được thiết kế tốt, không giống app mạng xã hội hay trang bán hàng.

- Điều duy nhất được "nổi bật": **trạng thái** (việc chưa xong, nhãn loại việc, chấm cảnh báo). Mọi thứ xung quanh yên lặng.
- Không phá cách vì thẩm mỹ. Khi lưỡng lự giữa "đẹp hơn" và "đọc nhanh hơn" → chọn đọc nhanh hơn.

## 3. Giữ nguyên (đã duyệt — không tự đổi)

- **Màu**: dùng đúng biến trong `src/App.css` (`.th` sáng, `.th.dark` tối). Không viết mã màu cứng trong component.
  - Chủ đạo xanh da trời `--accent` #0B79B8 (tối #5BB8EE); nền #F2F7FB (tối #0E151C); bề mặt thẻ trắng (tối #17212B); chữ #12202B.
  - Màu nhãn có nghĩa (từ v9.1, bảng 16a): nền nhạt `--tNV` + chữ đậm cùng tông `--tNVi` (và `--tBM`, `--tCK`, `--tHC`, `--tXN` tương tự): NV đỏ phấn, BM vàng nhạt, CK xanh lơ, HC xanh chàm nhạt, XN tím nhạt; có cả sáng và tối. `--p1…--p5` (đỏ, vàng, xanh lá, xanh đậm, tím) không đổi, chỉ còn cho số ưu tiên của việc cũ, chấm đỏ đám mây, cảnh báo, nút xoá.
  - Màu trạng thái của v9 đã khai báo trong `src/App.css`. **Đã áp dụng từ v9.2:** tích xong (`--okBg/--okInk`), nền vuốt (`--swR/--swR2` xanh nhạt, `--swL/--swL2` đỏ phấn), nút xoá dịu trên PC và chữ "Xoá việc" (`--delBg/--delInk`), nút trạng thái (`--doneLine/--doneInk`), thanh Hoàn tác (`--undoBg/--undoInk/--undoAct/--undoLine`, mới ở v9.2). **Chưa áp dụng** (đợt 9.4–9.6): ghi chú đêm qua, dải ngày trước, khoảng ngày (`--noteBg…`, `--rangeBg…`); đừng coi là đã có trên màn hình.
  - **Đỏ chỉ dùng cho khẩn/cảnh báo/xoá.** Không dùng đỏ để trang trí.
- **Phông**: Be Vietnam Pro (một họ chữ duy nhất, đọc tốt dấu tiếng Việt). Không thêm phông khác.
- **Cỡ chữ iPhone** (thang 5 bậc, từ v9.1): tiêu đề 20px; tên bảng dưới 17px; nội dung việc, mã giường, nút, chip 15px; chữ phụ 13px; ghi chú nhỏ 12px; **ô nhập ≥16px** (Safari không phóng to). Không dùng 12,5 / 13,5 / 14 / 18 trên iPhone. PC giữ cỡ cũ.
- **Cử chỉ trên dòng** (từ v9.2): vuốt phải qua 1/3 chiều rộng = xong, vuốt trái qua 1/3 = xoá (có thanh Hoàn tác 6 giây); chạm 2 lần = chi tiết. Dòng việc và việc của bé không còn ô tick (chữ sát lề trái 14px); việc xong không gạch ngang, chữ nhạt, tích xanh tròn 26px cuối dòng (chỉ hiển thị). Dòng bé ở tab Khám vẫn còn ô tick tới đợt 9.4. Nút thùng rác chỉ có trên PC khi rê chuột. Chi tiết việc cao ~76%, khu vực dạng chip. iPhone Safari không rung khi qua mốc, chỉ đổi màu nền.
- **Vùng chạm ≥44px** cho mọi nút, ô tick (dòng bé tab Khám), nút biểu tượng, nút Hoàn tác. Từ v9.1: tab Việc/Khám, chip khu vực và nút trên đầu trang cao đúng 44px; nút chọn nhãn 44px tròn; huy hiệu nhãn trong dòng tròn 26px, chữ 11px đậm, việc đã xong mờ ~0,5.
- **Đầu trang** (v9.1): iPhone có 3 nút tròn 44px theo thứ tự "/a", đám mây, lịch (lịch chỉ tab Việc); PC có "/a" và đám mây. Không có nút sáng/tối: Sáng / Tối / Theo máy nằm trong bảng "Sao lưu và cài đặt" (mở bằng nút đám mây). Không có chữ "MỚI".
- **Chip khu vực**: chỉ chip đang chọn có nền xanh; khu không có việc chữ và viền nhạt, không ghi số 0 (chữ nhạt `--chipZero` hiện chưa đạt 4,5:1 — chờ bác sĩ quyết, xem "Chờ duyệt" trong `NHAT_KY.md`).
- **Bảng dưới (Sheet) trên điện thoại**: có thanh kéo nhỏ ở đỉnh (chỉ trang trí, chưa kéo được), tiêu đề 17px, nút đóng 44px. Bảng có thể mở chồng lên bảng khác (chi tiết việc của bé trên chi tiết bé); Esc chỉ đóng bảng trên cùng.
- **Thanh Hoàn tác** (v9.2): thanh tối cao ≥52px ở đáy màn hình, nổi trên bảng dưới, nút "Hoàn tác" 44px; 6 giây rồi tự mất. Từ v9.3 trên tab Việc iPhone thanh nằm ngay TRÊN thanh thêm việc (không che ô gõ, nút "+", chip, nhãn) và theo bàn phím iPhone; trong chi tiết bé vẫn che "Hoàn tất khám" trong 6 giây (xem lại ở đợt 9.4). Thanh "Đã đổi /key thành …" + Hoàn tác của viết tắt cũng giữ 6 giây, cùng kiểu màu `--undo*`, nằm ngay trên ô gõ.
- **Ô thêm việc iPhone** (v9.3, bảng 15a, 15b): thu gọn là một dòng, ô tròn "Ghi việc cần làm…" + nút tròn "+" 44px; chạm vào ô thì bung hàng chip khu vực và hàng 5 nút nhãn ngay trên bàn phím; rời ô mà ô trống thì thu lại, nhãn về trống, khu về theo chip lọc. **Gợi ý viết tắt** (bảng 5) là hàng chip 44px ngay trên ô gõ; **thư viện** (bảng 6) không còn bút chì, chạm 2 lần vào dòng để sửa. Không hiện dòng chú thích nhỏ dưới hàng nhãn và dưới ô gõ ở bảng 15b và 5 (chỗ trên bàn phím chật), đã báo bác sĩ.
- **Chế độ tối** cho mọi màu mới (người dùng chọn Sáng / Tối / Theo máy). Tiêu đề luôn **một dòng**.
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

- Ảnh đã duyệt: `doi-agent/anh-chuan/` (iPhone sáng/tối, PC). Thay đổi giao diện phải so với bộ này. Bộ này đã lưu lại cho v9.1 và v9.2 (bác sĩ duyệt 05/11 và 06/11/2026). Ảnh 9.3 chưa lưu chuẩn: chờ bác sĩ duyệt ảnh 9.3 rồi mới lưu.
- Thiết kế v9 đã duyệt 05/11/2026: `doi-agent/thiet-ke-v9/THIET_KE_V9.md`. Đã áp dụng đợt 9.1 (token, đầu trang, bảng cài đặt) đợt 9.2 (cử chỉ vuốt phải/trái 1/3, Hoàn tác, tích xanh, `doneAt`, chi tiết việc của bé, chi tiết việc cao ~76% với chip khu, mục "Cử chỉ" trong cài đặt) và đợt 9.3 (ô thêm việc 1 dòng, gợi ý chip trên ô gõ viết tắt, thanh "Đã đổi … thành …" 6 giây, thư viện bỏ bút chì; bàn phím iPhone chưa thử trên máy thật). Tab Khám mới và dòng bé vuốt phải (9.4), lịch mới (9.5), ngày làm việc (9.6) thuộc các đợt sau — chưa làm.
- Bản thiết kế gốc: canvas "Ghi chú công việc theo khu vực", bảng "iPhone 15 – chữ gọn".
