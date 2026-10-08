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
    if(!title || String(title.textContent||"").trim().toUpperCase()!=="INICIO")return;
    const content=document.getElementById("content");
    if(!content)return;
    const table=content.querySelector("table.resizable-table");
    if(!table)return;

    // Ubicar la columna por su encabezado real. No dependemos de una posición fija.
    const ths=[...table.querySelectorAll("thead th")];
    const th=ths.find(x=>String(x.textContent||"").replace(/\s+/g," ").trim().toUpperCase().startsWith("ESTADO"));
    if(!th)return;
    const idx=th.cellIndex;

    // INICIO: ESTADO -> GESTIÓN.
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

    // El valor visible también debe ser GESTIÓN, no el ESTADO del expediente.
    table.querySelectorAll("tbody tr").forEach(tr=>{
      const cell=tr.children[idx];
      if(!cell)return;
      const old=cell.querySelector("select.inline-status");
      if(!old)return;
      const id=Number(old.dataset.statusId||old.dataset.id||0);
      const rec=(Array.isArray(window.cache?.expedientes))?window.cache.expedientes.find(x=>Number(x.id)===id):null;
      if(rec && typeof window.inlineGestion==="function")cell.innerHTML=window.inlineGestion(rec);
    });
  }

  window.applyInicioGestion=patchInicioGestion;

  // El contenido de INICIO se reconstruye dinámicamente; por eso observamos el DOM
  // y aplicamos el cambio después de cada render, sin modificar las demás pestañas.
  const observer=new MutationObserver(()=>{
    if(window.__gestionPatchBusy)return;
    window.__gestionPatchBusy=true;
    try{patchInicioGestion();}finally{window.__gestionPatchBusy=false;}
  });
  function startObserver(){
    const content=document.getElementById("content");
    if(content && !content.dataset.gestionObserver){
      content.dataset.gestionObserver="1";
      observer.observe(content,{childList:true,subtree:true});
    }
    patchInicioGestion();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startObserver);else startObserver();

  document.addEventListener("keydown",function(e){
    if(!(e.ctrlKey||e.metaKey)||String(e.key).toLowerCase()!=="v")return;
    const el=e.target;
    if(!el || !el.matches(".inline-date-field,.inline-status"))return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof window.bulkFillFromFocused==="function"){
      const synthetic=new KeyboardEvent("keydown",{key:"b",ctrlKey:true,metaKey:false,bubbles:true,cancelable:true});
      Object.defineProperty(synthetic,"target",{value:el});
      window.bulkFillFromFocused(synthetic);
    }
  },true);
})();