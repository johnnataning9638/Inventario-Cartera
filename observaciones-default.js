// DEFAULT VISUAL DE OBSERVACIONES SEGÚN REFERENCIA ENTREGADA
// La imagen de referencia tiene 1410 px de ancho; ese será el ancho inicial.
// Si el usuario redimensiona manualmente la columna, se respeta su nuevo ancho.
(function(){
  const DEFAULT_OBS_WIDTH=1410;

  function observationIndex(table){
    const header=table?.querySelector("thead tr");
    if(!header)return -1;
    return [...header.children].findIndex(th=>/^(OBSERVACIONES?|COMENTARIOS?|DESCRIPCIÓN|DESCRIPCION|DETALLE)$/.test(String(th.innerText||"").replace(/\s+/g," ").trim().toUpperCase()));
  }

  function applyDefault(table){
    if(!table||table.dataset.obsDefaultApplied==="1")return;
    const idx=observationIndex(table);
    if(idx<0)return;

    // Si ya existe un ancho registrado por el usuario, no lo reemplazamos.
    if(table.dataset.obsWidth)return;

    table.dataset.obsWidth=String(DEFAULT_OBS_WIDTH);
    if(typeof window.autoFitCarteraTables==="function")window.autoFitCarteraTables(table.parentElement||document);
    table.dataset.obsDefaultApplied="1";
  }

  function scan(root){
    (root||document).querySelectorAll(".tablewrap table").forEach(applyDefault);
  }

  function start(){
    scan(document);
    const content=document.getElementById("content");
    if(content){
      new MutationObserver(()=>scan(content)).observe(content,{childList:true,subtree:true});
    }
    setTimeout(()=>scan(document),100);
    setTimeout(()=>scan(document),500);
    setTimeout(()=>scan(document),1200);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
