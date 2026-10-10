/* INVENTARIO DE CARTERA - SUPABASE ISOLATION BRIDGE */
(function(){
  if(!window.__CARTERA_PERF_GUARD__){
    window.__CARTERA_PERF_GUARD__=true;
    const NativeSetInterval=window.setInterval.bind(window);
    window.setInterval=function(fn,delay,...args){try{const src=Function.prototype.toString.call(fn);if(/autoFitTables\(document\)/.test(src)||/scan\(document\)/.test(src))return NativeSetInterval(()=>{},60000,...args)}catch{}return NativeSetInterval(fn,delay,...args);};
  }
  const TARGET_URL=window.__INVENTARIO_SUPABASE__?.url||"https://wwkcgspbarhbhcbayerw.supabase.co";
  if(!window.supabase||typeof window.supabase.createClient!=="function")return;
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=function(_url,_key,options){
    const targetKey=window.__INVENTARIO_SUPABASE__?.key||_key;
    const client=originalCreateClient(TARGET_URL,targetKey,options||{});
    try{
      let legacyBootSuppressed=false;const originalGetSession=client.auth.getSession.bind(client.auth);
      client.auth.getSession=async function(...args){if(!legacyBootSuppressed){legacyBootSuppressed=true;return {data:{session:null},error:null};}return originalGetSession(...args);};
      const originalFrom=client.from.bind(client),removedTables=new Set(['cartera_expedientes','cartera_embargos']);
      client.from=function(table){const name=String(table||'');if(removedTables.has(name))return {select:()=>({order:async()=>({data:[],error:null}),then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)})};return originalFrom(table);};
    }catch(error){console.warn('[INVENTARIO] GUARD DE AUTENTICACIÓN',error);}return client;
  };
  window.__INVENTARIO_SUPABASE_ISOLATED__=true;window.__INVENTARIO_LEGACY_AUTH_GUARD__=true;window.__INVENTARIO_REMOVED_TABLE_GUARD__=true;
  function normalizeNavigation(){document.querySelectorAll('nav button[data-view="expedientes"]').forEach(b=>b.remove());const a=document.querySelector('nav button[data-view="actuaciones"]');if(a)a.textContent='ACTUACIONES / EXPEDIENTES';}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalizeNavigation);else normalizeNavigation();
  const loadLayer=(key,src,label)=>{if(window[key])return;window[key]=true;const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>console.info('[INVENTARIO] '+label+' CARGADA.');s.onerror=e=>console.warn('[INVENTARIO] NO SE PUDO CARGAR '+label,e);document.head.appendChild(s);};
  const loadTitulosLayer=()=>loadLayer('__TITULOS_LAYER_LOADED__','titulos.js?v=20261010.1','CAPA TÍTULOS / TDJ');
  const loadActuacionesLayer=()=>loadLayer('__ACTUACIONES_EXPEDIENTES_LAYER_LOADED__','actuaciones-expedientes.js?v=20261010.4','CAPA ACTUACIONES / EXPEDIENTES');
  const loadOptimizationLayers=()=>{loadLayer('__ACTUACIONES_OPT_LOADED__','optimizacion-actuaciones.js?v=20261010.5','OPTIMIZACIÓN ACTUACIONES');loadLayer('__CARTERA_DELETE_LAYER_LOADED__','acciones-eliminar.js?v=20261010.5','BOTÓN ELIMINAR');loadLayer('__ACTUACIONES_FILTERS_LOADED__','actuaciones-filtros.js?v=20261010.7','FILTROS ACTUACIONES / EXPEDIENTES');};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{loadTitulosLayer();loadActuacionesLayer();setTimeout(loadOptimizationLayers,20);});else{loadTitulosLayer();loadActuacionesLayer();setTimeout(loadOptimizationLayers,20);}
})();
