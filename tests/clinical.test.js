import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGa, gaFmt, calcAge, buildSummary } from '../src/lib/clinical.js';
import { addDays, isoOf } from '../src/lib/dates.js';

const NOW = new Date(2026, 9, 20); // 20/10/2026

test('đọc tuổi thai dạng 346', () => {
  assert.deepEqual(parseGa('346'), { w: 34, d: 6, days: 244 });
  assert.equal(parseGa('347'), null);   // ngày > 6
  assert.equal(parseGa('19 0'), null);
  assert.equal(gaFmt('320'), '32w0d');
});

test('tính ngày tuổi và tuổi thai hiệu chỉnh', () => {
  // sinh 08/10, 34w6d → 12 ngày tuổi → 244+12 = 256 = 36w4d, còn 24 ngày đến 40w
  const r = calcAge({ dob: '0810', ga: '346' }, NOW);
  assert.equal(r.days, '12 ngày');
  assert.equal(r.pma, '36w4d');
  assert.equal(r.to40, undefined); // không còn hiện "còn bao nhiêu ngày đến 40w"
});

test('ngày sinh "tương lai" được hiểu là năm trước; ngày sai báo lỗi', () => {
  const r = calcAge({ dob: '2512', ga: '280' }, NOW); // 25/12/2025
  assert.equal(r.days, '299 ngày');
  assert.ok(calcAge({ dob: '3102', ga: '346' }, NOW).err);
  assert.ok(calcAge({ dob: '0810', ga: '4' }, NOW).err);
});

test('tổng hợp y lệnh', () => {
  const rooms = [{ id: 'r1', name: 'Phòng 1' }, { id: 'r2', name: 'Phòng 2' }];
  const patients = [
    { id: 'a', roomId: 'r1', code: 'Giường 1', dob: '0810', ga: '346', wt: '1850', note: 'Theo dõi cân' },
    { id: 'b', roomId: 'r1', code: 'Giường 3', dob: '', ga: '', wt: '' }
  ];
  const todosByPid = { a: [{ text: 'Cân bé', done: true }, { text: 'Cập nhật y lệnh', done: false }] };
  const s = buildSummary({ rooms, patients, todosByPid, now: NOW });
  assert.match(s, /^KHÁM SÁNG 20\/10\/2026 - Y LỆNH/);
  assert.match(s, /Còn 1 việc ở 1 bệnh nhân\./);
  assert.match(s, /PHÒNG 1\nGiường 1 - 36w4d - 1850 g\n- Cập nhật y lệnh\nGhi chú: Theo dõi cân\n\nGiường 3 - Tiếp tục y lệnh cũ/);
  assert.doesNotMatch(s, /PHÒNG 2/);
});

test('cộng ngày qua tháng', () => {
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
  assert.equal(isoOf(new Date(2026, 0, 5)), '2026-01-05');
});

test('nhập tuổi thai theo nhiều cách', () => {
  for (const s of ['346', '34w6d', '34w6', '34+6', '34 6', '34.6', '34,6', '34/6', '3406', '34 tuần 6 ngày', ' 346 ']) {
    assert.deepEqual(parseGa(s), { w: 34, d: 6, days: 244 }, s);
  }
  assert.deepEqual(parseGa('34'), { w: 34, d: 0, days: 238 });
  assert.equal(parseGa('347'), null);
  assert.equal(parseGa('196'), null);
  assert.equal(parseGa(''), null);
});

test('nhập ngày sinh theo nhiều cách', () => {
  for (const s of ['0810', '08/10', '8/10', '8-10', '8.10', '08/10/2026', '081026', '08102026']) {
    const r = calcAge({ dob: s, ga: '346' }, NOW);
    assert.equal(r.days, '12 ngày', s);
  }
  assert.match(calcAge({ dob: '', ga: '346' }, NOW).err, /Chưa nhập ngày sinh/);
  assert.match(calcAge({ dob: '0810', ga: '' }, NOW).err, /Chưa nhập tuổi thai/);
  assert.match(calcAge({ dob: '0810', ga: '34x' }, NOW).err, /Chưa đọc được tuổi thai "34x"/);
  assert.match(calcAge({ dob: '01/12/2026', ga: '346' }, NOW).err, /sau ngày hôm nay/);
});

test('6 ví dụ đã thống nhất (tính ngày 21/10/2026)', () => {
  const now = new Date(2026, 9, 21);
  const cases = [
    ['0508', '25', '77 ngày', '36w0d'],
    ['2110', '346', '0 ngày', '34w6d'],
    ['1410', '286', '7 ngày', '29w6d'],
    ['0109', '240', '50 ngày', '31w1d'],
    ['2009', '320', '31 ngày', '36w3d'],
    ['0410', '390', '17 ngày', '41w3d']
  ];
  for (const [dob, ga, days, pma] of cases) {
    assert.deepEqual(calcAge({ dob, ga }, now), { days, pma }, dob + ' ' + ga);
  }
});
