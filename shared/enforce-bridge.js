
// /shared/enforce-bridge.js — ensure ?bridge=1 and #k on every module
(function(){
  function ready(fn){ if (document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(() => {
    const url = new URL(location.href);
    const sp = url.searchParams;
    let reload = false;
    if (sp.get("bridge")!=="1"){ sp.set("bridge","1"); url.search = "?" + sp.toString(); reload = true; }
    const frag = new URLSearchParams(url.hash.slice(1));
    let k = frag.get("k") || sessionStorage.getItem("session_bridge_key") || localStorage.getItem("session_bridge:last_k");
    if (!k){ k = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()); }
    sessionStorage.setItem("session_bridge_key", k);
    localStorage.setItem("session_bridge:last_k", k);
    if (!frag.get("k")){ frag.set("k", k); url.hash = "#" + frag.toString(); reload = true; }
    if (reload){ location.replace(url.pathname + url.search + url.hash); }
  });
})();
