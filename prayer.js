'use strict';
/* مواعيد الصلاة (حساب فلكي أوفلاين) + الأذان — مبني على خوارزمية PrayTimes */

const Prayer = (function () {
  const dtr = d => d * Math.PI / 180, rtd = r => r * 180 / Math.PI;
  const sin = d => Math.sin(dtr(d)), cos = d => Math.cos(dtr(d)), tan = d => Math.tan(dtr(d));
  const arcsin = x => rtd(Math.asin(x)), arccos = x => rtd(Math.acos(x));
  const arctan2 = (y, x) => rtd(Math.atan2(y, x)), arccot = x => rtd(Math.atan2(1, x));
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  const fixAngle = a => fix(a, 360), fixHour = a => fix(a, 24);

  const METHODS = {
    EGYPT: { fajr: 19.5, isha: 17.5, name: 'الهيئة المصرية' },
    MWL: { fajr: 18, isha: 17, name: 'رابطة العالم الإسلامي' },
    MAKKAH: { fajr: 18.5, isha: '90', name: 'أم القرى (مكة)' },
    KARACHI: { fajr: 18, isha: 18, name: 'كراتشي' },
    ISNA: { fajr: 15, isha: 15, name: 'أمريكا الشمالية' },
  };
  const CITIES = {
    'القاهرة': [30.044, 31.236], 'الإسكندرية': [31.2, 29.918], 'الجيزة': [30.013, 31.209],
    'المنصورة': [31.04, 31.378], 'طنطا': [30.785, 31.0], 'أسيوط': [27.18, 31.18],
    'الرياض': [24.713, 46.675], 'مكة': [21.389, 39.857], 'المدينة': [24.47, 39.61], 'جدة': [21.49, 39.19],
    'دبي': [25.205, 55.27], 'الكويت': [29.376, 47.977], 'الدوحة': [25.285, 51.531],
    'عمّان': [31.95, 35.93], 'بيروت': [33.888, 35.495], 'بغداد': [33.31, 44.36],
    'الخرطوم': [15.5, 32.56], 'إسطنبول': [41.008, 28.978], 'لندن': [51.507, -0.127],
  };

  function julian(y, m, d) { if (m <= 2) { y -= 1; m += 12; } const A = Math.floor(y / 100); const B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
  function sunPos(jd) {
    const D = jd - 2451545.0;
    const g = fixAngle(357.529 + 0.98560028 * D), q = fixAngle(280.459 + 0.98564736 * D);
    const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const decl = arcsin(sin(e) * sin(L));
    let RA = arctan2(cos(e) * sin(L), cos(L)) / 15; RA = fixHour(RA);
    return { decl, eqt: q / 15 - RA };
  }

  // يحسب المواعيد بالساعات لتاريخ/إحداثيات
  function compute(date, lat, lng, tz, methodKey, asrFactor) {
    const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    const M = METHODS[methodKey] || METHODS.EGYPT;
    const midDay = t => { const e = sunPos(jd + t).eqt; return fixHour(12 - e); };
    const angleTime = (angle, t, dir) => {
      const d = sunPos(jd + t).decl; const noon = midDay(t);
      const x = (-sin(angle) - sin(d) * sin(lat)) / (cos(d) * cos(lat));
      if (Math.abs(x) > 1) return NaN;
      const a = arccos(x) / 15; return noon + (dir === 'ccw' ? -a : a);
    };
    const asrT = t => { const d = sunPos(jd + t).decl; const angle = -arccot(asrFactor + tan(Math.abs(lat - d))); return angleTime(angle, t, 'cw'); };

    let t = {
      fajr: angleTime(M.fajr, 5 / 24, 'ccw'),
      sunrise: angleTime(0.833, 6 / 24, 'ccw'),
      dhuhr: midDay(12 / 24),
      asr: asrT(13 / 24),
      maghrib: angleTime(0.833, 18 / 24, 'cw'),
      isha: typeof M.isha === 'number' ? angleTime(M.isha, 18 / 24, 'cw') : null,
    };
    const adj = h => fixHour(h + tz - lng / 15);
    for (const k in t) if (t[k] != null && !isNaN(t[k])) t[k] = adj(t[k]);
    if (t.isha == null) t.isha = fixHour(t.maghrib + parseInt(M.isha) / 60); // "90 min"
    t.dhuhr = fixHour(t.dhuhr + 1 / 60); // دقيقة احتياط بعد الزوال
    return t;
  }

  const ORDER = [['fajr', 'الفجر'], ['sunrise', 'الشروق'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];

  function tzOffset(date) { return -date.getTimezoneOffset() / 60; }

  function timesFor(date, st) {
    const p = st.prayer || {};
    if (p.lat == null || p.lng == null) return null;
    const asrFactor = (p.asr === 'Hanafi') ? 2 : 1;
    const t = compute(date, p.lat, p.lng, tzOffset(date), p.method || 'EGYPT', asrFactor);
    const off = p.offsets || {};
    ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(k => { if (off[k]) t[k] = fixHour(t[k] + off[k] / 60); });
    return t;
  }

  function fmt(h) {
    if (h == null || isNaN(h)) return '--:--';
    let hh = Math.floor(fix(h, 24)); let mm = Math.round((fix(h, 24) - hh) * 60);
    if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
    const ap = hh < 12 ? 'ص' : 'م'; let h12 = hh % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + String(mm).padStart(2, '0') + ' ' + ap;
  }

  // الصلاة الجاية: {key,label,inMin}
  function next(st) {
    const now = new Date();
    const t = timesFor(now, st); if (!t) return null;
    const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const pr = [['fajr', 'الفجر'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];
    for (const [k, lbl] of pr) if (t[k] > nowH) return { key: k, label: lbl, at: t[k], inMin: Math.round((t[k] - nowH) * 60) };
    // بعد العشاء: فجر بكرة
    const tm = timesFor(new Date(now.getTime() + 86400000), st);
    return { key: 'fajr', label: 'الفجر', at: tm.fajr, inMin: Math.round((tm.fajr + 24 - nowH) * 60), tomorrow: true };
  }

  // ===== الأذان =====
  let audioEl = null, timer = null;
  function audio() { if (!audioEl) { audioEl = new Audio(); audioEl.preload = 'none'; } return audioEl; }
  function playAdhan(st) {
    const a = audio(); a.src = './adhan/' + ((st.adhan && st.adhan.reciter) || 'a1') + '.mp3';
    a.currentTime = 0; a.play().catch(() => { });
  }
  function stopAdhan() { if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; } }
  function notify(label) {
    try { if (window.Notification && Notification.permission === 'granted') new Notification('حان وقت ' + label, { body: 'الصلاة خير من النوم 🤍', icon: 'icon-192.png' }); } catch (e) { }
  }
  // يجدول الأذان للصلاة الجاية (يشتغل والتطبيق مفتوح)
  function schedule(st) {
    clearTimeout(timer);
    if (!st.adhan || !st.adhan.enabled) return;
    const n = next(st); if (!n) return;
    const ms = Math.max(1000, n.inMin * 60000);
    if (ms > 25 * 60 * 60 * 1000) return;
    timer = setTimeout(() => { playAdhan(st); notify(n.label); setTimeout(() => schedule(st), 90000); }, ms);
  }

  function askNotify() { try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { } }
  function geolocate() {
    return new Promise(res => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(p => res([p.coords.latitude, p.coords.longitude]), () => res(null), { timeout: 8000, maximumAge: 6e5 });
    });
  }

  return { METHODS, CITIES, timesFor, fmt, next, ORDER, schedule, playAdhan, stopAdhan, askNotify, geolocate, tzOffset };
})();
