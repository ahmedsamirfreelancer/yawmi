'use strict';
/* تبويب أدوات: بومودورو + سبحة + قبلة + آية/حديث اليوم + التذكيرات + الإعدادات */

const KAABA = [21.4225, 39.8262];

// ===== الرئيسية =====
function renderTools() {
  const sub = S.toolsub || 'home';
  if (sub === 'adhkar') return renderAdhkar();
  $('#hdr').innerHTML = `<div class="h-row"><div class="h-title">⚙️ أدوات وإعدادات</div>
    ${sub !== 'home' ? `<button class="edit-btn" id="tBack">‹ رجوع</button>` : ''}</div>`;
  const back = $('#tBack'); if (back) back.onclick = () => { S.toolsub = 'home'; renderTools(); };
  if (sub === 'pomodoro') return renderPomodoro();
  if (sub === 'tasbih') return renderTasbih();
  if (sub === 'qibla') return renderQibla();
  // الرئيسية
  $('#screen').innerHTML = `
    ${dailyAyahHTML()}
    <div class="tgrid">
      <button class="ttile big" data-go="adhkar"><span>📿</span>الأذكار</button>
      <button class="ttile" data-go="pomodoro"><span>⏱️</span>بومودورو</button>
      <button class="ttile" data-go="tasbih"><span>📿</span>سبحة حرة</button>
      <button class="ttile" data-go="qibla"><span>🧭</span>القبلة</button>
    </div>
    ${settingsSectionsHTML()}`;
  $$('#screen [data-go]').forEach(b => b.onclick = () => { S.toolsub = b.dataset.go; if (b.dataset.go === 'adhkar') S.adhkarCat = null; renderTools(); });
  wireSettings();
}

// ===== آية/حديث اليوم =====
function dayOfYear(d) { const s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 86400000); }
function dailyAyahHTML() {
  const it = DAILY_ITEMS[dayOfYear(new Date()) % DAILY_ITEMS.length];
  return `<div class="ayah"><div class="ayah-tag">${esc(it.t)} اليوم</div><div class="ayah-body">${esc(it.body)}</div><div class="ayah-src">${esc(it.src)}</div></div>`;
}

// ===== بومودورو =====
let pomoTick = null, pomoByTask = [];
function pomoState() { try { return JSON.parse(localStorage.getItem('yawmi_pomo') || 'null'); } catch (e) { return null; } }
function pomoSave(s) { if (s) localStorage.setItem('yawmi_pomo', JSON.stringify(s)); else localStorage.removeItem('yawmi_pomo'); }
function pomoTask() { return localStorage.getItem('yawmi_pomo_task') || ''; }
function pomoSetTask(t) { if (t) localStorage.setItem('yawmi_pomo_task', t); else localStorage.removeItem('yawmi_pomo_task'); }

// بناء قائمة المهام (من اليوم + القرآن)
function pomoTaskOptions(sel) {
  const v = L.getDay(todayKey());
  const day = [];
  if (S.template && S.template.sections) S.template.sections.forEach(s => s.items.forEach(it => {
    const k = it.kind || 'check';
    if (k === 'goal') { const t = v[it.id + '_t']; if (t && !day.includes(t)) day.push(t); }
    else if (k === 'check' || it.group) { const t = (it.group ? it.group + ': ' : '') + it.label; if (!day.includes(t)) day.push(t); }
  }));
  const q = [];
  if (S.hifz && S.hifz.enabled) { q.push('حفظ القرآن (الحصون)'); q.push('مراجعة الحفظ'); }
  if (S.review && S.review.started) q.push('مراجعة رسوخ');
  q.push('تلاوة وتدبّر');
  const opt = (val, lbl) => `<option value="${esc(val)}" ${sel === val ? 'selected' : ''}>${esc(lbl)}</option>`;
  let html = `<option value="" ${!sel ? 'selected' : ''}>— من غير مهمة —</option>`;
  if (day.length) html += `<optgroup label="مهام اليوم">${day.map(t => opt(t, t)).join('')}</optgroup>`;
  html += `<optgroup label="القرآن">${q.map(t => opt(t, t)).join('')}</optgroup>`;
  const custom = sel && sel !== '__custom__' && !day.includes(sel) && !q.includes(sel);
  html += `<option value="__custom__" ${(sel === '__custom__' || custom) ? 'selected' : ''}>✏️ أخرى (اكتب بنفسك)…</option>`;
  return html;
}

function renderPomodoro() {
  const cfg = (S.settings && S.settings.pomodoro) || { focus: 25, brk: 5, long: 15 };
  cfg.focus = cfg.focus || 25; cfg.brk = cfg.brk || 5; cfg.long = cfg.long || 15;
  let st = pomoState();
  const sel = pomoTask();
  const isCustom = sel && pomoTaskOptions(sel).indexOf('value="' + esc(sel) + '"') === -1;
  const phaseLbl = { focus: 'تركيز', brk: 'راحة', long: 'راحة طويلة' };
  $('#screen').innerHTML = `
    <div class="section"><div class="sec-head"><span>⏱️ مؤقّت بومودورو</span><span class="cnt" id="pomoTotal">—</span></div>
      <div class="pomo">
        <div class="pomo-phase" id="pPhase">${st ? phaseLbl[st.phase] : 'جاهز'}</div>
        <div class="pomo-time" id="pTime">${String(cfg.focus).padStart(2, '0')}:00</div>
        <div class="pomo-cur" id="pCur"></div>
        <div class="pomo-btns">
          <button class="primary" id="pStart">${st && st.running ? '⏸ إيقاف مؤقت' : '▶ ابدأ'}</button>
          <button class="mini ghost" id="pReset">إعادة</button>
        </div>
      </div></div>
    <div class="section"><div class="sec-head"><span>على إيه بتركّز؟</span></div>
      <div class="setbox">
        <select id="pTaskSel">${pomoTaskOptions(isCustom ? '__custom__' : sel)}</select>
        <input id="pTaskCustom" class="pomo-task" placeholder="اكتب المهمة" value="${isCustom ? esc(sel) : ''}" style="display:${isCustom ? 'block' : 'none'};margin-top:10px">
      </div></div>
    <div class="section"><div class="sec-head"><span>المدة (دقيقة)</span></div>
      <div class="setbox">
        <label class="setlbl">التركيز</label>
        <div class="stepper"><button data-pd="focus:-5">−</button><b id="pdFocus">${cfg.focus}</b><button data-pd="focus:5">+</button></div>
        <div class="seg sm" style="margin-top:8px">${[15, 25, 45].map(n => `<button type="button" data-pq="${n}" class="${cfg.focus === n ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="offs" style="margin-top:12px">
          <div class="off"><span>راحة</span><div class="ministep"><button data-pd="brk:-1">−</button><b id="pdBrk">${cfg.brk}</b><button data-pd="brk:1">+</button></div></div>
          <div class="off"><span>راحة طويلة</span><div class="ministep"><button data-pd="long:-5">−</button><b id="pdLong">${cfg.long}</b><button data-pd="long:5">+</button></div></div>
        </div>
      </div></div>`;

  const refreshCounts = () => {
    api('pomodoro').then(d => {
      pomoByTask = d.byTask || [];
      const e = $('#pomoTotal'); if (e) e.textContent = `النهاردة ${d.cnt || 0} 🍅 (${d.total || 0}د)`;
      drawCur();
    }).catch(() => {});
  };
  const drawCur = () => {
    const cur = $('#pCur'); if (!cur) return;
    const t = currentTask();
    if (!t) { cur.textContent = ''; return; }
    const row = pomoByTask.find(x => x.task === t);
    cur.innerHTML = `على «${esc(t)}» — <b>${row ? row.cnt : 0}</b> بومودورو النهاردة`;
  };
  const currentTask = () => {
    const selv = $('#pTaskSel') ? $('#pTaskSel').value : sel;
    if (selv === '__custom__') return ($('#pTaskCustom') && $('#pTaskCustom').value.trim()) || '';
    return selv || '';
  };

  const draw = () => {
    const s = pomoState(); const tEl = $('#pTime'), phEl = $('#pPhase');
    if (!tEl) return;
    if (!s) { tEl.textContent = String(cfg.focus).padStart(2, '0') + ':00'; if (phEl) phEl.textContent = 'جاهز'; return; }
    let rem = s.running ? Math.max(0, Math.round((s.endTs - Date.now()) / 1000)) : s.remain;
    if (phEl) phEl.textContent = phaseLbl[s.phase];
    tEl.textContent = String(Math.floor(rem / 60)).padStart(2, '0') + ':' + String(rem % 60).padStart(2, '0');
    if (s.running && rem <= 0) pomoFinish();
  };
  clearInterval(pomoTick); pomoTick = setInterval(draw, 500); draw();
  refreshCounts();

  // اختيار المهمة
  $('#pTaskSel').onchange = () => {
    const val = $('#pTaskSel').value;
    $('#pTaskCustom').style.display = val === '__custom__' ? 'block' : 'none';
    if (val !== '__custom__') { pomoSetTask(val); drawCur(); }
  };
  $('#pTaskCustom').oninput = () => { pomoSetTask($('#pTaskCustom').value.trim()); drawCur(); };

  // المدة
  const saveCfg = () => { S.settings.pomodoro = cfg; saveSettings(); };
  $$('#screen [data-pd]').forEach(b => b.onclick = () => {
    const [k, d] = b.dataset.pd.split(':');
    const min = k === 'focus' ? 5 : k === 'brk' ? 1 : 5, max = k === 'focus' ? 90 : k === 'brk' ? 30 : 45;
    cfg[k] = Math.max(min, Math.min(max, (cfg[k] || 0) + (+d)));
    saveCfg();
    const ids = { focus: 'pdFocus', brk: 'pdBrk', long: 'pdLong' };
    const el = document.getElementById(ids[k]); if (el) el.textContent = cfg[k];
    if (k === 'focus') { $$('[data-pq]').forEach(x => x.classList.toggle('on', +x.dataset.pq === cfg.focus)); const s = pomoState(); if (!s || !s.running) { $('#pTime').textContent = String(cfg.focus).padStart(2, '0') + ':00'; } }
  });
  $$('#screen [data-pq]').forEach(b => b.onclick = () => {
    cfg.focus = +b.dataset.pq; saveCfg();
    $('#pdFocus').textContent = cfg.focus; $$('[data-pq]').forEach(x => x.classList.toggle('on', x === b));
    const s = pomoState(); if (!s || !s.running) $('#pTime').textContent = String(cfg.focus).padStart(2, '0') + ':00';
  });

  $('#pStart').onclick = () => {
    let s = pomoState();
    if (!s) s = { phase: 'focus', running: false, remain: cfg.focus * 60, cycle: 0, task: '' };
    s.task = currentTask();
    if (s.running) { s.remain = Math.max(0, Math.round((s.endTs - Date.now()) / 1000)); s.running = false; }
    else {
      if (!s.remain || s.phase === 'focus' && s.remain > cfg.focus * 60) s.remain = cfg.focus * 60;
      s.endTs = Date.now() + (s.remain || cfg.focus * 60) * 1000; s.running = true; Prayer.askNotify();
    }
    pomoSave(s); renderPomodoro();
  };
  $('#pReset').onclick = () => { pomoSave(null); renderPomodoro(); };
}
function pomoFinish() {
  const cfg = (S.settings && S.settings.pomodoro) || { focus: 25, brk: 5, long: 15 };
  let s = pomoState(); if (!s) return;
  try { if (window.Notification && Notification.permission === 'granted') new Notification(s.phase === 'focus' ? 'خلصت التركيز! خد راحة 🤍' : 'الراحة خلصت، يلا نركّز', { icon: 'icon-192.png' }); } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
  if (s.phase === 'focus') {
    api('pomodoro', 'POST', { task: s.task || '', minutes: cfg.focus }).catch(() => {});
    s.cycle = (s.cycle || 0) + 1;
    s.phase = (s.cycle % 4 === 0) ? 'long' : 'brk';
  } else { s.phase = 'focus'; }
  const dur = (s.phase === 'focus' ? cfg.focus : s.phase === 'brk' ? cfg.brk : cfg.long) * 60;
  s.remain = dur; s.running = false; pomoSave(s);
  if (S.tab === 'tools' && S.toolsub === 'pomodoro') renderPomodoro();
}

// ===== السبحة =====
function tasbihState() { try { return JSON.parse(localStorage.getItem('yawmi_tasbih') || 'null'); } catch (e) { return null; } }
function renderTasbih() {
  let s = tasbihState() || { label: 'سبحان الله وبحمده', count: 0, target: 100 };
  const presets = [['سبحان الله وبحمده', 100], ['أستغفر الله', 100], ['لا إله إلا الله', 100], ['الحمد لله', 33], ['الله أكبر', 33], ['اللهم صل على محمد', 100]];
  const save = () => localStorage.setItem('yawmi_tasbih', JSON.stringify(s));
  $('#screen').innerHTML = `
    <div class="section"><div class="sec-head"><span>📿 السبحة</span></div>
      <div class="setbox">
        <select id="tsLabel">${presets.map(([l, t]) => `<option value="${esc(l)}|${t}" ${s.label === l ? 'selected' : ''}>${esc(l)} (${t})</option>`).join('')}</select>
      </div></div>
    <div class="tasbih">
      <div class="ts-count" id="tsCount">${s.count}</div>
      <div class="ts-target">من ${s.target} • لفّة ${Math.floor(s.count / s.target)}</div>
      <button class="ts-btn" id="tsBtn">سبّح</button>
      <button class="mini ghost" id="tsReset" style="margin-top:14px">تصفير</button>
    </div>`;
  const upd = () => { $('#tsCount').textContent = s.count; $('.ts-target').textContent = `من ${s.target} • لفّة ${Math.floor(s.count / s.target)}`; };
  $('#tsBtn').onclick = () => {
    s.count++;
    if (s.count % s.target === 0) { try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) {} }
    else { try { navigator.vibrate && navigator.vibrate(15); } catch (e) {} }
    save(); upd();
  };
  $('#tsReset').onclick = () => { s.count = 0; save(); upd(); };
  $('#tsLabel').onchange = e => { const [l, t] = e.target.value.split('|'); s.label = l; s.target = +t; s.count = 0; save(); renderTasbih(); };
}

// ===== القبلة =====
let qiblaHandler = null;
function bearingTo(lat1, lng1, lat2, lng2) {
  const toR = d => d * Math.PI / 180, toD = r => r * 180 / Math.PI;
  const dL = toR(lng2 - lng1);
  const y = Math.sin(dL) * Math.cos(toR(lat2));
  const x = Math.cos(toR(lat1)) * Math.sin(toR(lat2)) - Math.sin(toR(lat1)) * Math.cos(toR(lat2)) * Math.cos(dL);
  return (toD(Math.atan2(y, x)) + 360) % 360;
}
function renderQibla() {
  const p = (S.settings && S.settings.prayer) || {};
  if (p.lat == null) {
    $('#screen').innerHTML = `<div class="soon"><div class="soon-ic">🧭</div><p>حدّد موقعك الأول من الإعدادات عشان نحسب اتجاه القبلة.</p>
      <button class="mini" id="qLoc">حدّد موقعي</button></div>`;
    $('#qLoc').onclick = setupLocation; return;
  }
  const qb = Math.round(bearingTo(p.lat, p.lng, KAABA[0], KAABA[1]));
  $('#screen').innerHTML = `
    <div class="section"><div class="sec-head"><span>🧭 اتجاه القبلة</span></div>
      <div class="qibla">
        <div class="compass" id="compass">
          <div class="c-needle" id="cNeedle">🕋</div>
          <div class="c-n">ش</div><div class="c-e">شرق</div><div class="c-s">ج</div><div class="c-w">غرب</div>
        </div>
        <div class="q-deg">القبلة على <b>${qb}°</b> من الشمال</div>
        <div class="q-hint" id="qHint">حرّك تليفونك أفقياً ووجّه الكعبة 🕋 لأعلى</div>
        <button class="mini ghost" id="qPerm" style="display:none">تفعيل البوصلة</button>
      </div></div>`;
  const needle = $('#cNeedle'), hint = $('#qHint');
  const apply = (heading) => {
    // زاوية الكعبة بالنسبة لاتجاه الجهاز
    const rot = (qb - heading + 360) % 360;
    needle.style.transform = `rotate(${rot}deg)`;
    if (hint) hint.textContent = Math.abs(((rot + 180) % 360) - 180) < 8 ? '✅ دلوقتي إنت في اتجاه القبلة' : 'لفّ لحد ما الكعبة توصل لأعلى';
  };
  const onOri = e => {
    let heading = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.alpha != null ? 360 - e.alpha : null);
    if (heading != null) apply(heading);
  };
  const start = () => { window.addEventListener('deviceorientationabsolute', onOri, true); window.addEventListener('deviceorientation', onOri, true); qiblaHandler = onOri; };
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    const pb = $('#qPerm'); pb.style.display = 'block';
    pb.onclick = () => DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') { start(); pb.style.display = 'none'; } });
  } else { start(); }
  needle.style.transform = `rotate(${qb}deg)`;
}

// ===== التذكيرات (HTML + wiring يُستدعى من الإعدادات) =====
const REM_DEFS = { sabah: { l: 'أذكار الصباح', d: 'تلقائياً بعد الفجر', on: true }, masa: { l: 'أذكار المساء', d: 'تلقائياً بعد العصر', on: true }, wird: { l: 'وِرد القرآن', d: 'تلقائياً بعد الظهر', on: false }, sleep: { l: 'أذكار النوم', d: 'تلقائياً ١١م', on: true } };
function remConfig() {
  const r = (S.settings && S.settings.reminders) || {};
  const out = {};
  Object.keys(REM_DEFS).forEach(k => {
    const v = r[k];
    if (v && typeof v === 'object') out[k] = { on: v.on !== false, time: v.time || '' };
    else if (typeof v === 'string' && v) out[k] = { on: true, time: v };
    else out[k] = { on: REM_DEFS[k].on, time: '' };
  });
  return out;
}
// الوقت التلقائي (نسبةً للصلاة) لحساب الجدولة المحلية
function remAutoTime(k) {
  if (k === 'sleep') return '23:00';
  const t = Prayer.timesFor(new Date(), S.settings); if (!t) return '';
  const base = k === 'sabah' ? 'fajr' : (k === 'masa' ? 'asr' : 'dhuhr');
  if (t[base] == null || isNaN(t[base])) return '';
  let mins = (Math.round(t[base] * 60) + 30) % 1440;
  return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
}
function remindersHTML() {
  const cfg = remConfig();
  const pushOn = !!(S.settings && S.settings.pushEnabled);
  const rows = Object.keys(REM_DEFS).map(k => {
    const c = cfg[k], auto = remAutoTime(k);
    const hint = c.time ? '' : (auto ? `${REM_DEFS[k].d} (${auto})` : REM_DEFS[k].d);
    return `<div class="rem-row">
      <span>${REM_DEFS[k].l}<small>${c.time ? 'وقت محدد' : esc(hint)}</small></span>
      <div class="rem-ctl">
        <input type="time" data-remt="${k}" value="${esc(c.time)}" title="حدد وقت (فاضي = تلقائي)">
        <label class="sw"><input type="checkbox" data-remon="${k}" ${c.on ? 'checked' : ''}><i></i></label>
      </div></div>`;
  }).join('');
  return `<div class="section"><div class="sec-head"><span>⏰ التذكيرات التلقائية</span></div>
    <div class="setbox">
      <p class="qexplain">التنبيهات بتوصلك في وقتها حتى والتطبيق مقفول (لو فعّلت تنبيهات الخلفية). المواعيد بتتظبط تلقائياً نسبةً للصلاة — وتقدر تحدد وقت بنفسك لو حبيت.</p>
      <div class="acct-row"><span>تنبيهات الخلفية (Push)</span><label class="sw"><input type="checkbox" id="pushOn" ${pushOn ? 'checked' : ''}><i></i></label></div>
      <button class="mini ghost" id="pushTest" style="width:100%;margin:8px 0">🔔 جرّب الإشعار دلوقتي</button>
      ${rows}
    </div></div>`;
}
function wireReminders() {
  const setRem = (k, patch) => {
    S.settings.reminders = S.settings.reminders || {};
    const cur = remConfig()[k];
    S.settings.reminders[k] = { on: cur.on, time: cur.time, ...patch };
    saveSettings(); scheduleReminders();
  };
  $$('#screen [data-remon]').forEach(i => i.onchange = () => setRem(i.dataset.remon, { on: i.checked }));
  $$('#screen [data-remt]').forEach(i => i.onchange = () => { setRem(i.dataset.remt, { time: i.value }); renderTools(); });
  const po = $('#pushOn'); if (po) po.onchange = async () => {
    if (po.checked) { const ok = await enablePush(); S.settings.pushEnabled = ok; if (!ok) po.checked = false; }
    else { S.settings.pushEnabled = false; }
    saveSettings();
  };
  const pt = $('#pushTest'); if (pt) pt.onclick = async () => {
    pt.disabled = true; const old = pt.textContent; pt.textContent = 'بيبعت...';
    try {
      if (!(S.settings && S.settings.pushEnabled)) { const ok = await enablePush(); S.settings.pushEnabled = ok; saveSettings(); if (!ok) throw new Error('لازم تسمح بالتنبيهات'); }
      const r = await api('push-test', 'POST', {});
      alert(r.sent > 0 ? 'تم إرسال إشعار تجربة ✓ المفروض يوصلك خلال ثواني' : 'مفيش إشعار اتبعت — اتأكد إنك سامح بالإشعارات ومفعّل تنبيهات الخلفية');
    } catch (e) { alert(e.message || 'فعّل تنبيهات الخلفية الأول'); }
    pt.disabled = false; pt.textContent = old;
  };
}

// ===== تذكيرات محلية (والتطبيق مفتوح) =====
let remTimers = [];
function scheduleReminders() {
  remTimers.forEach(t => clearTimeout(t)); remTimers = [];
  const cfg = remConfig();
  const now = new Date();
  Object.keys(REM_DEFS).forEach(k => {
    const c = cfg[k]; if (!c.on) return;
    const v = c.time || remAutoTime(k); if (!/^\d{1,2}:\d{2}$/.test(v || '')) return;
    const [hh, mm] = v.split(':').map(Number);
    const t = new Date(now); t.setHours(hh, mm, 0, 0);
    if (t <= now) return;
    const ms = t - now; if (ms > 26 * 3600000) return;
    remTimers.push(setTimeout(() => {
      try { if (window.Notification && Notification.permission === 'granted') new Notification('⏰ ' + REM_DEFS[k].l, { body: 'افتكر وردك 🤍', icon: 'icon-192.png' }); } catch (e) {}
    }, ms));
  });
}
