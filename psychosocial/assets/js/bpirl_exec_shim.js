/* Minimal BPIRL execution shim: makes the existing Borderline button DO work */
(() => {
  // 1) Define a gate that actually does things (safe no-ops if modules missing)
  window.bpirlGate = window.bpirlGate || function(node){
    try { console.log('[BPIRL] gate enter'); } catch(e){}
    try { sessionStorage.setItem('bpirl_flag','true'); } catch(e){}
    try { window.state = window.state || {}; (state.bpirl = state.bpirl || {}).flag = true; } catch(e){}
    try { if (window.TS_BL01?.activate) TS_BL01.activate(); } catch(e){}
    try { if (window.SCSM?.init) SCSM.init({ preset:'HighEmpathy_LowConfrontation' }); } catch(e){}
    try { window.SCRL?.log?.('bpirl.enter', { ts: Date.now(), nodeId: node?.id || null }); } catch(e){}
    return 'shortcircuit';
  };

  // 2) Patch engine.evaluateNode so the gate runs when the flag is set
  if (window.engine?.evaluateNode && !engine.__bpirl_patched) {
    const orig = engine.evaluateNode.bind(engine);
    engine.evaluateNode = async function(node, ctx){
      const flag = (window.state?.bpirl?.flag === true) || sessionStorage.getItem('bpirl_flag') === 'true';
      if (flag) {
        const r = window.bpirlGate(node);
        if (r === 'shortcircuit') return r; // skip default challenge this tick
      }
      return orig(node, ctx);
    };
    engine.__bpirl_patched = true;
    try { console.log('[BPIRL] engine patched'); } catch(e){}
  }

  // 3) Bind the EXISTING Borderline button: set flag + force one tick now
  const findBP = () =>
    document.getElementById('bpirl-button')
    || [...document.querySelectorAll('[data-role="bpirl"],button,a')].find(el =>
         /borderline|bpirl/i.test((el.textContent||'').trim()));
  const bp = findBP();
  if (!bp) { console.warn('[BPIRL] Borderline button not found'); return; }

  bp.addEventListener('click', () => {
    try { sessionStorage.setItem('bpirl_flag','true'); } catch(e){}
    try { window.state = window.state || {}; (state.bpirl = state.bpirl || {}).flag = true; } catch(e){}

    try {
      const current = window.engine?.currentNode || window.engine?.node || null;
      if (window.engine?.evaluateNode) {
        window.engine.evaluateNode(current, { reason:'bpirl.manual' });
        console.log('[BPIRL] flag set + tick forced');
      } else {
        console.warn('[BPIRL] engine.evaluateNode not available');
      }
    } catch (e) {
      console.warn('[BPIRL] could not force tick', e);
    }
  }, { capture:false });
})();