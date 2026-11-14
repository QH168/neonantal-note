// Mục Việc: khu vực, danh sách theo khu, form thêm việc, lịch.
import { useRef, useState, useEffect, useMemo } from 'react';
import { ZONES, LEGACY_ZONES } from '../db.js';
import { addTask, toggleTask, cycleUrgency, removeTask, khoiPhucTask, setTaskTags, setTaskNote, setTaskText, setTaskZone, doiViecSangHomNay, hoanTacDoiViec } from '../lib/actions.js';
import { parseIso, fmtDM } from '../lib/dates.js';
import { demViecChuaXong, ngaySotGanNhat } from '../lib/lich.js';
import { TAGS, laViecMoi, batTatNhan, sapViec, khuHienThi, khuDeChon, gioXong, chuanTenViec, khiRoiOThemViec } from '../lib/viec.js';
import { nhomTheo } from '../lib/chung.js';
import { useBanPhim, useChamHaiLan, useTuLuu } from '../hooks.js';
import { useVietTat } from './VietTat.jsx';
import { KhungLich } from './Lich.jsx';
import { useHoanTac } from './HoanTac.jsx';
import { PriDot, PRI_NAME, Chevron, SwipeRow, TagDot, TickOk, TrangThaiXong, mauNhan, Sheet, PlusIcon, DongBtn, DauChiTietViec, ChanChiTietViec, giuConTro, useDongSheet } from './ui.jsx';

/** Thanh khu vực: dạng cột (PC) hoặc chip vuốt ngang (iPhone). */
export function ZoneNav({ dayTasks, active, onPick, chips }) {
  // Đếm việc chưa xong của mọi khu trong MỘT lượt (không lọc lại cả danh sách cho từng khu)
  const items = useMemo(() => {
    const con = new Map();
    let tong = 0;
    for (const t of dayTasks) if (!t.done) { tong++; con.set(t.zone, (con.get(t.zone) || 0) + 1); }
    return [['all', 'Tất cả', tong], ...khuHienThi(dayTasks, ZONES, LEGACY_ZONES).map((z) => [z, z, con.get(z) || 0])];
  }, [dayTasks]);
  return (
    <nav aria-label="Khu vực làm việc" className={chips ? 'chips noscroll' : 'zone-col'}>
      {items.map(([key, label, count]) => (
        <button key={key} type="button" aria-pressed={active === key} onClick={() => onPick(key)}
          className={(chips ? 'chip' : 'zone-btn') + (active === key ? ' on' : '') + (chips && !count ? ' zero' : '')}>
          <span className={chips ? '' : 'grow'}>{label}</span>
          {/* chip (iPhone): khu không có việc thì không ghi số 0, chữ nhạt */}
          {(!chips || count > 0) && <span className="zone-count">{count}</span>}
        </button>
      ))}
    </nav>
  );
}

/** 5 nút nhãn bật/tắt độc lập (dùng ở form thêm việc và bảng chi tiết việc). */
function TagBtns({ tags, onToggle, label, giuConTro: giu = false }) {
  return (
    <div className="pri-pick" role="group" aria-label={label}>
      {TAGS.map((tag) => (
        <button key={tag} type="button" aria-label={`Nhãn ${tag}`} aria-pressed={tags.includes(tag)} onClick={() => onToggle(tag)}
          onPointerDown={giu ? giuConTro : undefined} onMouseDown={giu ? giuConTro : undefined}
          className="pri-btn tag-btn" style={mauNhan(tag)}>{tag}</button>
      ))}
    </div>
  );
}

/**
 * Bảng "chi tiết việc" (chạm 2 lần vào việc): sửa tên, khu, nhãn, ghi chú; đánh dấu xong / bỏ; xoá việc. Mọi ô tự lưu.
 * Việc cũ (có urgency, chưa có tags): hiện 5 nút nhãn chưa bật; bật nhãn đầu tiên thì thành kiểu mới.
 */
function TaskDetail({ t, wide, onClose, onDoi = null }) {
  const hoanTac = useHoanTac();
  const [ten, doiTen, luuTen, datLaiTen, boTen] = useTuLuu(t.text, (x) => { setTaskText(t.id, x); });
  const [ghiChu, doiGhiChu, luuGhiChu, , boGhiChu] = useTuLuu(t.note || '', (x) => { setTaskNote(t.id, x); });
  const vtTen = useVietTat(ten, doiTen, { onBlur: () => { luuTen(); if (!ten.trim()) datLaiTen(t.text); } });
  const vtNote = useVietTat(ghiChu, doiGhiChu, { onBlur: luuGhiChu });
  const tags = laViecMoi(t) ? t.tags : [];
  // Xoá việc: bảng trượt xuống trước (DongBtn), xong mới xoá, gỡ bảng và hiện thanh Hoàn tác.
  const xoaViec = async () => {
    boTen(); boGhiChu();
    await removeTask(t.id);
    onClose();
    hoanTac.hien({ nhan: 'Đã xoá: ' + t.text, lam: () => khoiPhucTask(t.id) });
  };
  return (
    <Sheet label="Chi tiết việc" onClose={onClose} wide={wide} className="sheet-half">
      <DauChiTietViec id="ten-viec" nhan="Nội dung việc" ten={ten} vt={vtTen} onClose={onClose} />
      <div className="sheet-nhom">
        <span className="sheet-nhan" id="khu-viec-nhan">Khu vực</span>
        <div className="chips-sheet noscroll" role="group" aria-label="Khu vực">
          {khuDeChon(ZONES, t.zone).map((z) => (
            <button key={z} type="button" aria-pressed={t.zone === z} className={'chip' + (t.zone === z ? ' on' : '')}
              onClick={() => { if (t.zone !== z) setTaskZone(t.id, z); }}>{z}</button>
          ))}
        </div>
      </div>
      <div className="sheet-nhom">
        <span className="sheet-nhan">Nhãn, chạm để bật hoặc tắt</span>
        <TagBtns tags={tags} label="Nhãn của việc" onToggle={(tag) => setTaskTags(t, batTatNhan(t.tags, tag))} />
      </div>
      <label htmlFor="ghichu-viec" className="sheet-nhan">Ghi chú</label>
      <textarea id="ghichu-viec" className="sheet-note" placeholder="Ghi chú… (gõ / để viết tắt)" {...vtNote.props} />
      {vtNote.strip}
      <TrangThaiXong xong={!!t.done} gio={gioXong(t.doneAt)} onDanhDau={() => toggleTask(t)} onBo={() => toggleTask(t)} />
      {/* việc còn từ hôm qua (chế độ 2 ngày): dời riêng một việc sang hôm nay, có Hoàn tác */}
      {onDoi && <DongBtn className="btn doi-hom-nay" onClose={async () => { await onDoi(t); onClose(); }}>Dời sang hôm nay</DongBtn>}
      <ChanChiTietViec onXoa={xoaViec} onClose={onClose} />
    </Sheet>
  );
}

function TaskRow({ t, chips, onOpen }) {
  const hoanTac = useHoanTac();
  const [sang, setSang] = useState(false); // dòng sáng lên một nhịp (~140ms) mỗi lần chạm
  const hetSang = useRef(null);
  useEffect(() => () => clearTimeout(hetSang.current), []);
  const moi = laViecMoi(t);
  // Chạm 2 lần (trong 1 giây) vào thân dòng hoặc vùng nhãn → chi tiết việc.
  const cham = useChamHaiLan(() => onOpen(t.id));
  const tapBody = () => {
    setSang(true);
    clearTimeout(hetSang.current);
    hetSang.current = setTimeout(() => setSang(false), 140);
    cham();
  };
  const tags = moi ? t.tags : [];
  const note = (t.note || '').trim();
  // Xoá mềm rồi hiện thanh Hoàn tác (hẹn giờ 6 giây nằm ở HoanTacProvider, không ở dòng này).
  const xoa = async () => {
    await removeTask(t.id);
    hoanTac.hien({ nhan: 'Đã xoá: ' + t.text, lam: () => khoiPhucTask(t.id) });
  };
  return (
    <SwipeRow className={'task-row' + (chips ? ' compact' : '') + (sang ? ' flash' : '') + (t.done ? ' xong' : '')} label={t.text}
      daXong={!!t.done} onDone={() => { if (!t.done) toggleTask(t); }} onDelete={xoa}>
      <div className="task-main" role="button" tabIndex={0} aria-label={'Mở chi tiết việc: ' + t.text}
        onClick={tapBody} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(t.id); }}>
        <span className={'task-text' + (t.done ? ' done' : '')}>{t.text}</span>
        {note && <span className="task-note">{note}</span>}
      </div>
      {moi ? (
        tags.length > 0 && (
          <div className="tag-zone" onClick={tapBody}>
            {tags.map((x) => <TagDot key={x} tag={x} faded={t.done} />)}
          </div>
        )
      ) : (
        <button type="button" className="icon-btn pri-chuyen" onClick={() => cycleUrgency(t)}
          aria-label={`Mức ưu tiên ${t.urgency} (${PRI_NAME[t.urgency]}), bấm để đổi`}>
          <PriDot n={t.urgency} faded={t.done} />
        </button>
      )}
      {t.done && <TickOk />}
    </SwipeRow>
  );
}

/** Danh sách việc chia theo khu, thu gọn/mở rộng được. */
export function TaskGroups({ dayTasks, active, collapsed, onToggle, chips }) {
  // Bảng chi tiết đặt ở đây (không đặt trong TaskRow) để đổi khu mà bảng không bị đóng khi dòng chuyển nhóm.
  const [chiTietId, setChiTietId] = useState(null);
  const dangMo = chiTietId ? dayTasks.find((t) => t.id === chiTietId && !t.deleted) : null;
  // Chia việc theo khu trong MỘT lượt, chỉ tính lại khi danh sách hoặc khu đang lọc đổi
  const groups = useMemo(() => {
    const theoKhu = nhomTheo(dayTasks, (t) => t.zone);
    return khuHienThi(dayTasks, ZONES, LEGACY_ZONES).flatMap((z) => {
      const ds = (active === 'all' || active === z) && theoKhu.get(z);
      if (!ds) return [];
      const list = sapViec(ds);
      return [{ z, list, left: list.reduce((n, t) => n + (t.done ? 0 : 1), 0) }];
    });
  }, [dayTasks, active]);
  const sheet = dangMo && <TaskDetail key={dangMo.id} t={dangMo} wide={!chips} onClose={() => setChiTietId(null)} />;
  if (!groups.length) return <><div className="empty">Chưa có việc nào ở khu vực này.</div>{sheet}</>;
  return (
    <>
      {groups.map(({ z, list, left }) => {
        const open = !collapsed[z];
        return (
          <section key={z} className="group">
            <h2 className="group-h">
              <button type="button" aria-expanded={open} onClick={() => onToggle(z)} className="group-btn">
                <Chevron style={{ transform: `rotate(${open ? 90 : 0}deg)` }} />
                <span className="group-title">{z}</span>
                <span className="muted small">{left === 0 ? 'Đã xong hết' : `Còn ${left}/${list.length} việc`}</span>
              </button>
            </h2>
            {open && <div className="stack8">{list.map((t) => <TaskRow key={t.id} t={t} chips={chips} onOpen={setChiTietId} />)}</div>}
          </section>
        );
      })}
      {sheet}
    </>
  );
}

/** Một việc trong khung "Còn từ hôm qua": vuốt phải = xong; chạm 2 lần = chi tiết (có nút "Dời sang hôm nay"). Không vuốt trái, không xoá. */
function HangConHomQua({ m, onOpen }) {
  const t = m.task;
  const tags = laViecMoi(t) ? t.tags : [];
  const tap = useChamHaiLan(() => onOpen(t.id));
  return (
    <SwipeRow className="task-row compact hq-hang" label={t.text} onDone={() => toggleTask(t)}>
      <div className="task-main" role="button" tabIndex={0} aria-label={'Mở chi tiết việc: ' + t.text}
        onClick={tap} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(t.id); }}>
        <span className="task-text">{t.text}</span>
        <span className="hq-sub">{(m.nhan || fmtDM(t.date)) + (t.zone ? ', ' + t.zone : '')}</span>
      </div>
      {tags.length > 0 && <div className="tag-zone" onClick={tap}>{tags.map((x) => <TagDot key={x} tag={x} />)}</div>}
      {!laViecMoi(t) && t.urgency && <div className="tag-zone" onClick={tap}><PriDot n={t.urgency} /></div>}
    </SwipeRow>
  );
}

/**
 * Khung vàng "Còn từ hôm qua, n việc" (chế độ 2 ngày, bảng 17c). `muc` = viecConTuHomQua(...) (chỉ việc chưa xong, chưa xoá của ĐÚNG
 * ngày làm việc trước). "Dời hết sang hôm nay" đổi date bằng doiViecSangHomNay, có Hoàn tác 6 giây trả đúng ngày cũ. Hết việc thì ẩn khung.
 */
export function ConTuHomQua({ muc, homNay, chips }) {
  const hoanTac = useHoanTac();
  const [chiTietId, setChiTietId] = useState(null);
  const dangMo = chiTietId ? muc.find((m) => m.task.id === chiTietId) : null;
  const doi = async (ids, nhan) => {
    const daDoi = await doiViecSangHomNay(ids, homNay);
    if (daDoi.length) hoanTac.hien({ nhan, lam: () => hoanTacDoiViec(daDoi) });
  };
  const sheet = dangMo && (
    <TaskDetail key={dangMo.task.id} t={dangMo.task} wide={!chips} onClose={() => setChiTietId(null)}
      onDoi={(t) => doi([t.id], 'Đã dời sang hôm nay: ' + t.text)} />
  );
  if (!muc.length) return <>{sheet}</>;
  return (
    <>
      <section aria-label="Còn từ hôm qua" className="hq-khung">
        <div className="hq-dau">
          <h2 className="hq-tieu-de">Còn từ hôm qua, {muc.length} việc</h2>
          <button type="button" className="hq-doi" onClick={() => doi(muc.map((m) => m.task.id), `Đã dời ${muc.length} việc sang hôm nay`)}>Dời hết sang hôm nay</button>
        </div>
        <div className="stack8">
          {muc.map((m) => <HangConHomQua key={m.task.id} m={m} onOpen={setChiTietId} />)}
        </div>
        <p className="hq-ghi">Vuốt phải là xong luôn. Chạm 2 lần để dời riêng một việc.</p>
      </section>
      {sheet}
    </>
  );
}

/**
 * Form thêm việc. variant 'pc' = khung trên đầu (giữ bố cục cũ); 'ph' = thanh dưới cùng iPhone (bảng 15a, 15b):
 * một dòng gồm ô tròn + nút tròn "+"; chạm vào ô gõ thì bung hàng chip khu vực và hàng 5 nút nhãn ngay dưới ô, trên bàn phím.
 * `khuLoc` = chip khu đang lọc ở trên (để biết khu mặc định khi thu lại).
 */
export function TaskForm({ variant, date, zone, setZone, tags, setTags, khuLoc = 'all' }) {
  const ph = variant === 'ph';
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');            // chữ mới nhất, để thêm liên tiếp nhanh không bao giờ tạo trùng
  const datDraft = (x) => { draftRef.current = x; setDraft(x); };
  const [mo, setMo] = useState(false);    // iPhone: đang bung hàng khu vực và nhãn
  const formRef = useRef(null);
  const trongForm = useRef(false);        // đang chạm bên trong form: cú blur sinh ra từ đó không được thu lại
  const hetChamTimer = useRef(null);
  const moi = useRef({});                 // giá trị mới nhất cho các trình nghe sự kiện
  moi.current = { mo, zone, tags, khuLoc };
  const banPhim = useBanPhim();           // cách tính dùng chung với Sheet và thanh Hoàn tác (hooks.js)

  // Rời ô: ô trống thì thu lại, nhãn về trống, khu về theo chip đang lọc (luật thuần khiRoiOThemViec trong src/lib/viec.js).
  const roiO = () => {
    const m = moi.current;
    if (!ph || !m.mo) return;
    const r = khiRoiOThemViec({ chu: draftRef.current, khuLoc: m.khuLoc, khuHienTai: m.zone, nhanHienTai: m.tags }, ZONES);
    if (!r.thuLai) return;
    setMo(false); setTags(r.nhan); setZone(r.khu);
    if (draftRef.current) datDraft('');
  };
  // Thu lại KHÔNG làm ngay ở pointerdown/blur: bố cục đổi dưới ngón tay thì cú chạm trượt sang phần tử khác (nhất là thanh Hoàn tác
  // và các dòng nằm đáy). Hoãn tới sau pointerup/blur ~80ms, tức sau cú click; chạm lại vào form trong lúc chờ thì huỷ.
  const thuTimer = useRef(null);
  const choNgoai = useRef(false);         // đang giữ ngón ở NGOÀI form (khi ô bung): thu lại khi nhấc ngón
  const lenThu = () => {
    clearTimeout(thuTimer.current);
    thuTimer.current = setTimeout(() => {
      if (trongForm.current) return;
      const truoc = moi.current.mo;
      roiO();
      if (truoc && !draftRef.current && document.activeElement === inputRef.current) inputRef.current.blur(); // thu lại thì bỏ cả con trỏ
    }, 80);
  };
  const vt = useVietTat(draft, datDraft, {
    onBlur: (e) => {
      // blur do chạm nút trong form (chip, nhãn, "+", gợi ý) hoặc trong thanh Hoàn tác thì không thu lại; chỉ thu khi chạm/rời ra ngoài
      if (trongForm.current || (e.relatedTarget && (formRef.current?.contains(e.relatedTarget) || e.relatedTarget.closest?.('.hoantac-wrap')))) return;
      lenThu();
    }
  });
  const inputRef = vt.props.ref;

  useEffect(() => {
    if (!ph) return undefined;
    const hetCham = () => {
      clearTimeout(hetChamTimer.current);
      hetChamTimer.current = setTimeout(() => { trongForm.current = false; }, 400);
      if (choNgoai.current) { choNgoai.current = false; lenThu(); }
    };
    window.addEventListener('pointerup', hetCham);
    window.addEventListener('pointercancel', hetCham);
    return () => { window.removeEventListener('pointerup', hetCham); window.removeEventListener('pointercancel', hetCham); clearTimeout(hetChamTimer.current); clearTimeout(thuTimer.current); };
  }, [ph]); // eslint-disable-line react-hooks/exhaustive-deps
  // Đang bung: chạm vào form hoặc thanh Hoàn tác thì không thu lại; chạm ra ngoài thì thu lại SAU khi nhấc ngón (kể cả khi ô đã mất con trỏ vì lý do khác)
  useEffect(() => {
    if (!ph || !mo) return undefined;
    const xuong = (e) => {
      if (!formRef.current) return;
      const t = e.target;
      if (formRef.current.contains(t)) { clearTimeout(thuTimer.current); choNgoai.current = false; return; }
      if (t.closest?.('.hoantac-wrap')) { trongForm.current = true; clearTimeout(hetChamTimer.current); clearTimeout(thuTimer.current); choNgoai.current = false; return; }
      trongForm.current = false; // chạm ngoài: cờ 'đang chạm trong form' của lần chạm trước không còn đúng
      clearTimeout(hetChamTimer.current);
      choNgoai.current = true;
    };
    document.addEventListener('pointerdown', xuong, true);
    return () => document.removeEventListener('pointerdown', xuong, true);
  }, [ph, mo]);
  // Đo chiều cao thật của thanh thêm việc để thanh Hoàn tác xoá nằm ngay trên nó (CSS: html.co-form-viec, biến --tf-cao)
  useEffect(() => {
    const f = formRef.current;
    if (!ph || !f) return undefined;
    const root = document.documentElement;
    const do_ = () => root.style.setProperty('--tf-cao', Math.round(f.getBoundingClientRect().height) + 'px');
    do_();
    root.classList.add('co-form-viec');
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(do_) : null;
    ro?.observe(f);
    return () => { ro?.disconnect(); root.classList.remove('co-form-viec'); root.style.removeProperty('--tf-cao'); };
  }, [ph]);

  const submit = async (e) => {
    e.preventDefault();
    // Bấm "+" hoặc Enter cũng thay chữ tắt ở cuối ô (vd. "Làm /ctm"), rồi mới cắt khoảng trắng và ghi.
    const text = chuanTenViec(vt.chot(draftRef.current));
    if (!text) { if (ph) inputRef.current?.focus(); return; } // nút "+" khi ô trống: không tạo việc rỗng
    datDraft('');
    if (ph) inputRef.current?.focus();                        // giữ con trỏ để gõ tiếp
    await addTask({ date, zone, text, tags });
  };
  const tagBtns = <TagBtns tags={tags} label="Nhãn của việc mới" giuConTro={ph} onToggle={(tag) => setTags(batTatNhan(tags, tag))} />;
  const input = (
    <>
      <label htmlFor={variant + '-draft'} className="sr-only">Nội dung công việc</label>
      <input id={variant + '-draft'} type="text" {...vt.props}
        onFocus={(e) => { vt.props.onFocus(e); if (ph) setMo(true); }}
        onClick={(e) => { vt.props.onClick(e); if (ph) setMo(true); }} // đang có con trỏ mà chưa bung (vd. ô vừa thu lại) thì chạm lại sẽ bung
        placeholder={ph ? 'Ghi việc cần làm…' : 'Ghi chú việc cần làm…'} autoComplete="off" className={ph ? 'tf-in' : 'bare-input'} />
    </>
  );
  if (!ph) {
    return (
      <form onSubmit={submit} className="card task-form-pc">
        {vt.strip}
        {input}
        <div className="task-form-bar">
          <label htmlFor="pc-zone" className="sr-only">Khu vực</label>
          <select id="pc-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="select">
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <div className="row8"><span className="muted small">Nhãn</span>{tagBtns}</div>
          <span className="grow" />
          {/* giữ con trỏ trong ô khi bấm: nếu không, hàng gợi ý viết tắt biến mất lúc nhả chuột, nút nhảy lên và cú bấm trượt */}
          <button type="submit" className="btn primary" onPointerDown={giuConTro} onMouseDown={giuConTro}>Thêm việc</button>
        </div>
      </form>
    );
  }
  return (
    <form ref={formRef} onSubmit={submit} className={'task-form-ph' + (mo ? ' mo' : '') + (banPhim ? ' kb' : '')}
      style={banPhim ? { transform: `translateY(${-banPhim.duoi}px)` } : undefined}
      onPointerDownCapture={() => { trongForm.current = true; clearTimeout(hetChamTimer.current); }}>
      {vt.strip}
      <div className="tf-row">
        {input}
        <button type="submit" className="tf-plus" aria-label="Thêm việc" onPointerDown={giuConTro} onMouseDown={giuConTro}><PlusIcon /></button>
      </div>
      {mo && (
        <>
          <div className="chips-sheet noscroll tf-zones" role="group" aria-label="Khu vực">
            {ZONES.map((z) => (
              <button key={z} type="button" aria-pressed={zone === z} className={'chip' + (zone === z ? ' on' : '')}
                onPointerDown={giuConTro} onMouseDown={giuConTro} onClick={() => setZone(z)}>{z}</button>
            ))}
          </div>
          {tagBtns}
        </>
      )}
    </form>
  );
}
/**
 * Lịch tab Việc (v9.5, bảng 16c). Số dưới ngày = việc chưa xong: ngày từ hôm nay trở đi nền xanh nhạt, ngày đã qua còn sót nền vàng nhạt.
 * "Còn sót n việc ở các ngày trước" bấm được → ngày gần nhất còn sót (ngaySotGanNhat); hết sót thì ẩn. "Về hôm nay" luôn có.
 * `inline` = đặt thẳng trong trang (PC); không thì nằm trong bảng dưới (iPhone), chọn xong tự đóng.
 */
export function LichViec({ tasks, viewDate, today, month, setMonth, onPick, onClose, inline = false }) {
  const dongSheet = useDongSheet();
  const dem = useMemo(() => demViecChuaXong(tasks), [tasks]);
  const sot = useMemo(() => ngaySotGanNhat(tasks, today), [tasks, today]);
  const soSot = useMemo(() => Object.entries(dem).reduce((s, [iso, n]) => (iso < today ? s + n : s), 0), [dem, today]);
  const roi = () => { if (onClose) (dongSheet ? dongSheet(onClose) : onClose()); };
  const chon = (iso) => { onPick(iso); roi(); };
  const denNgay = (iso) => { setMonth(monthOf(iso)); chon(iso); };
  const soDuoi = (iso) => {
    const n = dem[iso] || 0;
    return n ? { chu: String(n), loai: iso < today ? 'sot' : 'xanh', aria: `, còn ${n} việc chưa xong` } : { chu: '', loai: '', aria: ', không có việc chưa xong' };
  };
  return (
    <KhungLich month={month} setMonth={setMonth} today={today} chon={viewDate} onPick={chon} dem={soDuoi} onClose={onClose}
      inline={inline} label="Lịch công việc">
      <div className="lich-chu-giai">
        <span><i className="lich-mau xanh" aria-hidden="true" />Việc chưa xong</span>
        <span><i className="lich-mau sot" aria-hidden="true" />Ngày đã qua, còn sót</span>
      </div>
      {sot && (
        <button type="button" className="lich-sot" onClick={() => denNgay(sot)}>
          <span className="grow left-text">Còn sót {soSot} việc ở các ngày trước</span>
          <Chevron size={16} />
        </button>
      )}
      <button type="button" className="lich-nay-nut" onClick={() => denNgay(today)}>Về hôm nay</button>
    </KhungLich>
  );
}
export const monthOf = (iso) => { const d = parseIso(iso); return { y: d.getFullYear(), m: d.getMonth() }; };
