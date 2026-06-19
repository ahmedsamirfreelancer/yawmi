'use strict';
/* تبويب القرآن: الحفظ (الحصون الخمسة) + المراجعة (رسوخ) — د. سعيد أبو العلا حمزة
   البيانات: S.hifz (حالة الحصون) + S.review (تصنيفات رسوخ). العلامات اليومية في day_entries بمفاتيح q_*. */

const MUSHAF_PAGES = 604;
// صفحات بداية كل جزء (مصحف المدينة، ٦٠٤ ص)
const JUZ_STARTS = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
function juzOf(page) { let j = 1; for (let i = 0; i < 30; i++) if (page >= JUZ_STARTS[i]) j = i + 1; return j; }
function juzPages(j) { const s = JUZ_STARTS[j - 1]; const e = j < 30 ? JUZ_STARTS[j] - 1 : MUSHAF_PAGES; return [s, e]; }
// السبت=0 .. الجمعة=6 (مطابق للكتاب)
function weekdaySat0(d) { return (d.getDay() + 1) % 7; }

// ===== حالة افتراضية =====
function defHifz() { return { enabled: false, startPage: 3, currentPage: 3, rate: 1, lastAdvance: '' }; }
function defReview() { return { started: false, juz: {}, rate3: 1 }; }

// ===== جدول الحصون الخمسة اليومي (يتولّد تلقائياً) =====
function husunPlan(h, date) {
  const cur = Math.max(h.startPage, Math.min(MUSHAF_PAGES, h.currentPage));
  const start = h.startPage || 3;
  const tasks = [];
  // ١) الحفظ الجديد
  tasks.push({ id: 'new', t: 'الحفظ الجديد', d: `صفحة ${cur} (جزء ${juzOf(cur)})`, min: 15 });
  // ٢) مراجعة القريب: حتى ٢٠ صفحة ملاصقة قبل صفحة الحفظ
  const nearStart = Math.max(start, cur - 20), nearEnd = cur - 1;
  if (nearEnd >= nearStart) tasks.push({ id: 'near', t: 'مراجعة القريب', d: `من ص ${nearStart} إلى ص ${nearEnd} (حدراً)`, min: 20 });
  // ٣) مراجعة البعيد: أنابيب ٤٠ صفحة لكل يوم أسبوع
  const farMax = nearStart - 1;
  if (farMax >= start) {
    const wd = weekdaySat0(date), ranges = [];
    for (let i = 0; ; i++) {
      const s = start + i * 40; if (s > farMax) break;
      if (i % 7 === wd) ranges.push([s, Math.min(farMax, s + 39)]);
    }
    if (ranges.length) tasks.push({ id: 'far', t: 'مراجعة البعيد', d: ranges.map(r => `ص ${r[0]}–${r[1]}`).join('، '), min: 40 });
  }
  // ٤) التحضير القبلي: تكرار صفحة الحفظ قبلها مباشرة
  tasks.push({ id: 'qabli', t: 'التحضير القبلي', d: `تكرار صفحة ${cur} حدراً (~١٥ مرة)`, min: 15 });
  // ٥) التحضير الليلي: صفحة الغد + استماع ١٠×
  const nx = cur + 1;
  if (nx <= MUSHAF_PAGES) tasks.push({ id: 'layli', t: 'التحضير الليلي', d: `صفحة ${nx} قبل النوم + استماع ١٠×`, min: 15 });
  // ٦) التحضير الأسبوعي: قراءة صفحات الأسبوع الجاي
  const wkE = Math.min(MUSHAF_PAGES, cur + 7);
  if (cur + 1 <= wkE) tasks.push({ id: 'usbu', t: 'التحضير الأسبوعي', d: `قراءة ص ${cur + 1}–${wkE} (للأسبوع الجاي)`, min: 10 });
  // ٧) القراءة المستمرة + الاستماع المنهجي
  tasks.push({ id: 'mustamirra', t: 'القراءة المستمرة + الاستماع', d: 'جزآن حدراً + استماع حِزب', min: 40 });
  return tasks;
}

// ===== خطة رسوخ اليومية =====
const REV_STATES = { mastered: { lbl: 'متقن', c: '#2e7d52' }, good: { lbl: 'يحتاج ضبط', c: '#C49A2E' }, weak: { lbl: 'يحتاج إعادة حفظ', c: '#c0392b' } };
function juzByLevel(rev, lvl) { const a = []; for (let j = 1; j <= 30; j++) if (rev.juz[j] === lvl) a.push(j); return a; }
function rusukhPlan(rev, date) {
  const mastered = juzByLevel(rev, 'mastered'), good = juzByLevel(rev, 'good'), weak = juzByLevel(rev, 'weak');
  const wd = weekdaySat0(date);
  // مراجعة المتقن: توزيع الأجزاء على ٧ أيام
  const todayMastered = mastered.filter((j, i) => i % 7 === wd);
  // ضبط المستوى ٢: أول جزء (الأقدم ترتيباً)
  const tadbeet = good.length ? good[0] : null;
  // المستوى ٣: يبدأ فقط بعد انتهاء كل الضبط
  const rehifz = (!good.length && weak.length) ? weak[0] : null;
  return { mastered, good, weak, todayMastered, tadbeet, rehifz };
}

// ===== الرندر =====
function renderQuran() {
  $('#hdr').innerHTML = `<div class="h-row"><div class="h-title">📖 القرآن</div>
    ${S.qsub && S.qsub !== 'home' ? `<button class="edit-btn" id="qBack">‹ رجوع</button>` : ''}</div>
    <div class="motto">الحفظ بالحصون الخمسة • المراجعة برسوخ</div>`;
  const back = $('#qBack'); if (back) back.onclick = () => { S.qsub = 'home'; renderQuran(); };
  const sub = S.qsub || 'home';
  if (sub === 'husun') return renderHusun();
  if (sub === 'rusukh') return renderRusukh();
  // الصفحة الرئيسية: بطاقتان
  const h = S.hifz || defHifz(), rev = S.review || defReview();
  const hifzInfo = h.enabled ? `صفحة ${h.currentPage} • جزء ${juzOf(h.currentPage)} • حفظت ${Math.max(0, h.currentPage - h.startPage)} صفحة` : 'مش مفعّل — اضغط للإعداد';
  const masteredN = juzByLevel(rev, 'mastered').length, goodN = juzByLevel(rev, 'good').length, weakN = juzByLevel(rev, 'weak').length;
  const revInfo = rev.started ? `متقن ${masteredN} • ضبط ${goodN} • إعادة ${weakN} جزء` : 'مش مفعّل — صنّف محفوظك';
  $('#screen').innerHTML = `
    <div class="qcard" id="cardHusun">
      <div class="qcard-ic">🏰</div>
      <div class="qcard-body"><b>الحفظ — الحصون الخمسة</b><span>${esc(hifzInfo)}</span></div>
      <div class="qcard-go">›</div>
    </div>
    <div class="qcard" id="cardRusukh">
      <div class="qcard-ic">🧠</div>
      <div class="qcard-body"><b>المراجعة والإتقان — رسوخ</b><span>${esc(revInfo)}</span></div>
      <div class="qcard-go">›</div>
    </div>
    <div class="qnote">طريقة د. سعيد أبو العلا حمزة — "تعاهدوا هذا القرآن" 🤍</div>`;
  $('#cardHusun').onclick = () => { S.qsub = 'husun'; renderQuran(); };
  $('#cardRusukh').onclick = () => { S.qsub = 'rusukh'; renderQuran(); };
}

// ===== شاشة الحصون =====
function renderHusun() {
  const h = S.hifz || defHifz();
  if (!h.enabled) {
    $('#screen').innerHTML = `
      <div class="section"><div class="sec-head"><span>🏰 إعداد الحصون الخمسة</span></div>
        <div class="setbox">
          <p class="qexplain">نظام يومي تلقائي للحفظ المتقن: حفظ جديد + مراجعة قريب وبعيد + تحضير. الحفظ في مصحف المدينة يبدأ من صفحة ٣.</p>
          <label class="setlbl">صفحة الحفظ الحالية (اللي بتحفظها دلوقتي)</label>
          <div class="stepper"><button data-st="-1">−</button><b id="curP">3</b><button data-st="1">+</button></div>
          <label class="setlbl">المعدّل اليومي</label>
          <div class="seg sm"><button type="button" data-rate="1" class="on">صفحة/يوم</button><button type="button" data-rate="2">صفحتين/يوم</button></div>
          <button class="primary" id="startHusun" style="margin-top:14px">ابدأ الحصون</button>
        </div></div>`;
    let cur = h.currentPage || 3, rate = h.rate || 1;
    const upd = () => $('#curP').textContent = cur;
    $$('[data-st]').forEach(b => b.onclick = () => { cur = Math.max(3, Math.min(MUSHAF_PAGES, cur + (+b.dataset.st))); upd(); });
    $$('[data-rate]').forEach(b => b.onclick = () => { $$('[data-rate]').forEach(x => x.classList.remove('on')); b.classList.add('on'); rate = +b.dataset.rate; });
    $('#startHusun').onclick = () => { S.hifz = { ...defHifz(), enabled: true, startPage: 3, currentPage: cur, rate }; saveHifz(); renderHusun(); };
    return;
  }
  const date = new Date();
  const key = todayKey();
  const v = L.getDay(key);
  const tasks = husunPlan(h, date);
  const total = tasks.reduce((a, t) => a + t.min, 0);
  const doneN = tasks.filter(t => v['q_h_' + t.id] === true).length;
  let items = tasks.map(t => {
    const on = v['q_h_' + t.id] === true;
    return `<div class="item ${on ? 'done' : ''}" data-qh="${t.id}">${CHK}
      <div class="lbl"><span>${esc(t.t)}</span><small>${esc(t.d)} • ~${t.min}د</small></div></div>`;
  }).join('');
  $('#screen').innerHTML = `
    <div class="psrip"><div class="pnext" style="margin:0;font-size:14px;color:#fff">📍 صفحة الحفظ النهاردة: <b style="color:var(--gold)">${h.currentPage}</b> • جزء ${juzOf(h.currentPage)}</div>
      <div class="pnext" style="margin-top:6px">حفظت ${Math.max(0, h.currentPage - h.startPage)} من ${MUSHAF_PAGES - h.startPage + 1} صفحة • ${doneN}/${tasks.length} حصون النهاردة</div>
    </div>
    <div class="section"><div class="sec-head"><span>حصون النهاردة</span><span class="cnt">~${total} دقيقة</span></div>
      <div class="items">${items}</div></div>
    <button class="add-section" id="advBtn" style="border-color:var(--ok);color:var(--ok)">✅ خلّصت حفظ صفحة ${h.currentPage} → انتقل للتالي</button>
    <div class="section"><div class="sec-head"><span>ضبط الموضع يدوياً</span></div>
      <div class="setbox"><div class="stepper"><button data-adj="-1">−</button><b>صفحة ${h.currentPage}</b><button data-adj="1">+</button></div>
      <button class="mini ghost" id="resetHusun">إعادة ضبط الإعداد</button></div></div>`;
  $$('#screen [data-qh]').forEach(el => el.onclick = () => {
    const id = el.dataset.qh, k = 'q_h_' + id;
    v[k] = v[k] === true ? undefined : true; if (v[k] === undefined) delete v[k];
    L.setDay(key, v); flash(); schedulePush(key); renderHusun();
  });
  $('#advBtn').onclick = () => {
    if (h.currentPage >= MUSHAF_PAGES) { alert('ما شاء الله، خلّصت المصحف! 🤍'); return; }
    h.currentPage = Math.min(MUSHAF_PAGES, h.currentPage + (h.rate || 1));
    h.lastAdvance = key; v['q_h_new'] = true; L.setDay(key, v); schedulePush(key); saveHifz(); renderHusun();
  };
  $$('#screen [data-adj]').forEach(b => b.onclick = () => { h.currentPage = Math.max(h.startPage, Math.min(MUSHAF_PAGES, h.currentPage + (+b.dataset.adj))); saveHifz(); renderHusun(); });
  $('#resetHusun').onclick = () => { if (confirm('إعادة ضبط إعداد الحصون؟ (تقدمك في الصفحة هيتساب)')) { S.hifz.enabled = false; saveHifz(); renderHusun(); } };
}

// ===== شاشة رسوخ =====
function renderRusukh() {
  const rev = S.review || defReview();
  if (!rev.started || S.qsub2 === 'classify') {
    return renderRusukhClassify(rev);
  }
  const date = new Date(), key = todayKey(), v = L.getDay(key);
  const plan = rusukhPlan(rev, date);
  const cls = (j) => rev.juz[j] ? REV_STATES[rev.juz[j]].c : '#ddd';
  // مراجعة المتقن النهاردة
  let masteredHtml = plan.todayMastered.length
    ? plan.todayMastered.map(j => `<span class="jchip" style="background:${cls(j)}">جزء ${j}</span>`).join('')
    : '<small style="color:var(--muted)">مفيش متقن مجدول النهاردة</small>';
  // الضبط
  let tadbeetHtml;
  if (plan.tadbeet) {
    const [s, e] = juzPages(plan.tadbeet);
    tadbeetHtml = `<div class="item ${v['q_r_tadbeet'] === true ? 'done' : ''}" data-qr="tadbeet">${CHK}
        <div class="lbl"><span>ضبط جزء ${plan.tadbeet}</span><small>ص ${s}–${e} • جزء/أسبوع</small></div></div>
      <button class="mini" id="promoteBtn">✅ تم ضبط جزء ${plan.tadbeet} → متقن</button>`;
  } else if (plan.rehifz) {
    const [s] = juzPages(plan.rehifz);
    tadbeetHtml = `<div class="qexplain">كل أجزاء الضبط خلصت 🤍 ابدأ إعادة حفظ <b>جزء ${plan.rehifz}</b> بنظام الحصون الخمسة.</div>
      <button class="mini" id="toHusunBtn">ابدأ حفظ جزء ${plan.rehifz} (ص ${s}) في الحصون</button>`;
  } else {
    tadbeetHtml = `<div class="qexplain">مفيش أجزاء محتاجة ضبط أو إعادة حفظ. الحمد لله 🤍</div>`;
  }
  const habits = [
    ['read', 'وِرد القراءة من المصحف', 'نظر + تحريك لسان'],
    ['listen', 'الاستماع لقارئ متقن', 'بيت / طريق / سيارة'],
    ['salah', 'الصلاة بالمحفوظات', 'ختمة منهجية في الصلاة'],
    ['tasmee', 'التسميع على متقن', 'ولو جزء بسيط'],
  ];
  const habitsHtml = habits.map(([id, t, d]) => {
    const on = v['q_r_' + id] === true;
    return `<div class="item ${on ? 'done' : ''}" data-qr="${id}">${CHK}<div class="lbl"><span>${esc(t)}</span><small>${esc(d)}</small></div></div>`;
  }).join('');
  $('#screen').innerHTML = `
    <div class="section"><div class="sec-head"><span>🔁 مراجعة المتقن النهاردة</span></div>
      <div class="jchips">${masteredHtml}</div></div>
    <div class="section"><div class="sec-head"><span>🛠️ الضبط (المستوى الثاني)</span></div>
      <div class="items">${tadbeetHtml}</div></div>
    <div class="section"><div class="sec-head"><span>🌿 العادات اليومية الثابتة</span></div>
      <div class="items">${habitsHtml}</div></div>
    <button class="add-section" id="reclassBtn">↻ تعديل تصنيف المحفوظ</button>`;
  $$('#screen [data-qr]').forEach(el => el.onclick = () => {
    const k = 'q_r_' + el.dataset.qr;
    v[k] = v[k] === true ? undefined : true; if (v[k] === undefined) delete v[k];
    L.setDay(key, v); flash(); schedulePush(key); renderRusukh();
  });
  const pb = $('#promoteBtn'); if (pb) pb.onclick = () => {
    if (!confirm(`ترقية جزء ${plan.tadbeet} للمتقن؟`)) return;
    rev.juz[plan.tadbeet] = 'mastered'; delete v['q_r_tadbeet']; L.setDay(key, v); saveReview(); renderRusukh();
  };
  const th = $('#toHusunBtn'); if (th) th.onclick = () => {
    const [s] = juzPages(plan.rehifz);
    S.hifz = { ...defHifz(), enabled: true, startPage: 3, currentPage: s, rate: 1 };
    saveHifz(); S.qsub = 'husun'; renderQuran();
  };
  $('#reclassBtn').onclick = () => { S.qsub2 = 'classify'; renderRusukh(); };
}

function renderRusukhClassify(rev) {
  let grid = '';
  for (let j = 1; j <= 30; j++) {
    const lvl = rev.juz[j];
    const c = lvl ? REV_STATES[lvl].c : '#efeee9';
    const tc = lvl ? '#fff' : '#9a958a';
    grid += `<div class="jcell" data-j="${j}" style="background:${c};color:${tc}">${j}</div>`;
  }
  $('#screen').innerHTML = `
    <div class="section"><div class="sec-head"><span>صنّف محفوظك (٣٠ جزء)</span></div>
      <div class="setbox">
        <p class="qexplain">دوس على كل جزء حافظه عشان تحدد مستواه (بدقة وعدم مجاملة للنفس). الدوس بيلف بين المستويات:</p>
        <div class="rlegend">
          <span><i style="background:${REV_STATES.mastered.c}"></i>متقن راسخ</span>
          <span><i style="background:${REV_STATES.good.c}"></i>يحتاج ضبط</span>
          <span><i style="background:${REV_STATES.weak.c}"></i>إعادة حفظ</span>
          <span><i style="background:#efeee9;border:1px solid #ddd"></i>مش محفوظ</span>
        </div>
        <div class="jgrid">${grid}</div>
        <button class="primary" id="saveClass" style="margin-top:14px">حفظ التصنيف وعرض الخطة</button>
      </div></div>`;
  const cycle = ['', 'mastered', 'good', 'weak'];
  $$('#screen [data-j]').forEach(el => el.onclick = () => {
    const j = +el.dataset.j;
    const cur = rev.juz[j] || '';
    const nxt = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
    if (nxt) rev.juz[j] = nxt; else delete rev.juz[j];
    const c = nxt ? REV_STATES[nxt].c : '#efeee9', tc = nxt ? '#fff' : '#9a958a';
    el.style.background = c; el.style.color = tc;
  });
  $('#saveClass').onclick = () => { rev.started = true; S.qsub2 = null; saveReview(); renderRusukh(); };
}

// ===== حفظ =====
let hifzT, reviewT;
function saveHifz() {
  S.hifz = S.hifz || defHifz();
  localStorage.setItem('yawmi_hifz', JSON.stringify(S.hifz));
  clearTimeout(hifzT); hifzT = setTimeout(() => api('hifz', 'POST', { data: S.hifz }).catch(() => {}), 600);
  flash();
}
function saveReview() {
  S.review = S.review || defReview();
  localStorage.setItem('yawmi_review', JSON.stringify(S.review));
  clearTimeout(reviewT); reviewT = setTimeout(() => api('review', 'POST', { data: S.review }).catch(() => {}), 600);
  flash();
}
async function loadQuran() {
  try { S.hifz = JSON.parse(localStorage.getItem('yawmi_hifz') || 'null') || defHifz(); } catch (e) { S.hifz = defHifz(); }
  try { S.review = JSON.parse(localStorage.getItem('yawmi_review') || 'null') || defReview(); } catch (e) { S.review = defReview(); }
  try { const r = await api('hifz'); if (r.data) { S.hifz = r.data; localStorage.setItem('yawmi_hifz', JSON.stringify(r.data)); } } catch (e) {}
  try { const r = await api('review'); if (r.data) { S.review = r.data; localStorage.setItem('yawmi_review', JSON.stringify(r.data)); } } catch (e) {}
  if (S.tab === 'quran') renderQuran();
}
