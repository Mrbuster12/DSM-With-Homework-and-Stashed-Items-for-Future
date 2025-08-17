/* assets/js/remove_legacy_bop.js */
(function(){
  function looks(btn){
    if (!btn || btn.tagName!=='BUTTON') return false;
    const id=(btn.id||'').toLowerCase(), cls=(btn.className||'').toLowerCase(), txt=(btn.textContent||'').toLowerCase().trim();
    if (id.includes('bop')||id.includes('bpirl')||id==='bp'||id==='bop') return true;
    if (cls.includes('bop')||cls.includes('bpirl')) return true;
    if (['bop','bp','bpirl','borderline','borderline mode','bp mode'].includes(txt)) return true;
    return false;
  }
  function nuke(root){ (root.querySelectorAll('button')||[]).forEach(b=>{ if(looks(b)) b.remove(); }); }
  document.addEventListener('DOMContentLoaded', ()=>nuke(document));
  new MutationObserver(muts=>{ muts.forEach(m=>{ (m.addedNodes||[]).forEach(n=>{ if(n.nodeType===1){ if(n.tagName==='BUTTON'&&looks(n)) n.remove(); else nuke(n); } }); }); })
    .observe(document.documentElement,{childList:true,subtree:true});
})();