
(function(){
  function tryWire(){
    try {
      // Heuristics for where your engine might live
      var eng = (window.VSC && window.VSC.engine)
             || window.engine
             || (window.app && window.app.engine)
             || null;
      if (!eng || typeof eng.evaluateNode !== "function") return false;

      if (window.wrapEvaluateNode) {
        // Wrap only once
        if (!eng.__bpirlWrapped){
          eng.evaluateNode = window.wrapEvaluateNode(eng.evaluateNode);
          eng.__bpirlWrapped = true;
          console.log("[BPIRL] preHooks enabled on engine.evaluateNode");
        }
        // Ensure a ctx exists at least as a scaffold
        if (!eng.ctx) eng.ctx = window.ctxScaffold || {};
        return true;
      }
    } catch(e){}
    return false;
  }
  function wait(fn, tries){
    if (tries <= 0) return;
    if (!fn()){
      setTimeout(function(){ wait(fn, tries-1); }, 300);
    }
  }
  // Register bpirlGate in the registry if not yet
  if (window.bpirlGate && window.hooks && window.hooks.register){
    window.hooks.register("bpirlGate", window.bpirlGate);
  }
  // Start polling to find the engine after your bundle initializes
  wait(tryWire, 40); // ~12s max
})();
