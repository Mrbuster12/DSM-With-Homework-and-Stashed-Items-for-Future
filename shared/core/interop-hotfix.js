// /shared/core/interop-hotfix.js
// Purpose: Drop‑in hotfix that wires DSM→CTC publisher and MSE/TP/IU consumers
// using flexible selectors and robust fallbacks. Safe: does not alter UI.

// The contents of this file are copied from the Interop_Hotfix_Flex_Selectors_0816
// package provided by the user. The script defines a lightweight bridge
// (window.VSCBridge) that can publish and subscribe to ctc_update events
// across modules using BroadcastChannel and localStorage. It also defines
// a simple envelope normalization function (window.VSCEnvelope) for DSM
// and risk notes, inferring risk triggers and care tier. The script
// automatically detects which page it runs on (DSM/CTC, MSE, Treatment
// Plan, or home) and installs the appropriate publisher/consumer logic.
// See Interop_Hotfix_With_Manifest_0816.zip for original documentation.

(function(){
  const LOG_PREFIX = "[VSC Interop Hotfix]";
  function log(){ try { console.log.apply(console, [LOG_PREFIX].concat([].slice.call(arguments))); } catch(e){} }
  function tryJSON(fn, fb){ try { return fn(); } catch(e){ return fb; } }

  // --- Bridge (if not present) ---
  if (!window.VSCBridge){
    window.VSCBridge = (function(){
      const chan = new BroadcastChannel('vsc_bridge');
      const subs = {};
      function publish(type, env){
        const payload = {type, env, ts: Date.now()};
        try { localStorage.setItem('vsc_last', JSON.stringify(payload)); } catch(e){}
        chan.postMessage(payload);
        if (subs[type]) subs[type].forEach(fn => { try { fn(env); } catch(e){} });
        log("published", type, env);
      }
      function subscribe(type, fn){
        if(!subs[type]) subs[type] = [];
        subs[type].push(fn);
        log("subscribed", type);
      }
      chan.onmessage = (e)=>{
        const p = e.data || {};
        if (p.type && subs[p.type]) subs[p.type].forEach(fn => { try { fn(p.env); } catch(e){} });
        log("relay", p.type, p.env);
      };
      function last(){ return tryJSON(()=>JSON.parse(localStorage.getItem('vsc_last')), null); }
      return { publish, subscribe, last };
    })();
  }

  // --- Schema (if not present) ---
  if (!window.VSCEnvelope){
    window.VSCEnvelope = {
      normalize: function(raw){
        const t = ((raw.dsm||"") + " " + (raw.risk||"") + " " + (raw.notes||"")).toLowerCase();
        const triggers = {
          SI: /suicid|self[- ]?harm|\bsi\b/.test(t),
          HI: /homicid|harm others|\bhi\b/.test(t),
          Psychosis: /psychosis|hallucin|delusion/.test(t)
        };
        let careTier = "Tier 1 (Routine)";
        if (/(inpatient|hospital|emergency|crisis)/.test(t) || triggers.SI || triggers.HI || triggers.Psychosis){
          careTier = "Tier 4 (Crisis)";
        } else if (/(intensive|partial|day program|tier 3)/.test(t)) {
          careTier = "Tier 3 (Intensive)";
        }
        return { triggers, careTier };
      }
    };
  }

  // --- Helpers ---
  function q(sel){ return document.querySelector(sel); }
  function qa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function setCheck(el, v){ if (el){ el.checked = !!v; el.dispatchEvent(new Event('change', {bubbles:true})); } }
  function append(el, txt){
    if (!el || !txt) return;
    const marker = "\n[AutoDoc] " + txt.trim();
    if (!el.value.includes(marker)) el.value += marker;
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }
  function val(el){ return (el && (el.value||"").trim()) || ""; }

  // --- Flexible selector probes ---
  function probeDSM(){ 
    return q('[name="dsm"]') || q('#dsm') || q('textarea[placeholder*="DSM" i]') || q('textarea[name*="dsm" i]') || q('textarea');
  }
  function probeRisk(){ 
    return q('[name="risk"]') || q('#risk') || q('textarea[placeholder*="risk" i]') || q('textarea[name*="risk" i]');
  }
  function probeNotes(){
    return q('[name="notes"]') || q('#notes') || q('textarea[placeholder*="note" i]') || null;
  }

  function isDSMCTCPage(){
    const hints = document.body.innerText.toLowerCase();
    return /dsm|risk|care tier|ctc/.test(hints) || /assessment-core/i.test(location.pathname);
  }
  function isMSEPage(){
    return /mse|mental status exam/.test(document.body.innerText.toLowerCase()) || /\/mse\//i.test(location.pathname);
  }
  function isTPPage(){
    const t = document.body.innerText.toLowerCase();
    return /treatment plan|goals|objectives|interventions/.test(t) || /\/treatment-plan\//i.test(location.pathname);
  }
  function isIUPage(){
    return /care tier|status|dashboard|home/.test(document.body.innerText.toLowerCase()) || /\/index\.html$|\/$/i.test(location.pathname);
  }

  // --- Publisher (DSM→CTC) ---
  function initPublisher(){
    const dsmEl = probeDSM();
    const riskEl = probeRisk();
    const notesEl = probeNotes();
    if (!dsmEl && !riskEl){ log("publisher: no DSM/Risk fields detected; skipping"); return; }
    log("publisher: hooked", !!dsmEl, !!riskEl, !!notesEl);
    function read(){ return { dsm: val(dsmEl), risk: val(riskEl), notes: val(notesEl) }; }
    function compute(){ return window.VSCEnvelope.normalize(read()); }
    function publish(){ const env = compute(); window.VSCBridge.publish('ctc_update', env); }
    ['input','change','keyup'].forEach(ev=>{
      [dsmEl, riskEl, notesEl].forEach(el=>{ if (el) el.addEventListener(ev, publish, {passive:true}); });
    });
    // bootstrap publish
    publish();
  }

  // --- MSE Consumer ---
  function initMSEConsumer(){
    const si = q('#si') || q('[name="si"]') || q('input[type="checkbox"][id*="suic" i]');
    const hi = q('#hi') || q('[name="hi"]') || q('input[type="checkbox"][id*="homic" i]');
    const thought = q('#thoughtContent') || q('[name="thoughtContent"]') || q('textarea[placeholder*="thought" i]');
    const riskSummary = q('#riskSummary') || q('[name="riskSummary"]') || q('textarea[placeholder*="risk" i]');
    function apply(env){
      if (!env) return;
      setCheck(si, env.triggers && env.triggers.SI);
      setCheck(hi, env.triggers && env.triggers.HI);
      if (env.triggers && env.triggers.SI) append(thought, 'Reports suicidal ideation.');
      if (env.triggers && env.triggers.HI) append(thought, 'Reports homicidal ideation.');
      append(riskSummary, 'Care Tier: ' + env.careTier);
      log("mse applied", env);
    }
    window.VSCBridge.subscribe('ctc_update', apply);
    const last = window.VSCBridge.last && window.VSCBridge.last();
    if (last && last.type === 'ctc_update') apply(last.env);
  }

  // --- TP Consumer ---
  function initTPConsumer(){
    const problems = q('#tpProblems') || q('[name="tpProblems"]') || q('textarea[placeholder*="problem" i]');
    const goals = q('#tpGoals') || q('[name="tpGoals"]') || q('textarea[placeholder*="goal" i]');
    const objectives = q('#tpObjectives') || q('[name="tpObjectives"]') || q('textarea[placeholder*="objective" i]');
    const interventions = q('#tpInterventions') || q('[name="tpInterventions"]') || q('textarea[placeholder*="intervention" i]');
    const snippets = {
      SI: {
        problems: 'Risk of self-harm (SI).',
        goals: 'Stabilize acute risk; maintain safety.',
        objectives: 'Engage in safety planning; disclose SI promptly.',
        interventions: 'Implement crisis plan; increase monitoring; emergency resources provided.'
      },
      HI: {
        problems: 'Risk of harm to others (HI).',
        goals: 'Reduce aggressive ideation; ensure safety.',
        objectives: 'Identify triggers; practice de-escalation steps.',
        interventions: 'Safety planning; collateral coordination as indicated.'
      },
      Psychosis: {
        problems: 'Psychosis symptoms impacting safety/functioning.',
        goals: 'Stabilize symptoms and reality testing.',
        objectives: 'Adhere to treatment; monitor hallucinations/delusions.',
        interventions: 'Psychoeducation; crisis resources; referral as needed.'
      }
    };
    function appendBlock(el, txt){ append(el, txt); }
    function apply(env){
      if (!env || !env.triggers) return;
      ['SI','HI','Psychosis'].forEach(k=>{
        if (env.triggers[k]){
          appendBlock(problems, snippets[k].problems);
          appendBlock(goals, snippets[k].goals);
          appendBlock(objectives, snippets[k].objectives);
          appendBlock(interventions, snippets[k].interventions);
        }
      });
      log("tp applied", env);
    }
    window.VSCBridge.subscribe('ctc_update', apply);
    const last = window.VSCBridge.last && window.VSCBridge.last();
    if (last && last.type === 'ctc_update') apply(last.env);
  }

  // --- IU Consumer ---
  function initIUConsumer(){
    const badge = q('#ctcBadge') || q('[data-role="ctc-badge"]') || null;
    function render(env){
      if (!badge) return;
      badge.textContent = (env && env.careTier) ? env.careTier : 'Tier —';
      badge.dataset.si = !!(env && env.triggers && env.triggers.SI);
      badge.dataset.hi = !!(env && env.triggers && env.triggers.HI);
      badge.dataset.psychosis = !!(env && env.triggers && env.triggers.Psychosis);
      log("iu badge", badge.textContent);
    }
    window.VSCBridge.subscribe('ctc_update', render);
    const last = window.VSCBridge.last && window.VSCBridge.last();
    if (last && last.type === 'ctc_update') render(last.env);
  }

  // --- Router ---
  function init(){
    if (isDSMCTCPage()) initPublisher();
    if (isMSEPage()) initMSEConsumer();
    if (isTPPage()) initTPConsumer();
    if (isIUPage()) initIUConsumer();
  }
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();