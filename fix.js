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

  function normalizeStatus(value){
    return String(value||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function applyInicioGestionColors(root){
    const scope=root||document;
    scope.querySelectorAll(".inicio-table tbody tr").forEach(tr=>{
      tr.classList.remove("gestion-row-terminado","gestion-row-proceso","gestion-row-pendiente");
      const select=tr.querySelector(".inicio-status-edit");
      if(!select)return;
      const value=normalizeStatus(select.value);
      if(value==="TERMINADO")tr.classList.add("gestion-row-terminado");
      else if(value==="PROCESO"||value==="EN PROCESO")tr.classList.add("gestion-row-proceso");
      else if(value==="PENDIENTE"||value==="PENDIENTE POR GESTION")tr.classList.add("gestion-row-pendiente");
    });
  }

  function installInicioCompactStyle(){
    if(document.getElementById("inicio-compact-visual-fix"))return;
    const style=document.createElement("style");
    style.id="inicio-compact-visual-fix";
    style.textContent=`
      .inicio-table{table-layout:auto!important;width:max-content!important;min-width:100%;}
      .inicio-table thead th{height:34px!important;padding:5px 7px!important;white-space:nowrap!important;line-height:1.1!important;}
      .inicio-table tbody tr{height:29px!important;}
      .inicio-table tbody td{height:29px!important;padding:4px 7px!important;white-space:nowrap!important;line-height:1.15!important;vertical-align:middle!important;}
      .inicio-table tbody td input,.inicio-table tbody td select{height:25px!important;min-height:25px!important;line-height:23px!important;box-sizing:border-box!important;white-space:nowrap!important;}
      .inicio-table tbody tr.gestion-row-terminado>td{background:#eef8f0!important;}
      .inicio-table tbody tr.gestion-row-proceso>td{background:#fff7ea!important;}
      .inicio-table tbody tr.gestion-row-pendiente>td{background:#fff1f1!important;}
      .inicio-table tbody tr.gestion-row-terminado:hover>td{background:#e7f4ea!important;}
      .inicio-table tbody tr.gestion-row-proceso:hover>td{background:#fff2df!important;}
      .inicio-table tbody tr.gestion-row-pendiente:hover>td{background:#ffebeb!important;}
      .inicio-table .column-resizer{cursor:col-resize!important;}
    `;
    document.head.appendChild(style);
  }

  // 1410 PX ES EL VALOR INICIAL DE CADA APERTURA/RECONSTRUCCIÓN DE OBSERVACIONES.
  // Si el usuario amplía OBSERVACIONES durante la sesión, el ancho manual se conserva.
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
      cell.style.whiteSpace="nowrap";
      cell.style.lineHeight="1.15";
      cell.style.fontSize="13px";
      cell.style.verticalAlign="middle";
      cell.style.overflowWrap="normal";
      cell.style.wordBreak="normal";
      cell.style.display="table-cell";
      cell.style.overflow="hidden";
      cell.style.height="29px";
      cell.style.maxHeight="29px";
      cell.style.textOverflow="clip";
      cell.style.webkitLineClamp="unset";
      cell.style.webkitBoxOrient="initial";
    });
    table.querySelectorAll("tbody tr").forEach(tr=>{
      tr.style.height="29px";
      tr.style.minHeight="0";
    });
    table.style.height="auto";
  }

  function measureCellWidth(cell){
    if(!cell)return 0;
    const style=getComputedStyle(cell);
    const canvas=measureCellWidth.canvas||(measureCellWidth.canvas=document.createElement("canvas"));
    const ctx=canvas.getContext("2d");
    if(!ctx)return 0;
    ctx.font=(style.fontStyle||"normal")+" "+(style.fontWeight||"400")+" "+(style.fontSize||"13px")+" "+(style.fontFamily||"Arial");
    let max=0;
    const controls=cell.querySelectorAll("input,select,button");
    controls.forEach(el=>{
      if(el.matches("select")){
        const selected=el.options?.[el.selectedIndex]?.text||el.value||"";
        max=Math.max(max,ctx.measureText(String(selected)).width+28);
      }else if(el.matches("input")){
        max=Math.max(max,ctx.measureText(String(el.value||el.placeholder||"")).width+28);
      }else{
        const r=el.getBoundingClientRect();
        if(r.width)max=Math.max(max,r.width);
      }
    });
    const text=String(cell.innerText||cell.textContent||"").replace(/\s+/g," ").trim();
    if(text)max=Math.max(max,ctx.measureText(text).width+24);
    return max;
  }

  function setColumnWidth(table,idx,width){
    if(!table||idx<0)return;
    const header=table.querySelector("thead tr");
    const th=header?.children?.[idx];
    if(!th)return;
    const minWidth=idx===observationIndex(table)?1410:70;
    const w=Math.max(minWidth,Math.round(Number(width)||minWidth));
    const colgroup=table.querySelector("colgroup[data-autofit='1']");
    if(colgroup?.children?.[idx])colgroup.children[idx].style.width=w+"px";
    table.querySelectorAll(`thead th:nth-child(${idx+1}),tbody td:nth-child(${idx+1})`).forEach(cell=>{
      cell.style.width=w+"px";
      cell.style.minWidth=w+"px";
      cell.style.maxWidth=w+"px";
      cell.style.whiteSpace="nowrap";
      cell.style.height="29px";
      cell.style.lineHeight="1.15";
      cell.style.verticalAlign="middle";
      cell.style.overflow="hidden";
      cell.style.textOverflow="clip";
    });
    if(idx===observationIndex(table))writeObservationWidth(table,w);
  }

  function fitSingleColumn(table,idx){
    const header=table.querySelector("thead tr");
    if(!header?.children?.[idx])return;
    let width=measureCellWidth(header.children[idx])+16;
    [...table.querySelectorAll("tbody tr")].slice(0,1000).forEach(tr=>{
      const cell=tr.children[idx];
      if(cell)width=Math.max(width,measureCellWidth(cell)+8);
    });
    const min=idx===observationIndex(table)?1410:70;
    setColumnWidth(table,idx,Math.ceil(Math.max(min,width)));
  }

  function bindColumnAutoFit(table){
    const header=table?.querySelector("thead tr");
    if(!header||table.dataset.autofitDoubleClickBound==="1")return;
    table.dataset.autofitDoubleClickBound="1";
    [...header.children].forEach((th,idx)=>{
      th.title="DOBLE CLIC PARA AJUSTAR ANCHO DE LA COLUMNA";
      th.addEventListener("dblclick",e=>{
        if(e.target.closest(".filter-icon,.column-filter-panel"))return;
        e.preventDefault();
        fitSingleColumn(table,idx);
      });
      const resizer=th.querySelector(".column-resizer");
      if(resizer){
        resizer.title="AJUSTAR ANCHO — DOBLE CLIC PARA AUTOAJUSTAR";
        resizer.addEventListener("dblclick",e=>{
          e.preventDefault();
          e.stopPropagation();
          fitSingleColumn(table,idx);
        });
      }
    });
  }

  // AUTOAJUSTE GENERAL DE COLUMNAS.
  // Se aplica a las tablas de INICIO, EXPEDIENTES, TÍTULOS/TDJ, PAGOS y ACTUACIONES.
  function autoFitTables(root){
    const scope=root||document;
    installInicioCompactStyle();
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
      const maxRows=rows.slice(0,1000);
      maxRows.forEach(row=>{
        [...row.children].slice(0,count).forEach((cell,i)=>{
          if(i===obsIdx)return;
          widths[i]=Math.max(widths[i],measureCellWidth(cell));
        });
      });
      [...header.children].forEach((th,i)=>{
        widths[i]=Math.max(widths[i],measureCellWidth(th));
      });

      const colgroup=table.querySelector("colgroup[data-autofit='1']")||document.createElement("colgroup");
      colgroup.dataset.autofit="1";
      while(colgroup.children.length<count)colgroup.appendChild(document.createElement("col"));
      while(colgroup.children.length>count)colgroup.removeChild(colgroup.lastChild);
      [...colgroup.children].forEach((col,i)=>{
        const th=header.children[i];
        const label=String(th?.innerText||"").replace(/\s+/g," ").trim().toUpperCase();
        let w=Math.round(Math.max(70,widths[i]+8));
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
      bindColumnAutoFit(table);
      if(table.classList.contains("inicio-table"))applyInicioGestionColors(table);
    });
  }
  window.autoFitCarteraTables=autoFitTables;

  function bindInicioGestionChange(){
    if(document.documentElement.dataset.inicioGestionColorBound==="1")return;
    document.documentElement.dataset.inicioGestionColorBound="1";
    document.addEventListener("change",function(e){
      const el=e.target;
      if(!el?.matches(".inicio-table .inicio-status-edit"))return;
      const tr=el.closest("tr");
      if(tr){
        tr.classList.remove("gestion-row-terminado","gestion-row-proceso","gestion-row-pendiente");
        const value=normalizeStatus(el.value);
        if(value==="TERMINADO")tr.classList.add("gestion-row-terminado");
        else if(value==="PROCESO"||value==="EN PROCESO")tr.classList.add("gestion-row-proceso");
        else if(value==="PENDIENTE"||value==="PENDIENTE POR GESTION")tr.classList.add("gestion-row-pendiente");
      }
    },true);
  }

  function start(){
    const content=document.getElementById("content");
    installInicioCompactStyle();
    bindInicioGestionChange();
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
