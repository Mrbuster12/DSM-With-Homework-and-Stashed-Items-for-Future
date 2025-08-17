/* assets/js/tendencies_addon.js
 * Non-intrusive Clinician Tendencies addon.
 * - NEVER writes to description/goals/assessment/dialogue
 * - NEVER calls render/reset functions
 * - NO side effects if BPIRL is active
 */
(function () {
  const S = {
    tendencies: ['#tendencies','select[name="tendencies"]','#clinicianStyle','select[name="clinicianStyle"]']
  };
  function $(cands){for(const s of cands){const el=document.querySelector(s);if(el)return el;}return null;}
  function getVal(el){return (!el)?'':('value'in el?String(el.value||''):String(el.textContent||''));}
  function setData(key,val){document.documentElement.setAttribute(key,val);}
  function onChange(e){
    if (window.sessionMode && String(window.sessionMode).toUpperCase()==='BPIRL') {
      console.info('Tendencies addon: ignored (BPIRL active).');
      return;
    }
    const v = getVal(e.target).trim();
    setData('data-tendencies', v || 'unset');
    document.dispatchEvent(new CustomEvent('tendencies:changed',{detail:{value:v}}));
  }
  function wire(){
    const t = $(S.tendencies);
    if (t && !t.__wired_tendencies){ t.addEventListener('change', onChange); t.__wired_tendencies = true; }
  }
  document.addEventListener('DOMContentLoaded', wire);
  new MutationObserver(()=>{try{wire();}catch(_){}}).observe(document.documentElement,{childList:true,subtree:true});
})();
