// csvLoader.js
export function loadSTMfromCSV(csvText){
  const lines = csvText.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const idx = {
    key: header.indexOf("key"),
    weight: header.indexOf("weight"),
    notice: header.indexOf("notice_threshold"),
    narrative: header.indexOf("narrative")
  };
  const out = {};
  for (const line of lines.slice(1)){
    if (!line.trim()) continue;
    const cols = line.split(",");
    const key = cols[idx.key];
    const weight = parseFloat(cols[idx.weight]);
    const notice_threshold = parseInt(cols[idx.notice], 10);
    const narrative = cols.slice(idx.narrative).join(",");
    out[key] = { key, weight, notice_threshold, narrative };
  }
  return out;
}
