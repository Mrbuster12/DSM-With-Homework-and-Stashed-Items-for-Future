
/* Replace/augment the Borderline toggle with a split-button dropdown that:
 *  - Left click: existing behavior (no change)
 *  - Right/dropdown: actions: Run BPIRL Now, Prefill DAP (Description+Goals), Open Specifiers
 */
(() => {
  function findBP() {
    return document.getElementById('bpirl-button')
      || [...document.querySelectorAll('[data-role="bpirl"],button,a')].find(el =>
           /borderline|bpirl/i.test((el.textContent||'').trim()));
  }

  function ensureContainer(host) {
    const wrap = document.createElement('span');
    wrap.className = 'bpirl-split-wrap';
    const primary = host.cloneNode(true);
    primary.classList.add('bpirl-primary');
    primary.title = (host.title || 'Borderline/BPIRL');
    // caret button
    const caret = document.createElement('button');
    caret.type = 'button';
    caret.className = 'bpirl-caret';
    caret.setAttribute('aria-haspopup', 'menu');
    caret.textContent = '▾';
    // menu
    const menu = document.createElement('div');
    menu.className = 'bpirl-menu';
    menu.setAttribute('role','menu');
    menu.style.display = 'none';

    const items = [
      {label:'Run BPIRL now (de‑escalate)', action: () => {
        try { sessionStorage.setItem('bpirl_flag','true'); } catch(e){}
        try { window.state = window.state || {}; (state.bpirl = state.bpirl || {}).flag = true; } catch(e){}
        if (typeof window.bpirlGate === 'function') {
          window.bpirlGate(window.engine?.currentNode || null);
        }
        try {
          const n = window.engine?.currentNode || window.engine?.node || null;
          window.engine?.evaluateNode?.(n, {reason:'bpirl.dropdown'});
        } catch(e){ console.warn(e); }
      }},
      {label:'Prefill DAP (Description + Goals)', action: () => {
        window.DAPAutofill?.run?.();
      }},
      {label:'Open Specifier Selection', action: () => {
        if (window.router?.navigate) window.router.navigate('/specifier-selection');
        else location.href = 'specifier-selection.html?v=' + Date.now();
      }}
    ];

    items.forEach(it => {
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'bpirl-menu-item';
      a.textContent = it.label;
      a.addEventListener('click', () => { menu.style.display = 'none'; it.action(); });
      menu.appendChild(a);
    });

    caret.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      const rect = caret.getBoundingClientRect();
      menu.style.position = 'absolute';
      menu.style.left = (rect.left) + 'px';
      menu.style.top = (rect.bottom + window.scrollY) + 'px';
    });
    document.addEventListener('click', () => { menu.style.display = 'none'; });

    wrap.appendChild(primary);
    wrap.appendChild(caret);
    document.body.appendChild(menu);
    host.replaceWith(wrap);
  }

  function injectStyles() {
    const css = `.bpirl-split-wrap{display:inline-flex;gap:4px;align-items:center}
.bpirl-caret{padding:6px 8px;border:1px solid currentColor;background:transparent;cursor:pointer}
.bpirl-menu{min-width:240px;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:6px}
.bpirl-menu-item{display:block;width:100%;text-align:left;border:0;background:transparent;padding:8px 10px;cursor:pointer}
.bpirl-menu-item:hover{background:rgba(0,0,0,.06)}`;
    const tag = document.createElement('style');
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function start() {
    injectStyles();
    const host = findBP();
    if (!host) return console.warn('[BPIRL] split dropdown: host not found');
    ensureContainer(host);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
