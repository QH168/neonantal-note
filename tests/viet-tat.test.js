import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chuanKey, taoMap, moRong, hoanTac, goiY, chenGoiY, BO_MAU } from '../src/lib/viet-tat.js';

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
