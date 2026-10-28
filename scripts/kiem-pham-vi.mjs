// Kiểm agent chỉ sửa đúng các file ghi trong phiếu việc (harness: hàng rào phạm vi).
// Cách dùng (trong bản sao git của dự án):
//   node scripts/kiem-pham-vi.mjs doi-agent/phieu-viec/<phieu>.json [--so-voi <mốc git>]
// Mặc định so với lần commit hiện tại (HEAD). Mọi phiếu luôn được sửa doi-agent/** (hồ sơ).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const phieuPath = args.find((a) => a.endsWith('.json'));
const i = args.indexOf('--so-voi');
const moc = i >= 0 ? args[i + 1] : 'HEAD';
if (!phieuPath) {
  console.error('Thiếu đường dẫn phiếu việc. Ví dụ: node scripts/kiem-pham-vi.mjs doi-agent/phieu-viec/MAU.json');
  process.exit(2);
}

const phieu = JSON.parse(readFileSync(phieuPath, 'utf8'));
const cho = [...(phieu.fileDuocSua || []), 'doi-agent/**'];
const toRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
const res = cho.map(toRe);

const git = (c) => execSync('git ' + c, { encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
let doi;
try {
  doi = [...new Set([...git(`diff --name-only ${moc}`), ...git('ls-files --others --exclude-standard')])];
} catch {
  console.error('Không chạy được git. Hãy chạy lệnh này trong bản sao git của dự án.');
  process.exit(2);
}

const ngoai = doi.filter((f) => !res.some((r) => r.test(f)));
console.log(`Phiếu: ${phieu.ten}`);
console.log(`File đã đổi (${doi.length}):\n  ` + (doi.join('\n  ') || '(không có)'));
if (ngoai.length) {
  console.log(`\nLỖI PHẠM VI — ${ngoai.length} file bị sửa ngoài phiếu:\n  ` + ngoai.join('\n  '));
  process.exit(1);
}
console.log('\nĐẠT — mọi thay đổi nằm trong phạm vi phiếu.');
