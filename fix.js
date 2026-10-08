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

    const ths=[...table.querySelectorAll("thead th")];
    const th=ths.find(x=>String(x.textContent||"").replace(/\s+/g," ").trim().toUpperCase().startsWith("ESTADO"));
    if(!th)return;
    const idx=th.cellIndex;

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

  // AUTOAJUSTE GENERAL DE COLUMNAS.
  // Se aplica a las tablas de INICIO, EXPEDIENTES, TÍTULOS/TDJ, PAGOS y ACTUACIONES.
  function autoFitTables(root){
    const scope=root||document;
    scope.querySelectorAll(".tablewrap table").forEach(table=>{
      const rows=[...table.querySelectorAll("thead tr,tbody tr")];
      if(!rows.length)return;
      const header=table.querySelector("thead tr");
      if(!header)return;
      const count=header.children.length;
      if(!count)return;

      const widths=new Array(count).fill(70);
      const maxRows=rows.slice(0,251);
      maxRows.forEach(row=>{
        [...row.children].slice(0,count).forEach((cell,i)=>{
          const text=String(cell.innerText||cell.textContent||"").replace(/\s+/g," ").trim();
          const controls=cell.querySelectorAll("input,select,button");
          let controlWidth=0;
          controls.forEach(el=>{
            const r=el.getBoundingClientRect();
            if(r.width)controlWidth=Math.max(controlWidth,r.width);
          });
          const textWidth=Math.min(420,Math.max(46,text.length*7.1+24));
          widths[i]=Math.max(widths[i],textWidth,controlWidth+18);
        });
      });

      const colgroup=table.querySelector("colgroup[data-autofit='1']")||document.createElement("colgroup");
      colgroup.dataset.autofit="1";
      while(colgroup.children.length<count)colgroup.appendChild(document.createElement("col"));
      while(colgroup.children.length>count)colgroup.removeChild(colgroup.lastChild);
      [...colgroup.children].forEach((col,i)=>{
        const th=header.children[i];
        const label=String(th?.innerText||"").replace(/\s+/g," ").trim().toUpperCase();
        let w=Math.round(Math.min(420,Math.max(70,widths[i])));
        if(/^(ACCIONES|ACCIÓN)$/.test(label))w=Math.max(w,130);
        if(/^(NIT|ID|AÑO|AÑO GRAVABLE)$/.test(label))w=Math.max(90,Math.min(w,145));
        if(/^(FECHA|FECHA DE PAGO|FECHA TÍTULO|FECHA DEL TÍTULO)$/.test(label))w=Math.max(105,Math.min(w,155));
        col.style.width=w+"px";
      });
      if(!colgroup.parentElement)table.insertBefore(colgroup,table.firstChild);
      table.style.width="max-content";
      table.style.minWidth="100%";
      table.style.tableLayout="auto";
      table.dataset.columnsAutofit="1";

      // OBSERVACIONES: ancho dinámico proporcional al contenido.
      // La columna crece para que el texto se lea en aproximadamente DOS/TRES RENGLONES,
      // sin reducir el tamaño de la fuente ni dejar espacio vacío innecesario dentro de la celda.
      [...header.children].forEach((th,i)=>{
        const label=String(th?.innerText||"").replace(/\s+/g," ").trim().toUpperCase();
        if(!/OBSERVACIONES?|COMENTARIOS?|DESCRIPCIÓN|DESCRIPCION|DETALLE/.test(label))return;

        let maxTextLength=0;
        let maxNaturalWidth=0;
        table.querySelectorAll(`tbody td:nth-child(${i+1})`).forEach(cell=>{
          const text=String(cell.innerText||cell.textContent||"").replace(/\s+/g," ").trim();
          maxTextLength=Math.max(maxTextLength,text.length);
          const rect=cell.getBoundingClientRect();
          if(rect.width)maxNaturalWidth=Math.max(maxNaturalWidth,rect.width);
        });

        // Aproximación para 2-3 líneas con fuente normal de tabla (13 px).
        // Se limita para evitar que una observación excepcional domine toda la pantalla.
        const estimated=Math.ceil((maxTextLength*7.3)/2.5)+40;
        const obsWidth=Math.round(Math.min(900,Math.max(560,estimated,maxNaturalWidth)));
        const col=colgroup.children[i];
        if(col)col.style.width=obsWidth+"px";

        table.querySelectorAll(`thead th:nth-child(${i+1}),tbody td:nth-child(${i+1})`).forEach(cell=>{
          cell.style.whiteSpace="normal";
          cell.style.width=obsWidth+"px";
          cell.style.minWidth=obsWidth+"px";
          cell.style.maxWidth=obsWidth+"px";
          cell.style.lineHeight="1.35";
          cell.style.fontSize="13px";
          cell.style.verticalAlign="top";
          cell.style.overflowWrap="break-word";
          cell.style.wordBreak="normal";
        });
        table.querySelectorAll(`tbody td:nth-child(${i+1})`).forEach(cell=>{
          cell.style.display="-webkit-box";
          cell.style.webkitBoxOrient="vertical";
          cell.style.webkitLineClamp="3";
          cell.style.overflow="hidden";
        });
      });
    });
  }
  window.autoFitCarteraTables=autoFitTables;

  function start(){
    const content=document.getElementById("content");
    if(content && !content.dataset.gestionObserver){
      content.dataset.gestionObserver="1";
      new MutationObserver(function(){
        if(window.__gestionPatchBusy)return;
        window.__gestionPatchBusy=true;
        try{
          patchInicioGestion();
          autoFitTables(content);
        }finally{window.__gestionPatchBusy=false;}
      }).observe(content,{childList:true,subtree:true});
    }
    patchInicioGestion();
    autoFitTables(document);
    setTimeout(()=>autoFitTables(document),250);
    setTimeout(()=>autoFitTables(document),900);
    setInterval(()=>autoFitTables(document),1800);
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