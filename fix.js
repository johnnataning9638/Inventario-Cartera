// PARCHE DE COMPATIBILIDAD PARA INICIO Y ATAJOS
(function(){
  function contributorData(id){
    const c=(window.cache&&Array.isArray(cache.contribuyentes))?cache.contribuyentes.find(x=>Number(x.id)===Number(id)):null;
    return c?{nit:c.nit||"",razon:c.razon_social||""}:{nit:"",razon:""};
  }
  window.contributorData=contributorData;

  function applyInicioGestion(){
    if(typeof window.view!=="undefined" && window.view!=="inicio")return;
    const content=document.getElementById("content");
    if(!content)return;
    const table=content.querySelector("table.resizable-table");
    if(!table)return;

    const headers=[...table.querySelectorAll("thead th[data-column-key]")];
    const th=headers.find(x=>x.dataset.columnKey==="estado");
    if(!th)return;

    // En INICIO, la columna ESTADO pasa a representar GESTIÓN.
    th.dataset.columnKey="gestion";
    const sortButton=th.querySelector(".sort-header");
    if(sortButton)sortButton.textContent="GESTIÓN";
    const filterButton=th.querySelector(".filter-icon");
    if(filterButton)filterButton.setAttribute("aria-label","FILTRAR GESTIÓN");
    if(th.querySelector(".column-filter-title"))th.querySelector(".column-filter-title").textContent="GESTIÓN";

    // Sustituye únicamente los controles de esa columna por el campo GESTIÓN.
    const bodyCells=[...table.querySelectorAll("tbody tr")].map(tr=>tr.children[5]).filter(Boolean);
    bodyCells.forEach(cell=>{
      const old=cell.querySelector("select.inline-status[data-inline-field=\"estado\"]");
      if(!old)return;
      const id=Number(old.dataset.statusId);
      const rec=(window.cache&&Array.isArray(cache.expedientes))?cache.expedientes.find(x=>Number(x.id)===id):null;
      if(!rec || typeof window.inlineGestion!=="function")return;
      cell.innerHTML=window.inlineGestion(rec);
    });
  }

  const originalRender=window.render;
  if(typeof originalRender==="function"){
    window.render=function(){
      const result=originalRender.apply(this,arguments);
      setTimeout(applyInicioGestion,0);
      return result;
    };
  }

  window.applyInicioGestion=applyInicioGestion;

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