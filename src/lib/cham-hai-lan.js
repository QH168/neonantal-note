// Phân biệt chạm 1 lần và chạm 2 lần (23/11) cho nút/chip "đã nhập máy". Hàm thuần, không phụ thuộc giao diện nên kiểm bằng Node.
//
// Luật:
//  - Chạm khi đang TẮT            → 'bat'   (bật ngay, không chờ xem có chạm lần hai không).
//  - Chạm khi đang BẬT (1 lần)    → 'khong' (không làm gì).
//  - Chạm lần 2 trong `cuaSo` ms sau một cú chạm mà LÚC ĐÓ ĐÃ BẬT sẵn → 'mo' (mở bảng chi tiết để tắt).
//  - Chạm lần 2 ngay sau cú chạm vừa BẬT → 'khong' (tránh bật rồi mở bảng luôn). Cú chạm đó coi như đã dùng hết,
//    phải chạm lần nữa (sau cửa sổ) mới tính là cú đầu của một cặp mới.
//  - Sau khi 'mo' cũng reset: cú chạm kế tiếp bắt đầu cặp mới.
// `dangBat` = trạng thái của nút TẠI LÚC chạm (trước khi cú chạm này bật nó).
export const CUA_SO_HAI_LAN_MS = 350;

export function taoChamHaiLan({ cuaSo = CUA_SO_HAI_LAN_MS } = {}) {
  let lanCuoi = null; // { luc, daBatSan } của cú chạm trước còn "chờ" làm cú đầu của một cặp; null = không có
  return {
    cham(now, dangBat) {
      const truoc = lanCuoi;
      if (truoc && now - truoc.luc <= cuaSo) {
        lanCuoi = null; // cú thứ hai dùng hết cặp
        return truoc.daBatSan ? 'mo' : 'khong';
      }
      if (!dangBat) {
        lanCuoi = { luc: now, daBatSan: false }; // vừa bật: chạm kế liền sau không mở bảng
        return 'bat';
      }
      lanCuoi = { luc: now, daBatSan: true };
      return 'khong';
    }
  };
}
