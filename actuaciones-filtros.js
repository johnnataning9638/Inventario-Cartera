/* INVENTARIO DE CARTERA — ACTUACIONES / EXPEDIENTES — BÚSQUEDA Y FILTROS */
(function(){
  const VERSION='20261010.6';
  const TYPE='actuaciones';
  function isActuaciones(){
    return String(window.view||'').toLowerCase()===TYPE || String(document.getElementById('title')?.textContent||'').trim().toUpperCase()==='ACTUACIONES / EXPEDIENTES';
  }
  function normalize(v){return String(v??'').trim().toLowerCase();}
  function searchRows(q){
    const needle=normalize(q);
    const rows=Array.isArray(cache.actuaciones)?cache.actuaciones:[];
    if(!needle)return rows;
    return rows.filter(r=>{
      const values=[r?.nit,r?.razon_social,r?.expediente];
      return values.some(v=>normalize(v).includes(needle));
    });
  }
  function installSearch(){
    if(window.__ACTUACIONES_SEARCH_20261010_6__)return;
    const nativeRender=window.render;
    if(typeof nativeRender!=='function')return;
    window.render=function(){
      if(!isActuaciones())return nativeRender.apply(this,arguments);
      const input=document.getElementById('search');
      const q=String(input?.value||'').trim();
      if(!q)return nativeRender.apply(this,arguments);
      const originalRows=cache.actuaciones;
      try{
        cache.actuaciones=searchRows(q);
        input.value='';
        nativeRender.apply(this,arguments);
      }finally{
        cache.actuaciones=originalRows;
        input.value=q;
      }
    };
    window.__ACTUACIONES_SEARCH_20261010_6__=true;
  }
  function closeOpenPanels(e){
    if(!isActuaciones())return;
    const target=e.target;
    if(target?.closest?.('.column-filter-panel,.filter-icon'))return;
    document.querySelectorAll('#content .column-filter-panel.open').forEach(panel=>panel.classList.remove('open'));
  }
  function installPanelClose(){
    if(document.documentElement.dataset.actuacionesFilterCloseBound==='1')return;
    document.documentElement.dataset.actuacionesFilterCloseBound='1';
    document.addEventListener('click',closeOpenPanels,false);
  }
  function install(){
    installSearch();
    installPanelClose();
    window.__ACTUACIONES_FILTERS_VERSION__=VERSION;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,160));
  else setTimeout(install,160);
})();
