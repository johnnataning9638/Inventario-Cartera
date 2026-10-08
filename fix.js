// PARCHE DE COMPATIBILIDAD PARA INICIO Y ATAJOS
(function(){
  function contributorData(id,record){
    const c=(Array.isArray(window.cache?.contribuyentes))?window.cache.contribuyentes.find(x=>Number(x.id)===Number(id)):null;
    const direct=typeof record==="object"&&record?record:{};
    return c?{nit:direct.nit||c.nit||"",razon:direct.razon_social||c.razon_social||""}:{nit:direct.nit||"",razon:direct.razon_social||""};
  }
  window.contributorData=window.contributorData||contributorData;

  function patchInicioGestion(){
    const title=document.getElementById("title");
    const content=document.getElementById("content");
    if(!title||!content)return;
    if(String(title.textContent||"").trim().toUpperCase()!=="INICIO")return;
    const table=content.querySelector("table.resizable-table");
    if(!table)return;

    // SOLO EN INICIO: localizar la columna cuyo texto sea ESTADO.
    const ths=[...table.querySelectorAll("thead th")];
    const th=ths.find(x=>String(x.textContent||"").replace(/\s+/g," ").trim().toUpperCase().startsWith("ESTADO"));
    if(!th)return;
    const idx=th.cellIndex;

    // Cambiar encabezado y sus acciones de filtro/ordenamiento.
    th.dataset.columnKey="gestion";
    const sortButton=th.querySelector(".sort-header");
    if(sortButton){
      sortButton.textContent="GESTIÓN";
      sortButton.setAttribute("onclick","sortTable('expedientes','gestion')");
    }
    const filterButton=th.querySelector(".filter-icon");
    if(filterButton){
      filterButton.title="FILTRAR GESTIÓN";
      filterButton.setAttribute("aria-label","FILTRAR GESTIÓN");
      filterButton.setAttribute("onclick","toggleColumnFilter(event,'expedientes','gestion')");
    }
    const filterTitle=th.querySelector(".column-filter-title");
    if(filterTitle)filterTitle.textContent="GESTIÓN";

    // Cambiar el control visible de ESTADO por el control real de GESTIÓN.
    table.querySelectorAll("tbody tr").forEach(tr=>{
      const cell=tr.children[idx];
      if(!cell)return;
      const current=cell.querySelector("select.inline-status");
      if(!current)return;
      if(current.dataset.inlineField==="gestion")return;
      const id=Number(current.dataset.statusId||0);
      const rec=(Array.isArray(window.cache?.expedientes))?window.cache.expedientes.find(x=>Number(x.id)===id):null;
      if(rec && typeof window.inlineGestion==="function")cell.innerHTML=window.inlineGestion(rec);
    });
  }

  window.applyInicioGestion=patchInicioGestion;

  // INICIO se reconstruye dinámicamente. Aplicar después de cada reconstrucción.
  function start(){
    const content=document.getElementById("content");
    if(content && !content.dataset.gestionObserver){
      content.dataset.gestionObserver="1";
      new MutationObserver(function(){
        if(window.__gestionPatchBusy)return;
        window.__gestionPatchBusy=true;
        try{patchInicioGestion();}finally{window.__gestionPatchBusy=false;}
      }).observe(content,{childList:true,subtree:true});
    }
    patchInicioGestion();
    setInterval(patchInicioGestion,1000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();

  document.addEventListener("keydown",function(e){
    if(!(e.ctrlKey||e.metaKey)||String(e.key).toLowerCase()!=="v")return;
    const el=e.target;
    if(!el||!el.matches(".inline-date-field,.inline-status"))return;
    e.preventDefault();e.stopPropagation();
    if(typeof window.bulkFillFromFocused==="function"){
      const synthetic=new KeyboardEvent("keydown",{key:"b",ctrlKey:true,bubbles:true,cancelable:true});
      Object.defineProperty(synthetic,"target",{value:el});
      window.bulkFillFromFocused(synthetic);
    }
  },true);
})();