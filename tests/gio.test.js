import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coGio, docGio, chuGio, thuTu, khoangHopLe, trongKhoang, loiGio, phanBoGio, gopPhut, dauCuoi, khoangTrong, maKhacHopLe, chuanBacSi } from '../src/lib/gio.js';

const G = (h, m = 0) => h * 60 + m;
const be = (n) => 'B' + n;
const chonN = (n) => Array.from({ length: n }, (_, i) => be(i + 1));
const gioCua = (kq, id) => kq.gio.get(id);
const dsGio = (kq, ids) => ids.map((i) => (kq.gio.has(i) ? chuGio(kq.gio.get(i)) : null));

test('coGio, chuGio', () => {
  assert.equal(coGio(0), true);
  assert.equal(coGio(1439), true);
  for (const x of [-1, 1440, 1.5, NaN, null, undefined, '495']) assert.equal(coGio(x), false);
  assert.equal(chuGio(495), '08h15');
  assert.equal(chuGio(0), '00h00');
  assert.equal(chuGio(1439), '23h59');
  assert.equal(chuGio(null), '');
  assert.equal(chuGio(1440), '');
  assert.equal(chuGio(NaN), '');
});

test('docGio: các dạng hợp lệ', () => {
  for (const s of ['815', '0815', '8:15', '08h15', '8H15', '08.15', ' 08h15 ']) assert.equal(docGio(s), 495, s);
  for (const s of ['8', '08', '8h']) assert.equal(docGio(s), 480, s);
  assert.equal(docGio('0'), 0);
  assert.equal(docGio('2359'), 1439);
  assert.equal(docGio('000'), 0);
  for (const s of ['', '   ', null, undefined]) assert.equal(docGio(s), null);
});

test('docGio: sai → NaN', () => {
  for (const s of ['2575', '860', 'abc', '12345', '24', '24h00', '8:60', '8h5', '-5', '8-15']) assert.ok(Number.isNaN(docGio(s)), s);
});

test('thuTu và mốc', () => {
  assert.equal(thuTu(G(6, 59), 420), G(6, 59) + 1440);
  assert.equal(thuTu(G(7), 420), G(7));
  assert.equal(thuTu(0, 0), 0);
  assert.equal(thuTu(1439, 0), 1439);
  assert.equal(thuTu(G(5, 59), 360), G(5, 59) + 1440);
  assert.equal(thuTu(G(7, 59), 480), G(7, 59) + 1440);
  assert.equal(thuTu(G(8), 480), G(8));
  assert.equal(thuTu(G(3), 123), G(3) + 1440, 'mốc lạ về 420');
  assert.equal(thuTu(G(3)), G(3) + 1440, 'thiếu mốc là 420');
});

test('khoangHopLe và trongKhoang: cả hai đầu, qua nửa đêm', () => {
  assert.equal(khoangHopLe({ tu: G(8, 20), den: G(8, 35) }, 420), true);
  assert.equal(khoangHopLe({ tu: G(8, 20), den: G(8, 20) }, 420), true);
  assert.equal(khoangHopLe({ tu: G(8, 35), den: G(8, 20) }, 420), false);
  assert.equal(khoangHopLe({ tu: G(23), den: G(1) }, 420), true);
  assert.equal(khoangHopLe({ tu: G(1), den: G(23) }, 420), false);
  assert.equal(khoangHopLe({ tu: G(1), den: G(23) }, 0), true);
  assert.equal(khoangHopLe({ tu: null, den: 5 }, 420), false);
  assert.equal(khoangHopLe(null, 420), false);
  const k = { tu: G(8, 20), den: G(8, 35) };
  assert.equal(trongKhoang(G(8, 20), k, 420), true);
  assert.equal(trongKhoang(G(8, 35), k, 420), true);
  assert.equal(trongKhoang(G(8, 19), k, 420), false);
  assert.equal(trongKhoang(G(8, 36), k, 420), false);
  assert.equal(trongKhoang(G(8, 25), { tu: G(8, 35), den: G(8, 20) }, 420), false);
  const dem = { tu: G(23, 30), den: G(0, 30) };
  assert.equal(trongKhoang(G(0), dem, 420), true);
  assert.equal(trongKhoang(G(1), dem, 420), false);
});

test('loiGio: trùng bé, trùng khoảng (cả hai đầu), bỏ qua chính nó', () => {
  const dong = [
    { id: 'a', ma: 'G01', gio: G(8, 15) },
    { id: 'b', ma: 'G02', gio: G(8, 15) },
    { id: 'c', ma: 'G03', gio: null },
    { id: 'd', ma: 'G04', gio: G(9) },
  ];
  const khoang = [{ id: 'k', tu: G(8, 20), den: G(8, 35), bs: 'BS A' }];
  assert.deepEqual(loiGio({ id: 'a', gio: G(8, 15) }, dong, khoang, 420), [{ kieu: 'be', id: 'b', ma: 'G02', gio: G(8, 15) }]);
  assert.deepEqual(loiGio({ id: 'x', gio: G(8, 15) }, dong, khoang, 420).map((l) => l.id), ['a', 'b']);
  assert.deepEqual(loiGio({ id: 'd', gio: G(9) }, dong, khoang, 420), []);
  assert.deepEqual(loiGio({ id: 'x', gio: G(8, 20) }, dong, khoang, 420), [{ kieu: 'khoang', id: 'k', tu: G(8, 20), den: G(8, 35), bs: 'BS A' }]);
  assert.equal(loiGio({ id: 'x', gio: G(8, 35) }, dong, khoang, 420).length, 1);
  assert.equal(loiGio({ id: 'x', gio: G(8, 36) }, dong, khoang, 420).length, 0);
  assert.equal(loiGio({ id: 'x', gio: G(8, 19) }, dong, khoang, 420).length, 0);
  assert.deepEqual(loiGio({ id: 'x', gio: null }, dong, khoang, 420), []);
  assert.deepEqual(loiGio({ id: 'x', gio: 5000 }, dong, khoang, 420), []);
  assert.deepEqual(loiGio({ id: 'k', gio: G(8, 20) }, [], khoang, 420), [], 'cùng id với khoảng thì bỏ qua');
  assert.deepEqual(loiGio({ id: 'x', gio: G(8, 25) }, dong, [{ id: 'k', tu: G(9), den: G(8), bs: '' }], 420), [], 'khoảng sai bị bỏ qua');
});

test('phanBoGio: 8 bé trong 08h01–08h07 bước 1 chỉ đủ 7', () => {
  const kq = phanBoGio({ tu: G(8, 1), den: G(8, 7), buoc: 1, chon: chonN(8) }, [], [], 420);
  assert.equal(kq.hopLe, true);
  assert.deepEqual(dsGio(kq, chonN(8)), ['08h01', '08h02', '08h03', '08h04', '08h05', '08h06', '08h07', null]);
  assert.deepEqual(kq.thieu, ['B8']);
  assert.equal(chuGio(kq.dau), '08h01');
  assert.equal(chuGio(kq.cuoi), '08h07');
});

test('phanBoGio: den null → 08h08 cho bé thứ 8', () => {
  const kq = phanBoGio({ tu: G(8, 1), den: null, buoc: 1, chon: chonN(8) }, [], [], 420);
  assert.equal(chuGio(gioCua(kq, 'B8')), '08h08');
  assert.deepEqual(kq.thieu, []);
});

test('phanBoGio: nhảy qua khoảng 08h20–08h35', () => {
  const khoang = [{ id: 'k', tu: G(8, 20), den: G(8, 35), bs: 'BS A' }];
  const kq = phanBoGio({ tu: G(8, 18), den: null, buoc: 1, chon: chonN(4) }, [], khoang, 420);
  assert.deepEqual(dsGio(kq, chonN(4)), ['08h18', '08h19', '08h36', '08h37']);
  assert.deepEqual(kq.bo, Array.from({ length: 16 }, (_, i) => G(8, 20) + i));
  // đầu khoảng trùng đúng điểm bắt đầu
  const kq2 = phanBoGio({ tu: G(8, 20), den: null, buoc: 1, chon: ['B1'] }, [], khoang, 420);
  assert.equal(chuGio(gioCua(kq2, 'B1')), '08h36');
  // trùng đúng đầu cuối
  const kq3 = phanBoGio({ tu: G(8, 35), den: null, buoc: 1, chon: ['B1'] }, [], khoang, 420);
  assert.equal(chuGio(gioCua(kq3, 'B1')), '08h36');
});

test('phanBoGio: bước 2, 3, 5', () => {
  assert.deepEqual(dsGio(phanBoGio({ tu: G(8), den: null, buoc: 2, chon: chonN(4) }, [], [], 420), chonN(4)), ['08h00', '08h02', '08h04', '08h06']);
  assert.deepEqual(dsGio(phanBoGio({ tu: G(8), den: null, buoc: 3, chon: chonN(4) }, [], [], 420), chonN(4)), ['08h00', '08h03', '08h06', '08h09']);
  assert.deepEqual(dsGio(phanBoGio({ tu: G(8), den: null, buoc: 5, chon: chonN(4) }, [], [], 420), chonN(4)), ['08h00', '08h05', '08h10', '08h15']);
  // bước sai → 1
  for (const b of [0, 61, -3, 2.5, 'x', undefined, null]) {
    assert.deepEqual(dsGio(phanBoGio({ tu: G(8), den: null, buoc: b, chon: chonN(3) }, [], [], 420), chonN(3)), ['08h00', '08h01', '08h02'], String(b));
  }
  // bước 60
  assert.deepEqual(dsGio(phanBoGio({ tu: G(8), den: null, buoc: 60, chon: chonN(3) }, [], [], 420), chonN(3)), ['08h00', '09h00', '10h00']);
});

test('phanBoGio: tránh giờ bé khác, bé đang chọn thì giờ cũ coi là trống', () => {
  const dong = [
    { id: 'X', ma: 'G90', gio: G(8, 2) },
    { id: 'Y', ma: 'G91', gio: G(8, 4) },
    { id: 'B1', ma: 'G01', gio: G(8, 1) }, // đang chọn, được cấp lại giờ
    { id: 'B2', ma: 'G02', gio: null },
  ];
  const kq = phanBoGio({ tu: G(8, 1), den: null, buoc: 1, chon: ['B1', 'B2', 'B3'] }, dong, [], 420);
  assert.deepEqual(dsGio(kq, ['B1', 'B2', 'B3']), ['08h01', '08h03', '08h05']);
  assert.deepEqual(kq.bo, [G(8, 2), G(8, 4)]);
});

test('phanBoGio: qua nửa đêm, 23h59 rồi 00h00 xếp cuối', () => {
  const kq = phanBoGio({ tu: G(23, 58), den: null, buoc: 1, chon: chonN(4) }, [], [], 420);
  assert.deepEqual(dsGio(kq, chonN(4)), ['23h58', '23h59', '00h00', '00h01']);
  assert.equal(chuGio(kq.dau), '23h58');
  assert.equal(chuGio(kq.cuoi), '00h01');
  const k2 = phanBoGio({ tu: G(23, 59), den: G(0, 0), buoc: 1, chon: chonN(3) }, [], [], 420);
  assert.deepEqual(dsGio(k2, chonN(3)), ['23h59', '00h00', null]);
  // den trước tu theo thứ tự ngày làm việc
  assert.equal(phanBoGio({ tu: G(0, 0), den: G(23, 59), buoc: 1, chon: ['B1'] }, [], [], 420).hopLe, false);
});

test('phanBoGio: hết ngày làm việc → thiếu (06h59 là phút cuối với mốc 420)', () => {
  const kq = phanBoGio({ tu: G(6, 58), den: null, buoc: 1, chon: chonN(3) }, [], [], 420);
  assert.deepEqual(dsGio(kq, chonN(3)), ['06h58', '06h59', null]);
  assert.deepEqual(kq.thieu, ['B3']);
  const k2 = phanBoGio({ tu: G(7, 0), den: null, buoc: 1, chon: ['B1'] }, [], [], 420);
  assert.equal(chuGio(gioCua(k2, 'B1')), '07h00');
  // với mốc 420, 07h00 là phút đầu: không lọt vào 06h59 của hôm sau
  const k3 = phanBoGio({ tu: G(6, 59), den: null, buoc: 1, chon: ['B1', 'B2'] }, [], [], 420);
  assert.deepEqual(dsGio(k3, ['B1', 'B2']), ['06h59', null]);
});

test('phanBoGio: các mốc 0, 360, 480', () => {
  const m0 = phanBoGio({ tu: G(23, 59), den: null, buoc: 1, chon: ['B1', 'B2'] }, [], [], 0);
  assert.deepEqual(dsGio(m0, ['B1', 'B2']), ['23h59', null]);
  const m360 = phanBoGio({ tu: G(5, 59), den: null, buoc: 1, chon: ['B1', 'B2'] }, [], [], 360);
  assert.deepEqual(dsGio(m360, ['B1', 'B2']), ['05h59', null]);
  const m360b = phanBoGio({ tu: G(23, 59), den: null, buoc: 1, chon: chonN(3) }, [], [], 360);
  assert.deepEqual(dsGio(m360b, chonN(3)), ['23h59', '00h00', '00h01']);
  const m480 = phanBoGio({ tu: G(7, 58), den: null, buoc: 1, chon: chonN(3) }, [], [], 480);
  assert.deepEqual(dsGio(m480, chonN(3)), ['07h58', '07h59', null]);
  // tu 00h00 với mốc 0
  assert.deepEqual(dsGio(phanBoGio({ tu: 0, den: 2, buoc: 1, chon: chonN(4) }, [], [], 0), chonN(4)), ['00h00', '00h01', '00h02', null]);
});

test('phanBoGio: tu/den sai, id lặp, chon rỗng', () => {
  for (const th of [{ tu: null, den: null }, { tu: NaN, den: null }, { tu: G(9), den: G(8) }, { tu: G(8), den: 3000 }, { tu: 'x', den: 5 }]) {
    const kq = phanBoGio({ ...th, buoc: 1, chon: ['B1', 'B2'] }, [], [], 420);
    assert.equal(kq.hopLe, false);
    assert.equal(kq.gio.size, 0);
    assert.deepEqual(kq.thieu, ['B1', 'B2']);
  }
  const lap = phanBoGio({ tu: G(8), den: null, buoc: 1, chon: ['B1', 'B2', 'B1'] }, [], [], 420);
  assert.deepEqual(dsGio(lap, ['B1', 'B2']), ['08h00', '08h01']);
  assert.equal(lap.gio.size, 2);
  const rong = phanBoGio({ tu: G(8), den: null, buoc: 1, chon: [] }, [], [], 420);
  assert.equal(rong.hopLe, true);
  assert.equal(rong.dau, null);
  assert.equal(rong.cuoi, null);
});

test('phanBoGio: bé thiếu giờ còn giờ cũ thì giờ cũ không cấp cho bé khác', () => {
  // Hai chỗ 08h00–08h01; B3 đang có giờ cũ 08h01 và xếp cuối nên thiếu; B1 B2 không được lấy 08h01 sau khi tính lại.
  const dong = [{ id: 'B3', ma: 'G03', gio: G(8, 1) }];
  const kq = phanBoGio({ tu: G(8), den: G(8, 1), buoc: 1, chon: ['B1', 'B2', 'B3'] }, dong, [], 420);
  assert.deepEqual(kq.thieu, ['B2', 'B3']);
  assert.deepEqual(dsGio(kq, ['B1', 'B2', 'B3']), ['08h00', null, null]);
  // sau khi áp: không trùng 08h01 với giờ cũ của B3
  const sau = { B3: G(8, 1) };
  for (const [id, g] of kq.gio) sau[id] = g;
  const giaTri = Object.values(sau);
  assert.equal(new Set(giaTri).size, giaTri.length);
  // Thiếu dây chuyền: B2 cũng có giờ cũ 08h02, B1 chiếm 08h00, B2 lấy 08h01 → B3 giờ cũ 08h01 trong khoảng chọn
  const dong2 = [
    { id: 'B2', ma: 'G02', gio: G(8, 2) },
    { id: 'B3', ma: 'G03', gio: G(8, 1) },
  ];
  const k2 = phanBoGio({ tu: G(8), den: G(8, 2), buoc: 1, chon: ['B1', 'B2', 'B3'] }, dong2, [], 420);
  const con = {};
  for (const d of dong2) con[d.id] = d.gio;
  for (const [id, g] of k2.gio) con[id] = g;
  const v = Object.values(con);
  assert.equal(new Set(v).size, v.length, JSON.stringify(con));
});

test('gopPhut', () => {
  assert.deepEqual(gopPhut([], 420), []);
  assert.deepEqual(gopPhut(null, 420), []);
  assert.deepEqual(gopPhut([G(8, 3), G(8, 1), G(8, 2), G(8, 7), G(8, 7), null, 9999], 420), [
    { tu: G(8, 1), den: G(8, 3) },
    { tu: G(8, 7), den: G(8, 7) },
  ]);
  // qua nửa đêm liền nhau theo ngày làm việc
  assert.deepEqual(gopPhut([G(23, 59), 0, 1], 420), [{ tu: G(23, 59), den: 1 }]);
  // mốc 0: 23h59 và 00h00 không liền nhau
  assert.deepEqual(gopPhut([G(23, 59), 0], 0), [{ tu: 0, den: 0 }, { tu: G(23, 59), den: G(23, 59) }]);
  // 06h59 (cuối ngày) và 07h00 (đầu ngày) không liền
  assert.deepEqual(gopPhut([G(6, 59), G(7)], 420), [{ tu: G(7), den: G(7) }, { tu: G(6, 59), den: G(6, 59) }]);
});

test('dauCuoi', () => {
  assert.equal(dauCuoi([], [], 420), null);
  assert.equal(dauCuoi([{ id: 'a', gio: null }], [{ id: 'k', tu: 9, den: 5 }], 420), null);
  const dong = [{ id: 'a', ma: 'G01', gio: G(8) }, { id: 'b', ma: 'G02', gio: G(8, 30) }];
  assert.deepEqual(dauCuoi(dong, [], 420), { dau: G(8), cuoi: G(8, 30) });
  assert.deepEqual(dauCuoi(dong, [{ id: 'k', tu: G(7, 30), den: G(9) }], 420), { dau: G(7, 30), cuoi: G(9) });
  // giờ sau nửa đêm xếp cuối
  assert.deepEqual(dauCuoi([{ id: 'a', gio: G(23) }, { id: 'b', gio: G(1) }], [], 420), { dau: G(23), cuoi: G(1) });
  assert.deepEqual(dauCuoi([{ id: 'a', gio: G(23) }, { id: 'b', gio: G(1) }], [], 0), { dau: G(1), cuoi: G(23) });
});

test('khoangTrong', () => {
  const dong = [{ id: 'a', gio: G(8) }, { id: 'b', gio: G(8, 10) }, { id: 'c', gio: G(8, 12) }, { id: 'd', gio: G(8, 30) }];
  // trống: 08h01–08h09 (9), 08h11 (1), 08h13–08h29 (17)
  assert.deepEqual(khoangTrong(dong, [], 420), [{ tu: G(8, 1), den: G(8, 9) }, { tu: G(8, 13), den: G(8, 29) }]);
  assert.deepEqual(khoangTrong(dong, [], 420, 1), [{ tu: G(8, 1), den: G(8, 9) }, { tu: G(8, 11), den: G(8, 11) }, { tu: G(8, 13), den: G(8, 29) }]);
  assert.deepEqual(khoangTrong(dong, [{ id: 'k', tu: G(8, 15), den: G(8, 25) }], 420), [{ tu: G(8, 1), den: G(8, 9) }]);
  assert.deepEqual(khoangTrong(dong, [{ id: 'k', tu: G(8, 15), den: G(8, 25) }], 420, 3), [
    { tu: G(8, 1), den: G(8, 9) },
    { tu: G(8, 26), den: G(8, 29) },
  ]);
  assert.deepEqual(khoangTrong([], [], 420), []);
  assert.deepEqual(khoangTrong([{ id: 'a', gio: G(8) }], [], 420), []);
  // qua nửa đêm
  assert.deepEqual(khoangTrong([{ id: 'a', gio: G(23, 50) }, { id: 'b', gio: G(0, 5) }], [], 420), [{ tu: G(23, 51), den: G(0, 4) }]);
});

test('maKhacHopLe, chuanBacSi', () => {
  assert.equal(maKhacHopLe(' g01 '), 'G01');
  assert.equal(maKhacHopLe('a-1'), 'A-1');
  assert.equal(maKhacHopLe('ABCDEFGH'), 'ABCDEFGH');
  for (const s of ['ABCDEFGHI', '', '   ', 'G 01', 'Gíường', 'G_1', null, undefined, 5]) assert.equal(maKhacHopLe(s), '', String(s));
  assert.equal(chuanBacSi('  BS   A  '), 'BS A');
  assert.equal(chuanBacSi('x'.repeat(30)).length, 20);
  assert.equal(chuanBacSi('  a  b   c '), 'a b c');
  for (const s of [null, undefined, 5, {}]) assert.equal(chuanBacSi(s), '');
});

// Bộ sinh số giả ngẫu nhiên cố định (mulberry32) để bài kiểm lặp lại được.
function sinh(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('ngẫu nhiên 3000 lượt: không trùng, không vào khoảng, trong [tu, den], giữ thứ tự', () => {
  const rnd = sinh(20261125);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const mocs = [0, 360, 420, 480];
  for (let lan = 0; lan < 3000; lan++) {
    const moc = mocs[ri(0, 3)];
    const gan = rnd() < 0.5; // dồn vào vùng hẹp để dễ chật
    const goc = gan ? (moc + ri(0, 1380)) % 1440 : ri(0, 1439);
    const ngay = (x) => (x + 1440) % 1440;
    // dòng của các bé
    const nBe = ri(0, 14);
    const dong = [];
    for (let i = 0; i < nBe; i++) {
      dong.push({ id: 'D' + i, ma: 'G' + String(i + 1).padStart(2, '0'), gio: rnd() < 0.3 ? null : ngay(goc + ri(-5, 40)) });
    }
    // trùng giờ cũ có thể có sẵn: không sao
    const khoang = [];
    for (let i = ri(0, 3); i > 0; i--) {
      const tu = ngay(goc + ri(-3, 40));
      khoang.push({ id: 'K' + i, tu, den: rnd() < 0.2 ? ngay(tu - ri(1, 5)) : ngay(tu + ri(0, 15)), bs: 'BS A' });
    }
    const chon = [];
    const soChon = ri(0, 12);
    for (let i = 0; i < soChon; i++) {
      const dung = nBe && rnd() < 0.7 ? 'D' + ri(0, nBe - 1) : 'N' + ri(0, 5);
      chon.push(dung);
    }
    const tu = ngay(goc);
    const den = rnd() < 0.4 ? null : ngay(goc + ri(-2, 60));
    const buoc = rnd() < 0.1 ? ri(-2, 70) : ri(1, 6);
    const kq = phanBoGio({ tu, den, buoc, chon }, dong, khoang, moc);
    const ctx = JSON.stringify({ moc, tu, den, buoc, chon, dong, khoang });
    const ids = [...new Set(chon)];
    if (!kq.hopLe) {
      assert.equal(kq.gio.size, 0, ctx);
      assert.deepEqual(kq.thieu, ids, ctx);
      continue;
    }
    // mỗi bé hoặc có giờ hoặc thiếu, không cả hai
    assert.equal(kq.gio.size + kq.thieu.length, ids.length, ctx);
    for (const id of kq.thieu) assert.ok(!kq.gio.has(id), ctx);
    const cuoiNgay = (moc + 1439) % 1440;
    const denTinh = den === null ? cuoiNgay : den;
    // áp kết quả lên dòng: bé trong kq.gio nhận giờ mới, bé thiếu giữ giờ cũ
    const sau = new Map();
    for (const d of dong) sau.set(d.id, d.gio);
    for (const [id, g] of kq.gio) sau.set(id, g);
    const moi = [...kq.gio.entries()];
    const gioMoi = moi.map(([, g]) => g);
    assert.equal(new Set(gioMoi).size, gioMoi.length, 'hai bé cùng phút ' + ctx);
    for (const [id, g] of moi) {
      assert.ok(coGio(g), ctx);
      assert.ok(thuTu(g, moc) >= thuTu(tu, moc) && thuTu(g, moc) <= thuTu(denTinh, moc), 'ngoài [tu, den] ' + ctx);
      for (const k of khoang) assert.equal(trongKhoang(g, k, moc), false, 'rơi vào khoảng ' + ctx);
      // không trùng dòng khác (kể cả giờ cũ còn giữ của bé thiếu)
      for (const [id2, g2] of sau) if (id2 !== id) assert.notEqual(g2, g, `trùng dòng ${id2} ${ctx}`);
      assert.deepEqual(loiGio({ id, gio: g }, [...sau].map(([i, gg]) => ({ id: i, ma: i, gio: gg })), khoang, moc), [], ctx);
    }
    // giữ thứ tự theo chon (tăng dần theo thứ tự ngày làm việc), giãn tối thiểu buoc
    const b = Number.isInteger(buoc) && buoc >= 1 && buoc <= 60 ? buoc : 1;
    const theoThuTu = ids.filter((i) => kq.gio.has(i)).map((i) => thuTu(kq.gio.get(i), moc));
    for (let i = 1; i < theoThuTu.length; i++) assert.ok(theoThuTu[i] - theoThuTu[i - 1] >= b, 'sai thứ tự hoặc sát hơn bước ' + ctx);
    // bé thiếu đều đứng sau mọi bé có giờ
    if (kq.thieu.length && kq.gio.size) {
      const viTriCuoi = Math.max(...[...kq.gio.keys()].map((i) => ids.indexOf(i)));
      assert.ok(kq.thieu.every((i) => ids.indexOf(i) > viTriCuoi), ctx);
    }
    // dau/cuoi khớp
    if (kq.gio.size) {
      assert.equal(kq.dau, gioMoi.reduce((a, g) => (thuTu(g, moc) < thuTu(a, moc) ? g : a)), ctx);
      assert.equal(kq.cuoi, gioMoi.reduce((a, g) => (thuTu(g, moc) > thuTu(a, moc) ? g : a)), ctx);
    }
    // bo nằm trong 0..1439
    for (const x of kq.bo) assert.ok(coGio(x), ctx);
  }
});
