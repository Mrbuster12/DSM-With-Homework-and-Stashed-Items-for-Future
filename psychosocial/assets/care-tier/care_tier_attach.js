// care_tier_attach.js
// Non-destructive mount of the Care Tier panel into an existing page.
// Looks for an obsolete bottom button/toolbar area. If not found, creates a floating dock.

import { infer, defaultSTM, generateDAPSegment } from "./sta.js";
import { loadSTMfromCSV } from "./csvLoader.js";
import { exportDAPasPDF } from "./pdfExport.js";

const SELECTORS = [
  '#bpirl-button',
  '[data-role="bpirl"]',
  '.bpirl-toggle',
  'button:has(span:contains("Borderline"))',
  'button:has(span:contains("Bipolar"))',
  'button[title*="BPIRL"]',
  '.footer-toolbar', '.bottom-bar'
];

function findMount(){
  for (const sel of SELECTORS){
    try{
      const node = document.querySelector(sel);
      if (node) return node;
    }catch{ /* ignore */ }
  }
  return null;
}

function createDock(){
  const dock = document.createElement('div');
  dock.style.position = 'fixed';
  dock.style.bottom = '16px';
  dock.style.right = '16px';
  dock.style.zIndex = '99999';
  dock.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
  dock.style.background = 'white';
  dock.style.borderRadius = '10px';
  dock.style.padding = '6px';
  document.body.appendChild(dock);
  return dock;
}

async function mountPanel(container){
  // Load panel template
  const tplRes = await fetch('./care_tier_panel.html');
  const tplHtml = await tplRes.text();
  const t = document.createElement('template');
  t.innerHTML = tplHtml.trim();
  const tpl = t.content.querySelector('#care-tier-panel');
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.appendChild(tpl.content.cloneNode(true));
  container.replaceWith(host); // swap obsolete node with our host (non-destructive to upstream scripts)

  // Wire inside shadow
  const $ = (id)=> shadow.getElementById(id);
  const toggle = $('toggle');
  const csv = $('csv');
  const exportBtn = $('export');
  const jsonPre = $('json');
  const dapPre = $('dap');

  let prev = null;
  let currentSTM = { ...defaultSTM };

  // Example snapshot — replace with live VSC glue if available globally
  const exampleSession = window.__VSC_EXAMPLE__ || {
    transcriptFlags: { self_harm: false, suicidal_ideation: true },
    severitySignals: { acute_risk: 0.42, mood_dysreg: 0.5, impulsivity: 0.35, cognitive_impair: 0.2, exposure_intensity: 0.4, dependence_likelihood: 0.3 },
    biometricFlags: { fall: false, syncopal_event: false },
    environment: { housingStable: false, socialSupport: "low", highRiskTriggers: true },
    engagement: { motivation: "medium", adherenceHistory: "fair" },
    history: { priorDetox: true, withdrawalHistory: false, medComorbidity: "moderate" },
    usage: { daysUsedPast30: 18, lastUseDaysAgo: 1, polysubstance: true, bingesPast30: 2 }
  };

  function run(){
    const enabled = toggle.value === 'on';
    if (!enabled){
      jsonPre.textContent = 'Care Tier Estimation is OFF.';
      dapPre.textContent = '';
      return;
    }
    const result = infer(exampleSession, prev, currentSTM);
    prev = result;
    jsonPre.textContent = JSON.stringify(result, null, 2);
    dapPre.textContent = generateDAPSegment(result);
  }

  toggle.addEventListener('change', run);
  csv.addEventListener('change', async (ev)=>{
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try{
      currentSTM = loadSTMfromCSV(text);
      prev = null;
      run();
    }catch(err){
      alert('Failed to load STM CSV: ' + err.message);
    }
  });
  exportBtn.addEventListener('click', ()=>{
    if (!dapPre.textContent) { alert('Nothing to export.'); return; }
    exportDAPasPDF(dapPre.textContent, 'DAP_Note');
  });

  run();
}

function boot(){
  const mountNode = findMount();
  const container = mountNode || createDock();
  mountPanel(container);
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
