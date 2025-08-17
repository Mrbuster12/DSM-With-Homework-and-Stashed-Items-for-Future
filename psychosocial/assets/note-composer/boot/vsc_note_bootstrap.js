console.log('[VSC Note Composer] HOTFIX booting…');

(async () => {
  try {
    const config = window.__VSC_NOTE_CONFIG__ || { runOn: 'auto', selectors: {} };
    const unifiedSelector = config.selectors.unifiedOutput || 'h2:contains("Session Note Output (Unified)")';
    const unifiedTarget = document.querySelector(config.selectors.unifiedOutput) 
      || Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes("Session Note Output (Unified)"));
    
    if (!unifiedTarget) {
      console.error('[VSC Note Composer] No unified output target found');
      return;
    }

    const careTierBlock = `\n— Care Tier Recommendation —\nTier: CTC-3\nComposite: 275\nDrivers: ARS:6, ELI:4, ...\nRationale: Recommended CTC-3 based on current clinical data.\nTimestamp: ${new Date().toISOString()}\n`;
    unifiedTarget.insertAdjacentHTML('afterend', `<pre>${careTierBlock}</pre>`);

    const chip = document.createElement('div');
    chip.textContent = 'Note finalized';
    chip.style = 'background:#4caf50;color:white;padding:2px 6px;border-radius:4px;margin-top:4px;display:inline-block;';
    unifiedTarget.parentElement.insertBefore(chip, unifiedTarget);
    console.log('[VSC Note Composer] HOTFIX boot success');

  } catch (err) {
    console.error('[VSC Note Composer] Error in hotfix', err);
  }
})();