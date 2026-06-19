'use strict';
/* ورقة اليوم — تطبيق متابعة (مرحلة ١): دخول + قائمة قابلة للتعديل + تقدّم + مزامنة */

const API = 'api/';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => 'x' + Math.random().toString(36).slice(2, 9);

// ===== الحالة =====
const S = {
  token: localStorage.getItem('yawmi_token') || '',
  user: null, template: null, settings: null, level: 'beginner',
  view: new Date(), tab: 'day', edit: false,
  days: {},            // كاش القيم لكل يوم
  progress: {},        // إنجاز الأيام للتقويم
};

const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayKey = () => dayKey(new Date());

// معاينة صوت الأذان (للإعدادات)
let adhanPlaying = '';
function resetPrevIcons() { $$('#screen [data-prev]').forEach(b => b.textContent = '▶'); }

// ===== API =====
async function api(route, method = 'GET', bodyObj = null) {
  const opt = { method, headers: {} };
  if (S.token) opt.headers['Authorization'] = 'Bearer ' + S.token;
  if (bodyObj) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(bodyObj); }
  const res = await fetch(API + '?r=' + route, opt);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'error'), { code: res.status, data });
  return data;
}

// ===== تخزين محلي (local-first) =====
const L = {
  setDay(date, values) { S.days[date] = values; try { localStorage.setItem('yawmi_d_' + date, JSON.stringify(values)); } catch (e) {} },
  getDay(date) {
    if (S.days[date]) return S.days[date];
    const raw = localStorage.getItem('yawmi_d_' + date);
    S.days[date] = raw ? JSON.parse(raw) : {};
    return S.days[date];
  },
  queue() { try { return JSON.parse(localStorage.getItem('yawmi_queue') || '[]'); } catch (e) { return []; } },
  enqueue(date) { const q = new Set(L.queue()); q.add(date); localStorage.setItem('yawmi_queue', JSON.stringify([...q])); },
  dequeue(date) { localStorage.setItem('yawmi_queue', JSON.stringify(L.queue().filter(d => d !== date))); },
};

async function pushDay(date) {
  const values = L.getDay(date);
  const completion = completionPct(date);
  try { await api('day', 'POST', { date, values, completion }); L.dequeue(date); S.progress[date] = completion; }
  catch (e) { L.enqueue(date); }
}
async function flushQueue() { for (const d of L.queue()) await pushDay(d); }
window.addEventListener('online', flushQueue);

// ===== الإنجاز =====
function boolItems(tpl) {
  const ids = [];
  (tpl || S.template).sections.forEach(s => s.items.forEach(it => {
    const k = it.kind || 'check';
    if (k === 'check' || it.group) ids.push(it.id);
  }));
  return ids;
}
function completionPct(date) {
  if (!S.template || !S.template.sections) return 0;
  const v = L.getDay(date); let total = 0, done = 0;
  S.template.sections.forEach(s => s.items.forEach(it => {
    const k = it.kind || 'check';
    if (k === 'check' || it.group) { total++; if (v[it.id] === true) done++; }
    else if (k === 'goal' && v[it.id + '_t']) { total++; if (v[it.id] === true) done++; } // الهدف يتحسب لو مكتوب بس
  }));
  return total ? Math.round(done / total * 100) : 0;
}
// ترقية قوالب المستخدمين القدامى: أهداف اليوم من text → goal (مرة واحدة)
function normalizeTemplate() {
  if (!S.template || !S.template.sections) return;
  let changed = false;
  S.template.sections.forEach(sec => {
    if (sec.id === 'goals') sec.items.forEach(it => { if ((it.kind || '') === 'text') { it.kind = 'goal'; changed = true; } });
  });
  if (changed) saveTemplate();
}
function computeStreak() {
  let d = new Date(), s = 0;
  const ok = k => (S.progress[k] != null ? S.progress[k] : completionPct(k)) >= 50;
  if (!ok(dayKey(d))) d.setDate(d.getDate() - 1);
  while (ok(dayKey(d))) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

// ===== شاشة الدخول =====
function renderAuth(mode = 'login') {
  document.body.classList.add('auth-mode');
  if (mode === 'forgot') return renderForgot();
  $('#root').innerHTML = `
    <div class="auth">
      <div class="auth-card">
        <div class="brand">وَرَقة ال<b>يَوم</b></div>
        <div class="brand-sub">رفيقك اليومي للعبادة والمتابعة</div>
        <div class="seg">
          <button id="tLogin" class="${mode === 'login' ? 'on' : ''}">دخول</button>
          <button id="tReg" class="${mode === 'register' ? 'on' : ''}">حساب جديد</button>
        </div>
        <form id="authForm">
          ${mode === 'register' ? `<input name="name" placeholder="اسمك" autocomplete="name">` : ''}
          <input name="email" type="email" placeholder="الإيميل" autocomplete="email" required>
          <input name="password" type="password" placeholder="الباسوورد" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" required>
          ${mode === 'register' ? `
          <label class="lvl-label">ابدأ من مستوى:</label>
          <div class="seg lvl">
            <button type="button" data-lvl="beginner" class="on">مبتدئ</button>
            <button type="button" data-lvl="intermediate">متوسط</button>
            <button type="button" data-lvl="advanced">متقدم</button>
          </div>
          <label class="lvl-label">سؤال استرجاع الباسوورد (لو نسيته):</label>
          <div class="rec-fields">
            <input name="recovery_q" placeholder="السؤال (مثلاً: اسم أول مدرسة؟)">
            <input name="recovery_a" placeholder="الإجابة">
          </div>` : ''}
          <button class="primary" type="submit">${mode === 'register' ? 'أنشئ الحساب' : 'دخول'}</button>
          ${mode === 'login' ? `<button type="button" class="link" id="forgotLink">نسيت الباسوورد؟</button>` : ''}
          <div class="err" id="authErr"></div>
        </form>
      </div>
    </div>`;
  $('#tLogin').onclick = () => renderAuth('login');
  $('#tReg').onclick = () => renderAuth('register');
  const fl = $('#forgotLink'); if (fl) fl.onclick = () => renderAuth('forgot');
  let chosen = 'beginner';
  $$('.lvl button').forEach(b => b.onclick = () => { $$('.lvl button').forEach(x => x.classList.remove('on')); b.classList.add('on'); chosen = b.dataset.lvl; });
  $('#authForm').onsubmit = async e => {
    e.preventDefault();
    const f = e.target; const err = $('#authErr'); err.textContent = '';
    const email = f.email.value.trim(), password = f.password.value;
    try {
      let data;
      if (mode === 'register') {
        const seed = JSON.parse(JSON.stringify(SEEDS[chosen]));
        data = await api('register', 'POST', { email, password, name: f.name.value.trim(), level: chosen,
          recovery_q: (f.recovery_q.value || '').trim(), recovery_a: (f.recovery_a.value || '').trim(),
          template: { motto: seed.motto, sections: seed.sections }, settings: DEFAULT_SETTINGS });
      } else {
        data = await api('login', 'POST', { email, password });
      }
      onAuth(data);
    } catch (ex) { err.textContent = ex.message || 'في مشكلة، حاول تاني'; }
  };
}

// ===== استرجاع الباسوورد بسؤال الأمان =====
function renderForgot() {
  $('#root').innerHTML = `
    <div class="auth">
      <div class="auth-card">
        <div class="brand">استرجاع الباسوورد</div>
        <div class="brand-sub">اكتب إيميلك ونجيب لك سؤال الأمان</div>
        <form id="fForm">
          <input name="email" type="email" placeholder="الإيميل" required>
          <div id="qBox"></div>
          <button class="primary" type="submit" id="fBtn">التالي</button>
          <button type="button" class="link" id="backLogin">رجوع للدخول</button>
          <div class="err" id="fErr"></div>
        </form>
      </div>
    </div>`;
  $('#backLogin').onclick = () => renderAuth('login');
  let step = 1, theQ = '';
  $('#fForm').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, err = $('#fErr'); err.textContent = '';
    const email = f.email.value.trim();
    try {
      if (step === 1) {
        const r = await api('forgot', 'POST', { email });
        if (!r.question) { err.textContent = r.msg || 'مفيش سؤال أمان متسجّل للحساب ده'; return; }
        theQ = r.question;
        $('#qBox').innerHTML = `<label class="lvl-label">${esc(theQ)}</label>
          <input name="answer" placeholder="إجابتك" required>
          <input name="password" type="password" placeholder="باسوورد جديد (٦ حروف+)" required>`;
        $('#fBtn').textContent = 'غيّر الباسوورد'; step = 2;
      } else {
        const data = await api('reset', 'POST', { email, answer: f.answer.value.trim(), password: f.password.value });
        onAuth(data);
      }
    } catch (ex) { err.textContent = ex.message || 'في مشكلة، حاول تاني'; }
  };
}

function onAuth(data) {
  S.token = data.token; S.user = data.user; S.template = data.template; S.settings = data.settings || DEFAULT_SETTINGS; S.level = data.level;
  localStorage.setItem('yawmi_token', S.token);
  localStorage.setItem('yawmi_template', JSON.stringify(S.template));
  localStorage.setItem('yawmi_settings', JSON.stringify(S.settings));
  document.body.classList.remove('auth-mode');
  buildShell(); render(); applyHash();
  syncFromServer(); initPrayer(); loadQuran(); scheduleReminders(); maybeResubscribePush();
}

function maybeResubscribePush() {
  if (S.settings && S.settings.pushEnabled && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => enablePush()).catch(() => {});
  }
}

function logout() {
  api('logout', 'POST').catch(() => {}); // يلغي التوكن من السيرفر (التوكن متقري قبل المسح)
  localStorage.removeItem('yawmi_token');
  S.token = ''; S.user = null;
  renderAuth('login');
}

async function syncFromServer() {
  try { const p = await api('progress'); S.progress = p.days || {}; } catch (e) {}
  try {
    const today = todayKey();
    if (!L.queue().includes(today)) {
      const r = await api('day&date=' + today);
      if (r.values && Object.keys(r.values).length) L.setDay(today, r.values);
    }
  } catch (e) {}
  flushQueue();
  if (S.tab === 'progress' || S.tab === 'day') render();
}

// ===== الهيكل (تبويبات) =====
function buildShell() {
  document.body.classList.remove('auth-mode');
  $('#root').innerHTML = `
    <div id="flash"></div>
    <header id="hdr"></header>
    <main id="screen"></main>
    <nav id="tabs">
      <button data-tab="day"><span>📋</span>اليوم</button>
      <button data-tab="quran"><span>📖</span>القرآن</button>
      <button data-tab="progress"><span>📈</span>التقدّم</button>
      <button data-tab="tools"><span>⚙️</span>أدوات</button>
    </nav>`;
  $$('#tabs button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; S.edit = false; render(); });
}

function render() {
  if (!S.token) return renderAuth('login');
  if (adhanPlaying) { try { Prayer.stopAdhan(); } catch (e) {} adhanPlaying = ''; }
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  if (S.tab === 'day') renderDay();
  else if (S.tab === 'progress') renderProgress();
  else if (S.tab === 'quran') renderQuran();
  else if (S.tab === 'tools') renderTools();
}

function flash() { const f = $('#flash'); if (!f) return; f.style.transform = 'scaleX(1)'; clearTimeout(flash._t); flash._t = setTimeout(() => f.style.transform = 'scaleX(0)', 250); }

// ===== شاشة اليوم =====
function renderDay() {
  normalizeTemplate();
  const key = dayKey(S.view);
  let g = key, h = '';
  try { g = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(S.view); } catch (e) {}
  try { h = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long' }).format(S.view); } catch (e) {}
  const isToday = key === todayKey();
  const pct = completionPct(key);
  const streak = computeStreak();

  $('#hdr').innerHTML = `
    <div class="h-row">
      <div class="h-title">وَرَقة ال<b>يَوم</b></div>
      <button class="edit-btn ${S.edit ? 'on' : ''}" id="editBtn">${S.edit ? '✓ تم' : '✎ تعديل'}</button>
    </div>
    <div class="motto">${esc(S.template.motto || '')}</div>
    <div class="datebar">
      <button id="next">‹</button>
      <div class="date" id="dlabel">${esc(g)}${isToday ? ' • النهاردة' : ''}${h ? `<small>${esc(h)} هـ</small>` : ''}</div>
      <button id="prev">›</button>
    </div>
    <div class="pbar"><i style="width:${pct}%"></i></div>
    <div class="pmeta"><span>${pct}% من يومك</span><span class="streak">🔥 ${streak} يوم متواصل</span></div>`;

  $('#editBtn').onclick = () => { S.edit = !S.edit; renderDay(); };
  $('#prev').onclick = () => { S.view.setDate(S.view.getDate() - 1); renderDay(); };
  $('#next').onclick = () => { const t = new Date(); t.setHours(0, 0, 0, 0); const v = new Date(S.view); v.setHours(0, 0, 0, 0); if (v < t) { S.view.setDate(S.view.getDate() + 1); renderDay(); } };
  $('#dlabel').onclick = () => { S.view = new Date(); renderDay(); };

  const v = L.getDay(key);
  let html = (isToday && !S.edit) ? prayerStripHTML() : '';
  S.template.sections.forEach((sec, si) => {
    html += `<div class="section" data-si="${si}">`;
    html += `<div class="sec-head"><span ${S.edit ? 'contenteditable class="ce"' : ''} data-secedit="${si}">${esc(sec.title)}</span>${secCount(sec, v)}</div>`;
    html += `<div class="items">`;
    let i = 0;
    while (i < sec.items.length) {
      const it = sec.items[i];
      if (it.group) {
        // اجمع المجموعة — pills في العرض، وصفوف تحت عنوان المجموعة في التعديل (يمنع لبس "الفجر مكرر")
        let j = i, inner = '';
        const gname = it.group;
        while (j < sec.items.length && sec.items[j].group === gname) {
          const p = sec.items[j];
          if (S.edit) inner += renderItem(sec, p, si, j, v);
          else inner += `<div class="pill ${v[p.id] === true ? 'on' : ''}" data-tog="${p.id}">${esc(p.label)}${p.note ? `<small>${esc(p.note)}</small>` : ''}</div>`;
          j++;
        }
        if (S.edit) html += `<div class="gedit"><div class="glabel-e">${esc(gname)}</div>${inner}</div>`;
        else html += `<div class="pills"><div class="glabel">${esc(gname)}</div>${inner}</div>`;
        i = j; continue;
      }
      html += renderItem(sec, it, si, i, v);
      i++;
    }
    if (sec.id === 'goals') html += `<button class="add-item" data-addgoal="${si}">+ أضف هدف</button>`;
    else if (S.edit) html += `<button class="add-item" data-add="${si}">+ مهمة</button>`;
    html += `</div></div>`;
  });
  if (S.edit) html += `<button class="add-section" id="addSec">+ قسم جديد</button>`;
  $('#screen').innerHTML = html;
  wireDay(key);
  wirePrayer();
}

function secCount(sec, v) {
  let total = 0, d = 0;
  sec.items.forEach(it => {
    const k = it.kind || 'check';
    if (k === 'check' || it.group) { total++; if (v[it.id] === true) d++; }
    else if (k === 'goal' && v[it.id + '_t']) { total++; if (v[it.id] === true) d++; }
  });
  if (!total) return '';
  return `<span class="cnt">${d} من ${total}</span>`;
}

const CHK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
const CHK = `<span class="check">${CHK_SVG}</span>`;

function renderItem(sec, it, si, ii, v) {
  const k = it.kind || 'check';
  const del = S.edit ? `<button class="del" data-del="${si}:${ii}">✕</button>` : '';
  if (k === 'goal') {
    if (S.edit) {
      return `<div class="field"><label>${editLabel(it, si, ii)}</label><div class="frow"><input type="text" data-goaltext="${it.id}" value="${esc(v[it.id + '_t'] || '')}">${del}</div></div>`;
    }
    const done = v[it.id] === true;
    return `<div class="goal ${done ? 'done' : ''}">
      <span class="check" data-tog="${it.id}">${CHK_SVG}</span>
      <input class="goal-inp" data-goaltext="${it.id}" placeholder="هدف ${esc(it.label)}" value="${esc(v[it.id + '_t'] || '')}"></div>`;
  }
  if (k === 'rating') {
    let dots = ''; for (let n = 1; n <= 10; n++) dots += `<div class="rdot ${v[it.id] === n ? 'on' : ''}" data-rate="${it.id}:${n}">${n}</div>`;
    return `<div class="field"><label>${editLabel(it, si, ii)}</label><div class="rating">${dots}</div>${del}</div>`;
  }
  if (k === 'text' || k === 'time') {
    const t = k === 'time' ? 'time' : 'text';
    return `<div class="field"><label>${editLabel(it, si, ii)}</label><div class="frow"><input type="${t}" data-inp="${it.id}" value="${esc(v[it.id] || '')}">${del}</div></div>`;
  }
  // check
  return `<div class="item ${v[it.id] === true ? 'done' : ''}" ${S.edit ? '' : `data-tog="${it.id}"`}>
    ${S.edit ? '' : CHK}<div class="lbl"><span ${S.edit ? 'contenteditable class="ce"' : ''} data-lbledit="${si}:${ii}">${esc(it.label)}</span>${it.note && !S.edit ? `<small>${esc(it.note)}</small>` : ''}</div>${del}</div>`;
}
function editLabel(it, si, ii) {
  return S.edit ? `<span contenteditable class="ce" data-lbledit="${si}:${ii}">${esc(it.label)}</span>` : esc(it.label);
}

function wireDay(key) {
  const v = L.getDay(key);
  const save = () => { L.setDay(key, v); flash(); schedulePush(key); };
  $$('#screen [data-tog]').forEach(el => el.onclick = () => { const id = el.dataset.tog; v[id] = v[id] === true ? undefined : true; if (v[id] === undefined) delete v[id]; save(); renderDay(); });
  $$('#screen [data-rate]').forEach(el => el.onclick = () => { const [id, n] = el.dataset.rate.split(':'); v[id] = v[id] === +n ? undefined : +n; if (v[id] === undefined) delete v[id]; save(); renderDay(); });
  $$('#screen [data-inp]').forEach(el => el.oninput = () => { const id = el.dataset.inp; if (el.value) v[id] = el.value; else delete v[id]; save(); });
  $$('#screen [data-goaltext]').forEach(el => el.oninput = () => { const k = el.dataset.goaltext + '_t'; if (el.value) v[k] = el.value; else delete v[k]; save(); });
  $$('#screen [data-addgoal]').forEach(el => el.onclick = () => {
    const si = +el.dataset.addgoal;
    S.template.sections[si].items.push({ id: uid(), kind: 'goal', label: String(S.template.sections[si].items.length + 1) });
    saveTemplate(); renderDay();
  });
  if (S.edit) wireEdit();
}

let pushT;
function schedulePush(key) { clearTimeout(pushT); pushT = setTimeout(() => pushDay(key), 600); }

// ===== وضع التعديل =====
function wireEdit() {
  $$('#screen [data-del]').forEach(el => el.onclick = () => {
    const [si, ii] = el.dataset.del.split(':').map(Number);
    S.template.sections[si].items.splice(ii, 1); saveTemplate(); renderDay();
  });
  $$('#screen [data-add]').forEach(el => el.onclick = async () => {
    const si = +el.dataset.add;
    const r = await uiPrompt({ title: 'مهمة جديدة', fields: [{ name: 'label', label: 'اسم المهمة', placeholder: 'مثلاً: قراءة ورد' }] }); if (!r) return;
    S.template.sections[si].items.push({ id: uid(), label: r.label }); saveTemplate(); renderDay();
  });
  const addSec = $('#addSec');
  if (addSec) addSec.onclick = async () => {
    const r = await uiPrompt({ title: 'قسم جديد', fields: [{ name: 'title', label: 'اسم القسم', placeholder: 'مثلاً: أذكار' }] }); if (!r) return;
    S.template.sections.push({ id: uid(), title: r.title, items: [] }); saveTemplate(); renderDay();
  };
  $$('#screen [data-lbledit]').forEach(el => el.onblur = () => {
    const [si, ii] = el.dataset.lbledit.split(':').map(Number);
    const t = el.textContent.trim(); if (t) S.template.sections[si].items[ii].label = t; saveTemplate();
  });
  $$('#screen [data-secedit]').forEach(el => el.onblur = () => {
    const si = +el.dataset.secedit; const t = el.textContent.trim(); if (t) S.template.sections[si].title = t; saveTemplate();
  });
}
let tplT;
function saveTemplate() {
  localStorage.setItem('yawmi_template', JSON.stringify(S.template));
  clearTimeout(tplT); tplT = setTimeout(() => api('template', 'POST', { template: S.template }).catch(() => {}), 700);
  flash();
}

// ===== التقدّم =====
function renderProgress() {
  $('#hdr').innerHTML = `<div class="h-row"><div class="h-title">التقدّم</div></div>`;
  const streak = computeStreak();
  const vals = Object.values(S.progress);
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + (+b), 0) / vals.length) : 0;
  // تقويم الشهر الحالي
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1); const days = new Date(y, m + 1, 0).getDate();
  const startW = first.getDay();
  let cells = '';
  for (let i = 0; i < startW; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const p = S.progress[k] != null ? +S.progress[k] : (localStorage.getItem('yawmi_d_' + k) ? completionPct(k) : null);
    const lvl = p == null ? 'n' : p >= 80 ? 'h' : p >= 50 ? 'm' : p > 0 ? 'l' : 'z';
    cells += `<div class="cal-cell c-${lvl}" title="${p == null ? '' : p + '%'}">${d}</div>`;
  }
  const wd = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
  $('#screen').innerHTML = `
    <div class="stats">
      <div class="stat"><b>🔥 ${streak}</b><span>يوم متواصل</span></div>
      <div class="stat"><b>${avg}%</b><span>متوسط الإنجاز</span></div>
      <div class="stat"><b>${vals.filter(x => +x >= 50).length}</b><span>أيام ناجحة</span></div>
    </div>
    <div class="section"><div class="sec-head"><span>${esc(new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(now))}</span></div>
      <div class="cal-wd">${wd.map(w => `<span>${w}</span>`).join('')}</div>
      <div class="cal">${cells}</div>
      <div class="legend"><span class="c-h"></span>عالي<span class="c-m"></span>متوسط<span class="c-l"></span>قليل<span class="c-z"></span>صفر</div>
    </div>`;
}

// ===== أقسام الإعدادات (تُعرض داخل تبويب أدوات — انظر tools.js) =====
function settingsSectionsHTML() {
  const p = S.settings.prayer || {}; const ad = S.settings.adhan || {};
  const located = p.lat != null;
  const methodOpts = Object.entries(Prayer.METHODS).map(([k, m]) => `<option value="${k}" ${p.method === k ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
  return `
    <div class="section"><div class="sec-head"><span>🕌 مواعيد الصلاة والأذان</span></div>
      <div class="setbox">
        <div class="acct-row"><span>الموقع</span><b>${located ? esc(p.city || (p.lat + ', ' + p.lng)) : 'غير محدّد'}</b></div>
        <button class="mini" id="locBtn2">${located ? 'تحديد تلقائي بالـGPS' : 'حدّد موقعي تلقائياً'}</button>
        <label class="setlbl">أو اختر مدينتك من القائمة</label>
        <select id="citySel">
          <option value="">📍 تحديد تلقائي (GPS)</option>
          ${Object.keys(Prayer.CITIES).map(c => `<option value="${esc(c)}" ${p.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        ${located ? `
        <label class="setlbl">طريقة الحساب</label>
        <select id="mMethod">${methodOpts}</select>
        <label class="setlbl">حساب العصر</label>
        <div class="seg sm"><button type="button" data-asr="Standard" class="${p.asr !== 'Hanafi' ? 'on' : ''}">الجمهور</button><button type="button" data-asr="Hanafi" class="${p.asr === 'Hanafi' ? 'on' : ''}">الحنفي</button></div>
        <label class="setlbl">تعديل بالدقائق (±) — لو الأذان عندك بيتأخّر أو يتقدّم</label>
        <div>
          ${['fajr:الفجر', 'dhuhr:الظهر', 'asr:العصر', 'maghrib:المغرب', 'isha:العشاء'].map(o => { const [k, l] = o.split(':'); const val = (p.offsets && p.offsets[k]) || 0; return `<div class="rem-row"><span>${l}</span><div class="ministep"><button data-offd="${k}:-1">−</button><b id="off_${k}">${val}</b><button data-offd="${k}:1">+</button></div></div>`; }).join('')}
        </div>
        <div class="acct-row"><span>الأذان وقت الصلاة</span><label class="sw"><input type="checkbox" id="adhanOn" ${ad.enabled ? 'checked' : ''}><i></i></label></div>
        <label class="setlbl">صوت الأذان — اضغط ▶ تسمعه، ودوس الاسم تختاره</label>
        <div class="adhan-list">
          ${ADHANS.map(a => `<div class="adhan-row ${ad.reciter === a.id ? 'sel' : ''}" data-areciter="${a.id}"><span class="adhan-name">${esc(a.name)}</span><button class="adhan-prev" data-prev="${a.id}">▶</button></div>`).join('')}
        </div>` : ''}
      </div></div>
    ${remindersHTML()}
    <div class="section"><div class="sec-head"><span>🔐 الحساب والأمان</span></div>
      <div class="acct">
        <div class="acct-row"><span>الاسم</span><b>${esc(S.user?.name || '—')}</b></div>
        <div class="acct-row"><span>الإيميل</span><b>${esc(S.user?.email || '')}</b></div>
        <div class="acct-row"><span>سؤال استرجاع الباسوورد</span><b>${S.user?.hasRecovery ? 'مفعّل ✓' : 'غير مضبوط'}</b></div>
        <button class="mini ghost" id="setRecBtn" style="width:100%;margin-top:8px">${S.user?.hasRecovery ? 'تغيير سؤال الأمان' : 'اضبط سؤال استرجاع الباسوورد'}</button>
        <button class="mini ghost" id="chgPassBtn" style="width:100%;margin-top:8px">تغيير الباسوورد</button>
        <button class="logout" id="logoutBtn">تسجيل الخروج</button>
      </div></div>
    <div class="credit">اللهم اجعله صدقة جارية 🤍</div>`;
}
function wireSettings() {
  const lb = $('#locBtn2'); if (lb) lb.onclick = setupLocation;
  const mm = $('#mMethod'); if (mm) mm.onchange = () => { S.settings.prayer.method = mm.value; saveSettings(); Prayer.schedule(S.settings); renderTools(); };
  $$('[data-asr]').forEach(b => b.onclick = () => { S.settings.prayer.asr = b.dataset.asr; saveSettings(); Prayer.schedule(S.settings); renderTools(); });
  $$('[data-offd]').forEach(b => b.onclick = () => {
    const [k, d] = b.dataset.offd.split(':');
    S.settings.prayer.offsets = S.settings.prayer.offsets || {};
    const val = Math.max(-30, Math.min(30, (S.settings.prayer.offsets[k] || 0) + (+d)));
    S.settings.prayer.offsets[k] = val;
    const el = document.getElementById('off_' + k); if (el) el.textContent = val;
    saveSettings(); Prayer.schedule(S.settings);
  });
  const cs = $('#citySel'); if (cs) cs.onchange = () => {
    const c = cs.value;
    if (!c) { setupLocation(); return; }
    const co = Prayer.CITIES[c]; if (!co) return;
    S.settings.prayer.lat = co[0]; S.settings.prayer.lng = co[1]; S.settings.prayer.city = c;
    saveSettings(); Prayer.askNotify(); Prayer.schedule(S.settings); render();
  };
  const ao = $('#adhanOn'); if (ao) ao.onchange = () => { S.settings.adhan = S.settings.adhan || {}; S.settings.adhan.enabled = ao.checked; saveSettings(); if (ao.checked) { Prayer.askNotify(); Prayer.schedule(S.settings); } };
  $$('#screen [data-areciter]').forEach(row => row.onclick = (e) => {
    if (e.target.closest('[data-prev]')) return;
    S.settings.adhan = S.settings.adhan || {}; S.settings.adhan.reciter = row.dataset.areciter; saveSettings();
    $$('#screen .adhan-row').forEach(r => r.classList.toggle('sel', r === row));
  });
  $$('#screen [data-prev]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.prev;
    if (adhanPlaying === id) { Prayer.stopAdhan(); adhanPlaying = ''; resetPrevIcons(); return; }
    Prayer.stopAdhan(); resetPrevIcons();
    Prayer.play(id); adhanPlaying = id; btn.textContent = '⏸';
    try { Prayer.audioEl().onended = () => { adhanPlaying = ''; resetPrevIcons(); }; } catch (x) {}
  });
  wireReminders();
  const sr = $('#setRecBtn'); if (sr) sr.onclick = setRecovery;
  const cp = $('#chgPassBtn'); if (cp) cp.onclick = changePassword;
  $('#logoutBtn').onclick = async () => { if (await uiConfirm('تسجيل الخروج؟ بياناتك محفوظة على السيرفر.', { okText: 'خروج', danger: true })) logout(); };
}

async function setRecovery() {
  const r = await uiPrompt({ title: 'سؤال استرجاع الباسوورد', message: 'لو نسيت الباسوورد هتسترجعه بإجابة السؤال ده — افتكرها كويس.', fields: [
    { name: 'q', label: 'السؤال', placeholder: 'مثلاً: اسم أول مدرسة؟' },
    { name: 'a', label: 'الإجابة', placeholder: 'إجابتك' },
  ] }); if (!r) return;
  try { await api('set-recovery', 'POST', { recovery_q: r.q, recovery_a: r.a }); S.user.hasRecovery = true; uiToast('تم ضبط سؤال الأمان ✓'); renderTools(); }
  catch (e) { uiToast('في مشكلة، حاول تاني'); }
}
async function changePassword() {
  const r = await uiPrompt({ title: 'تغيير الباسوورد', fields: [
    { name: 'old', label: 'الباسوورد الحالي', type: 'password', placeholder: '••••••' },
    { name: 'np', label: 'الباسوورد الجديد (٦ حروف على الأقل)', type: 'password', placeholder: '••••••' },
  ] }); if (!r) return;
  if (r.np.length < 6) { uiToast('الباسوورد الجديد لازم ٦ حروف على الأقل'); return; }
  try { await api('change-password', 'POST', { old: r.old, password: r.np }); uiToast('تم تغيير الباسوورد ✓'); }
  catch (e) { uiToast(e.message || 'الباسوورد الحالي غلط'); }
}

function renderSoon(title, msg) {
  $('#hdr').innerHTML = `<div class="h-row"><div class="h-title">${esc(title)}</div></div>`;
  $('#screen').innerHTML = `<div class="soon"><div class="soon-ic">📖</div><p>${esc(msg)}</p></div>`;
}

// ===== مواعيد الصلاة (شريط في اليوم) =====
function prayerStripHTML() {
  const p = (S.settings && S.settings.prayer) || {};
  if (p.lat == null) {
    return `<div class="psrip locate"><span>🕌 فعّل مواعيد الصلاة والأذان</span><button id="locBtn">حدّد موقعي</button></div>`;
  }
  const t = Prayer.timesFor(new Date(), S.settings);
  const n = Prayer.next(S.settings);
  let cells = '';
  Prayer.ORDER.filter(([k]) => k !== 'sunrise').forEach(([k, lbl]) => {
    cells += `<div class="pcell ${n && n.key === k ? 'nx' : ''}"><span>${lbl}</span><b>${Prayer.fmt(t[k])}</b></div>`;
  });
  const cd = n ? `الصلاة الجاية: ${n.label} بعد ${n.inMin >= 60 ? Math.floor(n.inMin / 60) + ' س ' + (n.inMin % 60) + ' د' : n.inMin + ' دقيقة'}` : '';
  return `<div class="psrip"><div class="pcells">${cells}</div><div class="pnext">${cd}${p.city ? ' • ' + esc(p.city) : ''}</div></div>`;
}
function wirePrayer() {
  const b = $('#locBtn'); if (b) b.onclick = setupLocation;
}
async function setupLocation() {
  const b = $('#locBtn'); if (b) { b.textContent = 'بيحدد...'; b.disabled = true; }
  const c = await Prayer.geolocate();
  if (!c) { pickCity(); if (b) { b.textContent = 'حدّد موقعي'; b.disabled = false; } return; }
  S.settings.prayer.lat = +c[0].toFixed(4); S.settings.prayer.lng = +c[1].toFixed(4); S.settings.prayer.city = '';
  saveSettings(); Prayer.askNotify(); Prayer.schedule(S.settings); render();
}
function pickCity() {
  // الموقع التلقائي فشل → نوجّه المستخدم لقائمة المدن في الإعدادات
  uiToast('مش قادر أحدد موقعك تلقائياً — اختر مدينتك من قائمة «مواعيد الصلاة» في الإعدادات');
  S.tab = 'tools'; S.toolsub = 'home'; render();
}
let setT;
function saveSettings() {
  localStorage.setItem('yawmi_settings', JSON.stringify(S.settings));
  clearTimeout(setT); setT = setTimeout(() => api('settings', 'POST', { settings: S.settings }).catch(() => {}), 600);
  flash();
}
function initPrayer() {
  if (S.settings && S.settings.prayer && S.settings.prayer.lat != null) { Prayer.askNotify(); Prayer.schedule(S.settings); }
}

// ===== توجيه من الإشعار (hash) =====
function applyHash() {
  const h = (location.hash || '').replace(/^#/, '');
  if (!h || !S.token) return;
  const [seg, sub] = h.split('/');
  if (['day', 'quran', 'progress', 'tools'].includes(seg)) S.tab = seg;
  if (seg === 'adhkar') { S.tab = 'tools'; S.toolsub = 'adhkar'; S.adhkarCat = sub || null; }
  if (document.querySelector('#tabs')) render();
}
window.addEventListener('hashchange', applyHash);
if ('serviceWorker' in navigator && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'navigate' && e.data.url) {
      const hk = (e.data.url.split('#')[1] || '');
      location.hash = hk ? '#' + hk : '';
      applyHash();
    }
  });
}

// ===== تشغيل =====
function boot() {
  if (S.token) {
    S.template = JSON.parse(localStorage.getItem('yawmi_template') || 'null');
    S.settings = JSON.parse(localStorage.getItem('yawmi_settings') || 'null') || DEFAULT_SETTINGS;
    if (S.template) { buildShell(); render(); }
    if (S.settings) { initPrayer(); scheduleReminders(); }
    loadQuran();
    api('bootstrap').then(d => { S.user = d.user; S.template = d.template; S.settings = d.settings || DEFAULT_SETTINGS; S.level = d.level;
      localStorage.setItem('yawmi_template', JSON.stringify(S.template)); localStorage.setItem('yawmi_settings', JSON.stringify(S.settings));
      if (!document.querySelector('#tabs')) buildShell(); render(); applyHash(); syncFromServer(); initPrayer(); scheduleReminders(); maybeResubscribePush(); })
      .catch(e => { if (e.code === 401) logout(); });
  } else {
    renderAuth('login');
  }
}
boot();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
