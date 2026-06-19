'use strict';
/* تبويب أدوات: بومودورو + سبحة + قبلة + آية/حديث اليوم + التذكيرات + الإعدادات */

const KAABA = [21.4225, 39.8262];

// ===== الرئيسية =====
function renderTools() {
  const sub = S.toolsub || 'home';
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
      <button class="ttile" data-go="pomodoro"><span>⏱️</span>بومودورو</button>
      <button class="ttile" data-go="tasbih"><span>📿</span>السبحة</button>
      <button class="ttile" data-go="qibla"><span>🧭</span>القبلة</button>
    </div>
    ${settingsSectionsHTML()}`;
  $$('#screen [data-go]').forEach(b => b.onclick = () => { S.toolsub = b.dataset.go; renderTools(); });
  wireSettings();
}

// ===== آية/حديث اليوم =====
function dayOfYear(d) { const s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 86400000); }
function dailyAyahHTML() {
  const it = DAILY_ITEMS[dayOfYear(new Date()) % DAILY_ITEMS.length];
  return `<div class="ayah"><div class="ayah-tag">${esc(it.t)} اليوم</div><div class="ayah-body">${esc(it.body)}</div><div class="ayah-src">${esc(it.src)}</div></div>`;
}

// ===== بومودورو =====
let pomoTick = null;
function pomoState() { try { return JSON.parse(localStorage.getItem('yawmi_pomo') || 'null'); } catch (e) { return null; } }
function pomoSave(s) { if (s) localStorage.setItem('yawmi_pomo', JSON.stringify(s)); else localStorage.removeItem('yawmi_pomo'); }
function renderPomodoro() {
  const cfg = (S.settings && S.settings.pomodoro) || { focus: 25, brk: 5, long: 15 };
  let st = pomoState();
  const phaseLbl = { focus: 'تركيز', brk: 'راحة', long: 'راحة طويلة' };
  $('#screen').innerHTML = `
    <div class="section"><div class="sec-head"><span>⏱️ مؤقّت بومودورو</span><span class="cnt" id="pomoTotal">—</span></div>
      <div class="pomo">
        <div class="pomo-phase" id="pPhase">${st ? phaseLbl[st.phase] : 'جاهز'}</div>
        <div class="pomo-time" id="pTime">${String(cfg.focus).padStart(2, '0')}:00</div>
        <input id="pTask" class="pomo-task" placeholder="على إيه بتركّز؟ (قرآن / مذاكرة...)" value="${esc(st && st.task || '')}">
        <div class="pomo-btns">
          <button class="primary" id="pStart">${st && st.running ? '⏸ إيقاف مؤقت' : '▶ ابدأ'}</button>
          <button class="mini ghost" id="pReset">إعادة</button>
        </div>
      </div></div>`;
  api('pomodoro').then(d => { const e = $('#pomoTotal'); if (e) e.textContent = `النهاردة ${d.total || 0} دقيقة`; }).catch(() => {});
  const draw = () => {
    const s = pomoState(); const tEl = $('#pTime'), phEl = $('#pPhase');
    if (!tEl) return;
    if (!s) { tEl.textContent = String(cfg.focus).padStart(2, '0') + ':00'; if (phEl) phEl.textContent = 'جاهز'; return; }
    const dur = (s.phase === 'focus' ? cfg.focus : s.phase === 'brk' ? cfg.brk : cfg.long) * 60;
    let rem = s.running ? Math.max(0, Math.round((s.endTs - Date.now()) / 1000)) : s.remain;
    if (phEl) phEl.textContent = phaseLbl[s.phase];
    tEl.textContent = String(Math.floor(rem / 60)).padStart(2, '0') + ':' + String(rem % 60).padStart(2, '0');
    if (s.running && rem <= 0) pomoFinish();
  };
  clearInterval(pomoTick); pomoTick = setInterval(draw, 500); draw();
  $('#pStart').onclick = () => {
    let s = pomoState();
    if (!s) s = { phase: 'focus', running: false, remain: cfg.focus * 60, cycle: 0, task: '' };
    s.task = $('#pTask').value.trim();
    if (s.running) { s.remain = Math.max(0, Math.round((s.endTs - Date.now()) / 1000)); s.running = false; }
    else { s.endTs = Date.now() + (s.remain || (cfg.focus * 60)) * 1000; s.running = true; Prayer.askNotify(); }
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
function remindersHTML() {
  const r = (S.settings && S.settings.reminders) || {};
  const pushOn = !!(S.settings && S.settings.pushEnabled);
  const rows = [['sabah', 'أذكار الصباح'], ['masa', 'أذكار المساء'], ['wird', 'وِرد القرآن'], ['sleep', 'وقت النوم']];
  return `<div class="section"><div class="sec-head"><span>⏰ التذكيرات</span></div>
    <div class="setbox">
      <p class="qexplain">التنبيهات بتوصلك حتى والتطبيق مقفول (لو فعّلت تنبيهات الخلفية).</p>
      <div class="acct-row"><span>تنبيهات الخلفية (Push)</span><label class="sw"><input type="checkbox" id="pushOn" ${pushOn ? 'checked' : ''}><i></i></label></div>
      ${rows.map(([k, l]) => `<div class="rem-row"><span>${l}</span><input type="time" data-rem="${k}" value="${esc(r[k] || '')}"></div>`).join('')}
    </div></div>`;
}
function wireReminders() {
  $$('#screen [data-rem]').forEach(i => i.onchange = () => {
    S.settings.reminders = S.settings.reminders || {};
    S.settings.reminders[i.dataset.rem] = i.value; saveSettings(); scheduleReminders();
  });
  const po = $('#pushOn'); if (po) po.onchange = async () => {
    if (po.checked) {
      const ok = await enablePush();
      S.settings.pushEnabled = ok; if (!ok) po.checked = false;
    } else { S.settings.pushEnabled = false; }
    saveSettings();
  };
}

// ===== تذكيرات محلية (والتطبيق مفتوح) =====
let remTimers = [];
function scheduleReminders() {
  remTimers.forEach(t => clearTimeout(t)); remTimers = [];
  const r = (S.settings && S.settings.reminders) || {};
  const labels = { sabah: 'أذكار الصباح', masa: 'أذكار المساء', wird: 'وِرد القرآن', sleep: 'وقت النوم وأذكاره' };
  const now = new Date();
  Object.keys(labels).forEach(k => {
    const v = r[k]; if (!/^\d{1,2}:\d{2}$/.test(v || '')) return;
    const [hh, mm] = v.split(':').map(Number);
    const t = new Date(now); t.setHours(hh, mm, 0, 0);
    if (t <= now) return; // النهاردة فات
    const ms = t - now; if (ms > 26 * 3600000) return;
    remTimers.push(setTimeout(() => {
      try { if (window.Notification && Notification.permission === 'granted') new Notification('⏰ ' + labels[k], { body: 'افتكر وردك 🤍', icon: 'icon-192.png' }); } catch (e) {}
    }, ms));
  });
}
