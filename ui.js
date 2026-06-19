'use strict';
/* واجهات داخل التطبيق بدل نوافذ المتصفح: uiToast / uiConfirm / uiPrompt (RTL، كحلي/ذهبي) */

const _uiEsc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// رسالة صغيرة سريعة
function uiToast(msg, ms = 2800) {
  let host = document.getElementById('uiToastHost');
  if (!host) { host = document.createElement('div'); host.id = 'uiToastHost'; document.body.appendChild(host); }
  const t = document.createElement('div');
  t.className = 'ui-toast'; t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, ms);
}

// أساس المودال
function _uiOverlay(innerHTML) {
  const ov = document.createElement('div');
  ov.className = 'ui-ov';
  ov.innerHTML = `<div class="ui-card" role="dialog">${innerHTML}</div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
  return ov;
}
function _uiClose(ov) { ov.classList.remove('show'); setTimeout(() => ov.remove(), 200); }

// تأكيد نعم/لا
function uiConfirm(message, opts = {}) {
  const okText = opts.okText || 'تمام', cancelText = opts.cancelText || 'إلغاء';
  return new Promise(res => {
    const ov = _uiOverlay(`
      <div class="ui-msg">${_uiEsc(message)}</div>
      <div class="ui-btns">
        <button class="ui-btn" data-c>${_uiEsc(cancelText)}</button>
        <button class="ui-btn ${opts.danger ? 'danger' : 'primary'}" data-ok>${_uiEsc(okText)}</button>
      </div>`);
    const done = v => { _uiClose(ov); res(v); };
    ov.querySelector('[data-ok]').onclick = () => done(true);
    ov.querySelector('[data-c]').onclick = () => done(false);
    ov.onclick = e => { if (e.target === ov) done(false); };
  });
}

// إدخال (حقل واحد أو أكتر) — يرجّع كائن القيم أو null
function uiPrompt(opts = {}) {
  const fields = opts.fields || [{ name: 'value', label: opts.label || '', type: 'text', placeholder: opts.placeholder || '' }];
  const okText = opts.okText || 'حفظ', cancelText = opts.cancelText || 'إلغاء';
  return new Promise(res => {
    const fieldsHtml = fields.map((f, i) => `
      ${f.label ? `<label class="ui-lbl">${_uiEsc(f.label)}</label>` : ''}
      <input class="ui-inp" data-f="${i}" type="${f.type || 'text'}" placeholder="${_uiEsc(f.placeholder || '')}" value="${_uiEsc(f.value || '')}" inputmode="${f.type === 'number' ? 'numeric' : 'text'}">`).join('');
    const ov = _uiOverlay(`
      ${opts.title ? `<div class="ui-title">${_uiEsc(opts.title)}</div>` : ''}
      ${opts.message ? `<div class="ui-msg sm">${_uiEsc(opts.message)}</div>` : ''}
      ${fieldsHtml}
      <div class="ui-btns">
        <button class="ui-btn" data-c>${_uiEsc(cancelText)}</button>
        <button class="ui-btn primary" data-ok>${_uiEsc(okText)}</button>
      </div>`);
    const inputs = [...ov.querySelectorAll('[data-f]')];
    setTimeout(() => inputs[0] && inputs[0].focus(), 60);
    const submit = () => {
      const out = {}; let empty = false;
      fields.forEach((f, i) => { const val = inputs[i].value.trim(); out[f.name] = val; if (!val) empty = true; });
      if (empty) { inputs.find(x => !x.value.trim()).classList.add('err'); return; }
      _uiClose(ov); res(out);
    };
    ov.querySelector('[data-ok]').onclick = submit;
    ov.querySelector('[data-c]').onclick = () => { _uiClose(ov); res(null); };
    ov.onclick = e => { if (e.target === ov) { _uiClose(ov); res(null); } };
    inputs.forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
  });
}
