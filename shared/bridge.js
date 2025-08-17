
// /shared/bridge.js  — minimal AES-GCM encrypted session bridge
window.Bridge = (function(){
  const KEYLEN = 32;
  async function importKey(pass){
    const pad = (pass || "").padEnd(KEYLEN, "•").slice(0, KEYLEN);
    const raw = new TextEncoder().encode(pad);
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt","decrypt"]);
  }
  async function encryptJSON(obj, pass){
    const key = await importKey(pass);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, data);
    return btoa(JSON.stringify({iv: Array.from(iv), c: Array.from(new Uint8Array(ct))}));
  }
  async function decryptJSON(payload, pass){
    const {iv, c} = JSON.parse(atob(payload));
    const key = await importKey(pass);
    const pt = await crypto.subtle.decrypt({name:"AES-GCM", iv: new Uint8Array(iv)}, key, new Uint8Array(c));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  async function save(key, obj, pass, ttlMs){
    const b64 = await encryptJSON(obj, pass);
    localStorage.setItem(key, b64);
    localStorage.setItem(key + ":ts", String(Date.now()));
    if (ttlMs) localStorage.setItem(key + ":ttl", String(ttlMs));
  }
  async function load(key, pass, ttlMs){
    const at = parseInt(localStorage.getItem(key + ":ts") || "0", 10);
    const ttl = ttlMs || parseInt(localStorage.getItem(key + ":ttl") || String(2*60*60*1000), 10);
    if (!at || (Date.now()-at) > ttl) return null;
    const b64 = localStorage.getItem(key); if (!b64) return null;
    try{ return await decryptJSON(b64, pass); }catch(e){ console.warn("Bridge decrypt failed", e); return null; }
  }
  return { save, load };
})();
