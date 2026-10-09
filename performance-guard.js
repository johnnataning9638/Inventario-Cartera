// PROTECCIÓN DE RENDIMIENTO Y CABECERAS — INVENTARIO DE CARTERA v20261009.11
(function(){
  if(window.__CARTERA_PERF_GUARD__)return;
  window.__CARTERA_PERF_GUARD__=true;
  const NativeSetInterval=window.setInterval.bind(window);
  window.setInterval=function(fn,delay,...args){
    try{
      const src=Function.prototype.toString.call(fn);
      if(/autoFitTables\(document\)/.test(src)) return NativeSetInterval(()=>{},Math.max(Number(delay)||1800,60000),...args);
      if(/scan\(document\)/.test(src)) return NativeSetInterval(()=>{},Math.max(Number(delay)||1800,60000),...args);
    }catch{}
    return NativeSetInterval(fn,delay,...args);
  };

  let wrappedAutoFit=null,lastAutoFit=0;
  Object.defineProperty(window,'autoFitCarteraTables',{configurable:true,get(){return wrappedAutoFit;},set(fn){
    if(typeof fn!=='function'){wrappedAutoFit=fn;return;}
    wrappedAutoFit=function(root,force){
      const now=Date.now();
      if(!force && now-lastAutoFit<1200)return;
      lastAutoFit=now;
      return fn(root,force);
    };
  }});
  const NativeMutationObserver=window.MutationObserver;
  if(NativeMutationObserver){
    window.MutationObserver=function(callback){
      const src=Function.prototype.toString.call(callback);
      if(!/autoFitTables\(content\)/.test(src))return new NativeMutationObserver(callback);
      const guarded=function(records,observer){
        let tableAdded=false;
        for(const m of records||[]){
          for(const n of Array.from(m.addedNodes||[])){
            if(n?.nodeType===1 && (n.matches?.('table.expedientes-table')||n.querySelector?.('table.expedientes-table'))){tableAdded=true;break;}
          }
          if(tableAdded)break;
        }
        if(tableAdded)callback(records,observer);
      };
      return new NativeMutationObserver(guarded);
    };
    window.MutationObserver.prototype=NativeMutationObserver.prototype;
  }
  function install(){
    if(document.getElementById('cartera-performance-guard-style'))return;
    const style=document.createElement('style');style.id='cartera-performance-guard-style';style.textContent=`
      .expedientes-table thead th{box-sizing:border-box!important;padding-left:7px!important;padding-right:42px!important;white-space:nowrap!important;overflow:visible!important;}
      .expedientes-table thead th .header-tools{min-width:40px!important;width:40px!important;max-width:40px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;box-sizing:border-box!important;}
      .expedientes-table thead th .filter-icon,.expedientes-table thead th .sort-header{flex-shrink:0!important;}
      .expedientes-table thead th .column-filter-panel{box-sizing:border-box!important;max-width:min(360px,calc(100vw - 24px))!important;}
    `;document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
