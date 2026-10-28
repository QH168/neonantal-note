// Thứ tự bé trong một ngày khám. Hàm thuần, không chạm CSDL/giao diện.
// Luật: bé có `order` (số) đứng trước bé không có `order`; trong mỗi nhóm
// xếp theo order (nhóm có) rồi createdAt, cuối cùng theo id để không bao giờ ngẫu nhiên.
// Bé cũ chưa có order (cả ngày cũ) vì vậy giữ đúng thứ tự createdAt như trước.

const coOrder = (p) => typeof p?.order === 'number' && Number.isFinite(p.order);
const so = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

export function soSanhBe(a, b) {
  const oa = coOrder(a), ob = coOrder(b);
  if (oa !== ob) return oa ? -1 : 1;
  if (oa && a.order !== b.order) return a.order - b.order;
  if (so(a.createdAt) !== so(b.createdAt)) return so(a.createdAt) - so(b.createdAt);
  const ia = String(a?.id ?? ''), ib = String(b?.id ?? '');
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

/** Trả về bản sao đã sắp, không đổi mảng gốc. */
export const sapBe = (list) => [...list].sort(soSanhBe);

/** Số thứ tự cho bé mới thêm vào ngày đã có các bé `existing`: nằm sau mọi bé hiện có. */
export function orderTiepTheo(existing) {
  let max = 0;
  for (const p of existing) if (coOrder(p) && p.order > max) max = p.order;
  return max + 1;
}
