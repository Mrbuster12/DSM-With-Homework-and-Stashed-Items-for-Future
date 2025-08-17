// sta.js
export const defaultSTM = {
  ARS: { key: "ARS", weight: 1.8, notice_threshold: 65, narrative: "acute risk indicators triggered; prioritize stabilization and safety planning" },
  ELI: { key: "ELI", weight: 1.1, notice_threshold: 60, narrative: "recent exposure patterns indicate elevated intensity of use" },
  PDL: { key: "PDL", weight: 1.3, notice_threshold: 55, narrative: "probable physiological dependence; monitor withdrawal risk" },
  BSI: { key: "BSI", weight: 1.2, notice_threshold: 50, narrative: "biomedical concerns increase care complexity" },
  CBF: { key: "CBF", weight: 1.4, notice_threshold: 55, narrative: "cognitive/behavioral symptoms suggest impaired self-regulation" },
  RES: { key: "RES", weight: 1.0, notice_threshold: 60, narrative: "recovery environment lacks stabilization supports" },
  ERQ: { key: "ERQ", weight: 0.9, notice_threshold: 50, narrative: "engagement signals marginal; motivational enhancement recommended" },
};

function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
function nowIso(){ return new Date().toISOString(); }

export function computeDRI(session={}){
  const tf = session.transcriptFlags || {};
  const sev = session.severitySignals || {};
  const bio = session.biometricFlags || {};
  const env = session.environment || {};
  const eng = session.engagement || {};
  const hist = session.history || {};
  const use = session.usage || {};

  const ARS = clamp(
    (tf["self_harm"]? 70:0) +
    (tf["harm_others"]? 70:0) +
    (tf["suicidal_ideation"]? 50:0) +
    (bio["fall"]? 30:0) +
    (bio["syncopal_event"]? 30:0) +
    Math.round(100*(sev["acute_risk"]||0)),
    0, 100
  );

  const ELI = clamp(
    (use.daysUsedPast30 || 0) * 2 +
    (use.polysubstance ? 20 : 0) +
    (use.bingesPast30 || 0) * 3 +
    (use.lastUseDaysAgo != null ? Math.max(0, 20 - use.lastUseDaysAgo) : 0) +
    Math.round(100*(sev["exposure_intensity"]||0)),
    0, 100
  );

  const PDL = clamp(
    (hist.withdrawalHistory ? 50 : 0) +
    (hist.priorDetox ? 20 : 0) +
    Math.round(100*(sev["dependence_likelihood"]||0)),
    0, 100
  );

  const BSI = clamp(
    (hist.medComorbidity==="severe" ? 70 : hist.medComorbidity==="moderate" ? 40 : 0) +
    Math.round(100*(sev["biomedical_instability"]||0)),
    0, 100
  );

  const CBF = clamp(
    Math.round(100*(sev["mood_dysreg"]||0)) +
    Math.round(100*(sev["impulsivity"]||0)) +
    Math.round(100*(sev["cognitive_impair"]||0)),
    0, 100
  );

  const RES = clamp(
    (env.housingStable===false ? 40 : 0) +
    (env.socialSupport==="low" ? 30 : env.socialSupport==="medium" ? 10 : 0) +
    (env.highRiskTriggers ? 30 : 0),
    0, 100
  );

  const ERQ = clamp(
    (eng.motivation==="low" ? 70 : eng.motivation==="medium" ? 40 : 10) +
    (eng.adherenceHistory==="poor" ? 20 : eng.adherenceHistory==="fair" ? 10 : 0),
    0, 100
  );

  return { ARS, ELI, PDL, BSI, CBF, RES, ERQ };
}

export function scoreComposite(DRI, stm=defaultSTM){
  return (
    DRI.ARS * stm.ARS.weight +
    DRI.ELI * stm.ELI.weight +
    DRI.PDL * stm.PDL.weight +
    DRI.BSI * stm.BSI.weight +
    DRI.CBF * stm.CBF.weight +
    DRI.RES * stm.RES.weight +
    DRI.ERQ * stm.ERQ.weight
  );
}

function applySafety(DRI){
  if (DRI.ARS >= 80) return "CTC-5";
  if (DRI.ARS >= 65) return "CTC-4";
  return null;
}

function mapToCTC(S, DRI){
  const safety = applySafety(DRI);
  if (safety) return safety;
  if (S >= 520) return "CTC-4";
  if (S >= 420) return "CTC-3";
  if (S >= 320) return "CTC-2";
  if (S >= 220) return "CTC-1";
  return "CTC-0";
}

function tierRank(t){ return { "CTC-0":0,"CTC-1":1,"CTC-2":2,"CTC-3":3,"CTC-4":4,"CTC-5":5 }[t] ?? 0; }
function meetsMargin(prevS, S, margin){ if (prevS <= 0) return true; const delta = (prevS - S) / prevS; return delta >= margin; }

export function composeRationale(ctc, DRI, stm=defaultSTM){
  const entries = Object.entries(DRI);
  entries.sort((a,b)=> b[1]-a[1]);
  const top = entries.filter(([k,v]) => v >= stm[k].notice_threshold).slice(0,3);
  const drivers = top.map(([k]) => stm[k].narrative);
  return `Recommended ${ctc} based on: ${drivers.join("; ")}`;
}

export function infer(session, prev=null, stm=defaultSTM){
  const DRI = computeDRI(session);
  const S = scoreComposite(DRI, stm);
  let CTC = mapToCTC(S, DRI);
  if (prev){
    if (tierRank(CTC) < tierRank(prev.CTC)){
      if (!meetsMargin(prev.S, S, 0.10)){
        CTC = prev.CTC;
      }
    }
  }
  const rationale = composeRationale(CTC, DRI, stm);
  return { CTC, S, DRI, rationale, timestamp: nowIso() };
}

export function generateDAPSegment(result){
  return [
    `Care Tier: ${result.CTC}`,
    `Composite Score: ${Math.round(result.S)}`,
    `Drivers: ${Object.entries(result.DRI).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k+":"+v).join(", ")}`,
    `Rationale: ${result.rationale}`
  ].join("\n");
}
