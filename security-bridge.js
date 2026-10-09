/* INVENTARIO DE CARTERA - SUPABASE ISOLATION BRIDGE
   Forces the application client to the dedicated Inventario-Cartera project.
   Compatibility guard: the legacy app.js bootAuth() performs an immediate getSession()
   before security-hardening.js takes ownership of authentication. The first getSession()
   is therefore answered as an empty local session so legacy bootAuth() exits before its
   obsolete cartera_acceso INSERT path. The real session is returned from the second call,
   which is used by the controlled MFA flow. This does not alter database/RLS permissions. */
(function(){
  /* PERFORMANCE GUARD: must install before app.js/fix.js so Expedientes never runs the
     expensive 1.8s auto-fit loop or recalculates 761 rows during sort/filter mutations. */
  if(!window.__CARTERA_PERF_GUARD__){
    window.__CARTERA_PERF_GUARD__=true;
    const NativeSetInterval=window.setInterval.bind(window);
    window.setInterval=function(fn,delay,...args){
      try{const src=Function.prototype.toString.call(fn);if(/autoFitTables\(document\)/.test(src)||/scan\(document\)/.test(src))return NativeSetInterval(()=>{},60000,...args);}catch{}
      return NativeSetInterval(fn,delay,...args);
    };
    let wrappedAutoFit=null,lastAutoFit=0;
    Object.defineProperty(window,'autoFitCarteraTables',{configurable:true,get(){return wrappedAutoFit;},set(fn){
      if(typeof fn!=='function'){wrappedAutoFit=fn;return;}
      wrappedAutoFit=function(root,force){const now=Date.now();if(!force&&now-lastAutoFit<1200)return;lastAutoFit=now;return fn(root,force);};
    }});
    const NativeMutationObserver=window.MutationObserver;
    if(NativeMutationObserver){
      window.MutationObserver=function(callback){
        const src=Function.prototype.toString.call(callback);
        if(!/autoFitTables\(content\)/.test(src))return new NativeMutationObserver(callback);
        return new NativeMutationObserver(function(records,observer){
          const tableAdded=(records||[]).some(m=>Array.from(m.addedNodes||[]).some(n=>n?.nodeType===1&&(n.matches?.('table.expedientes-table')||n.querySelector?.('table.expedientes-table'))));
          if(tableAdded)callback(records,observer);
        });
      };
      window.MutationObserver.prototype=NativeMutationObserver.prototype;
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCarteraPerfStyle);else installCarteraPerfStyle();
  }
  function installCarteraPerfStyle(){
    if(document.getElementById('cartera-performance-guard-style'))return;
    const style=document.createElement('style');style.id='cartera-performance-guard-style';style.textContent=`
      .expedientes-table thead th{box-sizing:border-box!important;padding-left:7px!important;padding-right:42px!important;white-space:nowrap!important;overflow:visible!important;}
      .expedientes-table thead th .header-tools{min-width:40px!important;width:40px!important;max-width:40px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;box-sizing:border-box!important;}
      .expedientes-table thead th .filter-icon,.expedientes-table thead th .sort-header{flex-shrink:0!important;}
      .expedientes-table thead th .column-filter-panel{box-sizing:border-box!important;max-width:min(360px,calc(100vw - 24px))!important;}
    `;document.head.appendChild(style);
  }
  const TARGET_URL="https://wwkcgspbarhbhcbayerw.supabase.co";
  const TARGET_KEY="sb_publishable_UCLa1Eax6ZxwcTGEwVqE_w_cP-XjM_8";
  if(!window.supabase||typeof window.supabase.createClient!=="function") return;
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=function(_url,_key,options){
    const client=originalCreateClient(TARGET_URL,TARGET_KEY,options||{});
    try{
      let legacyBootSuppressed=false;
      const originalGetSession=client.auth.getSession.bind(client.auth);
      client.auth.getSession=async function(...args){
        if(!legacyBootSuppressed){legacyBootSuppressed=true;console.info("[INVENTARIO] ARRANQUE LEGACY SUPRIMIDO; AUTENTICACIÓN MFA CONTROLADA.");return {data:{session:null},error:null};}
        return originalGetSession(...args);
      };
    }catch(error){console.warn("[INVENTARIO] NO FUE POSIBLE INSTALAR EL GUARD DE AUTENTICACIÓN",error);}
    return client;
  };
  window.__INVENTARIO_SUPABASE_ISOLATED__=true;
  window.__INVENTARIO_LEGACY_AUTH_GUARD__=true;
})();
