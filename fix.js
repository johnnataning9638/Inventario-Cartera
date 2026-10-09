// PARCHE DE COMPATIBILIDAD PARA INICIO Y ATAJOS — AUTOAJUSTE PROFESIONAL EXPEDIENTES
(function(){
  function contributorData(id,record){
    const c=(Array.isArray(window.cache?.contribuyentes))?window.cache.contribuyentes.find(x=>Number(x.id)===Number(id)):null;
    const direct=typeof record==="object"&&record?record:{};
    return c?{nit:direct.nit||c.nit||"",razon:direct.razon_social||c.razon_social||""}:{nit:direct.nit||"",razon:direct.razon_social||""};
  }
  window.contributorData=window.contributorData||contributorData;
  function patchInicioGestion(){
    const title=document.getElementById("title"),content=document.getElementById("content");
    if(!title||!content||String(title.textContent||"").trim().toUpperCase()!=="INICIO")return;
    const table=content.querySelector("table.resizable-table");if(!table)return;
    const th=[...table.querySelectorAll("thead th")].find(x=>String(x.textContent||"").replace(/\s+/g," ").trim().toUpperCase().startsWith("ESTADO"));if(!th)return;
    const idx=th.cellIndex;th.dataset.columnKey="gestion";
    const sortButton=th.querySelector(".sort-header");if(sortButton){sortButton.textContent="GESTIÓN";sortButton.setAttribute("onclick","sortTable('expedientes','gestion')");}
    const filterButton=th.querySelector(".filter-icon");if(filterButton){filterButton.title="FILTRAR GESTIÓN";filterButton.setAttribute("aria-label","FILTRAR GESTIÓN");filterButton.setAttribute("onclick","toggleColumnFilter(event,'expedientes','gestion')");}
    const filterTitle=th.querySelector(".column-filter-title");if(filterTitle)filterTitle.textContent="GESTIÓN";
    table.querySelectorAll("tbody tr").forEach(tr=>{const cell=tr.children[idx];if(!cell)return;const current=cell.querySelector("select.inline-status");if(!current||current.dataset.inlineField==="gestion")return;const id=Number(current.dataset.statusId||0);const rec=(Array.isArray(window.cache?.expedientes))?window.cache.expedientes.find(x=>Number(x.id)===id):null;if(rec&&typeof window.inlineGestion==="function")cell.innerHTML=window.inlineGestion(rec);});
  }
  function observationIndex(table){const header=table?.querySelector("thead tr");if(!header)return -1;return [...header.children].findIndex(th=>/^(OBSERVACIONES?|COMENTARIOS?|DESCRIPCIÓN|DESCRIPCION|DETALLE)$/.test(String(th.innerText||"").replace(/\s+/g," ").trim().toUpperCase()));}
  function normalizeStatus(value){return String(value||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
  function applyInicioGestionColors(root){(root||document).querySelectorAll(".inicio-table tbody tr").forEach(tr=>{tr.classList.remove("gestion-row-terminado","gestion-row-proceso","gestion-row-pendiente");const select=tr.querySelector(".inicio-status-edit");if(!select)return;const value=normalizeStatus(select.value);if(value==="TERMINADO")tr.classList.add("gestion-row-terminado");else if(value==="PROCESO"||value==="EN PROCESO")tr.classList.add("gestion-row-proceso");else if(value==="PENDIENTE"||value==="PENDIENTE POR GESTION")tr.classList.add("gestion-row-pendiente");});}
  function installInicioCompactStyle(){if(document.getElementById("inicio-compact-visual-fix"))return;const style=document.createElement("style");style.id="inicio-compact-visual-fix";style.textContent=`
    .inicio-table{table-layout:auto!important;width:max-content!important;min-width:100%;}
    .inicio-table thead th{height:34px!important;padding:5px 7px!important;white-space:nowrap!important;line-height:1.1!important;}
    .inicio-table tbody tr{height:29px!important}.inicio-table tbody td{height:29px!important;padding:4px 7px!important;white-space:nowrap!important;line-height:1.15!important;vertical-align:middle!important}
    .inicio-table tbody td input,.inicio-table tbody td select{height:25px!important;min-height:25px!important;line-height:23px!important;box-sizing:border-box!important;white-space:nowrap!important}
    .inicio-table tbody tr.gestion-row-terminado>td{background:#eef8f0!important}.inicio-table tbody tr.gestion-row-proceso>td{background:#fff7ea!important}.inicio-table tbody tr.gestion-row-pendiente>td{background:#fff1f1!important}
    .inicio-table tbody tr.gestion-row-terminado:hover>td{background:#e7f4ea!important}.inicio-table tbody tr.gestion-row-proceso:hover>td{background:#fff2df!important}.inicio-table tbody tr.gestion-row-pendiente:hover>td{background:#ffebeb!important}
    .inicio-table .column-resizer{cursor:col-resize!important}`;document.head.appendChild(style);}
  const EXP_WIDTH_RULES={
    nit:[80,120],expediente:[95,150],razon_social:[120,240],anio:[55,80],periodo:[60,90],obligacion:[120,300],tipo_obl:[70,100],cuantia:[95,145],fecha_prescripcion:[110,155],aplicativo:[80,110],gestion:[95,125],estado:[110,245],fecha_aviso_cobro:[110,155],fecha_opp:[90,130],fecha_embargo:[105,150],fecha_desembargo:[115,160],fecha_investigacion_bienes:[125,175],fecha_mandamiento_pago:[125,175],observaciones:[120,360]
  };
  function measureVisibleText(cell){
    if(!cell)return 0;const style=getComputedStyle(cell),canvas=measureVisibleText.canvas||(measureVisibleText.canvas=document.createElement("canvas")),ctx=canvas.getContext("2d");if(!ctx)return 0;
    ctx.font=(style.fontStyle||"normal")+" "+(style.fontWeight||"400")+" "+(style.fontSize||"12px")+" "+(style.fontFamily||"Arial");let text="";
    const select=cell.querySelector("select");const input=cell.querySelector("input");
    if(select)text=select.options?.[select.selectedIndex]?.text||"";else if(input)text=input.value||input.placeholder||"";else text=cell.innerText||cell.textContent||"";
    return ctx.measureText(String(text).replace(/\s+/g," ").trim()).width+22;
  }
  function expField(table,idx){return table.querySelector("thead tr")?.children?.[idx]?.dataset?.columnKey||"";}
  function compactExpWidth(table,idx){const field=expField(table,idx),rule=EXP_WIDTH_RULES[field];if(!rule)return null;const header=table.querySelector("thead tr")?.children?.[idx];let w=measureVisibleText(header)+10;[...table.querySelectorAll("tbody tr")].slice(0,1000).forEach(tr=>{const td=tr.children[idx];if(td)w=Math.max(w,measureVisibleText(td)+4);});return Math.round(Math.min(rule[1],Math.max(rule[0],w)));}
  function applyExpedientesCompact(table){
    if(!table?.classList.contains("expedientes-table"))return;const header=table.querySelector("thead tr");if(!header)return;const colgroup=table.querySelector("colgroup[data-autofit='1']");
    table.style.setProperty("table-layout","fixed","important");table.style.setProperty("width","max-content","important");table.style.setProperty("min-width","0","important");
    [...header.children].forEach((th,idx)=>{const w=compactExpWidth(table,idx);if(!w)return;if(colgroup?.children?.[idx]){const col=colgroup.children[idx];col.style.setProperty("width",w+"px","important");col.style.setProperty("min-width",w+"px","important");col.style.setProperty("max-width",w+"px","important");}
      table.querySelectorAll(`thead th:nth-child(${idx+1}),tbody td:nth-child(${idx+1})`).forEach(cell=>{cell.style.setProperty("width",w+"px","important");cell.style.setProperty("min-width",w+"px","important");cell.style.setProperty("max-width",w+"px","important");cell.style.boxSizing="border-box";cell.style.overflow="hidden";cell.style.textOverflow="ellipsis";cell.style.whiteSpace="nowrap";});
      const tools=th.querySelector(".header-tools");if(tools){tools.style.width="100%";tools.style.minWidth="0";tools.style.maxWidth="100%";tools.style.boxSizing="border-box";}
      const panel=th.querySelector(".column-filter-panel");if(panel){panel.style.width="100%";panel.style.minWidth="0";panel.style.maxWidth="100%";panel.style.boxSizing="border-box";panel.style.overflowX="hidden";}
      if(expField(table,idx)==="obligacion")table.querySelectorAll(`tbody td:nth-child(${idx+1}) select`).forEach(s=>{s.style.width="100%";s.style.minWidth="0";s.style.maxWidth="100%";s.style.boxSizing="border-box";});
      if(expField(table,idx)==="estado")table.querySelectorAll(`tbody td:nth-child(${idx+1}) select`).forEach(s=>{s.style.width="100%";s.style.minWidth="0";s.style.maxWidth="100%";s.style.boxSizing="border-box";});
    });
    table.dataset.compactExpedientes="1";
  }
  function readObservationWidth(table){const n=Number(table?.dataset?.obsWidth||0);return Number.isFinite(n)&&n>=70?n:360;}
  function writeObservationWidth(table,width){const w=Math.max(120,Math.round(Number(width)||360));table.dataset.obsWidth=String(w);return w;}
  function applyObservationWidth(table,idx,width){if(!table||idx<0)return;const w=writeObservationWidth(table,width),colgroup=table.querySelector("colgroup[data-autofit='1']");if(colgroup?.children?.[idx])colgroup.children[idx].style.width=w+"px";table.querySelectorAll(`thead th:nth-child(${idx+1}),tbody td:nth-child(${idx+1})`).forEach(cell=>{cell.style.width=w+"px";cell.style.minWidth=w+"px";cell.style.maxWidth=w+"px";cell.style.whiteSpace="nowrap";cell.style.overflow="hidden";cell.style.textOverflow="ellipsis";});}
  function measureCellWidth(cell){return measureVisibleText(cell);}
  function setColumnWidth(table,idx,width){if(!table||idx<0)return;const header=table.querySelector("thead tr"),th=header?.children?.[idx];if(!th)return;const field=table.classList.contains("expedientes-table")?expField(table,idx):"",rule=EXP_WIDTH_RULES[field];const min=rule?.[0]||70,max=rule?.[1]||Math.max(min,2000),w=Math.min(max,Math.max(min,Math.round(Number(width)||min))),colgroup=table.querySelector("colgroup[data-autofit='1']");if(colgroup?.children?.[idx])colgroup.children[idx].style.width=w+"px";table.querySelectorAll(`thead th:nth-child(${idx+1}),tbody td:nth-child(${idx+1})`).forEach(cell=>{cell.style.width=w+"px";cell.style.minWidth=w+"px";cell.style.maxWidth=w+"px";cell.style.whiteSpace="nowrap";cell.style.overflow="hidden";cell.style.textOverflow="ellipsis";});}
  function fitSingleColumn(table,idx){const w=compactExpWidth(table,idx);if(w)setColumnWidth(table,idx,w);else{const header=table.querySelector("thead tr"),th=header?.children?.[idx];if(!th)return;let width=measureCellWidth(th)+16;[...table.querySelectorAll("tbody tr")].slice(0,1000).forEach(tr=>{const cell=tr.children[idx];if(cell)width=Math.max(width,measureCellWidth(cell)+8);});setColumnWidth(table,idx,Math.ceil(width));}}
  function bindColumnAutoFit(table){const header=table?.querySelector("thead tr");if(!header||table.dataset.autofitDoubleClickBound==="1")return;table.dataset.autofitDoubleClickBound="1";[...header.children].forEach((th,idx)=>{th.title="DOBLE CLIC PARA AJUSTAR ANCHO DE LA COLUMNA";th.addEventListener("dblclick",e=>{if(e.target.closest(".filter-icon,.column-filter-panel"))return;e.preventDefault();fitSingleColumn(table,idx);});const resizer=th.querySelector(".column-resizer");if(resizer){resizer.title="AJUSTAR ANCHO — DOBLE CLIC PARA AUTOAJUSTAR";resizer.addEventListener("dblclick",e=>{e.preventDefault();e.stopPropagation();fitSingleColumn(table,idx);});}});}
  function autoFitTables(root){
    const scope=root||document;installInicioCompactStyle();scope.querySelectorAll(".tablewrap table").forEach(table=>{
      const header=table.querySelector("thead tr");if(!header)return;const count=header.children.length;if(!count)return;
      const obsIdx=observationIndex(table);const rows=[...table.querySelectorAll("thead tr,tbody tr")];const widths=new Array(count).fill(70);
      if(!table.classList.contains("expedientes-table")){rows.slice(0,1000).forEach(row=>[...row.children].slice(0,count).forEach((cell,i)=>{if(i!==obsIdx)widths[i]=Math.max(widths[i],measureCellWidth(cell));}));[...header.children].forEach((th,i)=>{widths[i]=Math.max(widths[i],measureCellWidth(th));});}
      const colgroup=table.querySelector("colgroup[data-autofit='1']")||document.createElement("colgroup");colgroup.dataset.autofit="1";while(colgroup.children.length<count)colgroup.appendChild(document.createElement("col"));while(colgroup.children.length>count)colgroup.removeChild(colgroup.lastChild);if(!colgroup.parentElement)table.insertBefore(colgroup,table.firstChild);
      [...colgroup.children].forEach((col,i)=>{let w=table.classList.contains("expedientes-table")?compactExpWidth(table,i):Math.round(Math.max(70,widths[i]+8));const th=header.children[i],label=String(th?.innerText||"").replace(/\s+/g," ").trim().toUpperCase();if(!table.classList.contains("expedientes-table")){if(/^(ACCIONES|ACCIÓN)$/.test(label))w=Math.max(w,130);if(/^(NIT|ID|AÑO|AÑO GRAVABLE)$/.test(label))w=Math.max(90,Math.min(w,145));if(/^(FECHA|FECHA DE PAGO|FECHA TÍTULO|FECHA DEL TÍTULO)$/.test(label))w=Math.max(105,Math.min(w,155));}if(i===obsIdx)w=readObservationWidth(table);col.style.width=w+"px";});
      table.style.width="max-content";table.style.minWidth=table.classList.contains("expedientes-table")?"0":"100%";table.style.tableLayout=table.classList.contains("expedientes-table")?"fixed":"auto";table.dataset.columnsAutofit="1";
      if(obsIdx>=0)applyObservationWidth(table,obsIdx,readObservationWidth(table));bindColumnAutoFit(table);if(table.classList.contains("expedientes-table"))applyExpedientesCompact(table);if(table.classList.contains("inicio-table"))applyInicioGestionColors(table);
    });
  }
  window.autoFitCarteraTables=autoFitTables;
  function bindInicioGestionChange(){if(document.documentElement.dataset.inicioGestionColorBound==="1")return;document.documentElement.dataset.inicioGestionColorBound="1";document.addEventListener("change",function(e){const el=e.target;if(!el?.matches(".inicio-table .inicio-status-edit"))return;const tr=el.closest("tr");if(!tr)return;tr.classList.remove("gestion-row-terminado","gestion-row-proceso","gestion-row-pendiente");const value=normalizeStatus(el.value);if(value==="TERMINADO")tr.classList.add("gestion-row-terminado");else if(value==="PROCESO"||value==="EN PROCESO")tr.classList.add("gestion-row-proceso");else if(value==="PENDIENTE"||value==="PENDIENTE POR GESTION")tr.classList.add("gestion-row-pendiente");},true);}
  function start(){const content=document.getElementById("content");installInicioCompactStyle();bindInicioGestionChange();if(content&&!content.dataset.gestionObserver){content.dataset.gestionObserver="1";new MutationObserver(function(){if(window.__gestionPatchBusy)return;window.__gestionPatchBusy=true;try{patchInicioGestion();autoFitTables(content);}finally{window.__gestionPatchBusy=false;}}).observe(content,{childList:true,subtree:true});}patchInicioGestion();autoFitTables(document);setTimeout(()=>autoFitTables(document),250);setTimeout(()=>autoFitTables(document),900);setInterval(()=>autoFitTables(document),1800);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  document.addEventListener("keydown",function(e){if(!(e.ctrlKey||e.metaKey)||String(e.key).toLowerCase()!=="v")return;const el=e.target;if(!el||!el.matches(".inline-date-field,.inline-status"))return;e.preventDefault();e.stopPropagation();if(typeof window.bulkFillFromFocused==="function"){const synthetic=new KeyboardEvent("keydown",{key:"b",ctrlKey:true,bubbles:true,cancelable:true});Object.defineProperty(synthetic,"target",{value:el});window.bulkFillFromFocused(synthetic);}},true);
})();
