
// /shared/key-propagation.js — propagate #k and add ?bridge=1 for DSM link
(function(){
  function ready(fn){ if (document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(() => {
    const url = new URL(location.href);
    const frag = new URLSearchParams(url.hash.slice(1));
    let k = frag.get("k") || sessionStorage.getItem("session_bridge_key");
    if (!k) { k = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()); }
    sessionStorage.setItem("session_bridge_key", k);
    localStorage.setItem("session_bridge:last_k", k);
    if (!frag.get("k")) { frag.set("k", k); history.replaceState(null, "", url.pathname + url.search + "#" + frag.toString()); }

    document.querySelectorAll('a[href]').forEach(a => {
      try{
        const u = new URL(a.getAttribute("href"), location.href);
        if (u.origin !== location.origin) return;
        const f2 = new URLSearchParams(u.hash.slice(1));
        if (!f2.get("k")) f2.set("k", k);
        u.hash = "#" + f2.toString();
        if (/\/assessment-core\/?$/.test(u.pathname) || /\/treatment-plan\/?$/.test(u.pathname) || /\/mse\/?$/.test(u.pathname) || /\/psychosocial\/?$/.test(u.pathname)){
          const sp = u.searchParams; if (!sp.get("bridge")) sp.set("bridge","1"); u.search = "?" + sp.toString();
        }
        a.setAttribute("href", u.pathname + u.search + u.hash);
      }catch(e){}
    });
  });
})();
