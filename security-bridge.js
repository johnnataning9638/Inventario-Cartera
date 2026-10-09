/* INVENTARIO DE CARTERA - SUPABASE ISOLATION BRIDGE
   Forces the application client to the dedicated Inventario-Cartera project.
   Compatibility guard: the legacy app.js bootAuth() performs an immediate getSession()
   before security-hardening.js takes ownership of authentication. The first getSession()
   is therefore answered as an empty local session so legacy bootAuth() exits before its
   obsolete cartera_acceso INSERT path. The real session is returned from the second call,
   which is used by the controlled MFA flow. This does not alter database/RLS permissions. */
(function(){
  /* PERFORMANCE GUARD: Expedientes uses its own ultra renderer. Keep the legacy global
     auto-fit away from this table; Inicio keeps its existing renderer untouched. */
  if(!window.__CARTERA_PERF_GUARD__){
    window.__CARTERA_PERF_GUARD__=true;
    const NativeSetInterval=window.setInterval.bind(window);
    window.setInterval=function(fn,delay,...args){
      try{const src=Function.prototype.toString.call(fn);if(/autoFitTables\(document\)/.test(src)||/scan\(document\)/.test(src))return NativeSetInterval(()=>{},60000,...args)}catch{}
      return NativeSetInterval(fn,delay,...args);
    };
    let wrappedAutoFit=null;
    Object.defineProperty(window,'autoFitCarteraTables',{configurable:true,get(){return wrappedAutoFit},set(fn){
      if(typeof fn!=='function'){wrappedAutoFit=fn;return}
      wrappedAutoFit=function(root,force){try{if((root||document).querySelector?.('table.expedientes-table'))return}catch{}return fn(root,force)};
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
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadExpedientesUltraUI);else loadExpedientesUltraUI();
  }
  function loadExpedientesUltraUI(){
    if(window.__EXPEDIENTES_ULTRA_LOADER__)return;
    window.__EXPEDIENTES_ULTRA_LOADER__=true;
    const s=document.createElement('script');
    s.src='expedientes-ultra.js?v=20261009.2';
    s.async=false;
    s.onload=()=>console.info('[INVENTARIO] CAPA EXPEDIENTES ULTRA CARGADA.');
    s.onerror=e=>console.warn('[INVENTARIO] NO SE PUDO CARGAR LA CAPA EXPEDIENTES ULTRA',e);
    document.head.appendChild(s);
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
