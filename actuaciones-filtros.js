/* INVENTARIO DE CARTERA — ACTUACIONES / EXPEDIENTES — BÚSQUEDA Y FILTROS */
(function(){
  const VERSION='20261010.7';
  const TYPE='actuaciones';
  function isActuaciones(){return String(window.view||'').toLowerCase()===TYPE||String(document.getElementById('title')?.textContent||'').trim().toUpperCase()==='ACTUACIONES / EXPEDIENTES';}
  function closeOpenPanels(e){
    if(!isActuaciones())return;
    const target=e.target;
    if(target?.closest?.('.column-filter-panel,.filter-icon'))return;
    document.querySelectorAll('#content .column-filter-panel.open').forEach(panel=>panel.classList.remove('open'));
  }
  function install(){
    if(document.documentElement.dataset.actuacionesFilterCloseBound!=='1'){
      document.documentElement.dataset.actuacionesFilterCloseBound='1';
      document.addEventListener('click',closeOpenPanels,false);
    }
    window.__ACTUACIONES_FILTERS_VERSION__=VERSION;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,160));else setTimeout(install,160);
})();
