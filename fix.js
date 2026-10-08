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

  function observationIndex(table){
    const header=table?.querySelector("thead tr");
    if(!header)return -1;
    return [...header.children].findIndex(th=>/^(OBSERVACIONES?|COMENTARIOS?|DESCRIPCIÓN|DESCRIPCION|DETALLE)$/.test(String(th.innerText||"").replace(/\s+/g," ").trim().toUpperCase()));
  }

  // 1410 PX ES EL VALOR INICIAL DE CADA APERTURA/RECONSTRUCCIÓN DE LA TABLA.
  // Si el usuario amplía OBSERVACIONES durante la sesión, el ancho manual se conserva
  // mientras esa tabla exista y el texto se adapta al 100% del ancho elegido.
  function readObservationWidth(table){
    const n=Number(table?.dataset?.obsWidth||0);
    return Number.isFinite(n)&&n>=1410?n:1410;
  }

  function writeObservationWidth(table,width){
    const w=Math.max(1410,Math.round(Number(width)||1410));
    table.dataset.obsWidth=String(w);
    return w;
  }

  function applyObservationWidth(table,idx,width){
    if(!table||idx<0)return;
    const w=writeObservationWidth(table,width);
    const colgroup=table.querySelector("colgroup[data-autofit='1']");
    if(colgroup?.children?.[idx])colgroup.children[idx].style.width=w+"px";

    const cells=table.querySelectorAll(`thead th:nth-child(${idx+1}),tbody td:nth-child(${idx+1})`);
    cells.forEach(cell=>{
      cell.style.width=w+"px";
      cell.style.minWidth=w+"px";
      cell.style.maxWidth=w+"px";
      cell.style.whiteSpace="normal";
      cell.style.lineHeight="1.35";
      cell.style.fontSize="13px";
      cell.style.verticalAlign="top";
      cell.style.overflowWrap="anywhere";
      cell.style.wordBreak="normal";
      cell.style.display="table-cell";
      cell.style.overflow="visible";
      cell.style.height="auto";
      cell.style.maxHeight="none";
      cell.style.textOverflow="clip";
      cell.style.webkitLineClamp="unset";
      cell.style.webkitBoxOrient="initial";
    });
    table.querySelectorAll("tbody tr").forEach(tr=>{
      tr.style.height="auto";
      tr.style.minHeight="0";
    });
    table.style.height="auto";
  }

  function bindObservationResizer(table,idx){
    const header=table?.querySelector("thead tr");
    const th=header?.children?.[idx];
    if(!th||th.dataset.obsResizeBound==="1")return;
    th.dataset.obsResizeBound="1";
    th.style.position="relative";

    const handle=document.createElement("span");
    handle.className="obs-column-resizer";
    handle.setAttribute("aria-label","AMPLIAR O REDUCIR OBSERVACIONES");
    handle.style.cssText="position:absolute;right:-4px;top:0;width:9px;height:100%;cursor:col-resize;z-index:30;touch-action:none;background:transparent;";
    th.appendChild(handle);

    let startX=0,startW=1410,dragging=false;
    const onMove=e=>{
      if(!dragging)return;
      const next=Math.max(1410,Math.round(startW+(e.clientX-startX)));
      applyObservationWidth(table,idx,next);
    };
    const onUp=()=>{
      if(!dragging)return;
      dragging=false;
      document.body.style.cursor="";
      document.body.style.userSelect="";
      window.removeEventListener("pointermove",onMove,true);
      window.removeEventListener("pointerup",onUp,true);
      const col=table.querySelector("colgroup[data-autofit='1']")?.children?.[idx];
      const thWidth=th.getBoundingClientRect().width;
      const colWidth=col?.getBoundingClientRect?.().width||0;
      applyObservationWidth(table,idx,Math.max(1410,thWidth,colWidth));
    };
    handle.addEventListener("pointerdown",e=>{
      e.preventDefault();
      e.stopPropagation();
      dragging=true;
      startX=e.clientX;
      startW=table.dataset.obsWidth?Number(table.dataset.obsWidth):Math.max(1410,th.getBoundingClientRect().width);
      document.body.style.cursor="col-resize";
      document.body.style.userSelect="none";
      window.addEventListener("pointermove",onMove,true);
      window.addEventListener("pointerup",onUp,true);
    },true);
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

      const obsIdx=observationIndex(table);
      const obsWidth=obsIdx>=0?readObservationWidth(table):0;
      const widths=new Array(count).fill(70);
      const maxRows=rows.slice(0,251);
      maxRows.forEach(row=>{
        [...row.children].slice(0,count).forEach((cell,i)=>{
          if(i===obsIdx)return;
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
        if(i===obsIdx)w=obsWidth;
        col.style.width=w+"px";
      });
      if(!colgroup.parentElement)table.insertBefore(colgroup,table.firstChild);
      table.style.width="max-content";
      table.style.minWidth="100%";
      table.style.tableLayout="auto";
      table.dataset.columnsAutofit="1";

      if(obsIdx>=0){
        applyObservationWidth(table,obsIdx,obsWidth);
        bindObservationResizer(table,obsIdx);
      }
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
