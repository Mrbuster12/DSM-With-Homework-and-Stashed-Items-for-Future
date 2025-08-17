# Care Tier Attach Patch (Non-Destructive Mount)

**Goal:** Replace the obsolete bottom button with the new Care Tier panel **without** touching your existing concordance/DSM logic or index structure. If the target button can't be found, we create a floating dock instead.

## What this does
- Searches for a bottom "BPIRL/Bipolar/Borderline" style button or toolbar using robust selectors.
- Swaps that node with a Shadow DOM host and mounts the Care Tier panel inside (CSS/JS isolated).
- Provides runtime CSV → STM loading and one-click DAP PDF export.
- Leaves all upstream features (concordance, DSM dropdown, docs engine) untouched.

## Files
- `sta.js` – estimator logic (abstracted)
- `csvLoader.js` – CSV → STM parser
- `pdfExport.js` – DAP → PDF via jsPDF
- `care_tier_panel.html` – shadow template
- `care_tier_attach.js` – auto-mount script
- `README_INTEGRATION.md` – this file

## How to integrate (2-minute drop-in)
1. Copy all files from this folder into your deployed site (commonly `/assets/care-tier/`).
2. In your **index.html**, add right before `</body>`:

```html
<!-- jsPDF CDN -->
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
<script type="module">
  // Expose jsPDF for our module (safely)
  window.jsPDF = window.jspdf.jsPDF;
  import '/assets/care-tier/sta.js';
  import '/assets/care-tier/csvLoader.js';
  import '/assets/care-tier/pdfExport.js';
  import '/assets/care-tier/care_tier_attach.js';
</script>
```

3. Deploy. If the obsolete button exists, it will be replaced. Otherwise a small floating panel appears bottom-right.

## Configure the mount target
- If you know the exact selector for the obsolete button, edit `SELECTORS` in `care_tier_attach.js` to put that selector first (e.g., `'#bipolarButton'`).

## Feeding live session data
- If your page exposes a live snapshot, set `window.__VSC_EXAMPLE__ = { ... }` before the module imports. The attach script will use it instead of the demo snapshot.

## Rollback
- Remove the `<script type="module">` block and delete `/assets/care-tier/` files. No other parts are touched.

## IP Safety
- Dimension names and narratives are abstracted. Your STM CSV remains a sealed trade secret per release.
