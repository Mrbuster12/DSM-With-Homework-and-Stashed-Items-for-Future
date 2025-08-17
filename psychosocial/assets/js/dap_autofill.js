
/* DAP auto-fill: if Description/Goals are empty, derive from Scenario + D/A/P content */
(() => {
  function getText(id) {
    const el = document.querySelector(id);
    return (el && (el.value || el.textContent || '')).trim();
  }
  function setText(id, text) {
    const el = document.querySelector(id);
    if (!el) return;
    if ('value' in el) el.value = text;
    else el.textContent = text;
  }
  function sentenceCase(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  // Basic goal templates by assessment keyword
  const GOAL_LIBRARY = {
    depression: [
      "Increase daily activation to 5 activities/week",
      "Reduce PHQ-9 score by 5 points in 6 weeks",
      "Establish consistent sleep schedule (7–8 hrs)"
    ],
    anxiety: [
      "Practice diaphragmatic breathing 2× daily",
      "Reduce GAD-7 score by 4 points in 6 weeks",
      "Gradual exposure to avoided situations (1/week)"
    ],
    relapse: [
      "Attend 7 recovery meetings/week for 4 weeks",
      "Implement craving log with HALT check-ins daily",
      "Secure accountability partner and share plan"
    ]
  };

  // Parse the on-screen note if present
  function derive() {
    // Try to locate fields by common ids/names; fallback to data-attributes
    const scenario = getText('#scenario, [data-field="scenario"], .note-scenario');
    let desc = getText('#description, [data-field="description"], .note-description');
    let goals = getText('#goals, [data-field="goals"], .note-goals');

    const d = getText('#dap-data, [data-field="dap-data"], .dap-data');
    const a = getText('#dap-assessment, [data-field="dap-assessment"], .dap-assessment');
    const p = getText('#dap-plan, [data-field="dap-plan"], .dap-plan');

    // Auto Description
    if (!desc) {
      const bits = unique([
        scenario && `Session focused on ${scenario.toLowerCase()}.`,
        d && `Client reported: ${sentenceCase(d)}.`,
        a && `Clinician impression: ${sentenceCase(a)}.`
      ]);
      desc = bits.join(' ');
      if (desc) setText('#description, [data-field="description"], .note-description', desc);
      console.log('[DAP] Autofilled Description ->', desc);
    }

    // Auto Goals
    if (!goals) {
      const key = (a || d || '').toLowerCase();
      let bank = [];
      if (/\bdepress/.test(key)) bank = bank.concat(GOAL_LIBRARY.depression);
      if (/\banx/.test(key)) bank = bank.concat(GOAL_LIBRARY.anxiety);
      if (/\brelaps/.test(key) || /\buse\b|\bcraving/.test(key)) bank = bank.concat(GOAL_LIBRARY.relapse);
      if (bank.length === 0) {
        bank = [
          "Identify 2 personal strengths and 2 supports",
          "Complete one measurable homework task before next session",
          "Set and review 1 short-term objective weekly"
        ];
      }
      goals = bank.slice(0,3).map((g,i)=>`${i+1}. ${g}`).join('\n');
      setText('#goals, [data-field="goals"], .note-goals', goals);
      console.log('[DAP] Autofilled Goals ->', goals);
    }
  }

  // Expose as a small API and auto-run on load
  window.DAPAutofill = { run: derive };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', derive);
  } else {
    setTimeout(derive, 0);
  }
})();



/* ==== VSC: DAP Prehook for BPIRL (Option B) ====
   This hook inspects DSM selection + biometric concordance and, when indicated,
   runs BPIRL and merges outputs into the note before export/save.
   Non-destructive: if anything fails, it no-ops.
*/
(function(){
  function qs(s, r=document){ return r.querySelector(s); }
  function qsa(s, r=document){ return Array.from(r.querySelectorAll(s)); }
  function text(el){ return (el && (el.value||el.textContent||'')).toString().trim(); }

  function getDSMId(){
    const sel = qs('#clinicianSelect');
    if(!sel) return "";
    const v = (sel.value||"").trim();
    if(v) return v;
    const lab = sel.options && sel.selectedIndex>=0 ? (sel.options[sel.selectedIndex].textContent||"") : "";
    return lab ? ("dsm_" + lab.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')) : "";
  }

  function getConcordance(){
    const sel = qs('#biometric');
    if(!sel) return "";
    const lab = sel.options && sel.selectedIndex>=0 ? (sel.options[sel.selectedIndex].textContent||"").toLowerCase() : "";
    if(/low/.test(lab)) return 'low';
    if(/moderate/.test(lab)) return 'moderate';
    if(/high/.test(lab)) return 'high';
    return '';
  }

  function isBPDLike(dsmId){
    // crude check for BPD-related specifiers
    return /dissociative|transient_stress_related_paranoid_ideation|borderline/.test(dsmId);
  }

  function ensureArray(a){ return Array.isArray(a) ? a : (a ? [a] : []); }

  function mergeNote(note, bp){
    // Merge risk flags
    const inFlags = ensureArray((bp && bp.risk && bp.risk.flags) || []);
    note.risk = note.risk || {};
    note.risk.flags = ensureArray(note.risk.flags).concat(inFlags).filter(Boolean);

    // Merge interventions
    const inInts = ensureArray((bp && bp.interventions) || []);
    note.interventions = ensureArray(note.interventions).concat(inInts);

    // Append to assessment
    const addLine = (bp && bp.assessment_line) ? (" " + bp.assessment_line) : "";
    if (note.assessment){
      note.assessment += addLine;
    } else {
      note.assessment = addLine.trim();
    }

    // Optionally tag summary
    if (note.summary){
      note.summary += (bp && bp.summary_tag ? (" | " + bp.summary_tag) : "");
    }
    return note;
  }

  // Provide a simple adapter around whatever BPIRL exposes
  function runBPIRL(){
    try{
      if (window.bpirlExec && typeof window.bpirlExec.run === 'function'){
        return window.bpirlExec.run({ source:'dap_prehook' });
      }
      if (window.bpirlGate && typeof window.bpirlGate.execute === 'function'){
        return window.bpirlGate.execute({ source:'dap_prehook' });
      }
    }catch(e){
      console.warn('[DAP Prehook] BPIRL execution failed', e);
    }
    return null;
  }

  function buildNoteSnapshot(){
    const note = {
      data: text(qs('#dapData')),
      assessment: text(qs('#dapAssessment')),
      plan: text(qs('#dapPlan')),
      risk: { flags: [] },
      interventions: [],
      summary: text(qs('#sessionNote')) || text(qs('#outputBox')) || ""
    };
    return note;
  }

  function attach(){
    const dsmId = getDSMId();
    const conc = getConcordance();
    const shouldRun = isBPDLike(dsmId) || conc==='low';

    function precompute(){
      if(!shouldRun) return null;
      const bp = runBPIRL();
      if(!bp) return null;
      // stash for export handlers
      window.VSC_BPIRL = bp;
      return bp;
    }

    // Trigger once on load if indicated
    precompute();

    // Wrap JSON export
    const jsonBtn = document.getElementById('exportJsonBtn');
    if(jsonBtn){
      jsonBtn.addEventListener('click', function(e){
        try{
          const note = buildNoteSnapshot();
          const bp = window.VSC_BPIRL || precompute();
          if (bp){
            const merged = mergeNote(note, bp);
            // expose merged as sessionPayload so existing handler can pick it up
            window.sessionPayload = Object.assign({}, window.sessionPayload||{}, merged);
          }
        }catch(err){ console.warn('[DAP Prehook] JSON export hook failed', err); }
      }, true);
    }

    // Wrap text download
    const txtBtn = document.getElementById('downloadBtn');
    if(txtBtn){
      txtBtn.addEventListener('click', function(e){
        try{
          const note = buildNoteSnapshot();
          const bp = window.VSC_BPIRL || precompute();
          if (bp){
            const merged = mergeNote(note, bp);
            // shove back into UI
            const assessEl = document.getElementById('dapAssessment');
            if (assessEl){ assessEl.value = merged.assessment; }
            const sessEl = document.getElementById('sessionNote') || document.getElementById('outputBox');
            if (sessEl && merged.summary){ sessEl.textContent = merged.summary; }
          }
        }catch(err){ console.warn('[DAP Prehook] Text export hook failed', err); }
      }, true);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
