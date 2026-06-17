'use strict';

/* ====================== بيانات المستويات ======================
   كل عنصر له id ثابت — لو نفس العبادة في كذا مستوى بتاخد نفس الـ id
   عشان البيانات تفضل محفوظة لما تبدّل المستوى.
   أنواع الأقسام: pillGroups (أزرار صف) / items (تشيك) / fields (نص/تقييم/وقت)
=============================================================== */
const SALAH = [
  { id: 'salah_fajr', label: 'فجر' }, { id: 'salah_dhuhr', label: 'ظهر' },
  { id: 'salah_asr', label: 'عصر' }, { id: 'salah_maghrib', label: 'مغرب' },
  { id: 'salah_isha', label: 'عشا' }
];
const SUNAN = [
  { id: 'sunan_fajr', label: 'الفجر', note: '٢ قبل' },
  { id: 'sunan_dhuhr', label: 'الظهر', note: '٤ قبل + ٢ بعد' },
  { id: 'sunan_maghrib', label: 'المغرب', note: '٢ بعد' },
  { id: 'sunan_isha', label: 'العشا', note: '٢ بعد' }
];
const topGoals = { type: 'goals', title: 'أهم ٣ حاجات النهاردة',
  fields: [{ id: 'goal1', ph: '...' }, { id: 'goal2', ph: '...' }, { id: 'goal3', ph: '...' }] };
const beforeSleep = (extra) => ({ title: 'قبل ما أنام', fields: [
  { id: 'rating', type: 'rating', label: 'تقييم يومك من ١٠' },
  { id: 'best_thing', type: 'text', label: 'أحسن حاجة عملتها النهاردة' }
].concat(extra || []) });

const LEVELS = [
  /* ===== 0 — مبتدئ ===== */
  { name: 'مبتدئ', motto: 'ابدأ صغير… الثبات أهم من الكثرة', sections: [
    topGoals,
    { title: 'الفرائض والأساسيات',
      pillGroups: [{ label: 'الصلوات', pills: SALAH }],
      items: [
        { id: 'sunan_fajr', label: 'السنن الرواتب', note: 'ابدأ بسنة الفجر' },
        { id: 'athkar_sabah', label: 'أذكار الصباح', note: 'بعد الفجر' },
        { id: 'athkar_masa', label: 'أذكار المساء', note: 'بعد العصر' },
        { id: 'quran', label: 'القرآن', note: 'ولو صفحة' }
      ] },
    { title: 'أذكار اليوم — ابدأ بسيط', items: [
        { id: 'istighfar', label: 'استغفار', note: 'ولو ٣٣' },
        { id: 'salaa_nabi', label: 'صلاة على النبي ﷺ', note: 'ولو ١٠' }
      ] },
    { title: 'خير وأخلاق', items: [
        { id: 'sadaqa', label: 'صدقة' },
        { id: 'birr', label: 'بر الوالدين / صلة رحم' },
        { id: 'smile', label: 'بسمة وكلمة طيبة' }
      ] },
    { title: 'صحة ووقت زيادة', items: [
        { id: 'riyada', label: 'رياضة' },
        { id: 'water', label: 'شرب مية كفاية' },
        { id: 'sleep_early', label: 'نوم بدري' }
      ] },
    beforeSleep()
  ] },

  /* ===== 1 — متوسط ===== */
  { name: 'متوسط', motto: 'لو عملت دول، كسبت يومك', sections: [
    topGoals,
    { title: 'الأوراد — مربوطة بالصلاة',
      pillGroups: [
        { label: 'الصلوات', pills: SALAH },
        { label: 'السنن الرواتب', pills: SUNAN },
        { label: 'القرآن', pills: [
          { id: 'quran_read', label: 'قراءة' }, { id: 'quran_review', label: 'مراجعة' },
          { id: 'quran_memorize', label: 'حفظ' }, { id: 'quran_tadabbur', label: 'تدبّر آية' } ] }
      ],
      items: [
        { id: 'athkar_salah', label: 'أذكار بعد الصلاة', note: 'دبر كل صلاة' },
        { id: 'athkar_sabah', label: 'أذكار الصباح', note: 'بعد الفجر' },
        { id: 'duha', label: 'صلاة الضحى' },
        { id: 'athkar_masa', label: 'أذكار المساء', note: 'بعد العصر' },
        { id: 'qiyam', label: 'قيام الليل / الوتر', note: 'ولو ركعتين قبل النوم' }
      ] },
    { title: 'أذكار اليوم — ١٠٠ مرة لكل ذكر', items: [
        { id: 'istighfar', label: 'استغفار' },
        { id: 'salaa_nabi', label: 'صلاة على النبي ﷺ' },
        { id: 'tasbeeh', label: 'سبحان الله وبحمده' }
      ] },
    { title: 'معاملات وأخلاق', items: [
        { id: 'sadaqa', label: 'صدقة' },
        { id: 'birr', label: 'بر الوالدين / صلة رحم' },
        { id: 'siyam', label: 'صيام تطوّع' },
        { id: 'lisan', label: 'حفظ اللسان' },
        { id: 'basar', label: 'غض البصر' },
        { id: 'dua', label: 'دعاء / مناجاة' }
      ] },
    { title: 'صحة ووقت زيادة', items: [
        { id: 'riyada', label: 'رياضة' },
        { id: 'water', label: 'شرب مية كفاية' },
        { id: 'food', label: 'أكل صحي' },
        { id: 'read_book', label: 'قراءة كتاب / حضور كورس' }
      ] },
    { title: 'متابعة النوم', fields: [
        { id: 'sleep_time', type: 'time', label: 'نمت إمبارح الساعة' },
        { id: 'wake_time', type: 'time', label: 'صحيت الساعة' }
      ], hint: 'الهدف: نوم ١٠:٣٠ • صحيان الفجر • ما تنامش بعد الفجر' },
    beforeSleep()
  ] },

  /* ===== 2 — متقدم ===== */
  { name: 'متقدم', motto: 'إحسان ومداومة — الزَم وِردك', sections: [
    topGoals,
    { title: 'الأوراد — مربوطة بالصلاة',
      pillGroups: [
        { label: 'الصلوات', pills: SALAH },
        { label: 'السنن الرواتب', pills: SUNAN },
        { label: 'القرآن', pills: [
          { id: 'quran_read', label: 'قراءة', note: 'وِرد' }, { id: 'quran_review', label: 'مراجعة' },
          { id: 'quran_memorize', label: 'حفظ' }, { id: 'quran_tadabbur', label: 'تدبّر' },
          { id: 'quran_tafsir', label: 'تفسير' } ] }
      ],
      items: [
        { id: 'jamaa', label: 'صلاة الجماعة / في المسجد' },
        { id: 'athkar_salah', label: 'أذكار بعد الصلاة', note: 'دبر كل صلاة' },
        { id: 'athkar_sabah', label: 'أذكار الصباح', note: 'بعد الفجر' },
        { id: 'duha', label: 'صلاة الضحى' },
        { id: 'athkar_masa', label: 'أذكار المساء', note: 'بعد العصر' },
        { id: 'qiyam', label: 'قيام الليل / الوتر' }
      ] },
    { title: 'أذكار اليوم — المداومة ١٠٠', items: [
        { id: 'istighfar', label: 'استغفار' },
        { id: 'salaa_nabi', label: 'صلاة على النبي ﷺ' },
        { id: 'tasbeeh', label: 'سبحان الله وبحمده' },
        { id: 'tahleel', label: 'لا إله إلا الله' },
        { id: 'hawqala', label: 'لا حول ولا قوة إلا بالله' }
      ] },
    { title: 'علم وتزكية', items: [
        { id: 'ilm', label: 'طلب علم / حضور درس' },
        { id: 'muhasaba', label: 'محاسبة النفس' },
        { id: 'dua_muslimeen', label: 'الدعاء للمسلمين' }
      ] },
    { title: 'معاملات وأخلاق', items: [
        { id: 'sadaqa', label: 'صدقة' },
        { id: 'birr', label: 'بر الوالدين / صلة رحم' },
        { id: 'siyam', label: 'صيام تطوّع' },
        { id: 'lisan', label: 'حفظ اللسان' },
        { id: 'basar', label: 'غض البصر' },
        { id: 'ghaydh', label: 'كظم الغيظ' }
      ] },
    { title: 'صحة ووقت زيادة', items: [
        { id: 'riyada', label: 'رياضة' },
        { id: 'water', label: 'شرب مية كفاية' },
        { id: 'food', label: 'أكل صحي' },
        { id: 'read_book', label: 'قراءة كتاب / كورس' }
      ] },
    { title: 'متابعة النوم', fields: [
        { id: 'sleep_time', type: 'time', label: 'نمت إمبارح الساعة' },
        { id: 'wake_time', type: 'time', label: 'صحيت الساعة' }
      ], hint: 'الهدف: نوم ١٠:٣٠ • صحيان الفجر • ما تنامش بعد الفجر' },
    beforeSleep()
  ] }
];

/* ====================== التخزين ====================== */
const DB_KEY = 'yawmi_data_v1';
const LVL_KEY = 'yawmi_level';
const DONE_THRESHOLD = 0.5;

let DB = load();
let level = +(localStorage.getItem(LVL_KEY) || 0);
let viewDate = new Date();

function load() { try { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; } catch (e) { return {}; } }
function persist() { localStorage.setItem(DB_KEY, JSON.stringify(DB)); flash(); }
function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dayData(key) { return DB[key] || (DB[key] = {}); }
function val(key, id) { return (DB[key] || {})[id]; }
function setVal(key, id, v) {
  const d = dayData(key);
  if (v === false || v === '' || v == null) delete d[id]; else d[id] = v;
  if (Object.keys(d).length === 0) delete DB[key];
  persist();
}

/* ====================== حساب الإنجاز ====================== */
function boolIds(lvl) {
  const ids = [];
  LEVELS[lvl].sections.forEach(s => {
    (s.pillGroups || []).forEach(g => g.pills.forEach(p => ids.push(p.id)));
    (s.items || []).forEach(i => ids.push(i.id));
  });
  return ids;
}
function completion(key, lvl) {
  const ids = boolIds(lvl); if (!ids.length) return 0;
  let done = 0; ids.forEach(id => { if (val(key, id) === true) done++; });
  return done / ids.length;
}
function computeStreak() {
  let d = new Date(); let s = 0;
  if (completion(dayKey(d), level) < DONE_THRESHOLD) d.setDate(d.getDate() - 1);
  while (completion(dayKey(d), level) >= DONE_THRESHOLD) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

/* ====================== الرسم ====================== */
const $ = sel => document.querySelector(sel);
const app = $('#app');

function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const CHK = '<span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>';

function render() {
  const key = dayKey(viewDate);
  const L = LEVELS[level];
  $('#motto').textContent = L.motto;

  // level tabs
  document.querySelectorAll('#levels button').forEach(b =>
    b.classList.toggle('active', +b.dataset.lvl === level));

  // date label (ميلادي + هجري)
  let g = '', h = '';
  try { g = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(viewDate); } catch (e) { g = key; }
  try { h = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long' }).format(viewDate); } catch (e) {}
  const isToday = key === dayKey(new Date());
  $('#dateLabel').innerHTML = esc(g) + (isToday ? ' • النهاردة' : '') + (h ? '<small>' + esc(h) + ' هـ</small>' : '');

  // sections
  let html = '';
  L.sections.forEach(s => {
    if (s.type === 'goals') {
      html += `<div class="section topgoals"><div class="sec-head">${esc(s.title)}</div><div class="items">`;
      s.fields.forEach((f, i) => {
        html += `<div class="field"><label>${i + 1} -</label><input type="text" data-id="${f.id}" placeholder="${esc(f.ph || '')}" value="${esc(val(key, f.id) || '')}"></div>`;
      });
      html += `</div></div>`; return;
    }
    // count for boolean sections
    let cnt = '';
    const bids = [];
    (s.pillGroups || []).forEach(g => g.pills.forEach(p => bids.push(p.id)));
    (s.items || []).forEach(i => bids.push(i.id));
    if (bids.length) { const dn = bids.filter(id => val(key, id) === true).length; cnt = `<span class="cnt">${dn} من ${bids.length}</span>`; }

    html += `<div class="section"><div class="sec-head"><span>${esc(s.title)}</span>${cnt}</div>`;

    (s.pillGroups || []).forEach(g => {
      html += `<div class="pills">`;
      if (g.label) html += `<div style="width:100%;font-size:12px;color:var(--navy);font-weight:700;margin-bottom:2px">${esc(g.label)}</div>`;
      g.pills.forEach(p => {
        const on = val(key, p.id) === true ? ' done' : '';
        html += `<div class="pill${on}" data-toggle="${p.id}">${esc(p.label)}${p.note ? `<small>${esc(p.note)}</small>` : ''}</div>`;
      });
      html += `</div>`;
    });

    if (s.items) {
      html += `<div class="items">`;
      s.items.forEach(it => {
        const on = val(key, it.id) === true ? ' done' : '';
        html += `<div class="item${on}" data-toggle="${it.id}">${CHK}<div class="lbl"><span>${esc(it.label)}</span>${it.note ? `<small>${esc(it.note)}</small>` : ''}</div></div>`;
      });
      html += `</div>`;
    }

    if (s.fields) {
      html += `<div class="items">`;
      s.fields.forEach(f => {
        if (f.type === 'rating') {
          const cur = val(key, f.id);
          html += `<div class="rating" data-rating="${f.id}"><b>${esc(f.label)}</b>`;
          for (let n = 1; n <= 10; n++) html += `<div class="rdot${cur === n ? ' on' : ''}" data-n="${n}">${n}</div>`;
          html += `</div>`;
        } else {
          const t = f.type === 'time' ? 'time' : 'text';
          html += `<div class="field"><label>${esc(f.label)}</label><input type="${t}" data-id="${f.id}" value="${esc(val(key, f.id) || '')}"></div>`;
        }
      });
      if (s.hint) html += `<div class="field" style="border:0"><small style="color:var(--muted)">${esc(s.hint)}</small></div>`;
      html += `</div>`;
    }
    html += `</div>`;
  });
  app.innerHTML = html;

  // progress
  const pct = Math.round(completion(key, level) * 100);
  $('#pfill').style.width = pct + '%';
  $('#ppct').innerHTML = `<bdi>${pct}%</bdi> من يومك`;
  const st = computeStreak();
  $('#streak').textContent = '🔥 ' + st + ' يوم متواصل';
}

/* ====================== الأحداث ====================== */
app.addEventListener('click', e => {
  const key = dayKey(viewDate);
  const tog = e.target.closest('[data-toggle]');
  if (tog) { const id = tog.dataset.toggle; setVal(key, id, val(key, id) === true ? false : true); render(); return; }
  const dot = e.target.closest('.rdot');
  if (dot) { const wrap = dot.closest('[data-rating]'); const id = wrap.dataset.rating; const n = +dot.dataset.n;
    setVal(key, id, val(key, id) === n ? false : n); render(); return; }
});
app.addEventListener('input', e => {
  const inp = e.target.closest('input[data-id]');
  if (inp) setVal(dayKey(viewDate), inp.dataset.id, inp.value);
});

document.querySelectorAll('#levels button').forEach(b =>
  b.addEventListener('click', () => { level = +b.dataset.lvl; localStorage.setItem(LVL_KEY, level); render(); }));

$('#prev').addEventListener('click', () => { viewDate.setDate(viewDate.getDate() - 1); render(); });
$('#next').addEventListener('click', () => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const v = new Date(viewDate); v.setHours(0, 0, 0, 0);
  if (v >= t) return; // مفيش مستقبل
  viewDate.setDate(viewDate.getDate() + 1); render();
});
$('#dateLabel').addEventListener('click', () => { viewDate = new Date(); render(); });

/* حفظ بصري */
let flashT;
function flash() { const f = $('#flash'); f.style.transform = 'scaleX(1)'; clearTimeout(flashT); flashT = setTimeout(() => f.style.transform = 'scaleX(0)', 250); }

/* ====================== تثبيت PWA ====================== */
let deferred = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferred = e;
  if (localStorage.getItem('yawmi_install_dismiss')) return;
  $('#installToast').classList.add('show');
});
$('#installBtn').addEventListener('click', async () => {
  $('#installToast').classList.remove('show');
  if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; }
});
$('#installX').addEventListener('click', () => {
  $('#installToast').classList.remove('show');
  localStorage.setItem('yawmi_install_dismiss', '1');
});

/* ====================== تشغيل ====================== */
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
