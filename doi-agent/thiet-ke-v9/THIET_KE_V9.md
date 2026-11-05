# Thiết kế v9 — đặc tả đã duyệt (05/11/2026)

> Bác sĩ duyệt toàn bộ canvas "Ghi chú Sơ sinh v8 — thiết kế" ngày 05/11/2026 22:45.
> Canvas (bản gốc, mở bằng tài khoản của bác sĩ): https://claude.ai/artifact/VoCWWauYDwv66hFeK8aHJp
> Bản sao mã nguồn từng bảng: `doi-agent/thiet-ke-v9/canvas/*.dc.html` (chỉ để đọc, không phải mã của app).
>
> Thứ tự ưu tiên khi mâu thuẫn: **tờ này** → `doi-agent/QUYET_DINH_DA_CHOT.md` (các mục ghi "THAY BẰNG v9" ở mục 9 dưới đây) → `doi-agent/THIET_KE.md` → skill frontend-design.
> Khi làm xong từng đợt, agent Ghi chép phải chép quyết định mới vào `QUYET_DINH_DA_CHOT.md` và sửa `THIET_KE.md` cho khớp.

## 0. Bảng tra: bảng canvas → tính năng

| Bảng | File | Nội dung |
|---|---|---|
| 14 | `RaSoat.dc.html` | 11 điểm rà soát (đã duyệt hết) |
| 15a | `ApViec.dc.html` | Tab Việc, sáng: đầu trang 3 nút, chip 44px, dòng việc không ô tick, ô thêm việc 1 dòng |
| 15b | `ApGo.dc.html` | Chạm vào ô gõ: hàng khu vực + hàng nhãn bung ra trên bàn phím |
| 15c | `ApChiTiet.dc.html` | Chi tiết việc: khu, nhãn, ghi chú, "Hoàn thành"/"Bỏ đánh dấu xong", "Xoá việc" |
| 15d | `ApKham.dc.html` | Tab Khám: nút "+" trên dòng phòng, tích đã khám |
| 15e | `ApTongHop.dc.html` | Tổng hợp y lệnh, chữ 16px |
| 15f | `ApCaiDat.dc.html` | "Sao lưu và cài đặt": sao lưu, giao diện Sáng/Tối/Theo máy, ngày làm việc bắt đầu lúc, cử chỉ |
| 15g | `ApViecToi.dc.html` | Tab Việc, tối |
| 16a | `MauNhan.dc.html` | Màu nhãn mới (đã duyệt) |
| 16b | `ChiTietBe.dc.html` | Chi tiết bé mới |
| 16c | `LichMoi.dc.html` | Khung lịch mới (ô tròn) |
| 16d | `KhamNgayTruoc.dc.html` | Khám: xem lại ngày trước (chỉ xem) |
| 16e | `LichNhieuNgay.dc.html` | Lịch Khám: chọn khoảng nhiều ngày |
| 16f | `TongHopNhieuNgay.dc.html` | Tổng hợp nhiều ngày (theo ngày / theo mã giường) |
| 17a | `KhamHaiNgay.dc.html` | Khám, xem 2 ngày để giao tour |
| 17b | `BeHaiNgay.dc.html` | Chi tiết bé: khung "Đêm qua" + mức tăng giảm cân |
| 17c | `ViecHaiNgay.dc.html` | Việc, xem 2 ngày: "Còn từ hôm qua" |
| 17d | `GiaoTour.dc.html` | Tổng hợp giao tour |
| 5 | `VietTat.dc.html` | Gõ viết tắt: gợi ý trên ô gõ, Hoàn tác |
| 6 | `ThuVien.dc.html` | Thư viện viết tắt: bỏ bút chì, chạm 2 lần để sửa, vuốt trái để xoá |
| 10 | `MoPhong.dc.html` | Mô phỏng cử chỉ (có logic kéo mẫu, tham khảo khi làm cử chỉ) |
| 11 | `NutIcon.dc.html` | Vuốt trái để xoá kiểu mới |
| 12 | `VuotXong.dc.html` | Vuốt phải để hoàn thành |
| 13 | `KhamXong.dc.html` | Khám: nút "+", vuốt phải là đã khám |

## 1. Hệ thống (token) — thay vào `src/App.css`

### 1.1 Thang chữ iPhone (5 bậc; ô nhập riêng 16px)
| Bậc | px | Dùng cho |
|---|---|---|
| Tiêu đề | 20 / 700 | "Việc hôm nay", "Khám bệnh hôm nay" |
| Tên khung | 17 / 700 | tiêu đề bảng dưới (chi tiết việc, tổng hợp, cài đặt…) |
| Nội dung | 15 | tên việc, mã giường, nút, chip, tên nhóm (700) |
| Chữ phụ | 13 | ngày, đếm "Còn 2/4 việc", ghi chú dưới tên việc, nhãn ô nhập |
| Ghi chú nhỏ | 12 | số đo dưới mã giường ("25w0d, 1850 g"), chú thích |
| Ô nhập | 16 | mọi input/select/textarea (luật cứng, đã có máy kiểm) |
Bỏ các cỡ 12,5 / 13,5 / 14 / 18 trên iPhone. PC giữ cỡ chữ cũ (quyết định cũ còn hiệu lực).

### 1.2 Màu nhãn mới (bảng 16a) — nền nhạt, chữ đậm cùng màu
Thêm biến MỚI cho nhãn (ví dụ `--tNV`, `--tNVi`…); **không đổi `--p1…--p5`** vì chúng còn dùng cho số ưu tiên của việc cũ, chấm đỏ đám mây, cảnh báo.
| Nhãn | Sáng: nền / chữ | Tối: nền / chữ |
|---|---|---|
| NV | #F8D7D3 / #8C2A20 | #4C2723 / #F5C4BD |
| BM | #F7E6B8 / #6E4E00 | #4A3B15 / #F0D88F |
| CK | #D3EAF0 / #1B5566 | #173A44 / #A9D8E5 |
| HC | #DDE3F6 / #2C3F86 | #232D52 / #BFCBF3 |
| XN | #E8DDF3 / #573884 | #34284A / #D8C7EF |
- Huy hiệu nhãn trong dòng: tròn 26px, chữ 11px đậm. Việc đã xong: nhãn mờ (opacity ~0,5).
- Nút chọn nhãn (ô gõ, chi tiết việc): 44px tròn. Tắt: nền trắng (tối: bề mặt), viền 1,5px `--line`, chữ màu nhãn. Bật: nền nhạt của nhãn, viền 2px màu chữ nhãn.

### 1.3 Màu trạng thái
| Ý nghĩa | Sáng | Tối |
|---|---|---|
| Tích "đã xong / đã khám" (tròn 26px, dấu tích) | nền #C8E6C9, tích #2E7D32 | nền #A5D6A7, tích #0B2410 |
| Nền lộ ra khi vuốt phải | #C8E6C9; qua mốc 1/3: #A5D6A7 | #2F5A34 |
| Nền lộ ra khi vuốt trái | #F6D5D2; qua mốc 1/3: #EFB8B2 | #5A2C28 |
| Chữ/nút xoá dịu (“Xoá việc”, nút xoá trên PC) | chữ #A8473D, nền nút #FBEAE8 | chữ #F5C4BD, nền #4C2723 (đề xuất, kiểm tương phản) |
| Nút "Hoàn thành" (viền) | viền #2E7D32, chữ #1B5E20 | viền #A5D6A7, chữ #A5D6A7 (đề xuất) |
| Dải "ngày trước / còn từ hôm qua / mới đêm qua" | nền #FBF3DF, chữ #6E4E00, viền #E4C98A | đề xuất: nền #3A2F14, chữ #F0D88F |
| Khoảng ngày chọn trên lịch | dải #EEF6FC; hai đầu tròn #CFE6F7 viền 1,5px #5BA8DA, chữ #075985 | đề xuất tương ứng từ `--tint` |
Mọi màu đề xuất cho bản tối: agent Giao diện kiểm tương phản ≥4,5:1 (chữ) / ≥3:1 (biểu tượng) rồi chốt.

### 1.4 Kích thước
- Tab Việc/Khám, chip khu vực, nút trên đầu: cao **44px** (chip trước đây 36px, tab 40px).
- Chip khu không có việc: chữ nhạt (#6B7F91), **không** ghi số 0.
- Chỉ chip đang chọn có màu nền xanh; các chip khác cùng một kiểu (bỏ kiểu tô xanh nhạt cho khu mới).

## 2. Khung chung

1. **Đầu trang còn 3 nút**: "/a" (thư viện viết tắt), đám mây (Sao lưu và cài đặt, chấm đỏ như cũ), lịch. Bỏ chữ "MỚI" dưới nút "/a" (hoặc tự tắt sau lần mở đầu). Nút sáng/tối chuyển vào bảng cài đặt.
2. **Bảng "Sao lưu và cài đặt"** (15f), thay bảng "Sao lưu & OneDrive":
   - Sao lưu: như cũ (lần xuất gần nhất, Xuất sao lưu, Nhập từ file; PC: thư mục OneDrive).
   - Giao diện: nút gạt **Sáng / Tối / Theo máy** (Theo máy = `prefers-color-scheme`).
   - **Ngày làm việc bắt đầu lúc**: 00:00 / 06:00 / **07:00 (mặc định)** / 08:00 — xem mục 7.
   - Cử chỉ: danh sách 4 dòng (Vuốt phải: đánh dấu xong; Vuốt trái: xoá, có hoàn tác; Chạm 2 lần: chi tiết; Gõ /: viết tắt).
3. **Dòng nhắc cử chỉ** trên tab Việc chỉ hiện 3 lần mở app đầu tiên và khi danh sách trống.
4. Bảng dưới (Sheet): có thanh kéo nhỏ ở đỉnh; tiêu đề 17px; nút đóng 44px.

## 3. Cử chỉ (bảng 10, 11, 12, 13)

Áp dụng cho: dòng việc (tab Việc), dòng bé (tab Khám, chỉ vuốt phải), việc của bé (trong chi tiết bé), thư viện viết tắt (chỉ vuốt trái).
- **Bỏ ô vuông đánh dấu ở đầu dòng.** Chữ bắt đầu sát lề trái (padding trái 14px).
- **Vuốt phải để xong**: dòng trượt theo ngón tay, phía sau lộ nền xanh nhạt **không chữ, không biểu tượng**. Mốc **1/3 chiều rộng dòng**: qua mốc thì nền đậm lên một nấc và rung nhẹ (`navigator.vibrate` nếu có); thả tay → đánh dấu xong; thả trước mốc → trượt về.
- **Việc đã xong**: **không gạch ngang**; chữ nhạt (`--muted`), nhãn mờ, **tích xanh nhạt ở cuối dòng** (sau nhãn), tự xuống cuối nhóm (giữ luật sắp xếp cũ). Tích chỉ để hiển thị, không bấm.
- **Bỏ đánh dấu xong**: chỉ trong chi tiết (chạm 2 lần) → nút "Bỏ đánh dấu xong". Vuốt phải trên việc đã xong: dòng chỉ nhúc nhích (lực cản) rồi về, không đổi.
- **Vuốt trái để xoá (thay kiểu C)**: giống vuốt phải nhưng ngược hướng — dòng trượt sang trái, lộ nền đỏ phấn **không biểu tượng**; qua 1/3 đậm lên một nấc + rung; thả tay → xoá mềm (`deleted`, như cũ) → dòng thu lại → thanh "Đã xoá: … — Hoàn tác" ở đáy màn hình **6 giây**. Hoàn tác = bỏ đánh dấu `deleted` (giữ nguyên dữ liệu khác).
- **Máy tính / không vuốt được**: rê chuột vào dòng hiện nút xoá (thùng rác, nền #FBEAE8, biểu tượng #A8473D, 44×44) cạnh nhãn; đánh dấu xong qua chi tiết việc → "Hoàn thành".
- Không có chuyển động tự chạy; tôn trọng `prefers-reduced-motion` (bỏ trượt, giữ kết quả).
- Mô phỏng tham khảo: `canvas/MoPhong.dc.html` (logic `down/move/up/release`, mốc `W/3`).

## 4. Tab Việc

1. **Ô thêm việc 1 dòng** (15a): ô gõ tròn "Ghi việc cần làm…" + nút tròn "+" (44px). Chạm vào ô gõ → bung ra ngay trên bàn phím (15b): hàng chip khu vực (mặc định = chip đang lọc, như cũ) và hàng 5 nút nhãn (chọn nhiều, bỏ trống được). Bỏ chữ "Nhãn (chọn được nhiều):" và nút "Thêm việc" dạng chữ.
2. **Chi tiết việc** (15c): giữ nội dung v8.2 (tên, khu, nhãn, ghi chú, Xoá việc) + **dòng trạng thái**: "Chưa xong" + nút "Hoàn thành" / "Đã xong" + nút "Bỏ đánh dấu xong". Khu vực dạng chip (thay ô chọn). "Xoá việc" dùng chữ đỏ dịu #A8473D.
3. **Khung lịch mới** (16c): ô ngày **hình tròn 40px** (vùng chạm cả ô ≥44px); hôm nay viền xanh 2px; ngày chọn tô xanh; số việc chưa xong là nhãn nhỏ dưới vòng tròn (ngày tới: nền #DCEFFB; ngày đã qua còn sót: nền #F7E6B8); dòng "Còn sót n việc ở các ngày trước" bấm được (đi tới ngày gần nhất còn sót); nút "Về hôm nay". Chủ nhật chữ đỏ dịu #8C2A20.
4. **Xem 2 ngày** (17c): nút gạt nhỏ "Hôm nay / 2 ngày" dưới tab. Chế độ 2 ngày: khung vàng "Còn từ hôm qua, n việc" đứng đầu (việc chưa xong của ngày làm việc trước), nút "Dời hết sang hôm nay" (đổi `date` sang hôm nay); việc ghi trong đêm hiện giờ ghi ("Ghi lúc 23:40 đêm qua", lấy từ `createdAt`).

## 5. Tab Khám

1. **Nút thêm bé** (13, 15d): tròn 32px viền xanh, vùng chạm 44px, **căn phải trên dòng tên phòng**; bỏ ô gạch đứt "+ Thêm bệnh nhân". Phòng đang thu gọn: bấm "+" thì phòng tự mở.
2. **Đã khám**: bỏ ô vuông; vuốt phải 1/3 = đã khám; tích xanh cuối dòng; chữ nhạt, không gạch ngang. Chạm 1 lần vào dòng bé vẫn mở chi tiết (giữ như cũ). Bỏ mũi tên ">" cuối dòng.
3. **Chi tiết bé mới** (16b): mã giường ở tiêu đề + chip tên phòng; hàng 3 ô Ngày sinh / Tuổi thai / Cân nặng; nút "Tính tuần tuổi" bên trái + ô kết quả lớn (Ngày tuổi, Hiệu chỉnh) — **vẫn chỉ tính khi bấm** (quyết định cũ); việc cần làm không ô vuông (vuốt phải xong, vuốt trái xoá, **chạm 2 lần để sửa / bỏ đánh dấu** — thay quyết định cũ "chưa cần"); ô thêm việc tròn + "+"; Ghi chú; dòng trạng thái "Chưa khám" + "Hoàn tất khám" (hoặc "Đã khám" + "Bỏ đánh dấu đã khám"); "Xoá khỏi hôm nay" (đỏ dịu, vẫn hỏi xác nhận) + "Xong".
4. **Lịch trong tab Khám**: thêm nút lịch trên đầu tab Khám. Lịch dùng chung khung 16c; số dưới ngày = số bé đã khám; nút gạt "Xem một ngày / Tổng hợp nhiều ngày".
5. **Xem lại ngày trước** (16d): tiêu đề "Khám ngày dd/mm"; dải vàng "Đang xem ngày trước. Chỉ xem, không sửa." + "Về hôm nay"; không nút "+", không vuốt; chạm bé xem chi tiết chỉ xem. Đáy: "Chép sang hôm nay" (dùng lại `copyPatientsFrom(ngàyĐó, hômNay)` — cùng luật không trùng phòng + mã, giữ thứ tự) và "Tổng hợp ngày này" (dùng `buildSummary` với ngày đó).
6. **Tổng hợp nhiều ngày** (16e, 16f): chọn ngày đầu rồi ngày cuối (dải xanh rất nhạt, hai đầu tròn nhạt); dòng "dd/mm đến dd/mm, n ngày, m lượt khám" + "Chọn lại"; nút "Xem tổng hợp n ngày". Văn bản sửa được, nút gạt **Theo ngày / Theo mã giường**; tuổi hiệu chỉnh tính lại **cho từng ngày**; ghi chú cảnh báo "Cùng mã giường ở các ngày khác nhau có thể là bé khác. App ghép theo phòng và mã, hãy kiểm tra trước khi gửi." Sao chép / Soạn lại.
7. **Xem 2 ngày để giao tour** (17a): nút gạt "Hôm nay / 2 ngày". Ghép bé hôm qua + hôm nay theo **phòng + mã** thành một thẻ có 2 dòng "Hôm qua" / "Hôm nay" (trạng thái khám, việc còn lại). Bé vào ban đêm: viền vàng + "Vào hh:mm đêm qua" (giờ tạo, xem mục 7). Bé chỉ có hôm qua: viền gạch đứt + nút "Chép sang". Chip lọc: Tất cả / Mới đêm qua / Còn việc / Chưa chép. Đáy: "Tổng hợp giao tour".
8. **Chi tiết bé ở chế độ 2 ngày** (17b): khung gập "Đêm qua, ghi lúc hh:mm" (chỉ xem: ghi chú, việc đã xong/đã chép); ô cân nặng hiện mức tăng/giảm so với hôm qua.
9. **Tổng hợp giao tour** (17d): chip bật/tắt nhóm (Bé mới / Việc còn lại / Bé ổn định / Ghi chú); văn bản chia nhóm "BÉ MỚI ĐÊM QUA", "VIỆC CÒN TỪ HÔM QUA", "BÉ ỔN ĐỊNH"; sửa được; Sao chép / Soạn lại.
10. **Tổng hợp y lệnh** (15e): chữ 16px (đã làm ở v7.2), nút "Soạn lại".

## 6. Viết tắt (bảng 5, 6)
- Gợi ý hiện thành hàng chip 44px **ngay trên ô gõ** (chip đầu viền xanh = gợi ý tốt nhất); sau khi thay: thanh tối "Đã đổi /kmdm thành Khí máu động mạch" + "Hoàn tác" (giữ ~4 giây như cũ, hoặc thống nhất 6 giây với xoá — hỏi bác sĩ nếu cần).
- Thư viện: hàng thêm mới (Viết tắt | Đổi thành | nút "+"), ô tìm tròn, đếm "n mục — Được sao lưu cùng dữ liệu"; **bỏ nút bút chì**: chạm 2 lần vào dòng để sửa; vuốt trái 1/3 để xoá + Hoàn tác (thay kiểu C).

## 7. Ngày làm việc (mốc giờ) — việc của agent Thuật toán + Dữ liệu
- Cài đặt "Ngày làm việc bắt đầu lúc" (mặc định **07:00**), lưu trong bảng `meta` (không sao lưu, giống cài đặt khác — hỏi bác sĩ nếu muốn sao lưu).
- **Ngày làm việc** = ngày lịch của (giờ máy − mốc). Ví dụ 02:30 ngày 05/11 với mốc 07:00 → thuộc ngày làm việc 04/11.
- Dùng ngày làm việc cho: "hôm nay" của tab Việc và tab Khám (`useToday`), ngày gán cho việc/bé mới, "Lấy danh sách hôm qua", chế độ 2 ngày, nhãn "đêm qua".
- **Không đổi dữ liệu cũ**: `date`/`examDate` đã lưu giữ nguyên.
- Viết thành hàm thuần trong `src/lib/dates.js` (ví dụ `ngayLamViec(now, mocPhut)`) + bài kiểm tra: biên 06:59/07:00, qua nửa đêm, qua tháng, qua năm, mốc 00:00 = ngày lịch.
- Tuổi hiệu chỉnh vẫn tính theo **ngày lịch** của hôm nay (không theo mốc), trừ khi bác sĩ nói khác. Ghi rõ trong báo cáo.

## 8. Dữ liệu cần thêm (agent Dữ liệu — việc lớn, phải theo 3 luật cứng)
- `doneAt` (giờ đánh dấu xong) cho việc, việc của bé và bé (đã khám) → để hiện "Đã xong lúc 09:42". Không cần chỉ mục → không cần đổi `db.version`. Sao lưu gộp như cũ.
- Hoàn tác xoá: chỉ đổi `deleted` true → false qua `updateRow` (có `updatedAt` mới).
- Không cần bảng mới cho chế độ 2 ngày / nhiều ngày (truy vấn theo `examDate`/`date` có chỉ mục sẵn).

## 9. Quyết định cũ được thay (ghi vào QUYET_DINH_DA_CHOT.md khi làm xong)
| Quyết định cũ | THAY BẰNG v9 |
|---|---|
| Ô tick nhỏ 80% ở đầu dòng | Không còn ô tick; vuốt phải 1/3 + tích xanh cuối dòng |
| Xoá kiểu C (thẻ đứng yên, nút "Xoá" đỏ trong dòng, thả quá nửa thì mở) | Vuốt trái 1/3 trượt thật, nền đỏ phấn, thả là xoá, Hoàn tác 6 giây |
| Nút xoá chỉ biểu tượng viền đỏ #C62828 / #EF5350 | Chỉ còn trên PC (rê chuột), kiểu nền đỏ phấn #FBEAE8 |
| Màu nhãn dùng --p1…--p5 (đỏ, vàng, xanh lá, xanh đậm, tím đậm) | Bảng màu 16a (nền nhạt, chữ đậm cùng tông; CK xanh lơ). --p1…--p5 giữ cho số ưu tiên việc cũ |
| Việc của bé chưa có chạm 2 lần (chưa cần) | Có chạm 2 lần để sửa / bỏ đánh dấu |
| Đầu trang có nút sáng/tối | Sáng/Tối/Theo máy trong "Sao lưu và cài đặt" |
| Thư viện sửa bằng bút chì | Chạm 2 lần để sửa |
| "Hôm nay" theo ngày lịch 00:00 | Theo ngày làm việc, mặc định bắt đầu 07:00 |
Giữ nguyên: dữ liệu cũ (số 1–4/NV của việc cũ), luật sắp xếp, tính tuổi chỉ khi bấm, không "đến 40w", ô nhập 16px, vùng chạm 44px, không họ tên, link app.

## 10. Thứ tự làm đề xuất (mỗi đợt một phiếu việc, Kiểm thử độc lập, ảnh trước/sau gửi bác sĩ)
| Đợt | Nội dung | Agent | Loại |
|---|---|---|---|
| 9.1 | Token: thang chữ, màu nhãn mới, màu trạng thái, chip/tab 44px, chip 0 việc nhạt; đầu trang 3 nút; bảng "Sao lưu và cài đặt" (Sáng/Tối/Theo máy, cử chỉ); dòng nhắc cử chỉ chỉ 3 lần đầu | Giao diện | vừa |
| 9.2 | Cử chỉ mới: bỏ ô tick, vuốt phải 1/3 xong, vuốt trái 1/3 xoá + Hoàn tác, tích xanh, không gạch ngang, PC rê chuột, chi tiết việc có dòng trạng thái; áp cho việc, việc của bé, thư viện; `doneAt` | Giao diện + Dữ liệu + Thuật toán | lớn |
| 9.3 | Ô thêm việc 1 dòng bung trên bàn phím; viết tắt: gợi ý chip trên ô gõ; thư viện bỏ bút chì | Giao diện | vừa |
| 9.4 | Khám: nút "+" trên dòng phòng; đã khám bằng vuốt phải; chi tiết bé mới; việc của bé chạm 2 lần | Giao diện | vừa |
| 9.5 | Lịch mới (ô tròn) cho Việc; lịch trong Khám; xem lại ngày trước; Chép sang hôm nay; Tổng hợp ngày này; chọn khoảng nhiều ngày; tổng hợp nhiều ngày | Giao diện + Thuật toán | lớn |
| 9.6 | Ngày làm việc (mốc 07:00); chế độ 2 ngày cho Việc và Khám; "Dời hết sang hôm nay"; chi tiết bé "Đêm qua" + mức tăng giảm cân; tổng hợp giao tour | Thuật toán + Dữ liệu + Giao diện | lớn |
Sau mỗi đợt: cập nhật `BAN_DO.md`, thẻ tính năng, `NHAT_KY.md`; ảnh chuẩn mới chỉ lưu khi bác sĩ duyệt ảnh.
