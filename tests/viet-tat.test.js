import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chuanKey, taoMap, moRong, moRongKhiGui, hoanTac, goiY, chenGoiY, BO_MAU } from '../src/lib/viet-tat.js';

const map = taoMap(BO_MAU);
const go = (s) => moRong(s, s.length, map);

test('bộ mẫu: 13 mục, key chữ thường không có "/"', () => {
  assert.equal(BO_MAU.length, 13);
  for (const m of BO_MAU) { assert.match(m.key, /^[a-z]+$/); assert.ok(m.text); }
  assert.equal(new Set(BO_MAU.map((m) => m.key)).size, 13);
});

test('chuanKey', () => {
  assert.equal(chuanKey('/KMDM'), 'kmdm');
  assert.equal(chuanKey('  / Km dm '), 'kmdm');
  assert.equal(chuanKey(undefined), '');
});

test('thay ở đầu chuỗi, giữ dấu cách, con trỏ sau dấu cách', () => {
  const r = go('/kmdm ');
  assert.equal(r.text, 'Khí máu động mạch ');
  assert.equal(r.caret, r.text.length);
  assert.equal(r.key, 'kmdm');
  assert.equal(r.goc, '/kmdm');
});

test('thay giữa câu (caret ở giữa, chữ phía sau giữ nguyên)', () => {
  const text = 'Làm /ctm  rồi theo dõi';
  const caret = 'Làm /ctm '.length;
  const r = moRong(text, caret, map);
  assert.equal(r.text, 'Làm Công thức máu  rồi theo dõi');
  assert.equal(r.caret, 'Làm Công thức máu '.length);
});

test('đầu dòng và nhiều dòng; xuống dòng cũng kích hoạt', () => {
  const r = go('Bé A\n/bil ');
  assert.equal(r.text, 'Bé A\nBilirubin toàn phần, trực tiếp ');
  const r2 = go('Bé A\n/rop\n');
  assert.equal(r2.text, 'Bé A\nKhám sàng lọc ROP\n');
  assert.equal(r2.phim, '\n');
});

test('không phân biệt hoa thường; nội dung tiếng Việt có dấu', () => {
  assert.equal(go('/KmDm ').text, 'Khí máu động mạch ');
  assert.equal(go('/OAE ').text, 'Đo OAE sàng lọc thính lực ');
});

test('không đổi: key lạ, 8/10, 1/2, a/b, thiếu dấu cách, "/" trơ', () => {
  for (const s of ['/xyz ', '8/10 ', '1/2 ', 'a/b ', '/kmdm', '/ ', 'abc/kmdm ', '//kmdm ', '/kmdm/ctm ', '']) {
    assert.equal(go(s), null, JSON.stringify(s));
  }
  assert.equal(moRong('/kmdm ', 3, map), null); // caret không đứng ngay sau dấu cách
  assert.equal(moRong('/kmdm ', 6, null), null);
});

test('hoàn tác trả lại "/key " (giữ hoa thường người gõ)', () => {
  const r = go('Làm /CTM ');
  const h = hoanTac(r.text, r);
  assert.equal(h.text, 'Làm /CTM ');
  assert.equal(h.caret, h.text.length);
  const r2 = moRong('Làm /ctm  rồi', 'Làm /ctm '.length, map);
  assert.equal(hoanTac(r2.text, r2).text, 'Làm /ctm  rồi');
});

test('hoàn tác hỏng khi chữ đã bị sửa', () => {
  const r = go('/ctm ');
  assert.equal(hoanTac('Công thức máu: ', r), null);
  assert.equal(hoanTac('x' + r.text, r), null);
  assert.equal(hoanTac(r.text, null), null);
});

const LIST = [...BO_MAU, { key: 'kmx', text: 'Khí máu X' }, { key: 'kma', text: 'Khí máu A' }, { key: 'kmb', text: 'B' }];

test('gợi ý: khớp đầu key, xếp theo key, tối đa 4, có vị trí bắt đầu', () => {
  const text = 'Làm /KM';
  const g = goiY(text, text.length, LIST);
  assert.deepEqual(g.map((x) => x.key), ['kma', 'kmb', 'kmdm', 'kmtm']); // 5 khớp, cắt còn 4
  assert.ok(g.every((x) => x.batDau === 4));
  assert.equal(goiY(text, text.length, LIST, 2).length, 2);
  assert.deepEqual(goiY('/c', 2, LIST).map((x) => x.key), ['cay', 'crp', 'ctm']);
});

test('gợi ý: không đang gõ thì rỗng', () => {
  for (const [s] of [['Làm km'], ['/km '], ['/'], ['8/1'], ['/zzz'], ['a/km'], ['']]) {
    assert.deepEqual(goiY(s, s.length, LIST), [], JSON.stringify(s));
  }
  assert.deepEqual(goiY('/km', 99, LIST), []);
});

test('chèn gợi ý: thay "/km" bằng nội dung + dấu cách, giữ chữ phía sau', () => {
  const r = chenGoiY('Làm /km rồi', 'Làm /km'.length, 4, 'Khí máu động mạch');
  assert.equal(r.text, 'Làm Khí máu động mạch  rồi');
  assert.equal(r.caret, 'Làm Khí máu động mạch '.length);
  const r2 = chenGoiY('/ct', 3, 0, 'Công thức máu');
  assert.equal(r2.text, 'Công thức máu ');
});

test('taoMap bỏ mục rỗng/thiếu', () => {
  assert.deepEqual(taoMap([{ key: '/AB', text: 'x' }, { key: '', text: 'y' }, { key: 'c', text: '' }, null]), { ab: 'x' });
});

// ---- moRongKhiGui: thay chữ tắt ở cuối khi lưu (bấm + hoặc Enter) ----
test('moRongKhiGui: /ctm cuối ô, giữ chữ phía trước', () => {
  assert.equal(moRongKhiGui('Làm /ctm', map), 'Làm Công thức máu');
  assert.equal(moRongKhiGui('Khám xong /kmdm', map), 'Khám xong Khí máu động mạch');
});

test('moRongKhiGui: hoa thường như moRong', () => {
  assert.equal(moRongKhiGui('Đo /CTM', map), 'Đo Công thức máu');
  assert.equal(moRongKhiGui('/Kmdm', map), 'Khí máu động mạch');
});

test('moRongKhiGui: /ctm một mình', () => {
  assert.equal(moRongKhiGui('/ctm', map), 'Công thức máu');
});

test('moRongKhiGui: có dấu cách/xuống dòng cuối vẫn thay, kết quả không còn khoảng trắng cuối', () => {
  assert.equal(moRongKhiGui('Làm /ctm ', map), 'Làm Công thức máu');
  assert.equal(moRongKhiGui('Làm /ctm   \n', map), 'Làm Công thức máu');
});

test('moRongKhiGui: không phải chữ tắt thì giữ nguyên chuỗi gốc', () => {
  for (const s of ['8/10', 'Ăn 1/2', 'x/kmdm', 'Làm /khongco', 'Làm /ctm xem', 'Làm ctm', 'Làm /ctm/', '/']) {
    assert.equal(moRongKhiGui(s, map), s);
  }
  assert.equal(moRongKhiGui('Làm 8/10 ', map), 'Làm 8/10 ');
});

test('moRongKhiGui: chuỗi rỗng, map rỗng, đầu vào lạ không lỗi', () => {
  assert.equal(moRongKhiGui('', map), '');
  assert.equal(moRongKhiGui('   ', map), '   ');
  assert.equal(moRongKhiGui('/ctm', {}), '/ctm');
  assert.equal(moRongKhiGui('/ctm', undefined), '/ctm');
  assert.equal(moRongKhiGui(undefined, map), undefined);
});

test('moRongKhiGui: moRong và bộ mẫu không đổi', () => {
  assert.equal(go('/ctm ').text, 'Công thức máu ');
  assert.equal(BO_MAU.length, 13);
});
// ---- 22/11: /t là viết tắt có sẵn, chèn giờ máy 24h HH:mm ----
import { gioHienTai, mucCoSan, mapDayDu, laCoSan, CO_SAN } from '../src/lib/viet-tat.js';
const GIO_7H05 = new Date(2026, 10, 22, 7, 5);
const GIO_14H30 = new Date(2026, 10, 22, 14, 30);

test('/t: gioHienTai dạng 24h có số 0 đứng đầu', () => {
  assert.equal(gioHienTai(GIO_7H05), '07:05');
  assert.equal(gioHienTai(GIO_14H30), '14:30');
  assert.equal(gioHienTai(new Date(2026, 10, 22, 0, 0)), '00:00');
  assert.equal(gioHienTai(new Date(2026, 10, 22, 23, 59)), '23:59');
});

test('/t + dấu cách thay bằng giờ máy, giữ chữ xung quanh', () => {
  const r = moRong('Đo /t ', 'Đo /t '.length, map, GIO_7H05);
  assert.equal(r.text, 'Đo 07:05 ');
  assert.equal(r.caret, 'Đo 07:05 '.length);
  assert.equal(moRong('/T ', 3, map, GIO_14H30).text, '14:30 ');            // hoa thường như mọi viết tắt
  assert.equal(moRong('/t\n', 3, {}, GIO_14H30).text, '14:30\n');          // xuống dòng cũng kích hoạt; map rỗng vẫn có /t
  assert.equal(moRong('/t ', 3, null, GIO_14H30).text, '14:30 ');
});

test('/t: không chạy khi không đúng token (/tt, a/t, thiếu dấu cách)', () => {
  assert.equal(moRong('/tt ', 4, map, GIO_7H05), null);
  assert.equal(moRong('a/t ', 4, map, GIO_7H05), null);
  assert.equal(moRong('/t', 2, map, GIO_7H05), null);
});

test('/t: hoàn tác trả về /t, và moRongKhiGui thay /t ở cuối', () => {
  const r = moRong('Mổ lúc /t ', 'Mổ lúc /t '.length, map, GIO_14H30);
  assert.deepEqual(hoanTac(r.text, r), { text: 'Mổ lúc /t ', caret: 'Mổ lúc /t '.length });
  assert.equal(moRongKhiGui('Mổ lúc /t', map, GIO_14H30), 'Mổ lúc 14:30');
  assert.equal(moRongKhiGui('/t', map, GIO_7H05), '07:05');
});

test('/t: mục tự tạo trùng key t không đè mục có sẵn (có sẵn thắng), map gốc không bị đổi', () => {
  const mapNguoiDung = taoMap([{ key: 't', text: 'tự tạo' }, { key: 'ctm', text: 'Công thức máu' }]);
  assert.equal(mapNguoiDung.t, 'tự tạo');
  assert.equal(moRong('/t ', 3, mapNguoiDung, GIO_7H05).text, '07:05 ');
  assert.equal(mapNguoiDung.t, 'tự tạo');
  assert.equal(mapDayDu(mapNguoiDung, GIO_7H05).ctm, 'Công thức máu');
  assert.equal(mapDayDu({}, GIO_7H05).t, '07:05');
});

test('/t: gợi ý có /t (giờ) ở cuối, bỏ mục tự tạo trùng key t', () => {
  const ds = [{ key: 't', text: 'tự tạo' }, { key: 'ta', text: 'Tăng sữa' }];
  const g = goiY('/t', 2, ds, 4, GIO_14H30);
  assert.deepEqual(g.map((x) => [x.key, x.text]), [['t', '14:30'], ['ta', 'Tăng sữa']]);
  assert.deepEqual(goiY('/c', 2, ds, 4, GIO_14H30), []);
});

test('/t: danh sách có sẵn cho thư viện', () => {
  assert.equal(CO_SAN.length, 1);
  assert.deepEqual(mucCoSan(GIO_14H30), [{ key: 't', text: '14:30', moTa: 'giờ hiện tại (vd. 14:05)', coSan: true }]);
  assert.equal(laCoSan('/T'), true);
  assert.equal(laCoSan('ctm'), false);
});